declare interface ICompiledCtx {
  source: string
  filename: string
}

declare interface ICompiledCode {
  sourceState: ICompiledCtx
  sourceCode: string
}

declare function compileJS(code: string, filename: string): ICompiledCode
