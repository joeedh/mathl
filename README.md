# mathl

A GLSL-flavoured shader-like language with a JavaScript backend —
write code that looks like a fragment shader, compile it to a JS
function you can call on the CPU.

## Install / build

```bash
pnpm install
pnpm build      # bundle to build/
pnpm test       # jest
pnpm typecheck  # tsgo --noEmit
```

## Transpile GLSL to JS

```ts
import * as mathl from 'mathl'

const shader = `
in  vec3  Point;
in  float Time;

out vec3  Color;

uniform float scale;

void main() {
  Color = vec3(Point.x * scale, Point.y * scale, sin(Time));
}
`

// Compile once.
const program = mathl.compileJS(shader, 'my_shader.glsl')

// Wire up uniforms and inputs.
program.uniforms.scale = 2.0

const pointIdx = program.inputTypes.Point.index
const timeIdx = program.inputTypes.Time.index
program.getInput<number[]>(pointIdx)[0] = 0.5 // Point.x
program.getInput<number[]>(pointIdx)[1] = 0.25 // Point.y
program.getInput<number[]>(pointIdx)[2] = 0.0 // Point.z
program.setInput(timeIdx, 1.234)

// Run.
program.call()

// Read outputs.
const colorIdx = program.outputTypes.Color.index
console.log(program.outputs[colorIdx]) // [1.0, 0.5, ~0.943]
```

`mathl.compileJS` is the all-in-one entry point. If you want the
intermediate JS source (for caching, codegen inspection, or embedding
in a generated file), do it in two steps:

```ts
const ctx = mathl.parse(shader, 'my_shader.glsl')
const js = mathl.genCode(ctx, 'js') // a JS source string
// ...write js to disk, ship it, eval() later...
```

See `documentation/parser.md` for how parsing works and
`documentation/generator.md` for the code-generator architecture.
