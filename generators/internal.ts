import {CodeGenerator} from './generator_base.js'
import {traverse} from '../core/ast.js'
import type {ASTNode} from '../core/ast.js'
import type {ParseState} from '../core/state.js'
import {VarType} from '../core/types.js'

interface InternalState {
  indent: string
}

export class InternalCodeGen {
  ctx: ParseState | undefined
  args: unknown

  constructor(ctx?: ParseState, args: unknown = {}) {
    this.ctx = ctx
    this.args = args
  }

  genCode(ast: ASTNode): string {
    let out = ''

    const initState: InternalState = {
      indent: '',
    }

    const newState = (state: InternalState): InternalState => {
      return {
        indent: state.indent,
      }
    }

    traverse<InternalState>(ast, initState, {
      Ident(node, _state, _visit) {
        out += node.value
      },
      IntConstant(node, _state, _visit) {
        out += node.value
      },
      FloatConstant(node, _state, _visit) {
        out += node.value
      },
      VarDecl(node, _state, _visit) {
        const type = node[0]
        let tname = '<error>'

        if (type && type.value instanceof VarType) {
          tname = type.value.getTypeNameSafe()
        }

        const q = type ? type.qualifier : undefined
        let qual: unknown = q
        if (qual && typeof qual === 'object' && 'value' in qual) {
          qual = (qual as {value: unknown}).value
        }

        if (typeof qual === 'string' && qual.length > 0) {
          tname = qual + ' ' + tname
        }

        out += tname + ' ' + node.value
      },
      ArrayLookup(node, state, visit) {
        visit(state, node[0])
        out += '['
        visit(state, node[1])
        out += ']'
      },
      Trinary(node, state, visit) {
        out += '(('
        visit(state, node[0])
        out += ') ? ('
        visit(state, node[1])
        out += ') : ('
        visit(state, node[2])
        out += '))'
      },
      PreInc(node, state, visit) {
        out += '++'
        visit(state, node[0])
      },
      PostInc(node, state, visit) {
        visit(state, node[0])
        out += '++'
      },
      PreDec(node, state, visit) {
        out += '--'
        visit(state, node[0])
      },
      PostDec(node, state, visit) {
        visit(state, node[0])
        out += '--'
      },
      UnaryOp(node, state, visit) {
        if (node.type === 'UnaryOp') {
          out += node.op
        }
        visit(state, node[0])
      },
      Assign(node, state, visit) {
        visit(state, node[0])
        if (node.type === 'Assign') {
          out += ' ' + node.op + ' '
        }
        visit(state, node[1])
      },
      BinOp(node, state, visit) {
        if (node.type !== 'BinOp') {
          visit(state, node)
          return
        }
        let paren = node.op !== '.'
        const parent = node.parent
        paren = paren && parent !== undefined && parent.type === 'BinOp' && parent.prec < node.prec

        if (paren) {
          out += '('
        }

        visit(state, node[0])

        if (node.op !== '.') {
          out += ` ${node.op} `
        } else {
          out += node.op
        }

        visit(state, node[1])

        if (paren) {
          out += ')'
        }
      },
      Function(node, state, visit) {
        out += state.indent
        const tn = node[0].value
        if (tn instanceof VarType) {
          out += tn.getTypeName() + ' '
        }

        out += node.value + '('
        const args = node[1]
        for (let i = 0; i < args.length; i++) {
          if (i > 0) {
            out += ', '
          }

          visit(state, args[i])
        }

        out += ') {\n'

        const state2 = newState(state)
        state2.indent += '  '

        visit(state2, node[2])

        out += state.indent + '}\n'
      },
      Return(node, state, visit) {
        out += 'return'

        for (const n of node) {
          out += ' '
          visit(state, n)
        }
      },
      Call(node, state, visit) {
        const head = node[0]
        if (head.type === 'VarType' && head.value instanceof VarType) {
          out += head.value.getTypeName()
        } else {
          visit(state, head)
        }

        out += '('
        for (let i = 0; i < node[1].length; i++) {
          if (i > 0) {
            out += ', '
          }
          visit(state, node[1][i])
        }

        out += ')'
      },
      ExprList(node, state, visit) {
        for (let i = 0; i < node.length; i++) {
          if (i > 0) {
            out += ', '
          }

          visit(state, node[i])
        }
      },
      StatementList(node, state, visit) {
        const indent = state.indent

        for (const n of node) {
          out += indent
          visit(state, n)
          out += ';\n'
        }
      },
    })

    return out
  }

  static generatorDefine(): {typeName: string} {
    return {
      typeName: 'internal',
    }
  }
}
CodeGenerator.register(InternalCodeGen as unknown as Parameters<typeof CodeGenerator.register>[0])

export const internalCodeGen = new InternalCodeGen()
