import * as mathl from '../index'
import {onLSFlush} from '../util/localStorage'
import {onLSStart} from '../util/localStorage'

globalThis.INSIDE_JEST = true

test('glsl to JS', async () => {
  await onLSStart()

  const code = `//glsl
precision highp float;


in vec3 Point;
in vec3 Normal;
in float Time;

out float Value;
out vec4 Color;
out vec3 Normal;

uniform float a;
uniform vec2 b;

void main() {
  Value = a + b.x + Point.x;
  Normal = vec3(b, 1.0);
  Color = vec4(b, 1.0, 1.0);
}`

  const result = mathl.compileJS(code, 'test.glsl')

  await onLSFlush()

  result.uniforms.a = 1
  result.uniforms.b = [2.5, 3]

  const pointIdx = result.inputTypes.Point.index
  result.getInput<number[]>(pointIdx)[0] = 0.5

  result.call()
  console.log(
    'Outputs:',
    Object.fromEntries(Object.entries(result.outputTypes).map((item) => [item[0], result.outputs[item[1].index]]))
  )
  
  expect(result.inputs).toMatchSnapshot()
  expect(result.outputs).toMatchSnapshot()
})
