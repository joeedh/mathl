import * as parseutil from '../util/parseutil.js';
import * as util from '../util/util.js';
import {ASTNode} from './ast.js';
import {ParseState} from './state.js';
import {strong, stronglog, log, termColor, termPrint} from '../util/util.js';
import '../generators/all.js';
import {transformAst} from './process_ast.js';

let indent = util.indent;

function exit() {
  process.exit();
}


let count = (str, match) => {
  let c = 0;
  do {
    let i = str.search(match);
    if (i < 0) {
      break;
    }

    c++;

    str = str.slice(i + 1, str.length);
  } while (1);

  return c;
}

import {printobj} from './parser.js';

import {VarType, ArrayType} from './types.js';
import {CodeGenerator} from '../generators/generator_base.js';

import {parse_intern} from './parser.js';
import * as state from './state.js';

export function parse(src, filename) {
  let ret;

  try {
    state.pushParseState(src, filename);
    ret = parse_intern(src, state.state);
    state.popParseState();
  } catch (error) {
    state.popParseState();
    //util.print_stack(error);
    throw error;
  }

  return ret;
}

export function genCode(ctx, type, args={}) {
  let cls = CodeGenerator.getGenerator(type);
  let gen = new cls(ctx, args);

  transformAst(ctx.ast, ctx);

  return gen.genCode();
}

export function genJS(ctx, args={}) {
  return genCode(ctx,'js', args);
}