import {termPrint, termColor} from '../util/util.js';
import {VarType, ArrayType} from './types.js';
import {PUTLParseError} from '../util/parseutil.js';

function exit(msg) {
  if (typeof process !== "undefined" && process.exit) {
    process.exit(-1);
  } else {
    throw new PUTLParseError(msg);
  }
}

export function formatLines(s, line=0, lexpos=-1, col, count=5) {
  s = s.split("\n");
  let out = '';

  let maxline = Math.ceil(Math.log(s.length) / Math.log(10));

  let start = Math.max(line-2, 0);
  let end = Math.min(line+count, s.length);

  for (let i=start; i<end; i++) {
    let l = s[i];
    let si = "" + (i + 1);
    while (si.length < maxline) {
      si = " " + si;
    }

    if (i === line) {
      let l2 = '';
      for (let j = 0; j < l.length; j++) {
        let c = l[j];

        if (j >= col-2 && j <= col+2) {
          c = termColor(c, "red")
        }
        l2 += c;
      }

      l = l2;
    }

    l = termPrint(l);
    l = `  ${si}: ${l}`;

    //if (i === line) {
    //  l = termPrint(termColor(l, "red"));
    //}
    out += l + "\n";
  }

  return out;
}

//export const ParseFlags = {
//  IGNORE_SEMI : 1
//};

export class ParseState {
  constructor(source, filename="(anonymous)", parser, preprocessed="") {
    this.parser = undefined;
    this.lexer = undefined;

    this.preprocessed = preprocessed;

    this.scope = {};
    this.localScope = {};

    this.scopestack = [];
    this.types = {};

    this.inputs = {};
    this.outputs = {};
    this.uniforms = {};

    this.reset();

    this.source = source;
    this.filename = filename;

    this.builtinFuncs = new Set([
      "cos", "sin", "fract", "abs", "floor", "vec3", "vec2", "vec4", "mat4", "float", "int",
      "sqrt", "log", "pow", "exp", "acos", "asin", "tan", "atan", "atan2", "normalize",
      "dot", "cross", "reflect", "step", "smoothstep"
    ]);

    //this.flag = 0;
  }

  copy() {
    let p = new ParseState(this.source, this.filename, undefined, this.preprocessed);

    p.parser = this.parser ? this.parser.copy() : undefined;
    p.lexer = this.parser ? this.parser.lexer : undefined;

    p.scope = Object.assign({}, this.scope);
    p.localScope = Object.assign({}, this.localScope);
    p.scopestack = this.scopestack.map(f => Object.assign({}, f));
    p.types = Object.assign({}, this.types);
    p.inputs = Object.assign({}, this.inputs);
    p.outputs = Object.assign({}, this.outputs);
    p.uniforms = Object.assign({}, this.uniforms);

    p.filename = this.filename;
    p.source = this.source;

    return p;
  }

  resetScopeStack() {
    this.scopestack.length = 0;
    this.localScope = {};
    this.scope = {};

    let lists = [this.inputs, this.outputs, this.uniforms];
    for (let list of lists) {
      for (let k in list) {
        this.setScope(k, list[k]);
      }
    }

    return this;
  }

  reset() {
    this.scopestack = [];
    this.types = {};
    this.localScope = {};
    this.scope = {};

    this.inputs = {};
    this.outputs = {};
    this.uniforms = {};

    this.addType(new VarType("void"), "void");

    let f = this.addType(new VarType("float"), "float");
    let i = this.addType(new VarType("int"), "int");
    let b = this.addType(new VarType("bool"), "bool");
    let v2 = this.addType(new ArrayType(f, 2, "vec2"), "vec2");
    let v3 = this.addType(new ArrayType(f, 3, "vec3"), "vec3");
    let v4 = this.addType(new ArrayType(f, 4, "vec4"), "vec4");
    let m3 = this.addType(new ArrayType(v3, 3, "mat3"), "mat3");
    let m4 = this.addType(new ArrayType(v4, 4, "mat4"), "mat4");

    return this;
  }

  get col() {
    return this.lexer ? this.lexer.lexpos - this.lexer.line_lexstart : -1;
  }

  get lexpos() {
    return this.lexer ? this.lexer.lexpos : -1;
  }

  get line() {
    return this.lexer ? this.lexer.lineno : -1;
  }

  error(node, msg) {
    //console.log(node)
    let s = `\nError: ${this.filename}:${node.line+1}: ${msg}`;
    console.error(s);
    console.warn(formatLines(this.source, node.line, node.lexpos, node.col));
    exit(s);
  }

  getType(name) {
    return this.types[name];
  }

  setReturnType(t) {
    this.setScope("$__return__$", t);
  }

  getReturnType(t) {
    return this.getScope("$__return__$");
  }

  setScope(k, v) {
    this.localScope[k] = v;
    this.scope[k] = v;
  }

  resolveType(t) {
    if (!(t instanceof  VarType)) {
      if (typeof t === "object" && t.type === "VarType") {
        t = t.value;
      }

      if (typeof t === "object" && t.type === "Ident") {
        t = t.value;
      }
    }

    if (typeof t === "object" && t instanceof VarType) {
      let basename = t.getBaseName();

      if (!(basename in this.types)) {
        this.error(arguments[0], "Unknown type " + basename);
      }

      let b = this.types[basename];
      if (b instanceof ArrayType && !(VarType instanceof ArrayType)) {
        return b;
      }
      return t;
    } else if (typeof t === "object" && t.type === "VarRef") {
      let vref = t;
      if (vref[0] instanceof ArrayType) {
        return this.resolveType(vref[0].type);
      } else {
        return this.resolveType(vref[0]);
      }
    }
  }

  getScope(k) {
    return this.scope[k];
  }

  hasType(name) {
    return name in this.types;
  }

  addType(type, name) {
    this.types[name] = type;
    return type;
  }

  pushScope() {
    this.scopestack.push([this.scope, this.localScope]);
    this.localScope = {};
    this.scope = Object.assign({}, this.scope);
  }

  popScope() {
    [this.scope, this.localScope] = this.scopestack.pop();
  }
}

let statestack = [];

export let state = new ParseState();

export function pushParseState(source=state.source, filename=state.filename, parser, preprocessed) {
  statestack.push(state);

  state = new ParseState(source, filename, parser, preprocessed);

  return state;
}

export function popParseState() {
  state = statestack.pop();
}
