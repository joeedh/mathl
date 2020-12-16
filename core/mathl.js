import * as parseutil from '../util/parseutil.js';
import * as util from '../util/util.js';
import {ASTNode} from './ast.js';
import {ParseState} from './state.js';
import {strong, stronglog, log, termColor, termPrint} from '../util/util.js';
import '../generators/all.js';
import {transformAst} from '../transform/process_ast.js';
import {initParser, getParser} from '../parser/parser.js';

let indent = util.indent;

function exit() {
  process.exit();
}

export {preprocess} from '../parser/preprocessor.js';
import {preprocess} from '../parser/preprocessor.js';

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

import {traverse, walk} from './ast.js';

export function findSlots(ctx, ast) {
  walk(ast, {
    VarDecl(n) {
      if (n.length === 0) {
        return;
      }

      let type = n[0];
      type = type.qualifier;

      if (type) {
        type = type.value;
      }

      if (type === "uniform") {
        ctx.uniforms[n.value] = n;
      } else if (type === "in") {
        ctx.inputs[n.value] = n;
      } else if (type === "out") {
        ctx.outputs[n.value] = n;
      }
    }

  });

  //console.log(ctx.uniforms, ctx.inputs, ctx.outputs);
}

export function parse(src, filename) {
  let ret;

  try {
    let src2 = preprocess(src);

    state.pushParseState(src, filename, undefined, src2);
    //ret = parse_intern(src, state.state);

    let parser = getParser();

    state.state.parser = parser;
    parser.lexer.line_lexstart = 0;
    state.state.lexer = parser.lexer;

    let ast = parser.parse(src2);

    findSlots(state.state, ast);

    ret = state.state;
    ret.ast = ast;

    transformAst(ret.ast, ret);
    //parser.printTokens(src);

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

  return gen.genCode();
}

export function genJS(ctx, args={}) {
  return genCode(ctx,'js', args);
}

export {silence, unsilence} from '../util/util.js';

export function compileJS(code, filename) {
  let ctx = parse(code, filename);
  let code2 = genJS(ctx);

  var program;

  eval(code2);
  return program();
}

