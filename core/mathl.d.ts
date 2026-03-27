export interface ICompiledCtx {
  source: string
  filename: string
}

export interface ICompiledCode {
  sourceState: ICompiledCtx
  sourceCode: string
  
}

export function findSlots(ctx: ICompiledCtx, ast: any): void
export function parse(src: any, filename: any): ParseState
export function genCode(ctx: ICompiledCtx, type: any, args?: {}): any
export function genJS(ctx: ICompiledCtx, args?: {}): any
export function compileJS(code: string, filename: string): ICompiledCode
