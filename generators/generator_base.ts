import type {ASTNode} from '../core/ast.js'
import type {ParseState} from '../core/state.js'

export interface GeneratorDefine {
  typeName: string
}

export interface CodeGeneratorClass {
  new (ctx: ParseState, args?: unknown): CodeGenerator
  generatorDefine(): GeneratorDefine
}

export const CodeGenerators: CodeGeneratorClass[] = []

export class CodeGenerator {
  ctx: ParseState
  args: unknown

  constructor(ctx: ParseState, args: unknown = {}) {
    this.ctx = ctx
    this.args = args
  }

  genCode(_ast?: ASTNode): string {
    return ''
  }

  static generatorDefine(): GeneratorDefine {
    return {
      typeName: '',
    }
  }

  static getGenerator(name: string): CodeGeneratorClass {
    for (const cls of CodeGenerators) {
      if (cls.generatorDefine().typeName === name) {
        return cls
      }
    }
    throw new Error('unknown generator ' + name)
  }

  static register(cls: CodeGeneratorClass): void {
    if (cls.generatorDefine === CodeGenerator.generatorDefine) {
      throw new Error('missing generatorDefine static method for ' + cls.name)
    }

    CodeGenerators.push(cls)
  }
}
