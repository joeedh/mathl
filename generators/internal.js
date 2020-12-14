import {CodeGenerator} from './generator_base.js';
import {traverse} from '../core/ast.js';

export class InternalCodeGen {
  constructor(ctx, args={}) {
    this.ctx = ctx;
    this.args = args;
  }

  genCode(ast) {
    let out = '';

    let _state = {
      indent : ''
    }

    let newState = (state) => {
      return {
        indent : state.indent
      }
    }

    traverse(ast, _state,{
      Number(node, state, visit) {
        out += node.value;
      },
      Ident(node, state, visit) {
        out += node.value;
      },
      ArrayLookup(node, state, visit) {
        visit(state, node[0]);
        out += "["
        visit(state, node[1])
        out += "]"
      },
      BinOp(node, state, visit) {
        visit(state, node[0])

        if (node.op !== ".") {
          out += ` ${node.op} `;
        } else {
          out += node.op
        }

        visit(state, node[1]);
      },
      Function(node, state, visit) {
        out += state.indent;
        out += node[0].value.getTypeName() + " ";

        out += node.value + "("
        let args = node[1];
        for (let i=0; i<args.length; i++) {
          if (i > 0) {
            out += ", ";
          }
          visit(state, args[i]);
        }

        out += ") {\n";

        let state2 = newState(state);
        state2.indent += "  ";

        //console.log(node[2].type)
        visit(state2, node[2]);

        out += state.indent + "}\n";
      },
      Call(node, state, visit) {
        visit(state, node[0])

        out += "("
        for (let i=0; i<node[1].length; i++) {
          if (i > 0) {
            out += ", ";
          }
          visit(state, node[1][i]);
        }

        out += ")";
      },
      StatementList(node, state, visit) {
        let indent = state.indent;

        for (let n of node) {
          out += indent;
          visit(state, n);
          out += ";\n";
        }
      }
    });

    return out;
  }

  static generatorDefine() {
    return {
      typeName: "internal"
    }
  }
}
CodeGenerator.register(InternalCodeGen);

export const internalCodeGen = new InternalCodeGen();
