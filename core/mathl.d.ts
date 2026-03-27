export interface ICompiledCtx {
  source: string
  filename: string
}

export type ValueType = number | number[] | boolean
export enum GLSLValueType {
  int = 'int',
  bool = 'bool',
  float = 'float',
  vec2 = 'vec2',
  vec3 = 'vec3',
  vec4 = 'vec4',
  mat2 = 'mat2',
  mat3 = 'mat3',
  mat4 = 'mat4',
}

export interface ICompiledCode {
  inputTypes: {[k: string]: {index: number; type: GLSLValueType}}
  outputTypes: {[k: string]: {index: number; type: GLSLValueType}}
  inputs: ValueType[]
  outputs: ValueType[]
  uniforms: {[k: string]: ValueType}

  setInput<T extends ValueType>(index: number, value: T): void
  getInput<T extends ValueType>(index: number): T
  
  /* one input per input type*/
  call(): void

  sourceState: ICompiledCtx
  sourceCode: string
}

export function findSlots(ctx: ICompiledCtx, ast: any): void
export function parse(src: any, filename: any): ParseState
export function genCode(ctx: ICompiledCtx, type: any, args?: {}): any
export function genJS(ctx: ICompiledCtx, args?: {}): any
export function compileJS(code: string, filename: string): ICompiledCode
