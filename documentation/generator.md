# Code generators

A generator consumes a `ParseState` (the result of `mathl.parse(...)`)
and emits a string of code in some target language. mathl ships three
generators today: `js`, `internal`, and `glsl` (the GLSL backend is
currently empty — `generators/glsl.ts` is a stub).

## The plug-in registry

`generators/generator_base.ts` defines the base class:

```ts
export class CodeGenerator {
  ctx: ParseState
  args: unknown

  constructor(ctx: ParseState, args: unknown = {}) { ... }

  genCode(_ast?: ASTNode): string { return '' }

  static generatorDefine(): GeneratorDefine {
    return {typeName: ''}
  }

  static getGenerator(name: string): CodeGeneratorClass { ... }
  static register(cls: CodeGeneratorClass): void { ... }
}
```

Every concrete generator:

1. Subclasses `CodeGenerator`.
2. Overrides the static `generatorDefine()` to return a `{typeName}`
   (this is the key consumers pass to `mathl.genCode(ctx, type)`).
3. Implements `genCode(ast?)` — when `ast` is undefined, fall back to
   `this.ctx.ast`.
4. Calls `CodeGenerator.register(MyGenerator)` at module-load time.

`generators/all.ts` imports each backend so the side-effecting
`register` calls run. `core/mathl.ts` re-imports `generators/all.js`
at the top of the module — that's what guarantees every generator is
present by the time `genCode()` is called.

Adding a new generator:

```ts
// generators/wgsl.ts
import {CodeGenerator} from './generator_base.js'
import type {ASTNode} from '../core/ast.js'

export class WGSLGenerator extends CodeGenerator {
  static generatorDefine() { return {typeName: 'wgsl'} }

  genCode(ast?: ASTNode): string {
    const root = ast ?? (this.ctx as any).ast
    // ...walk root, build string...
    return out
  }
}

CodeGenerator.register(WGSLGenerator)
```

Then add `import './wgsl.js'` to `generators/all.ts` and call
`mathl.genCode(ctx, 'wgsl')`.

## Dispatch — `mathl.genCode`

```ts
export function genCode(ctx: ParseState, type: string, args: unknown = {}): string {
  const cls = CodeGenerator.getGenerator(type)
  const gen = new cls(ctx, args)
  return gen.genCode()
}
```

`getGenerator` linearly searches `CodeGenerators[]` for the matching
`typeName` and throws `unknown generator <name>` if nothing registered.

## The JS generator — `generators/javascript.ts`

This is the production backend. Its output is a JS source string that,
when `eval()`-ed, assigns to a local `program` variable. The shape is
fixed and documented by `generators/javascript_types.ts::CompiledJS`:

```ts
program = function() {
  // ── runtime library ──
  let _$_sin__float__float = Math.sin;
  let _$_cos__float__float = Math.cos;
  let vec3cache = new cachering(() => [0, 0, 0], 2048);
  // ...

  // ── uniforms / inputs / outputs ──
  let a = 0;          function __seta(val)  { a = val; }
  let b = [0, 0];     function __setb(val)  { b[0] = val[0]; b[1] = val[1]; }
  let Point, Normal, Time;        // inputs
  // outputs live in `outputs[]` indexed by outputTypes

  // ── compiled user functions ──
  function _$_sin__vec3__vec3(a) { let r = vec3cache.next(); r[0] = Math.sin(a[0]); ... }
  function main() { ... }

  function __$func(outputs, inputs) {
    Point = inputs[0]; Normal = inputs[1]; Time = inputs[2];
    main();
    outputs[0] = Value; outputs[1] = Color; outputs[2] = Normal;
  }

  return {
    call() { return __$func(this.outputs, this.inputs) },
    setInput(i, v) { this.inputs[i] = v },
    getInput(i)    { return this.inputs[i] },
    uniforms: { get a(){return a}, set a(v){__seta(v)}, ... },
    outputs: [0.0, [0,0,0,0], [0,0,0]],
    outputTypes: { Value: {type:'float', index:0}, ... },
    inputs:  [[0,0,0], [0,0,0], 0.0],
    inputTypes: { Point: {type:'vec3', index:0}, ... },
    outputCount: 3,
  }
}
```

### How it walks the AST

`JSGenerator.genCode` runs a single recursive `rec(n)` over the AST.
Each node type has a hand-coded case that emits target text:

- **`VarDecl`** — emits `let name = ...` if the var isn't a slot
  variable (input/output/uniform) and isn't shadowed in the current
  function. Vec/mat types are pre-allocated from `vec3cache.next()` /
  `mat4cache.next()` (ring buffers, no per-call GC).
