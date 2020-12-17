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

    this.poly_namemap = {};
    this.poly_keymap = {};

    this.scope = {};
    this.localScope = {};

    this.scopestack = [];
    this.types = {};

    this.inputs = {};
    this.outputs = {};
    this.uniforms = {};

    this.functions = {};

    this.reset();

    this.source = source;
    this.filename = filename;

    this.builtinFuncs = new Set([
      "cos", "sin", "fract", "abs", "floor", "vec3", "vec2", "vec4", "mat4","mat3", "float", "int",
      "sqrt", "log", "pow", "exp", "acos", "asin", "tan", "atan", "atan2", "normalize",
      "dot", "cross", "reflect", "step", "smoothstep"
    ]);

    //this.flag = 0;
  }

  addPolyFunc(name, rtype, args, type2) {
    if (type2 === "") {
      type2 = this.getType(type2);
    }
    if (rtype === "") {
      rtype = type2;
    }

    if (typeof name === "object") {
      if (name.constructor.name === "ASTNode") {
        if (name.type === "Ident") {
          name = name.value;
        } else if (name.type === "VarType") {
          name = name.value.getTypeNameSafe();
        }
      } else if (name instanceof VarType) {
        name = name.getTypeNameSafe();
      }
    }
    for (let i=0; i<args.length; i++) {
      if (args[i] === "") {
        args[i] = type2;
      }
    }

    rtype = this.resolveType(rtype);

    let key = this.buildPolyKey(name, rtype, args, type2);

    this.poly_keymap[key] = {
      name, args, type : rtype, key
    };

    if (!(name in this.poly_namemap)) {
      this.poly_namemap[name] = new Set();
    }

    this.poly_namemap[name].add({
      type : rtype,
      args,
      key,
      name
    });

    this.addFunc(name, rtype, args, key);
  }

  addFunc(name, rtype, args, key=name) {
    args = args.filter(f => typeof f === "string" ? this.getType(f) : f);
    if (typeof type === "string") {
      rtype = this.getType(name);
    }

    this.functions[key] = {
      type : rtype,
      args,
      name,
      key
    };
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

  buildPolyKey(name, rtype, args, type2) {
    if (type2 && typeof type2 === "string") {
      type2 = this.getType(type2);
    }

    if (typeof rtype === "string") {
      rtype = rtype === "" ? type2 : this.getType(rtype);
    }

    if (typeof name === "object") {
      if (name.constructor.name === "ASTNode") {
        if (name.type === "VarType") {
          name = name.value;
        } else if (name.type === "Ident") {
          name = name.value;
        } else {
          this.error(name, "Bad type node");
        }
      }

      if (typeof name === "object" && name instanceof VarType) {
        name = name.getTypeNameSafe();
      }
    }

    let key = `_${name}_${rtype.getTypeNameSafe()}_`;

    for (let i=0; i<args.length; i++) {
      if (typeof args[i] === "string") {
        if (args[i] === "") {
          args[i] = type2;
        } else {
          args[i] = this.getType(args[i]);
        }
      }

      key += args[i].getTypeNameSafe();
    }

    return key;
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
    this.poly_keymap = {};
    this.poly_namemap = {};
    this.functions = {};
    this.constructors = {};
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


    let keys = [
      "", "float", "vec2", "vec3", "vec4"
    ];

    let sizes = {
      "float" : 1,
      "vec2" : 2,
      "vec3" : 3,
      "vec4" : 4
    };

    let out = [];
    let visit = new Set();

    let push = (list) => {
      let listkey = JSON.stringify(list);
      if (!visit.has(listkey)) {
        visit.add(listkey);
        out.push(list);
      }
    }
    let getsize = (f) => {
      let size = 0;
      for (let item of f) {
        size += sizes[item];
      }
      return size;
    }

    let rec = (a, size=a, lst=[], depth=0) => {
      if (a <= 0 || a > size) {
        return [];
      }

      if (depth > size) {
        return [keys[a]];
      }

      if (getsize(lst) === size) {
        push(lst);
      }

      for (let i=1; i<=size; i++) {
        let lst2 = lst.concat([keys[i]]);

        rec(i, size, lst2, depth + 1);
      }
    }

    let constructors = {};

    for (let i=1; i<=4; i++) {
      out.length = 0;
      rec(i);

      let key = keys[i];
      key = this.getType(key);


      for (let args of out) {
        let key2 = this.buildPolyKey(key, key, args, key);
        this.addPolyFunc(key, key, args, key);

        constructors[key2] = keys[i];
      }
    }

    this.constructors = constructors;

    for (let i=2; i<=4; i++) {
      let key = "vec" + i;

      this.addPolyFunc("normalize", "", ["", ""], key);
      this.addPolyFunc("dot", "float", ["", ""], key);
      this.addPolyFunc("cross", "", ["", ""], key);
    }

    for (let key of keys) {
      if (key === "") {
        continue;
      }

      this.addPolyFunc("min", "", ["", ""], key);
      this.addPolyFunc("max", "", ["", ""], key);
      this.addPolyFunc("fract", "", [""], key);
      this.addPolyFunc("step", "", [""], key);
      this.addPolyFunc("cos", "", [""], key);
      this.addPolyFunc("sin", "", [""], key);
      this.addPolyFunc("floor", "", [""], key);
      this.addPolyFunc("ceil", "", [""], key);
      this.addPolyFunc("mod", "", [""], key);
      this.addPolyFunc("sqrt", "", [""], key);
      this.addPolyFunc("pow", "", [""], key);
      this.addPolyFunc("log", "", [""], key);
    }

    return this;
  }

  get col() {
    return this.lexer ? this.lexer.lexpos - this.lexer.line_lexstart : -1;
  }

  get lexpos() {
    return this.lexer ? this.lexer.lexpos : -1;
  }

  get line() {
    return this.lexer ? this.lexer.linemap[this.lexer.lexpos] : -1;
  }

  error(node, msg) {
    //console.log(node)

    if (!node) {
      console.error(`\nError: ${msg}`);
    } else {
      let s = `\nError: ${this.filename}:${node.line + 1}: ${msg}`;
      console.error(s + "\n");

      console.warn(formatLines(this.source, node.line, node.lexpos, node.col, 5));
    }

    exit(-1);
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
    if (typeof t === "string") {
      t = this.getType(t);
    }

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

  typesEqual(a, b) {
    if (a === undefined || b === undefined) {
      console.log("A:"+a, "B:"+b);
      throw new Error("undefined arguments to typesEqual");
    }

    a = this.resolveType(a);
    b = this.resolveType(b);

    if (!a) {
      console.log(""+a);
      this.error(undefined, "bad type " + arguments[0]);
    }

    if (!b) {
      console.log(""+b);
      this.error(undefined, "bad type " + arguments[1]);
    }

    if (!a || !b) {
      return false;
    }
    return a.getTypeName() === b.getTypeName();
  }

  getScope(k) {
    return this.resolveType(this.scope[k]);
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
