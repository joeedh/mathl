# Parser

mathl's parser turns a GLSL source string into an AST that the transform
and generator passes can operate on. It is a four-stage pipeline:

```
source ──▶ preprocessor ──▶ lexer ──▶ LALR(1) driver ──▶ AST
```

Everything below lives under `parser/` and `core/`.

## Files

| File                     | Role                                                                         |
| ------------------------ | ---------------------------------------------------------------------------- |
| `parser/preprocessor.ts` | `#define` / `#ifdef` / `#include`-style macro expansion + comment stripping  |
| `parser/parser.ts`       | Lexer (`GLSLLexer`), grammar productions, action functions                   |
| `parser/jscc_util.ts`    | PyPLY-style wrapper around JSCC's LALR(1) table generator + parse driver     |
| `parser/parsetab.ts`     | Pre-built parse table (`parsetable.json` encoded as an LZ-compressed string) |
| `core/ast.ts`            | `ASTNode` base class and ~50 concrete node subclasses                        |
| `core/state.ts`          | `ParseState` — symbol table, type table, scope stack, poly-func registry     |
| `core/types.ts`          | `VarType`, `ArrayType`, `DynamicArrayType`                                   |
| `core/mathl.ts`          | High-level `parse(src)` entry point that wires the stages together           |

## Pipeline

### 1. Preprocessing — `parser/preprocessor.ts`

`preprocess(src)` strips comments (`stripComments`) and then walks the
input line-by-line through `Preprocessor.process()`, handling:

- `#define NAME value` — text substitution
- `#define MACRO(a, b) ...` — function-like macros with `,`-aware
  arg collection (`collectargs`)
- `#ifdef` / `#ifndef` / `#else` / `#endif` — gated by an `ifstack`
- `#include` — currently a stub (the test corpus
  does not exercise it)

Macros are sorted by length (longest first) so longer names match before
substrings, and `boundary_re` ensures replacement only happens at token
boundaries (the regex matches typical GLSL punctuation around the
identifier).

The output is plain GLSL with comments and `#`-directives removed —
whitespace is preserved so line/column information stays accurate.

### 2. Lexing — `GLSLLexer` in `parser/parser.ts`

The lexer is built from a list of `tokdef(name, regex, postProcess?)`
entries (the `tokendef` array). Tokens are tried in declaration order;
the first regex that matches longest wins. Notable behaviors:

- **`ID` post-processing**: identifiers are reclassified after the fact —
  - If `lex.structs` already contains the name (user-declared
    `struct Foo {...}`), the token becomes `TYPE_NAME`.
  - If the previous token was `DOT`, the token becomes `FIELD_SELECTION`
    (a swizzle / struct-member access).
  - If the uppercased name is a keyword (`keywords` set), the token's
    type is replaced with the keyword name (e.g. `vec3` → `VEC3`).
- **`NL`, `WS`, `COMMENT`** are dropped (their post-process function
  returns nothing); `NL` also bumps `lineno` / `line_lexstart` so error
  messages can locate themselves.
- **Numeric tokens** (`FLOATCONSTANT`, `INTCONSTANT`, `UINTCONSTANT`,
  `DOUBLECONSTANT`, `BOOLCONSTANT`) convert the matched string to its
  JS-native value in the post-process function.
- **Scope tracking**: the lexer maintains a `scope: Map<string,ASTNode>`
  plus a `scopestack` and a `structs` map. The parser actions call
  `pushScope()` / `popScope()` at function boundaries and register
  declarations into `scope` so later `ID` lookups can disambiguate
  user-defined types.

### 3. Grammar and the LALR(1) driver

The grammar is declared inline in `parser/parser.ts` as the `parsedef`
array. Each entry is `{grammar, func}`:

```ts
{
  grammar: `additive_expression: multiplicative_expression
                                | additive_expression PLUS multiplicative_expression
                                | additive_expression MINUS multiplicative_expression`,
  func   : BinOpHandler,
}
```

The grammar string is the literal YACC-style rule (multiple alternatives
allowed); `func` is the action invoked when the rule reduces. `func`
receives `p`, an array where:

- `p[0]` is the reduction result (set by the action)
- `p[1..]` are the values from the matched RHS symbols
- `p.lexer` is the active `GLSLLexer`

`p.length === 2` (single-symbol rule) is the common "just bubble up"
case; longer lengths mean the alternative with that many RHS symbols
fired.

`jscc_util.ts` does the heavy lifting:

1. `getParser(lex, parsedef, tokens, precedence, "glsl")` is called
   once. It builds one big JSCC grammar string from the precedence
   table, the token list, and every `parsedef.grammar` (each tagged with
   `[*_ID*]` so the table can map productions back to action functions).
2. The grammar's hash is compared against the hash stored in the
   cached `parsetable.json`. On match, the prebuilt table is loaded via
   `Parser.load()` and the action map is bound. On mismatch (and only
   when called with `force=true` from `build_parsetable.js`) JSCC's
   table generator runs in-process to produce a new `pdata`.
3. The returned `Parser` exposes `parse(source)`, which:
   - Inputs `source` into the lexer.
   - Builds `linemap`/`colmap` for error reporting.
   - Drives a standard shift-reduce loop over two `ParseStack`s
     (`sstack` for state numbers, `vstack` for semantic values). On
     reduce it pops the RHS values into a `p` array, invokes the
     action, and pushes `p[0]` and the goto state.
   - On parse failure, `doerror` prints ±20 lines of context plus a
     caret and throws.

The driver itself is in `Parser.parse` (`jscc_util.ts`). It returns the
top-level reduction value — for mathl, a `ProgramNode`.

### 4. AST construction — `core/ast.ts`

Action functions construct `ASTNode` subclasses. Every node:

- Extends `ASTNodeBase<VALUE, TYPE>`, which itself extends `Array<ASTNode>`
  — children are the array elements, accessible by `n[0]`, `n[1]`, …
  with `n.length` children.
- Has an immutable `type: string` (e.g. `'BinOp'`, `'VarDecl'`).
- Carries `id`, `line`, `col`, `lexpos` (populated from the active
  `ParseState` at construction time).
- Optional `value`, `op`, `prec`, `qualifier`, `ntype` (resolved
  `VarType` after the type pass), `polyKey` (set by the transform pass
  for polymorphic call sites), `noScope`.

Common nodes: `ProgramNode`, `FunctionNode`, `StatementListNode`,
`VarDeclNode`, `BinOpNode`, `AssignNode`, `CallNode`, `IdentNode`,
`IntConstantNode`, `FloatConstantNode`, `BasicMemberLookupNode`,
`ArrayLookupNode`, `IfNode`/`ElseNode`, `ForLoopNode`, `WhileNode`,
`ReturnNode`, `StructDeclNode`, `LayoutQualifierNode`, …

Walk helpers (all in `core/ast.ts` and re-exported from
`parser/parser.ts`):

- `walk(ast, handlers)` — visit by type, `handlers` is a `Map<type, cb>`
  or a plain object.
- `fullVisit(ast, cb)` — preorder, every node.
- `controlledVisit(ast, handlers, state)` — handlers explicitly call
  `descend(n, state)` to recurse, useful when state must be threaded.
- `scopeWalk` — used by `transform/process_ast.ts` to track scope while
  visiting.
- `traverse<State>(ast, initialState, handlers)` — generic typed
  traversal used by the internal/JS generators.

## ParseState — the symbol table

`core/state.ts` defines `ParseState`, the context object threaded
through parsing, transformation, and code generation. It holds:

- `inputs`, `outputs`, `uniforms` — `Map<name, VarDeclNode>`, populated
  by `mathl.findSlots()` after the parse finishes.
- `scope` / `localScope` / `scopestack` — variable scope chain.
- `types` — `Map<name, VarType>` (`float`, `int`, `bool`, `vec2`,
  `vec3`, `vec4`, `mat3`, `mat4`, plus user struct decls).
- `functions`, `poly_keymap`, `poly_namemap`, `constructors` —
  polymorphic function registry (see below).
- `parser`, `lexer`, `source`, `filename`, `preprocessed`.

A small stack of `ParseState`s is kept in `state.statestack` so the
library code can be parsed once with its own state and then merged into
each user parse (`pushParseState` / `popParseState`).

### Polymorphic functions

GLSL is heavily overloaded (`sin(float)`, `sin(vec3)`, `+(vec3, vec3)`,
`+(vec3, float)`, …). The transform pass picks one concrete instance
per call site by:

1. At `ParseState.reset()` time, every builtin (`sin`, `cos`, `min`,
   `max`, `cross`, `dot`, `step`, `pow`, the arithmetic operators, the
   `vec2..vec4` / `mat3..mat4` constructors) is registered via
   `addPolyFunc()`, which:
   - Builds a key like `_$_sin__vec3__vec3` (`_$_<name>__<ret>__<args>`).
   - Stores a `PolyFuncEntry` in `poly_keymap` and `poly_namemap`.
2. `generators/state.ts`'s `libraryCode` (a giant GLSL string emitted by
   `genLibraryCode()`) provides a hand-rolled GLSL implementation for
   each key. The library is parsed once (with `getLibraryCode`,
   `core/mathl.ts`), cached in `localStorage`, and re-injected into
   every user parse so the JS generator can emit calls into the keyed
   functions.
3. The AST transform (`transform/process_ast.ts`) rewrites operator
   nodes and unresolved `Call` nodes to point at the matching poly key,
   storing it on `node.polyKey`.

## Entry point

`core/mathl.ts` exposes the top-level `parse(src, filename?)`:

```ts
export function parse(src: string, filename?: string): ParsedState {
  const src2 = preprocess(src)
  const parser = getParser()
  if (!compiledLibraryCode) compiledLibraryCode = getLibraryCode()

  pushParseState(src, filename, parser, src2)
  try {
    const parsed = parser.parse(src2) as ASTNode // ProgramNode

    // Prepend the cached library AST so transforms can see builtins.
    const ast2 = new ProgramNode()
    for (const node of compiledLibraryCode) ast2.push(node.copy())
    for (const node of parsed) ast2.push(node)

    findSlots(state, ast2) // populate ctx.inputs/outputs/uniforms
    state.ast = ast2
    transformAst(state.ast, state) // resolve types, dispatch poly funcs
  } finally {
    popParseState()
  }
  return state
}
```

The returned `ParsedState` (a `ParseState` with an `ast` field) is what
every code generator consumes.

## Rebuilding the parse table

The grammar is large enough that LALR(1) table generation takes several
seconds, so the result is committed to `parsetable.json` and loaded as
an LZ-compressed string from `parser/parsetab.ts`. When you change the
grammar:

```bash
node build_parsetable.js
```

This calls `rebuildParser()` (`parser/parser.ts`), which forces
`getParser()` with `force=true`. The new table is hashed and written
back. At runtime, `getParser()` will throw "parser is out of date; run
build_parsetable.js" if the stored hash doesn't match the grammar.

## Errors

Two layers of error reporting:

- **Lexer** — token-rule mismatch returns from the lexer's fallback
  callback (currently just logs `'Token error'`).
- **Parser** — `Parser.parse` calls `doerror(PCB)` which prints the
  source line, a caret at the column, and throws.
- **Transform / type errors** — `ParseState.error(node, msg)` prints the
  surrounding source via `formatLines(...)` and either throws (browser
  / Jest) or calls `process.exit(-1)` (CLI).