- **`BinOp`** — operator nodes that survived the transform pass are
  emitted as JS infix; the polymorphic operator overloads from
  `libraryCode` (e.g. `_$_$_add__vec3__vec3vec3`) appear as `Call`
  nodes with `polyKey` set.
- **`Call`** — calls the polyKey-resolved function name. Constructor
  calls like `vec3(a, b, c)` are routed to keyed helpers
  `_$_vec3__vec3__floatfloatfloat`.
- **`Assign`, `If`/`Else`, `While`, `DoWhile`, `ForLoop`, `Switch`,
  `Return`, `Break`, `Continue`, `Discard`** — straightforward.
- **`BasicMemberLookup`** — swizzles (`v.xy`, `v.rgb`) are rewritten
  by the transform pass into either `ArrayLookup` (for single-component
  access like `v.x` → `v[0]`) or named helper calls like
  `swizzle_vec3_xy(v)`.

The `JSGenState` object tracks a scratch stack (`usestack` is
currently false — the cachering path is in use). `push` / `pop` clone
state across block boundaries to avoid leaking `let` declarations out
of inner scopes.

### Runtime library prelude

`jslib` (top of `generators/javascript.ts`) is a hand-written JS
string prepended to every program. It supplies:

- `_$_<name>__float__float` aliases for the scalar `Math` builtins,
  matching the polymorphic key scheme. Vector/matrix versions of the
  same builtins are emitted as compiled GLSL from `libraryCode`.
- The `cachering` constructor (small ring-buffer allocator used in
  place of `new Array(...)` for vec/mat temporaries).
- Per-type caches: `vec2cache`, `vec3cache`, `vec4cache`, `mat3cache`,
  `mat4cache` (size 2048 each) and matching `*stack` rings (size 128,
  used only when the stack path is enabled).

### Compiling and running

`compileJS(code, filename?)` ties it together (`core/mathl.ts`):

```ts
export function compileJS(code, filename) {
  const ctx   = parse(code, filename)
  const code2 = genJS(ctx)            // same as genCode(ctx, 'js')
  let program
  eval(code2)                          // assigns to `program`
  const ret = program()
  ret.sourceState = ctx
  ret.sourceCode  = code2
  return ret                           // a CompiledJS
}
```

`CompiledJS` (see `generators/javascript_types.ts`):

```ts
interface CompiledJS {
  inputTypes:  {[k: string]: {index: number; type: GLSLValueType}}
  outputTypes: {[k: string]: {index: number; type: GLSLValueType}}
  inputs:      ValueType[]    // matches inputTypes by index
  outputs:     ValueType[]    // matches outputTypes by index
  uniforms:    {[k: string]: ValueType}
  setInput<T>(index: number, value: T): void
  getInput<T>(index: number): T
  call(): void                          // runs main(), writes outputs
  sourceState: ParseState
  sourceCode:  string
}
```

Drive it by setting `uniforms.X`, writing into the input slots via
`getInput(idx)` (mutating in place is cheaper than `setInput` for
vector inputs), calling `.call()`, and reading the result from
`outputs[outputTypes.Foo.index]`.

## The internal generator — `generators/internal.ts`

`InternalCodeGen` (typeName `'internal'`) re-prints the AST as
GLSL-ish source. It's used for debugging and for the `out_test.glsl`
fixture written by `test_mathl.js`. It uses the typed `traverse(...)`
helper from `core/ast.ts` with a small `InternalState` carrying the
current indent. Each handler emits text directly into a closure
`out` string. It's a good template for new pretty-printers: short,
flat, no scope tracking, no polyKey rewriting.

## The GLSL generator — `generators/glsl.ts`

Empty stub. The intent is round-tripping through the transformer (so
e.g. swizzle rewriting and poly-key dispatch get materialized back
into valid GLSL). When you implement it, follow the InternalCodeGen
pattern but emit the resolved poly-key calls instead of original
operator-form expressions.

## The shared codelib — `generators/codelib.ts`

`CodeLib` is a small GLSL string of vector/scalar helpers
(`add_v2_fl`, `mul_v3_v3`, …). It's separate from the much larger
auto-generated `libraryCode` in `core/state.ts::genLibraryCode()` and
is currently unused at the top level — kept around because the
transform pass references some of these names for swizzle rewrites.

## Picking a generator from user code

```ts
import * as mathl from 'mathl'
const ctx = mathl.parse(glslSource)
const js   = mathl.genCode(ctx, 'js')
const prnt = mathl.genCode(ctx, 'internal')
// Or, the high-level convenience:
const compiled = mathl.compileJS(glslSource)
```
