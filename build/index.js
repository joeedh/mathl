var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// util/parseutil.js
var token = class {
  static {
    __name(this, "token");
  }
  constructor(type2, val2, lexpos, lexlen, lineno, lexer4, parser5) {
    this.type = type2;
    this.value = val2;
    this.lexpos = lexpos;
    this.lexlen = lexlen;
    this.lineno = lineno;
    this.lexer = lexer4;
    this.parser = parser5;
  }
  toString() {
    if (this.value !== void 0)
      return "token(type=" + this.type + ", value='" + this.value + "')";
    else
      return "token(type=" + this.type + ")";
  }
};
var tokdef = class {
  static {
    __name(this, "tokdef");
  }
  constructor(name2, regexpr, func) {
    this.name = name2;
    this.re = regexpr;
    this.func = func;
  }
};
var PUTLParseError = class extends Error {
  static {
    __name(this, "PUTLParseError");
  }
};
var lexer = class _lexer {
  static {
    __name(this, "lexer");
  }
  constructor(tokdef3, errfunc) {
    this.tokdef = tokdef3;
    this.tokens = new Array();
    this.lexpos = 0;
    this.lexdata = "";
    this.lineno = 0;
    this.errfunc = errfunc;
    this.tokints = {};
    this.prev = void 0;
    for (var i2 = 0; i2 < tokdef3.length; i2++) {
      this.tokints[tokdef3[i2].name] = i2;
    }
    this.statestack = [["__main__", 0]];
    this.states = { "__main__": [tokdef3, errfunc] };
    this.statedata = 0;
  }
  copy() {
    let ret2 = new _lexer(this.tokdef, this.errfunc);
    for (let k2 in this.states) {
      let state2 = this.states[k2];
      state2 = [state2[0], state2[1]];
      ret2.states[k2] = state2;
    }
    ret2.statedata = this.statedata;
    return ret2;
  }
  //errfunc is optional, defines state-specific error function
  add_state(name2, tokdef3, errfunc) {
    if (errfunc === void 0) {
      errfunc = /* @__PURE__ */ __name(function(lexer4) {
        return true;
      }, "errfunc");
    }
    this.states[name2] = [tokdef3, errfunc];
  }
  tok_int(name2) {
  }
  //statedata is optional.
  //it stores state-specific data in lexer.statedata.
  push_state(state2, statedata) {
    this.statestack.push([state2, statedata]);
    state2 = this.states[state2];
    this.statedata = statedata;
    this.tokdef = state2[0];
    this.errfunc = state2[1];
  }
  pop_state() {
    var item = this.statestack[this.statestack.length - 1];
    var state2 = this.states[item[0]];
    this.tokdef = state2[0];
    this.errfunc = state2[1];
    this.statedata = item[1];
  }
  input(str) {
    while (this.statestack.length > 1) {
      this.pop_state();
    }
    this.prev = void 0;
    this.lexdata = str;
    this.lexpos = 0;
    this.lineno = 0;
    this.tokens = new Array();
    this.peeked_tokens = [];
  }
  error() {
    if (this.errfunc !== void 0 && !this.errfunc(this))
      return;
    console.log("Syntax error near line " + this.lineno);
    var next = Math.min(this.lexpos + 8, this.lexdata.length);
    console.log("  " + this.lexdata.slice(this.lexpos, next));
    throw new PUTLParseError("Parse error");
  }
  peek() {
    var tok = this.next(123);
    if (tok === void 0)
      return void 0;
    this.peeked_tokens.push(tok);
    return tok;
  }
  peek_i(i2) {
    while (this.peeked_tokens.length <= i2) {
      var t2 = this.peek();
      if (t2 === void 0)
        return void 0;
    }
    return this.peeked_tokens[i2];
  }
  at_end() {
    return this.lexpos >= this.lexdata.length && this.peeked_tokens.length === 0;
  }
  next(ignore_peek) {
    if (ignore_peek !== 123 && this.peeked_tokens.length > 0) {
      var tok = this.peeked_tokens[0];
      this.peeked_tokens.shift();
      return tok;
    }
    if (this.lexpos >= this.lexdata.length)
      return void 0;
    var ts = this.tokdef;
    var tlen = ts.length;
    var lexdata = this.lexdata.slice(this.lexpos, this.lexdata.length);
    var results = [];
    for (var i2 = 0; i2 < tlen; i2++) {
      var t2 = ts[i2];
      if (t2.re === void 0)
        continue;
      var res = t2.re.exec(lexdata);
      if (res !== null && res !== void 0 && res.index === 0) {
        results.push([t2, res]);
      }
    }
    var max_res = 0;
    var theres = void 0;
    for (var i2 = 0; i2 < results.length; i2++) {
      var res = results[i2];
      if (res[1][0].length > max_res) {
        theres = res;
        max_res = res[1][0].length;
      }
    }
    if (theres === void 0) {
      this.error();
      return;
    }
    var def = theres[0];
    var lexlen = max_res;
    var tok = new token(def.name, theres[1][0], this.lexpos, lexlen, this.lineno, this, void 0);
    this.lexpos += max_res;
    if (def.func) {
      tok = def.func(tok);
      if (tok === void 0) {
        return this.next(ignore_peek);
      }
    }
    this.prev = tok;
    return tok;
  }
};
var parser2 = class _parser2 {
  static {
    __name(this, "parser");
  }
  constructor(lexer4, errfunc) {
    this.lexer = lexer4;
    this.errfunc = errfunc;
    this.start = void 0;
  }
  copy() {
    let ret2 = new _parser2(this.lexer.copy(), this.errfunc);
    ret2.start = this.start;
    return ret2;
  }
  parse(data, err_on_unconsumed) {
    if (err_on_unconsumed === void 0)
      err_on_unconsumed = true;
    if (data !== void 0)
      this.lexer.input(data);
    var ret2 = this.start(this);
    if (err_on_unconsumed && !this.lexer.at_end() && this.lexer.next() !== void 0) {
      this.error(void 0, "parser did not consume entire input");
    }
    return ret2;
  }
  input(data) {
    this.lexer.input(data);
  }
  error(tok, msg) {
    if (msg == void 0)
      msg = "";
    if (tok == void 0)
      var estr = "Parse error at end of input: " + msg;
    else
      estr = "Parse error at line " + (tok.lineno + 1) + ": " + msg;
    var buf = "1| ";
    var ld = this.lexer.lexdata;
    var l2 = 1;
    for (var i2 = 0; i2 < ld.length; i2++) {
      var c = ld[i2];
      if (c == "\n") {
        l2++;
        buf += "\n" + l2 + "| ";
      } else {
        buf += c;
      }
    }
    console.log("------------------");
    console.log(buf);
    console.log("==================");
    console.log(estr);
    if (this.errfunc && !this.errfunc(tok)) {
      return;
    }
    throw new PUTLParseError(estr);
  }
  peek() {
    var tok = this.lexer.peek();
    if (tok != void 0)
      tok.parser = this;
    return tok;
  }
  peek_i(i2) {
    var tok = this.lexer.peek_i(i2);
    if (tok !== void 0)
      tok.parser = this;
    return tok;
  }
  peeknext() {
    return this.peek_i(0);
  }
  next() {
    var tok = this.lexer.next();
    if (tok !== void 0)
      tok.parser = this;
    return tok;
  }
  optional(type2) {
    var tok = this.peek_i(0);
    if (tok && tok.type === type2) {
      this.next();
      return true;
    }
    return false;
  }
  at_end() {
    return this.lexer.at_end();
  }
  expect(type2, msg) {
    var tok = this.next();
    if (msg === void 0)
      msg = type2;
    if (tok !== void 0 && tok.type !== type2) {
      this.error(tok, "Expected " + msg + ", not " + tok.type);
    } else if (tok === void 0) {
      this.error(tok, "Expected " + msg);
    }
    return tok.value;
  }
};
function test_parser() {
  var basic_types = new set([
    "int",
    "float",
    "double",
    "vec2",
    "vec3",
    "vec4",
    "mat4",
    "string"
  ]);
  var reserved_tokens = new set([
    "int",
    "float",
    "double",
    "vec2",
    "vec3",
    "vec4",
    "mat4",
    "string",
    "static_string",
    "array"
  ]);
  function tk3(name2, re, func) {
    return new tokdef(name2, re, func);
  }
  __name(tk3, "tk");
  var tokens3 = [
    tk3("ID", /[a-zA-Z]+[a-zA-Z0-9_]*/, function(t2) {
      if (reserved_tokens.has(t2.value)) {
        t2.type = t2.value.toUpperCase();
      }
      return t2;
    }),
    tk3("OPEN", /\{/),
    tk3("CLOSE", /}/),
    tk3("COLON", /:/),
    tk3("JSCRIPT", /\|/, function(t2) {
      var js = "";
      var lexer4 = t2.lexer;
      while (lexer4.lexpos < lexer4.lexdata.length) {
        var c = lexer4.lexdata[lexer4.lexpos];
        if (c == "\n")
          break;
        js += c;
        lexer4.lexpos++;
      }
      if (js.endsWith(";")) {
        js = js.slice(0, js.length - 1);
        lexer4.lexpos--;
      }
      t2.value = js;
      return t2;
    }),
    tk3("LPARAM", /\(/),
    tk3("RPARAM", /\)/),
    tk3("COMMA", /,/),
    tk3("NUM", /[0-9]/),
    tk3("SEMI", /;/),
    tk3("NEWLINE", /\n/, function(t2) {
      t2.lexer.lineno += 1;
    }),
    tk3("SPACE", / |\t/, function(t2) {
    })
  ];
  for (var rt in reserved_tokens) {
    tokens3.push(tk3(rt.toUpperCase()));
  }
  function errfunc(lexer4) {
    return true;
  }
  __name(errfunc, "errfunc");
  var lex3 = new lexer(tokens3, errfunc);
  console.log("Testing lexical scanner...");
  lex3.input(a);
  var tok;
  while (tok = lex3.next()) {
    console.log(tok.toString());
  }
  var parser5 = new parser5(lex3);
  parser5.input(a);
  function p_Array(p) {
    p.expect("ARRAY");
    p.expect("LPARAM");
    var arraytype = p_Type(p);
    var itername = "";
    if (p.optional("COMMA")) {
      itername = arraytype;
      arraytype = p_Type(p);
    }
    p.expect("RPARAM");
    return { type: "array", data: { type: arraytype, iname: itername } };
  }
  __name(p_Array, "p_Array");
  function p_Type(p) {
    var tok2 = p.peek();
    if (tok2.type == "ID") {
      p.next();
      return { type: "struct", data: '"' + tok2.value + '"' };
    } else if (basic_types.has(tok2.type.toLowerCase())) {
      p.next();
      return { type: tok2.type.toLowerCase() };
    } else if (tok2.type == "ARRAY") {
      return p_Array(p);
    } else {
      p.error(tok2, "invalid type " + tok2.type);
    }
  }
  __name(p_Type, "p_Type");
  function p_Field(p) {
    var field = {};
    console.log("-----", p.peek().type);
    field.name = p.expect("ID", "struct field name");
    p.expect("COLON");
    field.type = p_Type(p);
    field.set = void 0;
    field.get = void 0;
    var tok2 = p.peek();
    if (tok2.type == "JSCRIPT") {
      field.get = tok2.value;
      p.next();
    }
    tok2 = p.peek();
    if (tok2.type == "JSCRIPT") {
      field.set = tok2.value;
      p.next();
    }
    p.expect("SEMI");
    return field;
  }
  __name(p_Field, "p_Field");
  function p_Struct(p) {
    var st = {};
    st.name = p.expect("ID", "struct name");
    st.fields = [];
    p.expect("OPEN");
    while (1) {
      if (p.at_end()) {
        p.error(void 0);
      } else if (p.optional("CLOSE")) {
        break;
      } else {
        st.fields.push(p_Field(p));
      }
    }
    return st;
  }
  __name(p_Struct, "p_Struct");
  var ret2 = p_Struct(parser5);
  console.log(JSON.stringify(ret2));
}
__name(test_parser, "test_parser");

// util/polyfill.js
if (typeof window !== "undefined" && typeof globalThis === "undefined") {
  window.globalThis = window;
} else if (typeof globalThis === void 0 && typeof global !== "undefined") {
  global.globalThis = global;
}
if (Set.prototype.map === void 0) {
  Set.prototype.map = function(func, thisArg) {
    let ret2 = /* @__PURE__ */ new Set();
    let i2 = 0;
    if (thisArg) {
      for (let item of this) {
        ret2.add(func(item, i2++, this));
      }
    } else {
      for (let item of this) {
        ret2.add(func.call(thisArg, item, i2++, this));
      }
    }
    return ret2;
  };
}
if (Set.prototype.filter === void 0) {
  Set.prototype.filter = function(func, thisArg) {
    let ret2 = /* @__PURE__ */ new Set();
    let i2 = 0;
    if (thisArg) {
      for (let item of this) {
        if (func(item, i2++, this)) {
          ret2.add(item);
        }
      }
    } else {
      for (let item of this) {
        if (func.call(thisArg, item, i2++, this)) {
          ret2.add(item);
        }
      }
    }
    return ret2;
  };
}
if (Set.prototype.reduce === void 0) {
  Set.prototype.reduce = function(func, initialVal) {
    let accum = initialVal;
    let i2 = 0;
    for (let item of this) {
      accum = func(accum, item, i2++, this);
    }
    return accum;
  };
}
if (Array.prototype.set === void 0) {
  Array.prototype.set = /* @__PURE__ */ __name(function set3(array, src, dst, count4) {
    src = src === void 0 ? 0 : src;
    dst = dst === void 0 ? 0 : dst;
    count4 = count4 === void 0 ? array.length : count4;
    if (count4 < 0) {
      throw new RangeError("Count must be >= zero");
    }
    let len = Math.min(this.length - dst, array.length - src);
    len = Math.min(len, count4);
    for (let i2 = 0; i2 < len; i2++) {
      this[dst + i2] = array[src + i2];
    }
    return this;
  }, "set");
  if (Float64Array.prototype.set === void 0) {
    Float64Array.prototype.set = Array.prototype.set;
    Float32Array.prototype.set = Array.prototype.set;
    Uint8Array.prototype.set = Array.prototype.set;
    Uint8ClampedArray.prototype.set = Array.prototype.set;
    Int32Array.prototype.set = Array.prototype.set;
    Int16Array.prototype.set = Array.prototype.set;
    Int8Array.prototype.set = Array.prototype.set;
  }
}
if (Array.prototype.reject === void 0) {
  Array.prototype.reject = /* @__PURE__ */ __name(function reject(func) {
    return this.filter((item) => !func(item));
  }, "reject");
}
if (globalThis.Symbol === void 0) {
  globalThis.Symbol = {
    iterator: "$__iterator__$",
    keystr: "$__keystr__$"
  };
} else if (Symbol.keystr === void 0) {
  Symbol.keystr = Symbol("keystr");
}
globalThis.list = /* @__PURE__ */ __name(function list(iter) {
  let ret2 = [];
  if (typeof iter === "string") {
    for (let i2 = 0; i2 < iter.length; i2++) {
      ret2.push(iter[i2]);
    }
    return ret2;
  }
  if (Symbol.iterator in iter) {
    for (let item of iter) {
      ret2.push(item);
    }
  } else {
    iter.forEach(function(item) {
      ret2.push(item);
    }, this);
  }
  return ret2;
}, "list");
if (Math.fract === void 0) {
  Math.fract = /* @__PURE__ */ __name(function fract(f) {
    return f - Math.floor(f);
  }, "fract");
}
if (Math.tent === void 0) {
  Math.tent = /* @__PURE__ */ __name(function tent(f) {
    return 1 - Math.abs(Math.fract(f) - 0.5) * 2;
  }, "tent");
}
if (Math.sign === void 0) {
  Math.sign = /* @__PURE__ */ __name(function sign(f) {
    return (f > 0) * 2 - 1;
  }, "sign");
}
if (Array.prototype.pop_i === void 0) {
  Array.prototype.pop_i = function(idx) {
    if (idx < 0 || idx >= this.length) {
      throw new Error("Index out of range");
    }
    while (idx < this.length) {
      this[idx] = this[idx + 1];
      idx++;
    }
    this.length -= 1;
  };
}
if (Array.prototype.remove === void 0) {
  Array.prototype.remove = function(item, suppress_error) {
    var i2 = this.indexOf(item);
    if (i2 < 0) {
      if (suppress_error)
        console.trace("Warning: item not in array", item);
      else
        throw new Error("Error: item not in array " + item);
      return;
    }
    this.pop_i(i2);
  };
}
if (String.prototype.contains === void 0) {
  String.prototype.contains = function(substr) {
    return String.search(substr) >= 0;
  };
}
String.prototype[Symbol.keystr] = function() {
  return this;
};
Number.prototype[Symbol.keystr] = Boolean.prototype[Symbol.keystr] = function() {
  return "" + this;
};
Array.prototype[Symbol.keystr] = function() {
  let key = "";
  for (let item of this) {
    key += item[Symbol.keystr]() + ":";
  }
  return key;
};

// util/util.js
var silencelog = 0;
function silence() {
  silencelog++;
}
__name(silence, "silence");
function unsilence() {
  silencelog = Math.max(silencelog - 1, 0);
}
__name(unsilence, "unsilence");
function strong() {
  let s = "";
  for (let i2 = 0; i2 < arguments.length; i2++) {
    s += arguments[i2] + " ";
  }
  return termColor2(s, "red");
}
__name(strong, "strong");
function stronglog() {
  let s = "";
  for (let i2 = 0; i2 < arguments.length; i2++) {
    if (i2 > 0) {
      s += " ";
    }
    s += arguments[i2];
  }
  if (!silencelog) {
    console.log(termPrint(strong(s)));
  }
}
__name(stronglog, "stronglog");
function log2() {
  let s = "";
  for (let i2 = 0; i2 < arguments.length; i2++) {
    if (i2 > 0) {
      s += " ";
    }
    s += arguments[i2];
  }
  if (!silencelog) {
    console.log(termPrint(s));
  }
}
__name(log2, "log");
function indent(n2, chr = "  ", color = void 0) {
  let s = "";
  for (let i2 = 0; i2 < n2; i2++) {
    s += chr;
  }
  if (color !== void 0) {
    return termColor2(s, color);
  } else {
    return s;
  }
}
__name(indent, "indent");
var colormap = {
  "black": 30,
  "red": 31,
  "green": 32,
  "yellow": 33,
  "blue": 34,
  "magenta": 35,
  "cyan": 36,
  "white": 37,
  "reset": 0,
  "grey": 2,
  "orange": 202,
  "pink": 198,
  "brown": 314,
  "lightred": 91,
  "peach": 210
};
var termColorMap = {};
for (let k2 in colormap) {
  termColorMap[k2] = colormap[k2];
  termColorMap[colormap[k2]] = k2;
}
function termColor2(s, c) {
  if (typeof s === "symbol") {
    s = s.toString();
  } else {
    s = "" + s;
  }
  if (c in colormap)
    c = colormap[c];
  if (c > 107) {
    let s2 = "\x1B[38;5;" + c + "m";
    return s2 + s + "\x1B[0m";
  }
  return "\x1B[" + c + "m" + s + "\x1B[0m";
}
__name(termColor2, "termColor");
;
function termPrint() {
  let s = "";
  for (let i3 = 0; i3 < arguments.length; i3++) {
    if (i3 > 0) {
      s += " ";
    }
    s += arguments[i3];
  }
  let re1a = /\u001b\[[1-9][0-9]?m/;
  let re1b = /\u001b\[[1-9][0-9];[0-9][0-9]?;[0-9]+m/;
  let re2 = /\u001b\[0m/;
  let endtag = "\x1B[0m";
  function tok(s3, type2) {
    return {
      type: type2,
      value: s3
    };
  }
  __name(tok, "tok");
  let tokdef3 = [
    [re1a, "start"],
    [re1b, "start"],
    [re2, "end"]
  ];
  let s2 = s;
  let i2 = 0;
  let tokens3 = [];
  while (s2.length > 0) {
    let ok = false;
    let mintk = void 0, mini = void 0;
    let minslice = void 0, mintype = void 0;
    for (let tk3 of tokdef3) {
      let i3 = s2.search(tk3[0]);
      if (i3 >= 0 && (mini === void 0 || i3 < mini)) {
        minslice = s2.slice(i3, s2.length).match(tk3[0])[0];
        mini = i3;
        mintype = tk3[1];
        mintk = tk3;
        ok = true;
      }
    }
    if (!ok) {
      break;
    }
    if (mini > 0) {
      let chunk = s2.slice(0, mini);
      tokens3.push(tok(chunk, "chunk"));
    }
    s2 = s2.slice(mini + minslice.length, s2.length);
    let t2 = tok(minslice, mintype);
    tokens3.push(t2);
  }
  if (s2.length > 0) {
    tokens3.push(tok(s2, "chunk"));
  }
  let stack = [];
  let cur;
  let out = "";
  for (let t2 of tokens3) {
    if (t2.type === "chunk") {
      out += t2.value;
    } else if (t2.type === "start") {
      stack.push(cur);
      cur = t2.value;
      out += t2.value;
    } else if (t2.type === "end") {
      cur = stack.pop();
      if (cur) {
        out += cur;
      } else {
        out += endtag;
      }
    }
  }
  return out;
}
__name(termPrint, "termPrint");
globalThis.termColor = termColor2;
var MovingAvg = class extends Array {
  static {
    __name(this, "MovingAvg");
  }
  constructor(size = 64) {
    super();
    this.length = size;
    this.cur = 0;
    this.used = 0;
    this.sum = 0;
  }
  add(val2) {
    if (this.used < this.length) {
      this[this.cur] = val2;
      this.used++;
    } else {
      this.sum -= this[this.cur];
      this[this.cur] = val2;
    }
    this.sum += val2;
    this.cur = (this.cur + 1) % this.length;
    return this.sample();
  }
  sample() {
    return this.used ? this.sum / this.used : 0;
  }
};
var EmptySlot = {};
function getClassParent(cls) {
  let p = cls.prototype;
  if (p)
    p = p.__proto__;
  if (p)
    p = p.constructor;
  return p;
}
__name(getClassParent, "getClassParent");
function getAllKeys(obj) {
  let keys2 = /* @__PURE__ */ new Set();
  if (typeof obj !== "object" && typeof obj !== "function") {
    throw new Error("must pass an object ot getAllKeys; object was: " + obj);
  }
  let p;
  while (p && p !== Object) {
    for (let k2 in Object.getOwnPropertyDescriptors(obj)) {
      if (k2 === "__proto__")
        continue;
      keys2.add(k2);
    }
    for (let k2 of Object.getOwnPropertySymbols(obj)) {
      keys2.add(k2);
    }
    p = p.__proto__;
  }
  let cls = obj.constructor;
  if (!cls)
    return keys2;
  while (cls) {
    let proto = cls.prototype;
    if (!proto) {
      cls = getClassParent(cls);
      continue;
    }
    for (let k2 in proto) {
      keys2.add(k2);
    }
    for (let k2 in Object.getOwnPropertyDescriptors(proto)) {
      keys2.add(k2);
    }
    cls = getClassParent(cls);
  }
  return keys2;
}
__name(getAllKeys, "getAllKeys");
function btoa2(buf) {
  if (buf instanceof ArrayBuffer) {
    buf = new Uint8Array(buf);
  }
  if (typeof buf == "string" || buf instanceof String) {
    return globalThis.btoa(buf);
  }
  var ret2 = "";
  for (var i2 = 0; i2 < buf.length; i2++) {
    ret2 += String.fromCharCode(buf[i2]);
  }
  return btoa2(ret2);
}
__name(btoa2, "btoa");
;
function atob2(buf) {
  let data = globalThis.atob(buf);
  let ret2 = [];
  for (let i2 = 0; i2 < data.length; i2++) {
    ret2.push(data.charCodeAt(i2));
  }
  return new Uint8Array(ret2);
}
__name(atob2, "atob");
function time_ms() {
  if (globalThis.performance)
    return globalThis.performance.now();
  else
    throw new Error("no performance.now");
}
__name(time_ms, "time_ms");
function color2css(c) {
  var ret2 = c.length === 3 ? "rgb(" : "rgba(";
  for (var i2 = 0; i2 < 3; i2++) {
    if (i2 > 0)
      ret2 += ",";
    ret2 += ~~(c[i2] * 255);
  }
  if (c.length === 4)
    ret2 += "," + c[3];
  ret2 += ")";
  return ret2;
}
__name(color2css, "color2css");
var cachering = class _cachering extends Array {
  static {
    __name(this, "cachering");
  }
  constructor(func, size, isprivate = false) {
    super();
    this.private = isprivate;
    this.cur = 0;
    for (let i2 = 0; i2 < size; i2++) {
      this.push(func());
    }
  }
  static fromConstructor(cls, size, isprivate = false) {
    var func = /* @__PURE__ */ __name(function() {
      return new cls();
    }, "func");
    return new _cachering(func, size, isprivate);
  }
  next() {
    if (debug_cacherings) {
      this.gen++;
    }
    var ret2 = this[this.cur];
    this.cur = (this.cur + 1) % this.length;
    return ret2;
  }
};
var SetIter = class {
  static {
    __name(this, "SetIter");
  }
  constructor(set3) {
    this.set = set3;
    this.i = 0;
    this.ret = { done: false, value: void 0 };
  }
  [Symbol.iterator]() {
    return this;
  }
  next() {
    var ret2 = this.ret;
    while (this.i < this.set.items.length && this.set.items[this.i] === EmptySlot) {
      this.i++;
    }
    if (this.i >= this.set.items.length) {
      ret2.done = true;
      ret2.value = void 0;
      return ret2;
    }
    ret2.value = this.set.items[this.i++];
    return ret2;
  }
};
var set2 = class _set {
  static {
    __name(this, "set");
  }
  constructor(input) {
    this.items = [];
    this.keys = {};
    this.freelist = [];
    this.length = 0;
    if (typeof input == "string") {
      for (let i2 = 0; i2 < input.length; i2++) {
        this.add(input[i2]);
      }
      return;
    }
    if (input !== void 0) {
      if (Symbol.iterator in input) {
        for (let item of input) {
          this.add(item);
        }
      } else if (input.forEach) {
        input.forEach(function(item) {
          this.add(item);
        }, this);
      }
    }
  }
  [Symbol.iterator]() {
    return new SetIter(this);
  }
  equals(setb) {
    for (let item of this) {
      if (!setb.has(item)) {
        return false;
      }
    }
    for (let item of setb) {
      if (!this.has(item)) {
        return false;
      }
    }
    return true;
  }
  clear() {
    this.items.length = 0;
    this.keys = {};
    this.freelist.length = 0;
    this.length = 0;
    return this;
  }
  filter(f, thisvar) {
    let i2 = 0;
    let ret2 = new _set();
    for (let item of this) {
      if (f.call(thisvar, item, i2++, this)) {
        ret2.add(item);
      }
    }
    return ret2;
  }
  map(f, thisvar) {
    let ret2 = new _set();
    let i2 = 0;
    for (let item of this) {
      ret2.add(f.call(thisvar, item, i2++, this));
    }
    return ret2;
  }
  reduce(f, initial) {
    if (initial === void 0) {
      for (let item of this) {
        initial = item;
        break;
      }
    }
    let i2 = 0;
    for (let item of this) {
      initial = f(initial, item, i2++, this);
    }
    return initial;
  }
  copy() {
    let ret2 = new _set();
    for (let item of this) {
      ret2.add(item);
    }
    return ret2;
  }
  add(item) {
    let key = item[Symbol.keystr]();
    if (key in this.keys)
      return;
    if (this.freelist.length > 0) {
      let i2 = this.freelist.pop();
      this.keys[key] = i2;
      this.items[i2] = item;
    } else {
      let i2 = this.items.length;
      this.keys[key] = i2;
      this.items.push(item);
    }
    this.length++;
  }
  get size() {
    return this.length;
  }
  delete(item, ignore_existence = true) {
    this.remove(item, ignore_existence);
  }
  remove(item, ignore_existence) {
    let key = item[Symbol.keystr]();
    if (!(key in this.keys)) {
      if (!ignore_existence) {
        console.warn("Warning, item", item, "is not in set");
      }
      return;
    }
    let i2 = this.keys[key];
    this.freelist.push(i2);
    this.items[i2] = EmptySlot;
    delete this.keys[key];
    this.length--;
  }
  has(item) {
    return item[Symbol.keystr]() in this.keys;
  }
  forEach(func, thisvar) {
    for (let i2 = 0; i2 < this.items.length; i2++) {
      let item = this.items[i2];
      if (item === EmptySlot)
        continue;
      thisvar !== void 0 ? func.call(thisvar, item) : func(item);
    }
  }
};
var HashIter = class {
  static {
    __name(this, "HashIter");
  }
  constructor(hash) {
    this.hash = hash;
    this.i = 0;
    this.ret = { done: false, value: void 0 };
  }
  next() {
    var items = this.hash._items;
    if (this.i >= items.length) {
      this.ret.done = true;
      this.ret.value = void 0;
      return this.ret;
    }
    do {
      this.i += 2;
    } while (this.i < items.length && items[i] === _hash_null);
    return this.ret;
  }
};
function get_callstack(err) {
  var callstack = [];
  var isCallstackPopulated = false;
  var err_was_undefined = err == void 0;
  if (err === void 0) {
    try {
      _idontexist.idontexist += 0;
    } catch (err1) {
      err = err1;
    }
  }
  if (err !== void 0) {
    if (err.stack) {
      var lines3 = err.stack.split("\n");
      var len = lines3.length;
      for (var i2 = 0; i2 < len; i2++) {
        if (1) {
          lines3[i2] = lines3[i2].replace(/@http\:\/\/.*\//, "|");
          var l2 = lines3[i2].split("|");
          lines3[i2] = l2[1] + ": " + l2[0];
          lines3[i2] = lines3[i2].trim();
          callstack.push(lines3[i2]);
        }
      }
      if (err_was_undefined) {
      }
      isCallstackPopulated = true;
    } else if (globalThis.opera && e.message) {
      var lines3 = err.message.split("\n");
      var len = lines3.length;
      for (var i2 = 0; i2 < len; i2++) {
        if (lines3[i2].match(/^\s*[A-Za-z0-9\-_\$]+\(/)) {
          var entry = lines3[i2];
          if (lines3[i2 + 1]) {
            entry += " at " + lines3[i2 + 1];
            i2++;
          }
          callstack.push(entry);
        }
      }
      if (err_was_undefined) {
        callstack.shift();
      }
      isCallstackPopulated = true;
    }
  }
  var limit = 24;
  if (!isCallstackPopulated) {
    var currentFunction = arguments.callee.caller;
    var i2 = 0;
    while (currentFunction && i2 < 24) {
      var fn = currentFunction.toString();
      var fname = fn.substring(fn.indexOf("function") + 8, fn.indexOf("")) || "anonymous";
      callstack.push(fname);
      currentFunction = currentFunction.caller;
      i2++;
    }
  }
  return callstack;
}
__name(get_callstack, "get_callstack");
function print_stack(err) {
  try {
    var cs = get_callstack(err);
  } catch (err2) {
    console.warn("Could not fetch call stack.");
    return;
  }
  console.warn("Callstack:");
  for (var i2 = 0; i2 < cs.length; i2++) {
    console.log(cs[i2]);
  }
}
__name(print_stack, "print_stack");
function _int32(x) {
  return ~~((1 << 30) - 1 & ~~x);
}
__name(_int32, "_int32");
var MersenneRandom = class {
  static {
    __name(this, "MersenneRandom");
  }
  constructor(seed2) {
    this.index = 624;
    this.mt = new Uint32Array(624);
    this.seed(seed2);
  }
  random() {
    return this.extract_number() / (1 << 30);
  }
  seed(seed2) {
    seed2 = ~~(seed2 * 8192);
    this.index = 624;
    this.mt.fill(0, 0, this.mt.length);
    this.mt[0] = seed2;
    for (var i2 = 1; i2 < 624; i2++) {
      this.mt[i2] = _int32(
        1812433253 * (this.mt[i2 - 1] ^ this.mt[i2 - 1] >> 30) + i2
      );
    }
  }
  extract_number() {
    if (this.index >= 624)
      this.twist();
    var y = this.mt[this.index];
    y = y ^ y >> 11;
    y = y ^ y << 7 & 2636928640;
    y = y ^ y << 15 & 4022730752;
    y = y ^ y >> 18;
    this.index = this.index + 1;
    return _int32(y);
  }
  twist() {
    for (var i2 = 0; i2 < 624; i2++) {
      var y = _int32((this.mt[i2] & 2147483648) + (this.mt[(i2 + 1) % 624] & 2147483647));
      this.mt[i2] = this.mt[(i2 + 397) % 624] ^ y >> 1;
      if (y % 2 != 0)
        this.mt[i2] = this.mt[i2] ^ 2567483615;
    }
    this.index = 0;
  }
};
var _mt = new MersenneRandom(0);
function random() {
  return _mt.extract_number() / (1 << 30);
}
__name(random, "random");
function seed(n2) {
  _mt.seed(n2);
}
__name(seed, "seed");
function strhash(str) {
  var hash = 0;
  for (var i2 = 0; i2 < str.length; i2++) {
    var ch = str.charCodeAt(i2);
    hash = hash < 0 ? -hash : hash;
    hash ^= ch * 524287 + 4323543 & (1 << 19) - 1;
  }
  return hash;
}
__name(strhash, "strhash");
var digestcache;
var HashDigest = class {
  static {
    __name(this, "HashDigest");
  }
  constructor() {
    this.i = 0;
    this.hash = 0;
  }
  static cachedDigest() {
    return digestcache.next().reset();
  }
  reset() {
    this.i = 0;
    this.hash = 0;
    return this;
  }
  get() {
    return this.hash;
  }
  add(v) {
    if (v >= -5 && v <= 5) {
      v *= 32;
    }
    this.i = (this.i + ~~v) * 1103515245 + 12345 & (1 << 29) - 1;
    let v2 = v * 1024 * 1024 & (1 << 29) - 1;
    v = v | v2;
    v = ~~v;
    this.hash ^= v ^ this.i;
  }
};
var NullItem = {};
var MapIter = class {
  static {
    __name(this, "MapIter");
  }
  constructor(ownermap) {
    this.ret = { done: true, value: void 0 };
    this.value = new Array(2);
    this.i = 0;
    this.map = ownermap;
    this.done = true;
  }
  finish() {
    if (!this.done) {
      this.done = true;
      this.map.itercur--;
    }
  }
  next() {
    let ret2 = this.ret;
    let i2 = this.i;
    let map2 = this.map, list2 = map2._list;
    while (i2 < list2.length && list2[i2] === NullItem) {
      i2 += 2;
    }
    if (i2 >= list2.length) {
      ret2.done = true;
      ret2.value = void 0;
      this.finish();
      return ret2;
    }
    this.i = i2 + 2;
    ret2.value = this.value;
    ret2.value[0] = list2[i2];
    ret2.value[1] = list2[i2 + 1];
    ret2.done = false;
    return ret2;
  }
  return() {
    this.finish();
    return this.ret;
  }
  reset() {
    this.i = 0;
    this.value[0] = void 0;
    this.value[1] = void 0;
    this.done = false;
    return this;
  }
};
var map = class {
  static {
    __name(this, "map");
  }
  constructor() {
    this._items = {};
    this._list = [];
    this.size = 0;
    this.iterstack = new Array(8);
    this.itercur = 0;
    for (let i2 = 0; i2 < this.iterstack.length; i2++) {
      this.iterstack[i2] = new MapIter(this);
    }
    this.freelist = [];
  }
  has(key) {
    return key[Symbol.keystr]() in this._items;
  }
  set(key, v) {
    let k2 = key[Symbol.keystr]();
    let i2 = this._items[k2];
    if (i2 === void 0) {
      if (this.freelist.length > 0) {
        i2 = this.freelist.pop();
      } else {
        i2 = this._list.length;
        this._list.length += 2;
      }
      this.size++;
    }
    this._list[i2] = key;
    this._list[i2 + 1] = v;
    this._items[k2] = i2;
  }
  keys() {
    let this2 = this;
    return function* () {
      for (let [key, val2] of this2) {
        yield key;
      }
    }();
  }
  values() {
    let this2 = this;
    return function* () {
      for (let [key, val2] of this2) {
        yield val2;
      }
    }();
  }
  get(k2) {
    k2 = k2[Symbol.keystr]();
    let i2 = this._items[k2];
    if (i2 !== void 0) {
      return this._list[i2 + 1];
    }
  }
  delete(k2) {
    k2 = k2[Symbol.keystr]();
    if (!(k2 in this._items)) {
      return false;
    }
    let i2 = this._items[k2];
    this.freelist.push(i2);
    this._list[i2] = NullItem;
    this._list[i2 + 1] = NullItem;
    delete this._items[k2];
    this.size--;
    return true;
  }
  [Symbol.iterator]() {
    let ret2 = this.iterstack[this.itercur].reset();
    this.itercur++;
    if (this.itercur === this.iterstack.length) {
      this.iterstack.push(new MapIter(this));
    }
    return ret2;
  }
};
function validateId(id) {
  let bad = typeof id !== "number";
  bad = bad || id !== ~~id;
  bad = bad || isNaN(id);
  if (bad) {
    throw new Error("bad number " + id);
  }
  return bad;
}
__name(validateId, "validateId");
var UndefinedTag = {};
var IDMap = class extends Array {
  static {
    __name(this, "IDMap");
  }
  constructor() {
    super();
    this._keys = /* @__PURE__ */ new Set();
    this.size = 0;
  }
  has(id) {
    validateId(id);
    if (id < 0 || id >= this.length) {
      return false;
    }
    return this[id] !== void 0;
  }
  set(id, val2) {
    validateId(id);
    if (id < 0) {
      console.warn("got -1 id in IDMap");
      return;
    }
    if (id >= this.length) {
      this.length = id + 1;
    }
    if (val2 === void 0) {
      val2 = UndefinedTag;
    }
    let ret2 = false;
    if (this[id] === void 0) {
      this.size++;
      this._keys.add(id);
      ret2 = true;
    }
    this[id] = val2;
    return ret2;
  }
  /* we allow -1, which always returns undefined*/
  get(id) {
    validateId(id);
    if (id === -1) {
      return void 0;
    } else if (id < 0) {
      console.warn("id was negative");
      return void 0;
    }
    let ret2 = id < this.length ? this[id] : void 0;
    ret2 = ret2 === UndefinedTag ? void 0 : ret2;
    return ret2;
  }
  delete(id) {
    if (!this.has(id)) {
      return false;
    }
    this._keys.remove(id);
    this[id] = void 0;
    this.size--;
    return true;
  }
  keys() {
    let this2 = this;
    return function* () {
      for (let id of this2._keys) {
        yield id;
      }
    }();
  }
  values() {
    let this2 = this;
    return function* () {
      for (let id of this2._keys) {
        yield this2[id];
      }
    }();
  }
  [Symbol.iterator]() {
    let this2 = this;
    let iteritem = [0, 0];
    return function* () {
      for (let id of this2._keys) {
        iteritem[0] = id;
        iteritem[1] = this2[id];
        if (iteritem[1] === UndefinedTag) {
          iteritem[1] = void 0;
        }
        yield iteritem;
      }
    }();
  }
};

// core/types.js
var VarTypeClasses = [];
var VarType = class _VarType {
  static {
    __name(this, "VarType");
  }
  constructor(type2) {
    this.type = type2;
  }
  static fromJSON(json) {
    for (let cls of VarTypeClasses) {
      if (cls.name === json.Class) {
        let ret2 = new cls();
        ret2.loadJSON(json);
        return ret2;
      }
    }
    throw new Error("unknown vardecl class for " + json);
  }
  static register(cls) {
    VarTypeClasses.push(cls);
  }
  toJSON() {
    return {
      type: this.type,
      Class: this.constructor.name
    };
  }
  loadJSON(json) {
    if (typeof json.type === "object") {
      this.type = _VarType.fromJSON(json.type);
    } else {
      this.type = json.type;
    }
    return this;
  }
  toString() {
    return `VarType(${this.type})`;
  }
  makeZero() {
    return 0;
  }
  getComponents() {
    return 1;
  }
  getBaseName() {
    return this.type;
  }
  getTypeName() {
    return "" + this.type;
  }
  getTypeNameSafe() {
    if (typeof this.type !== "string") {
      return this.type.getTypeNameSafe();
    }
    let s = this.getTypeName();
    s = s.replace(/[\[\]\(\)]/g, "_");
    return s;
  }
};
VarType.register(VarType);
var ArrayType = class extends VarType {
  static {
    __name(this, "ArrayType");
  }
  constructor(type2, size, alias = "") {
    super();
    if (typeof type2 === "string") {
      type2 = new VarType(type2);
    }
    this.alias = alias;
    this.type = type2;
    this.size = size;
  }
  toJSON() {
    return Object.assign(super.toJSON(), {
      alias: this.alias,
      size: this.size
    });
  }
  loadJSON(json) {
    super.loadJSON(json);
    this.alias = json.alias;
    this.size = json.size;
  }
  getComponents() {
    return this.size;
  }
  makeZero() {
    let ret2 = [];
    for (let i2 = 0; i2 < this.size; i2++) {
      ret2.push(this.type.makeZero());
    }
    return ret2;
  }
  getTypeName() {
    if (this.alias.length > 0) {
      return this.alias;
    }
    return `${this.type.getTypeName()}[${this.size}]`;
  }
  getBaseName() {
    return typeof this.type === "string" ? this.type : this.type.getBaseName();
  }
  getTypeNameSafe() {
    if (this.alias) {
      return this.alias;
    }
    return `${this.type.getTypeNameSafe()}_${this.size}_`;
  }
  toString() {
    return `ArrayType(${this.type}, ${this.size}, ${this.alias})`;
  }
};
var DynamicArrayType = class extends ArrayType {
  static {
    __name(this, "DynamicArrayType");
  }
  constructor(type2, alias = "") {
    super();
    this.alias = alias;
    this.type = type2;
  }
  getComponents() {
    return 1e5;
  }
  makeZero() {
    return [];
  }
  getTypeName() {
    if (this.alias.length > 0) {
      return this.alias;
    }
    return `${this.type.getTypeName()}[]`;
  }
  getBaseName() {
    return typeof this.type === "string" ? this.type : this.type.getBaseName();
  }
  toString() {
    return `ArrayType(${this.type}, ${this.alias})`;
  }
};
VarType.register(ArrayType);

// core/state.js
var opnames = {
  "*": "mul",
  "/": "div",
  "-": "sub",
  "+": "add",
  "%": "mod",
  "!=": "nequals",
  "==": "equals",
  ">=": "gequals",
  "<=": "lequals",
  ">": "greater",
  "<": "less",
  "^": "bxor",
  "&": "band",
  "|": "bor",
  "+=": "assign_plus",
  "-=": "assign_minus",
  "*=": "assign_mul",
  "/=": "assign_div",
  "&=": "assign_band",
  "|=": "assign_bor",
  "^=": "assign_bxor"
};
function exit2(msg) {
  if (typeof process !== "undefined" && process.exit) {
    process.exit(-1);
  } else {
    throw new PUTLParseError(msg);
  }
}
__name(exit2, "exit");
function formatLines(s, line = 0, lexpos = -1, col, count4 = 5) {
  s = s.split("\n");
  let out = "";
  let maxline = Math.ceil(Math.log(s.length) / Math.log(10));
  let start = Math.max(line - 2, 0);
  let end = Math.min(line + count4, s.length);
  for (let i2 = start; i2 < end; i2++) {
    let l2 = s[i2];
    let si = "" + (i2 + 1);
    while (si.length < maxline) {
      si = " " + si;
    }
    if (i2 === line) {
      let l22 = "";
      for (let j = 0; j < l2.length; j++) {
        let c = l2[j];
        if (j >= col - 2 && j <= col + 2) {
          c = termColor2(c, "red");
        }
        l22 += c;
      }
      l2 = l22;
    }
    l2 = termPrint(l2);
    l2 = `  ${si}: ${l2}`;
    out += l2 + "\n";
  }
  return out;
}
__name(formatLines, "formatLines");
var castFuncs = /* @__PURE__ */ new Set(["float", "int", "bool"]);
function isBrowser() {
  if (typeof window !== "undefined") {
    return window.navigator && window.document;
  } else if (typeof self !== "undefined") {
    return true;
  }
  return false;
}
__name(isBrowser, "isBrowser");
var ParseState = class _ParseState {
  static {
    __name(this, "ParseState");
  }
  constructor(source, filename2 = "(anonymous)", parser5, preprocessed = "") {
    this.parser = void 0;
    this.lexer = void 0;
    this.throwError = isBrowser();
    this.temp_idgen = 0;
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
    this.filename = filename2;
    this.builtinFuncs = /* @__PURE__ */ new Set([
      "cos",
      "sin",
      "fract",
      "abs",
      "floor",
      "vec3",
      "vec2",
      "vec4",
      "mat4",
      "mat3",
      "float",
      "int",
      "sqrt",
      "log",
      "pow",
      "exp",
      "acos",
      "asin",
      "tan",
      "atan",
      "atan2",
      "normalize",
      "dot",
      "cross",
      "reflect",
      "step",
      "smoothstep",
      "int",
      "bool",
      "trunc"
    ]);
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
  newTempId() {
    return `$tmp${this.temp_idgen++}`;
  }
  placeVarDecl(n2, type2, name2 = this.newTempId()) {
    let ASTNode2 = n2.constructor;
    let v = new ASTNode2("VarDecl");
    v.value = name2;
    type2 = this.resolveType(type2);
    if (!type2) {
      this.error(n2, "Unknown type " + arguments[1]);
    }
    let tn = new ASTNode2("VarType");
    tn.value = type2;
    v.push(tn);
    if (n2.type === "StatementList") {
      n2.prepend(n2);
      return v;
    }
    let p = n2;
    let lastp = p;
    while (p) {
      if (p.type === "StatementList") {
        p.insert(p.indexOf(lastp), v);
        return v;
      }
      lastp = p;
      p = p.parent;
    }
    this.error(n2, "Failed to place variable declaration");
  }
  addPolyFunc(name2, rtype, args2, type2) {
    if (type2 === "") {
      type2 = this.getType(type2);
    }
    if (rtype === "") {
      rtype = type2;
    }
    if (typeof name2 === "object") {
      if (name2.constructor.name === "ASTNode") {
        if (name2.type === "Ident") {
          name2 = name2.value;
        } else if (name2.type === "VarType") {
          name2 = name2.value.getTypeNameSafe();
        }
      } else if (name2 instanceof VarType) {
        name2 = name2.getTypeNameSafe();
      }
    }
    for (let i2 = 0; i2 < args2.length; i2++) {
      if (args2[i2] === "") {
        args2[i2] = type2;
      }
    }
    rtype = this.resolveType(rtype);
    let key = this.buildPolyKey(name2, rtype, args2, type2);
    this.poly_keymap[key] = {
      name: name2,
      args: args2,
      type: rtype,
      key
    };
    if (!(name2 in this.poly_namemap)) {
      this.poly_namemap[name2] = /* @__PURE__ */ new Set();
    }
    this.poly_namemap[name2].add({
      type: rtype,
      args: args2,
      key,
      name: name2
    });
    this.addFunc(name2, rtype, args2, key);
  }
  addFunc(name2, rtype, args2, key = name2) {
    args2 = args2.filter((f) => typeof f === "string" ? this.getType(f) : f);
    if (typeof type === "string") {
      rtype = this.getType(name2);
    }
    this.functions[key] = {
      type: rtype,
      args: args2,
      name: name2,
      key
    };
  }
  copy() {
    let p = new _ParseState(this.source, this.filename, void 0, this.preprocessed);
    p.parser = this.parser ? this.parser.copy() : void 0;
    p.lexer = this.parser ? this.parser.lexer : void 0;
    p.scope = Object.assign({}, this.scope);
    p.localScope = Object.assign({}, this.localScope);
    p.scopestack = this.scopestack.map((f) => Object.assign({}, f));
    p.types = Object.assign({}, this.types);
    p.inputs = Object.assign({}, this.inputs);
    p.outputs = Object.assign({}, this.outputs);
    p.uniforms = Object.assign({}, this.uniforms);
    p.filename = this.filename;
    p.source = this.source;
    return p;
  }
  buildPolyKey(name2, rtype, args2, type2) {
    if (type2 && typeof type2 === "string") {
      type2 = this.getType(type2);
    }
    if (typeof rtype === "string") {
      rtype = rtype === "" ? type2 : this.getType(rtype);
    }
    if (typeof name2 === "object") {
      if (name2.constructor.name === "ASTNode") {
        if (name2.type === "VarType") {
          name2 = name2.value;
        } else if (name2.type === "Ident") {
          name2 = name2.value;
        } else {
          this.error(name2, "Bad type node");
        }
      }
      if (typeof name2 === "object" && name2 instanceof VarType) {
        name2 = name2.getTypeNameSafe();
      }
    }
    let key = `_$_${name2}_${rtype.getTypeNameSafe()}_`;
    let t2 = rtype.getTypeNameSafe();
    let nonfloat = !castFuncs.has(t2);
    for (let i2 = 0; i2 < args2.length; i2++) {
      if (typeof args2[i2] === "string") {
        if (args2[i2] === "") {
          args2[i2] = type2;
        } else {
          args2[i2] = this.getType(args2[i2]);
        }
      }
      let tname = args2[i2].getTypeNameSafe();
      nonfloat = nonfloat || !castFuncs.has(tname);
      key += tname;
    }
    if (!nonfloat && !this.hasType(name2)) {
    }
    return key;
  }
  resetScopeStack() {
    this.scopestack.length = 0;
    this.localScope = {};
    this.scope = {};
    let lists = [this.inputs, this.outputs, this.uniforms];
    for (let list2 of lists) {
      for (let k2 in list2) {
        this.setScope(k2, list2[k2]);
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
    let i2 = this.addType(new VarType("int"), "int");
    let b = this.addType(new VarType("bool"), "bool");
    let v2 = this.addType(new ArrayType(f, 2, "vec2"), "vec2");
    let v3 = this.addType(new ArrayType(f, 3, "vec3"), "vec3");
    let v4 = this.addType(new ArrayType(f, 4, "vec4"), "vec4");
    let m3 = this.addType(new ArrayType(v3, 3, "mat3"), "mat3");
    let m4 = this.addType(new ArrayType(v4, 4, "mat4"), "mat4");
    let keys2 = [
      "",
      "float",
      "vec2",
      "vec3",
      "vec4"
    ];
    let sizes = {
      "float": 1,
      "int": 1,
      "bool": 1,
      "vec2": 2,
      "vec3": 3,
      "vec4": 4
    };
    let out = [];
    let visit3 = /* @__PURE__ */ new Set();
    let push = /* @__PURE__ */ __name((list2) => {
      let listkey = JSON.stringify(list2);
      if (!visit3.has(listkey)) {
        visit3.add(listkey);
        out.push(list2);
      }
    }, "push");
    let getsize = /* @__PURE__ */ __name((f2) => {
      let size = 0;
      for (let item of f2) {
        size += sizes[item];
      }
      return size;
    }, "getsize");
    let rec = /* @__PURE__ */ __name((a2, size = a2, lst = [], depth = 0) => {
      if (a2 <= 0 || a2 > size) {
        return [];
      }
      if (depth > size) {
        return [keys2[a2]];
      }
      if (getsize(lst) === size) {
        push(lst);
      }
      for (let i3 = 1; i3 <= size; i3++) {
        let lst2 = lst.concat([keys2[i3]]);
        rec(i3, size, lst2, depth + 1);
      }
    }, "rec");
    let constructors = {};
    for (let i3 = 1; i3 <= 4; i3++) {
      out.length = 0;
      rec(i3);
      let key = keys2[i3];
      key = this.getType(key);
      for (let args2 of out) {
        let key2 = this.buildPolyKey(key, key, args2, key);
        this.addPolyFunc(key, key, args2, key);
        constructors[key2] = [keys2[i3], args2];
      }
    }
    this.constructors = constructors;
    for (let i3 = 2; i3 <= 4; i3++) {
      let key = "vec" + i3;
      this.addPolyFunc("normalize", "", ["", ""], key);
      this.addPolyFunc("dot", "float", ["", ""], key);
      this.addPolyFunc("cross", "", ["", ""], key);
    }
    this.addPolyFunc("atan2", "float", ["float", "float"], "float");
    for (let i3 = 0; i3 < 2; i3++) {
      let key = i3 ? "mat4" : "mat3";
      this.addPolyFunc("invert", "", [""], key);
      this.addPolyFunc("transpose", "", [""], key);
    }
    for (let key of keys2) {
      if (key === "") {
        continue;
      }
      this.addPolyFunc("exp", "", [""], key);
      this.addPolyFunc("abs", "", [""], key);
      this.addPolyFunc("min", "", ["", ""], key);
      this.addPolyFunc("max", "", ["", ""], key);
      this.addPolyFunc("fract", "", [""], key);
      this.addPolyFunc("step", "", ["", ""], key);
      this.addPolyFunc("pow", "", ["", ""], key);
      this.addPolyFunc("sin", "", [""], key);
      this.addPolyFunc("cos", "", [""], key);
      this.addPolyFunc("asin", "", [""], key);
      this.addPolyFunc("acos", "", [""], key);
      this.addPolyFunc("atan", "", [""], key);
      this.addPolyFunc("tan", "", [""], key);
      this.addPolyFunc("floor", "", [""], key);
      this.addPolyFunc("ceil", "", [""], key);
      this.addPolyFunc("mod", "", [""], key);
      this.addPolyFunc("sqrt", "", [""], key);
      this.addPolyFunc("pow", "", [""], key);
      this.addPolyFunc("log", "", [""], key);
    }
    this.addPolyFunc("trunc", "int", ["int"], "int");
    return this;
  }
  error(node2, msg) {
    if (!node2) {
      console.error(`
Error: ${msg}`);
    } else {
      console.warn(this);
      console.warn(formatLines(this.source, node2.line, node2.lexpos, node2.col, 45));
      let s = `
Error: ${this.filename}:${node2.line + 1}: ${msg}`;
      console.error(s + "\n");
    }
    if (this.throwError) {
      throw new Error("Error: " + msg);
    } else {
      exit2(-1);
    }
  }
  getType(name2) {
    return this.types[name2];
  }
  setReturnType(t2) {
    this.setScope("$__return__$", t2);
  }
  getReturnType(t2) {
    return this.getScope("$__return__$");
  }
  setScope(k2, v) {
    this.localScope[k2] = v;
    this.scope[k2] = v;
  }
  resolveType(t2) {
    if (typeof t2 === "string") {
      t2 = this.getType(t2);
    }
    if (!(t2 instanceof VarType)) {
      if (typeof t2 === "object" && t2.type === "VarType") {
        t2 = t2.value;
      }
      if (typeof t2 === "object" && t2.type === "Ident") {
        t2 = t2.value;
      }
    }
    if (typeof t2 === "object" && t2 instanceof VarType) {
      let name2 = t2.getTypeName();
      if (!(name2 in this.types)) {
        this.error(arguments[0], "Unknown type " + name2);
      }
      let t22 = this.types[name2];
      if (t22 instanceof ArrayType && !(t2 instanceof ArrayType)) {
        return t22;
      }
      return t2;
    }
    if (typeof t2 === "object" && t2.type === "VarRef") {
      let vref = t2;
      if (vref[0] instanceof ArrayType) {
        return this.resolveType(vref[0].type);
      } else {
        return this.resolveType(vref[0]);
      }
    }
  }
  typesEqual(a2, b) {
    if (a2 === void 0 || b === void 0) {
      console.log("A:" + a2, "B:" + b);
      throw new Error("undefined arguments to typesEqual");
    }
    a2 = this.resolveType(a2);
    b = this.resolveType(b);
    if (!a2) {
      console.log("" + a2);
      this.error(void 0, "bad type " + arguments[0]);
    }
    if (!b) {
      console.log("" + b);
      this.error(void 0, "bad type " + arguments[1]);
    }
    if (!a2 || !b) {
      return false;
    }
    return a2.getTypeName() === b.getTypeName();
  }
  getScope(k2) {
    return this.resolveType(this.scope[k2]);
  }
  hasType(name2) {
    return name2 in this.types;
  }
  addType(type2, name2) {
    this.types[name2] = type2;
    return type2;
  }
  pushScope() {
    this.scopestack.push([this.scope, this.localScope]);
    this.localScope = {};
    this.scope = Object.assign({}, this.scope);
  }
  popScope() {
    [this.scope, this.localScope] = this.scopestack.pop();
  }
};
var statestack = [];
var state = new ParseState();
function pushParseState(source = state.source, filename2 = state.filename, parser5, preprocessed) {
  statestack.push(state);
  state = new ParseState(source, filename2, parser5, preprocessed);
  return state;
}
__name(pushParseState, "pushParseState");
function popParseState() {
  state = statestack.pop();
}
__name(popParseState, "popParseState");
function genLibraryCode() {
  let s = "";
  let names = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k"];
  let builtins = {
    cos: 1,
    sin: 1,
    sqrt: 1,
    exp: 1,
    log: 1,
    floor: 1,
    ceil: 1,
    abs: 1,
    min: 2,
    max: 2,
    acos: 1,
    asin: 1,
    atan: 1,
    fract: 1
  };
  let ctx2 = new ParseState();
  let keys2 = ["float", "vec2", "vec3", "vec4", "int", "bool"];
  let sizemap = {
    int: 1,
    bool: 1,
    float: 1,
    vec2: 2,
    vec3: 3,
    vec4: 4
  };
  function genMathFunc(name2, args2, type2) {
    let size = sizemap[type2];
    let ntype = ctx2.resolveType(type2);
    args2 = [].concat(args2);
    for (let i3 = 0; i3 < args2.length; i3++) {
      if (args2[i3] === "") {
        args2[i3] = ntype;
      } else {
        args2[i3] = ctx2.resolveType(args2[i3]);
      }
    }
    let key = ctx2.buildPolyKey(name2, ntype, args2, ntype);
    s += `${ntype.getTypeNameSafe()} ${key}(`;
    let tname = ntype.getTypeNameSafe();
    let i2 = 0;
    for (let arg of args2) {
      if (i2 > 0) {
        s += ", ";
      }
      s += `${arg.getTypeNameSafe()} ${names[i2]}`;
      i2++;
    }
    s += ") {\n";
    s += `  ${tname} r;
`;
    for (let j = 0; j < size; j++) {
      s += `  r[${j}] = `;
      let s2 = `${name2}(`;
      for (let i3 = 0; i3 < args2.length; i3++) {
        if (i3 > 0) {
          s2 += ", ";
        }
        s2 += names[i3];
        if (ctx2.typesEqual(args2[i3], ntype)) {
          s2 += `[${j}]`;
        }
      }
      s2 += `);
`;
      s += s2;
    }
    s += `  return r;
`;
    s += "}\n";
  }
  __name(genMathFunc, "genMathFunc");
  for (let k2 in builtins) {
    let v = builtins[k2];
    let args2;
    if (typeof v === "number") {
      args2 = [];
      for (let i2 = 0; i2 < v; i2++) {
        args2.push("");
      }
    } else {
      args2 = v;
    }
    for (let key of keys2) {
      if (key === "float" || key === "int" || key === "bool") {
        continue;
      }
      genMathFunc(k2, args2, key);
    }
  }
  for (let key of keys2) {
    if (key === "float" || key === "int" || key === "bool") {
      continue;
    }
    genMathFunc("pow", ["", ""], key);
    genMathFunc("pow", ["float", ""], key);
    genMathFunc("pow", ["", "float"], key);
    genMathFunc("step", ["", ""], key);
    genMathFunc("step", ["float", ""], key);
    genMathFunc("step", ["", "float"], key);
  }
  let transformAssignOp = /* @__PURE__ */ __name((op) => {
    if (op.length === 2 && op.endsWith("=") && op !== "==" && op !== "!=" && op !== ">=" && op !== "<=") {
      op = op[0];
    }
    return op;
  }, "transformAssignOp");
  for (let op in opnames) {
    let name2 = opnames[op];
    op = transformAssignOp(op);
    s += `
  int _$_$_int_${name2}_int_int(int a, int b) {
    return trunc(a ${op} b);
  }
  int _$_$_${name2}_int_int(int a, int b) {
    return trunc(a ${op} b);
  }
  
  `;
  }
  for (let key of keys2) {
    if (key === "float" || key === "int" || key === "bool") {
      continue;
    }
    for (let op in opnames) {
      let name2 = opnames[op];
      if (op === "**" || op === "%") {
        continue;
      }
      op = transformAssignOp(op);
      s += `${key} _$_$_${name2}_${key}_${key}(${key} a, ${key} b) {
`;
      s += `  ${key} r;
`;
      let size = sizemap[key];
      for (let i2 = 0; i2 < size; i2++) {
        s += `  r[${i2}] = a[${i2}] ${op} b[${i2}];
`;
      }
      s += `
  return r;
`;
      s += `}
`;
    }
    for (let op in opnames) {
      let name2 = opnames[op];
      if (op === "**" || op === "%") {
        continue;
      }
      for (let step = 0; step < 2; step++) {
        if (step) {
          s += `${key} _$_$_${name2}_float_${key}(float a, ${key} b) {
`;
        } else {
          s += `${key} _$_$_${name2}_${key}_float(${key} a, float b) {
`;
        }
        s += `  ${key} r;
`;
        for (let i2 = 0; i2 < sizemap[key]; i2++) {
          if (step) {
            s += `  r[${i2}] = a ${op} b[${i2}];
`;
          } else {
            s += `  r[${i2}] = a[${i2}] ${op} b;
`;
          }
        }
        s += `  return r;
`;
        s += "}\n";
      }
    }
  }
  for (let k2 in ctx2.constructors) {
    let [type2, args2] = ctx2.constructors[k2];
    args2 = args2.map((f) => f.getTypeNameSafe());
    s += `${type2} ${k2}(`;
    for (let i3 = 0; i3 < args2.length; i3++) {
      if (i3 > 0) {
        s += ", ";
      }
      s += `${args2[i3]} ${names[i3]}`;
    }
    s += `) {
  ${type2} r;
`;
    let i2 = 0;
    let size = sizemap[type2];
    let ai = 0;
    let aj = 0;
    let arg = args2[ai];
    for (let i3 = 0; i3 < size; i3++) {
      if (arg === "float" || arg === "int" || arg === "bool") {
        s += `  r[${i3}] = ${names[ai]};
`;
        aj++;
      } else {
        s += `  r[${i3}] = ${names[ai]}[${aj++}];
`;
      }
      if (aj >= sizemap[arg]) {
        ai++;
        aj = 0;
        arg = args2[ai];
      }
    }
    s += "  return r;\n";
    s += "}\n";
  }
  s += `
  
int int_cast(float f) {
  return f;
}

int int_cast(int f) {
  return f;
}

float float_cast(float f) {
  return f;
}

float float_cast(int f) {
  return f;
}

float float_cast(bool b) {
  return b ? 1.0 : 0.0;
}

bool bool_cast(float f) {
  return f != 0.0;
}

bool bool_cast(bool b) {
  return b;
}

bool bool_cast(int i) {
  return i != 0;
}
  
vec4 _$_$_mul_mat4_vec4(mat4 m, vec4 v) {
  vec4 r;
  
  r[0] = m[0][0]*v[0] + m[1][0]*v[1] + m[2][0]*v[2] + m[3][0]*v[3];
  r[1] = m[0][1]*v[0] + m[1][1]*v[1] + m[2][1]*v[2] + m[3][1]*v[3];
  r[2] = m[0][2]*v[0] + m[1][2]*v[1] + m[2][2]*v[2] + m[3][2]*v[3];
  r[3] = m[0][3]*v[0] + m[1][3]*v[1] + m[2][3]*v[2] + m[3][3]*v[3];
  
  return r;
}

`;
  return s;
}
__name(genLibraryCode, "genLibraryCode");
var libraryCode = genLibraryCode();

// util/nstructjs_es6.js
var token2 = class {
  static {
    __name(this, "token");
  }
  constructor(type2, val2, lexpos, lineno, lexer4, parser5) {
    this.type = type2;
    this.value = val2;
    this.lexpos = lexpos;
    this.lineno = lineno;
    this.lexer = lexer4;
    this.parser = parser5;
  }
  toString() {
    if (this.value !== void 0)
      return "token(type=" + this.type + ", value='" + this.value + "')";
    else
      return "token(type=" + this.type + ")";
  }
};
var tokdef2 = class {
  static {
    __name(this, "tokdef");
  }
  constructor(name2, regexpr, func, example) {
    this.name = name2;
    this.re = regexpr;
    this.func = func;
    this.example = example;
    if (example === void 0 && regexpr) {
      let s = "" + regexpr;
      if (s.startsWith("/") && s.endsWith("/")) {
        s = s.slice(1, s.length - 1);
      }
      if (s.startsWith("\\")) {
        s = s.slice(1, s.length);
      }
      s = s.trim();
      if (s.length === 1) {
        this.example = s;
      }
    }
  }
};
var PUTIL_ParseError = class extends Error {
  static {
    __name(this, "PUTIL_ParseError");
  }
  constructor(msg) {
    super();
  }
};
var lexer2 = class {
  static {
    __name(this, "lexer");
  }
  constructor(tokdef3, errfunc) {
    this.tokdef = tokdef3;
    this.tokens = new Array();
    this.lexpos = 0;
    this.lexdata = "";
    this.lineno = 0;
    this.errfunc = errfunc;
    this.tokints = {};
    for (let i2 = 0; i2 < tokdef3.length; i2++) {
      this.tokints[tokdef3[i2].name] = i2;
    }
    this.statestack = [["__main__", 0]];
    this.states = { "__main__": [tokdef3, errfunc] };
    this.statedata = 0;
  }
  add_state(name2, tokdef3, errfunc) {
    if (errfunc === void 0) {
      errfunc = /* @__PURE__ */ __name(function(lexer4) {
        return true;
      }, "errfunc");
    }
    this.states[name2] = [tokdef3, errfunc];
  }
  tok_int(name2) {
  }
  push_state(state2, statedata) {
    this.statestack.push([state2, statedata]);
    state2 = this.states[state2];
    this.statedata = statedata;
    this.tokdef = state2[0];
    this.errfunc = state2[1];
  }
  pop_state() {
    let item = this.statestack[this.statestack.length - 1];
    let state2 = this.states[item[0]];
    this.tokdef = state2[0];
    this.errfunc = state2[1];
    this.statedata = item[1];
  }
  input(str) {
    while (this.statestack.length > 1) {
      this.pop_state();
    }
    this.lexdata = str;
    this.lexpos = 0;
    this.lineno = 0;
    this.tokens = new Array();
    this.peeked_tokens = [];
  }
  error() {
    if (this.errfunc !== void 0 && !this.errfunc(this))
      return;
    console.log("Syntax error near line " + this.lineno);
    let next = Math.min(this.lexpos + 8, this.lexdata.length);
    console.log("  " + this.lexdata.slice(this.lexpos, next));
    throw new PUTIL_ParseError("Parse error");
  }
  peek() {
    let tok = this.next(true);
    if (tok === void 0)
      return void 0;
    this.peeked_tokens.push(tok);
    return tok;
  }
  peeknext() {
    if (this.peeked_tokens.length > 0) {
      return this.peeked_tokens[0];
    }
    return this.peek();
  }
  at_end() {
    return this.lexpos >= this.lexdata.length && this.peeked_tokens.length === 0;
  }
  //ignore_peek is optional, false
  next(ignore_peek) {
    if (!ignore_peek && this.peeked_tokens.length > 0) {
      let tok2 = this.peeked_tokens[0];
      this.peeked_tokens.shift();
      return tok2;
    }
    if (this.lexpos >= this.lexdata.length)
      return void 0;
    let ts = this.tokdef;
    let tlen = ts.length;
    let lexdata = this.lexdata.slice(this.lexpos, this.lexdata.length);
    let results = [];
    for (var i2 = 0; i2 < tlen; i2++) {
      let t2 = ts[i2];
      if (t2.re === void 0)
        continue;
      let res = t2.re.exec(lexdata);
      if (res !== null && res !== void 0 && res.index === 0) {
        results.push([t2, res]);
      }
    }
    let max_res = 0;
    let theres = void 0;
    for (var i2 = 0; i2 < results.length; i2++) {
      let res = results[i2];
      if (res[1][0].length > max_res) {
        theres = res;
        max_res = res[1][0].length;
      }
    }
    if (theres === void 0) {
      this.error();
      return;
    }
    let def = theres[0];
    let tok = new token2(def.name, theres[1][0], this.lexpos, this.lineno, this, void 0);
    this.lexpos += tok.value.length;
    if (def.func) {
      tok = def.func(tok);
      if (tok === void 0) {
        return this.next();
      }
    }
    return tok;
  }
};
var parser3 = class {
  static {
    __name(this, "parser");
  }
  constructor(lexer4, errfunc) {
    this.lexer = lexer4;
    this.errfunc = errfunc;
    this.start = void 0;
  }
  parse(data, err_on_unconsumed) {
    if (err_on_unconsumed === void 0)
      err_on_unconsumed = true;
    if (data !== void 0)
      this.lexer.input(data);
    let ret2 = this.start(this);
    if (err_on_unconsumed && !this.lexer.at_end() && this.lexer.next() !== void 0) {
      this.error(void 0, "parser did not consume entire input");
    }
    return ret2;
  }
  input(data) {
    this.lexer.input(data);
  }
  error(token3, msg) {
    let estr;
    if (msg === void 0)
      msg = "";
    if (token3 === void 0)
      estr = "Parse error at end of input: " + msg;
    else
      estr = "Parse error at line " + (token3.lineno + 1) + ": " + msg;
    let buf = "1| ";
    let ld = this.lexer.lexdata;
    let l2 = 1;
    for (var i2 = 0; i2 < ld.length; i2++) {
      let c = ld[i2];
      if (c === "\n") {
        l2++;
        buf += "\n" + l2 + "| ";
      } else {
        buf += c;
      }
    }
    console.log("------------------");
    console.log(buf);
    console.log("==================");
    console.log(estr);
    if (this.errfunc && !this.errfunc(token3)) {
      return;
    }
    throw new PUTIL_ParseError(estr);
  }
  peek() {
    let tok = this.lexer.peek();
    if (tok !== void 0)
      tok.parser = this;
    return tok;
  }
  peeknext() {
    let tok = this.lexer.peeknext();
    if (tok !== void 0)
      tok.parser = this;
    return tok;
  }
  next() {
    let tok = this.lexer.next();
    if (tok !== void 0)
      tok.parser = this;
    return tok;
  }
  optional(type2) {
    let tok = this.peek();
    if (tok === void 0)
      return false;
    if (tok.type === type2) {
      this.next();
      return true;
    }
    return false;
  }
  at_end() {
    return this.lexer.at_end();
  }
  expect(type2, msg) {
    let tok = this.next();
    if (msg === void 0) {
      msg = type2;
      for (let tk3 of this.lexer.tokdef) {
        if (tk3.name === type2 && tk3.example) {
          msg = tk3.example;
        }
      }
    }
    if (tok === void 0 || tok.type !== type2) {
      this.error(tok, "Expected " + msg);
    }
    return tok.value;
  }
};
function test_parser2() {
  let basic_types = new set(["int", "float", "double", "vec2", "vec3", "vec4", "mat4", "string"]);
  let reserved_tokens = new set(["int", "float", "double", "vec2", "vec3", "vec4", "mat4", "string", "static_string", "array"]);
  function tk3(name2, re, func) {
    return new tokdef2(name2, re, func);
  }
  __name(tk3, "tk");
  let tokens3 = [tk3("ID", /[a-zA-Z]+[a-zA-Z0-9_]*/, function(t2) {
    if (reserved_tokens.has(t2.value)) {
      t2.type = t2.value.toUpperCase();
    }
    return t2;
  }), tk3("OPEN", /\{/), tk3("CLOSE", /}/), tk3("COLON", /:/), tk3("JSCRIPT", /\|/, function(t2) {
    let js = "";
    let lexer4 = t2.lexer;
    while (lexer4.lexpos < lexer4.lexdata.length) {
      let c = lexer4.lexdata[lexer4.lexpos];
      if (c === "\n")
        break;
      js += c;
      lexer4.lexpos++;
    }
    if (js.endsWith(";")) {
      js = js.slice(0, js.length - 1);
      lexer4.lexpos--;
    }
    t2.value = js;
    return t2;
  }), tk3("LPARAM", /\(/), tk3("RPARAM", /\)/), tk3("COMMA", /,/), tk3("NUM", /[0-9]/), tk3("SEMI", /;/), tk3("NEWLINE", /\n/, function(t2) {
    t2.lexer.lineno += 1;
  }), tk3("SPACE", / |\t/, function(t2) {
  })];
  let __iter_rt = __get_iter(reserved_tokens);
  let rt;
  while (1) {
    let __ival_rt = __iter_rt.next();
    if (__ival_rt.done) {
      break;
    }
    rt = __ival_rt.value;
    tokens3.push(tk3(rt.toUpperCase()));
  }
  let a2 = "\n  Loop {\n    eid : int;\n    flag : int;\n    index : int;\n    type : int;\n\n    co : vec3;\n    no : vec3;\n    loop : int | eid(loop);\n    edges : array(e, int) | e.eid;\n\n    loops : array(Loop);\n  }\n  ";
  function errfunc(lexer4) {
    return true;
  }
  __name(errfunc, "errfunc");
  let lex3 = new lexer2(tokens3, errfunc);
  console.log("Testing lexical scanner...");
  lex3.input(a2);
  let token3;
  while (token3 = lex3.next()) {
    console.log(token3.toString());
  }
  let parser5 = new parser5(lex3);
  parser5.input(a2);
  function p_Array(p) {
    p.expect("ARRAY");
    p.expect("LPARAM");
    let arraytype = p_Type(p);
    let itername = "";
    if (p.optional("COMMA")) {
      itername = arraytype;
      arraytype = p_Type(p);
    }
    p.expect("RPARAM");
    return { type: "array", data: { type: arraytype, iname: itername } };
  }
  __name(p_Array, "p_Array");
  function p_Type(p) {
    let tok = p.peek();
    if (tok.type === "ID") {
      p.next();
      return { type: "struct", data: '"' + tok.value + '"' };
    } else if (basic_types.has(tok.type.toLowerCase())) {
      p.next();
      return { type: tok.type.toLowerCase() };
    } else if (tok.type === "ARRAY") {
      return p_Array(p);
    } else {
      p.error(tok, "invalid type " + tok.type);
    }
  }
  __name(p_Type, "p_Type");
  function p_Field(p) {
    let field = {};
    console.log("-----", p.peek().type);
    field.name = p.expect("ID", "struct field name");
    p.expect("COLON");
    field.type = p_Type(p);
    field.set = void 0;
    field.get = void 0;
    let tok = p.peek();
    if (tok.type === "JSCRIPT") {
      field.get = tok.value;
      p.next();
    }
    tok = p.peek();
    if (tok.type === "JSCRIPT") {
      field.set = tok.value;
      p.next();
    }
    p.expect("SEMI");
    return field;
  }
  __name(p_Field, "p_Field");
  function p_Struct(p) {
    let st = {};
    st.name = p.expect("ID", "struct name");
    st.fields = [];
    p.expect("OPEN");
    while (1) {
      if (p.at_end()) {
        p.error(void 0);
      } else if (p.optional("CLOSE")) {
        break;
      } else {
        st.fields.push(p_Field(p));
      }
    }
    return st;
  }
  __name(p_Struct, "p_Struct");
  let ret2 = p_Struct(parser5);
  console.log(JSON.stringify(ret2));
}
__name(test_parser2, "test_parser");
var struct_parseutil = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  token: token2,
  tokdef: tokdef2,
  PUTIL_ParseError,
  lexer: lexer2,
  parser: parser3
});
"use strict";
var NStruct = class {
  static {
    __name(this, "NStruct");
  }
  constructor(name2) {
    this.fields = [];
    this.id = -1;
    this.name = name2;
  }
};
var StructEnum = {
  T_INT: 0,
  T_FLOAT: 1,
  T_DOUBLE: 2,
  T_STRING: 7,
  T_STATIC_STRING: 8,
  //fixed-length string
  T_STRUCT: 9,
  T_TSTRUCT: 10,
  T_ARRAY: 11,
  T_ITER: 12,
  T_SHORT: 13,
  T_BYTE: 14,
  T_BOOL: 15,
  T_ITERKEYS: 16,
  T_UINT: 17,
  T_USHORT: 18,
  T_STATIC_ARRAY: 19,
  T_SIGNED_BYTE: 20
};
var ValueTypes = /* @__PURE__ */ new Set([
  StructEnum.T_INT,
  StructEnum.T_FLOAT,
  StructEnum.T_DOUBLE,
  StructEnum.T_STRING,
  StructEnum.T_STATIC_STRING,
  StructEnum.T_SHORT,
  StructEnum.T_BYTE,
  StructEnum.T_BOOL,
  StructEnum.T_UINT,
  StructEnum.T_USHORT,
  StructEnum.T_SIGNED_BYTE
]);
var StructTypes = {
  "int": StructEnum.T_INT,
  "uint": StructEnum.T_UINT,
  "ushort": StructEnum.T_USHORT,
  "float": StructEnum.T_FLOAT,
  "double": StructEnum.T_DOUBLE,
  "string": StructEnum.T_STRING,
  "static_string": StructEnum.T_STATIC_STRING,
  "struct": StructEnum.T_STRUCT,
  "abstract": StructEnum.T_TSTRUCT,
  "array": StructEnum.T_ARRAY,
  "iter": StructEnum.T_ITER,
  "short": StructEnum.T_SHORT,
  "byte": StructEnum.T_BYTE,
  "bool": StructEnum.T_BOOL,
  "iterkeys": StructEnum.T_ITERKEYS,
  "sbyte": StructEnum.T_SIGNED_BYTE
};
var StructTypeMap = {};
for (let k2 in StructTypes) {
  StructTypeMap[StructTypes[k2]] = k2;
}
function gen_tabstr(t2) {
  let s = "";
  for (let i2 = 0; i2 < t2; i2++) {
    s += "  ";
  }
  return s;
}
__name(gen_tabstr, "gen_tabstr");
function StructParser() {
  let basic_types = /* @__PURE__ */ new Set([
    "int",
    "float",
    "double",
    "string",
    "short",
    "byte",
    "sbyte",
    "bool",
    "uint",
    "ushort"
  ]);
  let reserved_tokens = /* @__PURE__ */ new Set([
    "int",
    "float",
    "double",
    "string",
    "static_string",
    "array",
    "iter",
    "abstract",
    "short",
    "byte",
    "sbyte",
    "bool",
    "iterkeys",
    "uint",
    "ushort",
    "static_array"
  ]);
  function tk3(name2, re, func) {
    return new tokdef2(name2, re, func);
  }
  __name(tk3, "tk");
  let tokens3 = [
    tk3("ID", /[a-zA-Z_$]+[a-zA-Z0-9_\.$]*/, function(t2) {
      if (reserved_tokens.has(t2.value)) {
        t2.type = t2.value.toUpperCase();
      }
      return t2;
    }, "identifier"),
    tk3("OPEN", /\{/),
    tk3("EQUALS", /=/),
    tk3("CLOSE", /}/),
    tk3("COLON", /:/),
    tk3("SOPEN", /\[/),
    tk3("SCLOSE", /\]/),
    tk3("JSCRIPT", /\|/, function(t2) {
      let js = "";
      let lexer4 = t2.lexer;
      while (lexer4.lexpos < lexer4.lexdata.length) {
        let c = lexer4.lexdata[lexer4.lexpos];
        if (c === "\n")
          break;
        js += c;
        lexer4.lexpos++;
      }
      while (js.trim().endsWith(";")) {
        js = js.slice(0, js.length - 1);
        lexer4.lexpos--;
      }
      t2.value = js.trim();
      return t2;
    }),
    tk3("LPARAM", /\(/),
    tk3("RPARAM", /\)/),
    tk3("COMMA", /,/),
    tk3("NUM", /[0-9]+/, void 0, "number"),
    tk3("SEMI", /;/),
    tk3("NEWLINE", /\n/, function(t2) {
      t2.lexer.lineno += 1;
    }, "newline"),
    tk3("SPACE", / |\t/, function(t2) {
    }, "whitespace")
  ];
  reserved_tokens.forEach(function(rt) {
    tokens3.push(tk3(rt.toUpperCase()));
  });
  function errfunc(lexer4) {
    return true;
  }
  __name(errfunc, "errfunc");
  let lex3 = new lexer2(tokens3, errfunc);
  let parser$1 = new parser3(lex3);
  function p_Static_String(p) {
    p.expect("STATIC_STRING");
    p.expect("SOPEN");
    let num = p.expect("NUM");
    p.expect("SCLOSE");
    return { type: StructEnum.T_STATIC_STRING, data: { maxlength: num } };
  }
  __name(p_Static_String, "p_Static_String");
  function p_DataRef(p) {
    p.expect("DATAREF");
    p.expect("LPARAM");
    let tname = p.expect("ID");
    p.expect("RPARAM");
    return { type: StructEnum.T_DATAREF, data: tname };
  }
  __name(p_DataRef, "p_DataRef");
  function p_Array(p) {
    p.expect("ARRAY");
    p.expect("LPARAM");
    let arraytype = p_Type(p);
    let itername = "";
    if (p.optional("COMMA")) {
      itername = arraytype.data.replace(/"/g, "");
      arraytype = p_Type(p);
    }
    p.expect("RPARAM");
    return { type: StructEnum.T_ARRAY, data: { type: arraytype, iname: itername } };
  }
  __name(p_Array, "p_Array");
  function p_Iter(p) {
    p.expect("ITER");
    p.expect("LPARAM");
    let arraytype = p_Type(p);
    let itername = "";
    if (p.optional("COMMA")) {
      itername = arraytype.data.replace(/"/g, "");
      arraytype = p_Type(p);
    }
    p.expect("RPARAM");
    return { type: StructEnum.T_ITER, data: { type: arraytype, iname: itername } };
  }
  __name(p_Iter, "p_Iter");
  function p_StaticArray(p) {
    p.expect("STATIC_ARRAY");
    p.expect("SOPEN");
    let arraytype = p_Type(p);
    let itername = "";
    p.expect("COMMA");
    let size = p.expect("NUM");
    if (size < 0 || Math.abs(size - Math.floor(size)) > 1e-6) {
      console.log(Math.abs(size - Math.floor(size)));
      p.error("Expected an integer");
    }
    size = Math.floor(size);
    if (p.optional("COMMA")) {
      itername = p_Type(p).data;
    }
    p.expect("SCLOSE");
    return { type: StructEnum.T_STATIC_ARRAY, data: { type: arraytype, size, iname: itername } };
  }
  __name(p_StaticArray, "p_StaticArray");
  function p_IterKeys(p) {
    p.expect("ITERKEYS");
    p.expect("LPARAM");
    let arraytype = p_Type(p);
    let itername = "";
    if (p.optional("COMMA")) {
      itername = arraytype.data.replace(/"/g, "");
      arraytype = p_Type(p);
    }
    p.expect("RPARAM");
    return { type: StructEnum.T_ITERKEYS, data: { type: arraytype, iname: itername } };
  }
  __name(p_IterKeys, "p_IterKeys");
  function p_Abstract(p) {
    p.expect("ABSTRACT");
    p.expect("LPARAM");
    let type2 = p.expect("ID");
    p.expect("RPARAM");
    return { type: StructEnum.T_TSTRUCT, data: type2 };
  }
  __name(p_Abstract, "p_Abstract");
  function p_Type(p) {
    let tok = p.peek();
    if (tok.type === "ID") {
      p.next();
      return { type: StructEnum.T_STRUCT, data: tok.value };
    } else if (basic_types.has(tok.type.toLowerCase())) {
      p.next();
      return { type: StructTypes[tok.type.toLowerCase()] };
    } else if (tok.type === "ARRAY") {
      return p_Array(p);
    } else if (tok.type === "ITER") {
      return p_Iter(p);
    } else if (tok.type === "ITERKEYS") {
      return p_IterKeys(p);
    } else if (tok.type === "STATIC_ARRAY") {
      return p_StaticArray(p);
    } else if (tok.type === "STATIC_STRING") {
      return p_Static_String(p);
    } else if (tok.type === "ABSTRACT") {
      return p_Abstract(p);
    } else if (tok.type === "DATAREF") {
      return p_DataRef(p);
    } else {
      p.error(tok, "invalid type " + tok.type);
    }
  }
  __name(p_Type, "p_Type");
  function p_ID_or_num(p) {
    let t2 = p.peeknext();
    if (t2.type === "NUM") {
      p.next();
      return t2.value;
    } else {
      return p.expect("ID", "struct field name");
    }
  }
  __name(p_ID_or_num, "p_ID_or_num");
  function p_Field(p) {
    let field = {};
    field.name = p_ID_or_num(p);
    p.expect("COLON");
    field.type = p_Type(p);
    field.set = void 0;
    field.get = void 0;
    let check = 0;
    let tok = p.peek();
    if (tok.type === "JSCRIPT") {
      field.get = tok.value;
      check = 1;
      p.next();
    }
    tok = p.peek();
    if (tok.type === "JSCRIPT") {
      check = 1;
      field.set = tok.value;
      p.next();
    }
    p.expect("SEMI");
    return field;
  }
  __name(p_Field, "p_Field");
  function p_Struct(p) {
    let name2 = p.expect("ID", "struct name");
    let st = new NStruct(name2);
    let tok = p.peek();
    let id = -1;
    if (tok.type === "ID" && tok.value === "id") {
      p.next();
      p.expect("EQUALS");
      st.id = p.expect("NUM");
    }
    p.expect("OPEN");
    while (1) {
      if (p.at_end()) {
        p.error(void 0);
      } else if (p.optional("CLOSE")) {
        break;
      } else {
        st.fields.push(p_Field(p));
      }
    }
    return st;
  }
  __name(p_Struct, "p_Struct");
  parser$1.start = p_Struct;
  return parser$1;
}
__name(StructParser, "StructParser");
var struct_parse = StructParser();
var struct_parser = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  NStruct,
  StructEnum,
  ValueTypes,
  StructTypes,
  StructTypeMap,
  struct_parse
});
var struct_typesystem = /* @__PURE__ */ Object.freeze({
  __proto__: null
});
"use strict";
var STRUCT_ENDIAN = true;
function setEndian(mode) {
  STRUCT_ENDIAN = !!mode;
}
__name(setEndian, "setEndian");
var temp_dataview = new DataView(new ArrayBuffer(16));
var uint8_view = new Uint8Array(temp_dataview.buffer);
var unpack_context = class {
  static {
    __name(this, "unpack_context");
  }
  constructor() {
    this.i = 0;
  }
};
function pack_byte(array, val2) {
  array.push(val2);
}
__name(pack_byte, "pack_byte");
function pack_sbyte(array, val2) {
  if (val2 < 0) {
    val2 = 256 + val2;
  }
  array.push(val2);
}
__name(pack_sbyte, "pack_sbyte");
function pack_bytes(array, bytes) {
  for (let i2 = 0; i2 < bytes.length; i2++) {
    array.push(bytes[i2]);
  }
}
__name(pack_bytes, "pack_bytes");
function pack_int(array, val2) {
  temp_dataview.setInt32(0, val2, STRUCT_ENDIAN);
  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
  array.push(uint8_view[2]);
  array.push(uint8_view[3]);
}
__name(pack_int, "pack_int");
function pack_uint(array, val2) {
  temp_dataview.setUint32(0, val2, STRUCT_ENDIAN);
  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
  array.push(uint8_view[2]);
  array.push(uint8_view[3]);
}
__name(pack_uint, "pack_uint");
function pack_ushort(array, val2) {
  temp_dataview.setUint16(0, val2, STRUCT_ENDIAN);
  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
}
__name(pack_ushort, "pack_ushort");
function pack_float(array, val2) {
  temp_dataview.setFloat32(0, val2, STRUCT_ENDIAN);
  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
  array.push(uint8_view[2]);
  array.push(uint8_view[3]);
}
__name(pack_float, "pack_float");
function pack_double(array, val2) {
  temp_dataview.setFloat64(0, val2, STRUCT_ENDIAN);
  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
  array.push(uint8_view[2]);
  array.push(uint8_view[3]);
  array.push(uint8_view[4]);
  array.push(uint8_view[5]);
  array.push(uint8_view[6]);
  array.push(uint8_view[7]);
}
__name(pack_double, "pack_double");
function pack_short(array, val2) {
  temp_dataview.setInt16(0, val2, STRUCT_ENDIAN);
  array.push(uint8_view[0]);
  array.push(uint8_view[1]);
}
__name(pack_short, "pack_short");
function encode_utf8(arr, str) {
  for (let i2 = 0; i2 < str.length; i2++) {
    let c = str.charCodeAt(i2);
    while (c !== 0) {
      let uc = c & 127;
      c = c >> 7;
      if (c !== 0)
        uc |= 128;
      arr.push(uc);
    }
  }
}
__name(encode_utf8, "encode_utf8");
function decode_utf8(arr) {
  let str = "";
  let i2 = 0;
  while (i2 < arr.length) {
    let c = arr[i2];
    let sum = c & 127;
    let j = 0;
    let lasti = i2;
    while (i2 < arr.length && c & 128) {
      j += 7;
      i2++;
      c = arr[i2];
      c = (c & 127) << j;
      sum |= c;
    }
    if (sum === 0)
      break;
    str += String.fromCharCode(sum);
    i2++;
  }
  return str;
}
__name(decode_utf8, "decode_utf8");
function test_utf8() {
  let s = "a" + String.fromCharCode(8800) + "b";
  let arr = [];
  encode_utf8(arr, s);
  let s2 = decode_utf8(arr);
  if (s !== s2) {
    throw new Error("UTF-8 encoding/decoding test failed");
  }
  return true;
}
__name(test_utf8, "test_utf8");
function truncate_utf8(arr, maxlen) {
  let len = Math.min(arr.length, maxlen);
  let last_codepoint = 0;
  let last2 = 0;
  let incode = false;
  let i2 = 0;
  let code3 = 0;
  while (i2 < len) {
    incode = arr[i2] & 128;
    if (!incode) {
      last2 = last_codepoint + 1;
      last_codepoint = i2 + 1;
    }
    i2++;
  }
  if (last_codepoint < maxlen)
    arr.length = last_codepoint;
  else
    arr.length = last2;
  return arr;
}
__name(truncate_utf8, "truncate_utf8");
var _static_sbuf_ss = new Array(2048);
function pack_static_string(data, str, length) {
  if (length === void 0)
    throw new Error("'length' paremter is not optional for pack_static_string()");
  let arr = length < 2048 ? _static_sbuf_ss : new Array();
  arr.length = 0;
  encode_utf8(arr, str);
  truncate_utf8(arr, length);
  for (let i2 = 0; i2 < length; i2++) {
    if (i2 >= arr.length) {
      data.push(0);
    } else {
      data.push(arr[i2]);
    }
  }
}
__name(pack_static_string, "pack_static_string");
var _static_sbuf = new Array(32);
function pack_string(data, str) {
  _static_sbuf.length = 0;
  encode_utf8(_static_sbuf, str);
  pack_int(data, _static_sbuf.length);
  for (let i2 = 0; i2 < _static_sbuf.length; i2++) {
    data.push(_static_sbuf[i2]);
  }
}
__name(pack_string, "pack_string");
function unpack_bytes(dview, uctx, len) {
  let ret2 = new DataView(dview.buffer.slice(uctx.i, uctx.i + len));
  uctx.i += len;
  return ret2;
}
__name(unpack_bytes, "unpack_bytes");
function unpack_byte(dview, uctx) {
  return dview.getUint8(uctx.i++);
}
__name(unpack_byte, "unpack_byte");
function unpack_sbyte(dview, uctx) {
  return dview.getInt8(uctx.i++);
}
__name(unpack_sbyte, "unpack_sbyte");
function unpack_int(dview, uctx) {
  uctx.i += 4;
  return dview.getInt32(uctx.i - 4, STRUCT_ENDIAN);
}
__name(unpack_int, "unpack_int");
function unpack_uint(dview, uctx) {
  uctx.i += 4;
  return dview.getUint32(uctx.i - 4, STRUCT_ENDIAN);
}
__name(unpack_uint, "unpack_uint");
function unpack_ushort(dview, uctx) {
  uctx.i += 2;
  return dview.getUint16(uctx.i - 2, STRUCT_ENDIAN);
}
__name(unpack_ushort, "unpack_ushort");
function unpack_float(dview, uctx) {
  uctx.i += 4;
  return dview.getFloat32(uctx.i - 4, STRUCT_ENDIAN);
}
__name(unpack_float, "unpack_float");
function unpack_double(dview, uctx) {
  uctx.i += 8;
  return dview.getFloat64(uctx.i - 8, STRUCT_ENDIAN);
}
__name(unpack_double, "unpack_double");
function unpack_short(dview, uctx) {
  uctx.i += 2;
  return dview.getInt16(uctx.i - 2, STRUCT_ENDIAN);
}
__name(unpack_short, "unpack_short");
var _static_arr_us = new Array(32);
function unpack_string(data, uctx) {
  let slen = unpack_int(data, uctx);
  if (!slen) {
    return "";
  }
  let str = "";
  let arr = slen < 2048 ? _static_arr_us : new Array(slen);
  arr.length = slen;
  for (let i2 = 0; i2 < slen; i2++) {
    arr[i2] = unpack_byte(data, uctx);
  }
  return decode_utf8(arr);
}
__name(unpack_string, "unpack_string");
var _static_arr_uss = new Array(2048);
function unpack_static_string(data, uctx, length) {
  let str = "";
  if (length === void 0)
    throw new Error("'length' cannot be undefined in unpack_static_string()");
  let arr = length < 2048 ? _static_arr_uss : new Array(length);
  arr.length = 0;
  let done = false;
  for (let i2 = 0; i2 < length; i2++) {
    let c = unpack_byte(data, uctx);
    if (c === 0) {
      done = true;
    }
    if (!done && c !== 0) {
      arr.push(c);
    }
  }
  truncate_utf8(arr, length);
  return decode_utf8(arr);
}
__name(unpack_static_string, "unpack_static_string");
var struct_binpack = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  get STRUCT_ENDIAN() {
    return STRUCT_ENDIAN;
  },
  setEndian,
  temp_dataview,
  uint8_view,
  unpack_context,
  pack_byte,
  pack_sbyte,
  pack_bytes,
  pack_int,
  pack_uint,
  pack_ushort,
  pack_float,
  pack_double,
  pack_short,
  encode_utf8,
  decode_utf8,
  test_utf8,
  pack_static_string,
  pack_string,
  unpack_bytes,
  unpack_byte,
  unpack_sbyte,
  unpack_int,
  unpack_uint,
  unpack_ushort,
  unpack_float,
  unpack_double,
  unpack_short,
  unpack_string,
  unpack_static_string
});
var warninglvl = 2;
var debug = 0;
var _static_envcode_null = "";
var packer_debug, packer_debug_start, packer_debug_end;
var packdebug_tablevel = 0;
function _get_pack_debug() {
  return {
    packer_debug,
    packer_debug_start,
    packer_debug_end,
    debug,
    warninglvl
  };
}
__name(_get_pack_debug, "_get_pack_debug");
var cachering2 = class _cachering extends Array {
  static {
    __name(this, "cachering");
  }
  constructor(cb, tot) {
    super();
    this.length = tot;
    this.cur = 0;
    for (let i2 = 0; i2 < tot; i2++) {
      this[i2] = cb();
    }
  }
  static fromConstructor(cls, tot) {
    return new _cachering(() => new cls(), tot);
  }
  next() {
    let ret2 = this[this.cur];
    this.cur = (this.cur + 1) % this.length;
    return ret2;
  }
};
function gen_tabstr$1(tot) {
  let ret2 = "";
  for (let i2 = 0; i2 < tot; i2++) {
    ret2 += " ";
  }
  return ret2;
}
__name(gen_tabstr$1, "gen_tabstr$1");
function setWarningMode(t2) {
  if (typeof t2 !== "number" || isNaN(t2)) {
    throw new Error("Expected a single number (>= 0) argument to setWarningMode");
  }
  warninglvl = t2;
}
__name(setWarningMode, "setWarningMode");
function setDebugMode(t2) {
  debug = t2;
  if (debug) {
    packer_debug = /* @__PURE__ */ __name(function() {
      let tab = gen_tabstr$1(packdebug_tablevel);
      if (arguments.length > 0) {
        console.warn(tab, ...arguments);
      } else {
        console.warn("Warning: undefined msg");
      }
    }, "packer_debug");
    packer_debug_start = /* @__PURE__ */ __name(function(funcname) {
      packer_debug("Start " + funcname);
      packdebug_tablevel++;
    }, "packer_debug_start");
    packer_debug_end = /* @__PURE__ */ __name(function(funcname) {
      packdebug_tablevel--;
      if (funcname) {
        packer_debug("Leave " + funcname);
      }
    }, "packer_debug_end");
  } else {
    packer_debug = /* @__PURE__ */ __name(function() {
    }, "packer_debug");
    packer_debug_start = /* @__PURE__ */ __name(function() {
    }, "packer_debug_start");
    packer_debug_end = /* @__PURE__ */ __name(function() {
    }, "packer_debug_end");
  }
}
__name(setDebugMode, "setDebugMode");
setDebugMode(debug);
var StructFieldTypes = [];
var StructFieldTypeMap = {};
function packNull(manager2, data, field, type2) {
  StructFieldTypeMap[type2.type].packNull(manager2, data, field, type2);
}
__name(packNull, "packNull");
;
function toJSON(manager2, val2, obj, field, type2) {
  return StructFieldTypeMap[type2.type].toJSON(manager2, val2, obj, field, type2);
}
__name(toJSON, "toJSON");
;
function fromJSON(manager2, val2, obj, field, type2, instance) {
  return StructFieldTypeMap[type2.type].fromJSON(manager2, val2, obj, field, type2, instance);
}
__name(fromJSON, "fromJSON");
;
function unpack_field(manager2, data, type2, uctx) {
  let name2;
  if (debug) {
    name2 = StructFieldTypeMap[type2.type].define().name;
    packer_debug_start("R " + name2);
  }
  let ret2 = StructFieldTypeMap[type2.type].unpack(manager2, data, type2, uctx);
  if (debug) {
    packer_debug_end();
  }
  return ret2;
}
__name(unpack_field, "unpack_field");
var fakeFields = new cachering2(() => {
  return { type: void 0, get: void 0, set: void 0 };
}, 256);
function fmt_type(type2) {
  return StructFieldTypeMap[type2.type].format(type2);
}
__name(fmt_type, "fmt_type");
function do_pack(manager2, data, val2, obj, field, type2) {
  let name2;
  if (debug) {
    name2 = StructFieldTypeMap[type2.type].define().name;
    packer_debug_start("W " + name2);
  }
  let typeid = type2;
  if (typeof typeid !== "number") {
    typeid = typeid.type;
  }
  let ret2 = StructFieldTypeMap[typeid].pack(manager2, data, val2, obj, field, type2);
  if (debug) {
    packer_debug_end();
  }
  return ret2;
}
__name(do_pack, "do_pack");
var _ws_env = [[void 0, void 0]];
var StructFieldType = class _StructFieldType {
  static {
    __name(this, "StructFieldType");
  }
  static pack(manager2, data, val2, obj, field, type2) {
  }
  static unpack(manager2, data, type2, uctx) {
  }
  static packNull(manager2, data, field, type2) {
    this.pack(manager2, data, 0, 0, field, type2);
  }
  static format(type2) {
    return this.define().name;
  }
  static toJSON(manager2, val2, obj, field, type2) {
    return val2;
  }
  static fromJSON(manager2, val2, obj, field, type2, instance) {
    return val2;
  }
  /**
   return false to override default
   helper js for packing
   */
  static useHelperJS(field) {
    return true;
  }
  /**
     Define field class info.
  
     Example:
     <pre>
     static define() {return {
      type : StructEnum.T_INT,
      name : "int"
    }}
     </pre>
     */
  static define() {
    return {
      type: -1,
      name: "(error)"
    };
  }
  /**
   Register field packer/unpacker class.  Will throw an error if define() method is bad.
   */
  static register(cls) {
    if (StructFieldTypes.indexOf(cls) >= 0) {
      throw new Error("class already registered");
    }
    if (cls.define === _StructFieldType.define) {
      throw new Error("you forgot to make a define() static method");
    }
    if (cls.define().type === void 0) {
      throw new Error("cls.define().type was undefined!");
    }
    if (cls.define().type in StructFieldTypeMap) {
      throw new Error("type " + cls.define().type + " is used by another StructFieldType subclass");
    }
    StructFieldTypes.push(cls);
    StructFieldTypeMap[cls.define().type] = cls;
  }
};
var StructIntField = class extends StructFieldType {
  static {
    __name(this, "StructIntField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    pack_int(data, val2);
  }
  static unpack(manager2, data, type2, uctx) {
    return unpack_int(data, uctx);
  }
  static define() {
    return {
      type: StructEnum.T_INT,
      name: "int"
    };
  }
};
StructFieldType.register(StructIntField);
var StructFloatField = class extends StructFieldType {
  static {
    __name(this, "StructFloatField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    pack_float(data, val2);
  }
  static unpack(manager2, data, type2, uctx) {
    return unpack_float(data, uctx);
  }
  static define() {
    return {
      type: StructEnum.T_FLOAT,
      name: "float"
    };
  }
};
StructFieldType.register(StructFloatField);
var StructDoubleField = class extends StructFieldType {
  static {
    __name(this, "StructDoubleField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    pack_double(data, val2);
  }
  static unpack(manager2, data, type2, uctx) {
    return unpack_double(data, uctx);
  }
  static define() {
    return {
      type: StructEnum.T_DOUBLE,
      name: "double"
    };
  }
};
StructFieldType.register(StructDoubleField);
var StructStringField = class extends StructFieldType {
  static {
    __name(this, "StructStringField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    val2 = !val2 ? "" : val2;
    pack_string(data, val2);
  }
  static packNull(manager2, data, field, type2) {
    this.pack(manager2, data, "", 0, field, type2);
  }
  static unpack(manager2, data, type2, uctx) {
    return unpack_string(data, uctx);
  }
  static define() {
    return {
      type: StructEnum.T_STRING,
      name: "string"
    };
  }
};
StructFieldType.register(StructStringField);
var StructStaticStringField = class extends StructFieldType {
  static {
    __name(this, "StructStaticStringField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    val2 = !val2 ? "" : val2;
    pack_static_string(data, val2, type2.data.maxlength);
  }
  static format(type2) {
    return `static_string[${type2.data.maxlength}]`;
  }
  static packNull(manager2, data, field, type2) {
    this.pack(manager2, data, "", 0, field, type2);
  }
  static unpack(manager2, data, type2, uctx) {
    return unpack_static_string(data, uctx, type2.data.maxlength);
  }
  static define() {
    return {
      type: StructEnum.T_STATIC_STRING,
      name: "static_string"
    };
  }
};
StructFieldType.register(StructStaticStringField);
var StructStructField = class extends StructFieldType {
  static {
    __name(this, "StructStructField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    let stt = manager2.get_struct(type2.data);
    packer_debug("struct", stt.name);
    manager2.write_struct(data, val2, stt);
  }
  static format(type2) {
    return type2.data;
  }
  static fromJSON(manager2, val2, obj, field, type2, instance) {
    let stt = manager2.get_struct(type2.data);
    return manager2.readJSON(val2, stt, instance);
  }
  static toJSON(manager2, val2, obj, field, type2) {
    let stt = manager2.get_struct(type2.data);
    return manager2.writeJSON(val2, stt);
  }
  static unpackInto(manager2, data, type2, uctx, dest) {
    let cls2 = manager2.get_struct_cls(type2.data);
    packer_debug("struct", cls2 ? cls2.name : "(error)");
    return manager2.read_object(data, cls2, uctx, dest);
  }
  static packNull(manager2, data, field, type2) {
    let stt = manager2.get_struct(type2.data);
    packer_debug("struct", type2);
    for (let field2 of stt.fields) {
      let type22 = field2.type;
      packNull(manager2, data, field2, type22);
    }
  }
  static unpack(manager2, data, type2, uctx) {
    let cls2 = manager2.get_struct_cls(type2.data);
    packer_debug("struct", cls2 ? cls2.name : "(error)");
    return manager2.read_object(data, cls2, uctx);
  }
  static define() {
    return {
      type: StructEnum.T_STRUCT,
      name: "struct"
    };
  }
};
StructFieldType.register(StructStructField);
var StructTStructField = class extends StructFieldType {
  static {
    __name(this, "StructTStructField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    let cls = manager2.get_struct_cls(type2.data);
    let stt = manager2.get_struct(type2.data);
    if (val2.constructor.structName !== type2.data && val2 instanceof cls) {
      stt = manager2.get_struct(val2.constructor.structName);
    } else if (val2.constructor.structName === type2.data) {
      stt = manager2.get_struct(type2.data);
    } else {
      console.trace();
      throw new Error("Bad struct " + val2.constructor.structName + " passed to write_struct");
    }
    packer_debug("int " + stt.id);
    pack_int(data, stt.id);
    manager2.write_struct(data, val2, stt);
  }
  static fromJSON(manager2, val2, obj, field, type2, instance) {
    let stt = manager2.get_struct(val2._structName);
    return manager2.readJSON(val2, stt, instance);
  }
  static toJSON(manager2, val2, obj, field, type2) {
    let stt = manager2.get_struct(val2.constructor.structName);
    let ret2 = manager2.writeJSON(val2, stt);
    ret2._structName = "" + stt.name;
    return ret2;
  }
  static packNull(manager2, data, field, type2) {
    let stt = manager2.get_struct(type2.data);
    pack_int(data, stt.id);
    packNull(manager2, data, field, { type: StructEnum.T_STRUCT, data: type2.data });
  }
  static format(type2) {
    return "abstract(" + type2.data + ")";
  }
  static unpackInto(manager2, data, type2, uctx, dest) {
    let id = unpack_int(data, uctx);
    packer_debug("-int " + id);
    if (!(id in manager2.struct_ids)) {
      packer_debug("tstruct id: " + id);
      console.trace();
      console.log(id);
      console.log(manager2.struct_ids);
      throw new Error("Unknown struct type " + id + ".");
    }
    let cls2 = manager2.get_struct_id(id);
    packer_debug("struct name: " + cls2.name);
    cls2 = manager2.struct_cls[cls2.name];
    return manager2.read_object(data, cls2, uctx, dest);
  }
  static unpack(manager2, data, type2, uctx) {
    let id = unpack_int(data, uctx);
    packer_debug("-int " + id);
    if (!(id in manager2.struct_ids)) {
      packer_debug("tstruct id: " + id);
      console.trace();
      console.log(id);
      console.log(manager2.struct_ids);
      throw new Error("Unknown struct type " + id + ".");
    }
    let cls2 = manager2.get_struct_id(id);
    packer_debug("struct name: " + cls2.name);
    cls2 = manager2.struct_cls[cls2.name];
    return manager2.read_object(data, cls2, uctx);
  }
  static define() {
    return {
      type: StructEnum.T_TSTRUCT,
      name: "tstruct"
    };
  }
};
StructFieldType.register(StructTStructField);
var StructArrayField = class extends StructFieldType {
  static {
    __name(this, "StructArrayField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    if (val2 === void 0) {
      console.trace();
      console.log("Undefined array fed to struct struct packer!");
      console.log("Field: ", field);
      console.log("Type: ", type2);
      console.log("");
      packer_debug("int 0");
      pack_int(data, 0);
      return;
    }
    packer_debug("int " + val2.length);
    pack_int(data, val2.length);
    let d = type2.data;
    let itername = d.iname;
    let type22 = d.type;
    let env = _ws_env;
    for (let i2 = 0; i2 < val2.length; i2++) {
      let val22 = val2[i2];
      if (itername !== "" && itername !== void 0 && field.get) {
        env[0][0] = itername;
        env[0][1] = val22;
        val22 = manager2._env_call(field.get, obj, env);
      }
      let fakeField = fakeFields.next();
      fakeField.type = type22;
      do_pack(manager2, data, val22, obj, fakeField, type22);
    }
  }
  static packNull(manager2, data, field, type2) {
    pack_int(data, 0);
  }
  static format(type2) {
    if (type2.data.iname !== "" && type2.data.iname !== void 0) {
      return "array(" + type2.data.iname + ", " + fmt_type(type2.data.type) + ")";
    } else {
      return "array(" + fmt_type(type2.data.type) + ")";
    }
  }
  static useHelperJS(field) {
    return !field.type.data.iname;
  }
  static fromJSON(manager2, val2, obj, field, type2, instance) {
    let ret2 = instance || [];
    ret2.length = 0;
    for (let i2 = 0; i2 < val2.length; i2++) {
      let val22 = fromJSON(manager2, val2[i2], val2, field, type2.data.type, void 0);
      if (val22 === void 0) {
        console.log(val22);
        console.error("eeek");
        process.exit();
      }
      ret2.push(val22);
    }
    return ret2;
  }
  static toJSON(manager2, val2, obj, field, type2) {
    val2 = val2 || [];
    let json = [];
    let itername = type2.data.iname;
    for (let i2 = 0; i2 < val2.length; i2++) {
      let val22 = val2[i2];
      let env = _ws_env;
      if (itername !== "" && itername !== void 0 && field.get) {
        env[0][0] = itername;
        env[0][1] = val22;
        val22 = manager2._env_call(field.get, obj, env);
      }
      json.push(toJSON(manager2, val22, val2, field, type2.data.type));
    }
    return json;
  }
  static unpackInto(manager2, data, type2, uctx, dest) {
    let len = unpack_int(data, uctx);
    dest.length = 0;
    for (let i2 = 0; i2 < len; i2++) {
      dest.push(unpack_field(manager2, data, type2.data.type, uctx));
    }
  }
  static unpack(manager2, data, type2, uctx) {
    let len = unpack_int(data, uctx);
    packer_debug("-int " + len);
    let arr = new Array(len);
    for (let i2 = 0; i2 < len; i2++) {
      arr[i2] = unpack_field(manager2, data, type2.data.type, uctx);
    }
    return arr;
  }
  static define() {
    return {
      type: StructEnum.T_ARRAY,
      name: "array"
    };
  }
};
StructFieldType.register(StructArrayField);
var StructIterField = class extends StructFieldType {
  static {
    __name(this, "StructIterField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    function forEach(cb, thisvar) {
      if (val2 && val2[Symbol.iterator]) {
        for (let item of val2) {
          cb.call(thisvar, item);
        }
      } else if (val2 && val2.forEach) {
        val2.forEach(function(item) {
          cb.call(thisvar, item);
        });
      } else {
        console.trace();
        console.log("Undefined iterable list fed to struct struct packer!", val2);
        console.log("Field: ", field);
        console.log("Type: ", type2);
        console.log("");
      }
    }
    __name(forEach, "forEach");
    let starti = data.length;
    data.length += 4;
    let d = type2.data, itername = d.iname, type22 = d.type;
    let env = _ws_env;
    let i2 = 0;
    forEach(function(val22) {
      if (itername !== "" && itername !== void 0 && field.get) {
        env[0][0] = itername;
        env[0][1] = val22;
        val22 = manager2._env_call(field.get, obj, env);
      }
      let fakeField = fakeFields.next();
      fakeField.type = type22;
      do_pack(manager2, data, val22, obj, fakeField, type22);
      i2++;
    }, this);
    temp_dataview.setInt32(0, i2, STRUCT_ENDIAN);
    data[starti++] = uint8_view[0];
    data[starti++] = uint8_view[1];
    data[starti++] = uint8_view[2];
    data[starti++] = uint8_view[3];
  }
  static fromJSON() {
    return StructArrayField.fromJSON(...arguments);
  }
  static toJSON(manager2, val2, obj, field, type2) {
    val2 = val2 || [];
    let json = [];
    let itername = type2.data.iname;
    for (let val22 of val2) {
      let env = _ws_env;
      if (itername !== "" && itername !== void 0 && field.get) {
        env[0][0] = itername;
        env[0][1] = val22;
        val22 = manager2._env_call(field.get, obj, env);
      }
      json.push(toJSON(manager2, val22, val2, field, type2.data.type));
    }
    return json;
  }
  static packNull(manager2, data, field, type2) {
    pack_int(data, 0);
  }
  static useHelperJS(field) {
    return !field.type.data.iname;
  }
  static format(type2) {
    if (type2.data.iname !== "" && type2.data.iname !== void 0) {
      return "iter(" + type2.data.iname + ", " + fmt_type(type2.data.type) + ")";
    } else {
      return "iter(" + fmt_type(type2.data.type) + ")";
    }
  }
  static unpackInto(manager2, data, type2, uctx, arr) {
    let len = unpack_int(data, uctx);
    packer_debug("-int " + len);
    arr.length = 0;
    for (let i2 = 0; i2 < len; i2++) {
      arr.push(unpack_field(manager2, data, type2.data.type, uctx));
    }
    return arr;
  }
  static unpack(manager2, data, type2, uctx) {
    let len = unpack_int(data, uctx);
    packer_debug("-int " + len);
    let arr = new Array(len);
    for (let i2 = 0; i2 < len; i2++) {
      arr[i2] = unpack_field(manager2, data, type2.data.type, uctx);
    }
    return arr;
  }
  static define() {
    return {
      type: StructEnum.T_ITER,
      name: "iter"
    };
  }
};
StructFieldType.register(StructIterField);
var StructShortField = class extends StructFieldType {
  static {
    __name(this, "StructShortField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    pack_short(data, val2);
  }
  static unpack(manager2, data, type2, uctx) {
    return unpack_short(data, uctx);
  }
  static define() {
    return {
      type: StructEnum.T_SHORT,
      name: "short"
    };
  }
};
StructFieldType.register(StructShortField);
var StructByteField = class extends StructFieldType {
  static {
    __name(this, "StructByteField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    pack_byte(data, val2);
  }
  static unpack(manager2, data, type2, uctx) {
    return unpack_byte(data, uctx);
  }
  static define() {
    return {
      type: StructEnum.T_BYTE,
      name: "byte"
    };
  }
};
StructFieldType.register(StructByteField);
var StructSignedByteField = class extends StructFieldType {
  static {
    __name(this, "StructSignedByteField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    pack_sbyte(data, val2);
  }
  static unpack(manager2, data, type2, uctx) {
    return unpack_sbyte(data, uctx);
  }
  static define() {
    return {
      type: StructEnum.T_SIGNED_BYTE,
      name: "sbyte"
    };
  }
};
StructFieldType.register(StructSignedByteField);
var StructBoolField = class extends StructFieldType {
  static {
    __name(this, "StructBoolField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    pack_byte(data, !!val2);
  }
  static unpack(manager2, data, type2, uctx) {
    return !!unpack_byte(data, uctx);
  }
  static define() {
    return {
      type: StructEnum.T_BOOL,
      name: "bool"
    };
  }
};
StructFieldType.register(StructBoolField);
var StructIterKeysField = class extends StructFieldType {
  static {
    __name(this, "StructIterKeysField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    if (typeof val2 !== "object" && typeof val2 !== "function" || val2 === null) {
      console.warn("Bad object fed to iterkeys in struct packer!", val2);
      console.log("Field: ", field);
      console.log("Type: ", type2);
      console.log("");
      pack_int(data, 0);
      return;
    }
    let len = 0;
    for (let k2 in val2) {
      len++;
    }
    packer_debug("int " + len);
    pack_int(data, len);
    let d = type2.data, itername = d.iname, type22 = d.type;
    let env = _ws_env;
    let i2 = 0;
    for (let val22 in val2) {
      if (i2 >= len) {
        if (warninglvl > 0)
          console.warn("Warning: object keys magically replaced on us", val2, i2);
        return;
      }
      if (itername && itername.trim().length > 0 && field.get) {
        env[0][0] = itername;
        env[0][1] = val22;
        val22 = manager2._env_call(field.get, obj, env);
      } else {
        val22 = val2[val22];
      }
      let f2 = { type: type22, get: void 0, set: void 0 };
      do_pack(manager2, data, val22, obj, f2, type22);
      i2++;
    }
  }
  static fromJSON() {
    return StructArrayField.fromJSON(...arguments);
  }
  static toJSON(manager2, val2, obj, field, type2) {
    val2 = val2 || [];
    let json = [];
    let itername = type2.data.iname;
    for (let k2 in val2) {
      let val22 = val2[k2];
      let env = _ws_env;
      if (itername !== "" && itername !== void 0 && field.get) {
        env[0][0] = itername;
        env[0][1] = val22;
        val22 = manager2._env_call(field.get, obj, env);
      }
      json.push(toJSON(manager2, val22, val2, field, type2.data.type));
    }
    return json;
  }
  static packNull(manager2, data, field, type2) {
    pack_int(data, 0);
  }
  static useHelperJS(field) {
    return !field.type.data.iname;
  }
  static format(type2) {
    if (type2.data.iname !== "" && type2.data.iname !== void 0) {
      return "iterkeys(" + type2.data.iname + ", " + fmt_type(type2.data.type) + ")";
    } else {
      return "iterkeys(" + fmt_type(type2.data.type) + ")";
    }
  }
  static unpackInto(manager2, data, type2, uctx, arr) {
    let len = unpack_int(data, uctx);
    packer_debug("-int " + len);
    arr.length = 0;
    for (let i2 = 0; i2 < len; i2++) {
      arr.push(unpack_field(manager2, data, type2.data.type, uctx));
    }
    return arr;
  }
  static unpack(manager2, data, type2, uctx) {
    let len = unpack_int(data, uctx);
    packer_debug("-int " + len);
    let arr = new Array(len);
    for (let i2 = 0; i2 < len; i2++) {
      arr[i2] = unpack_field(manager2, data, type2.data.type, uctx);
    }
    return arr;
  }
  static define() {
    return {
      type: StructEnum.T_ITERKEYS,
      name: "iterkeys"
    };
  }
};
StructFieldType.register(StructIterKeysField);
var StructUintField = class extends StructFieldType {
  static {
    __name(this, "StructUintField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    pack_uint(data, val2);
  }
  static unpack(manager2, data, type2, uctx) {
    return unpack_uint(data, uctx);
  }
  static define() {
    return {
      type: StructEnum.T_UINT,
      name: "uint"
    };
  }
};
StructFieldType.register(StructUintField);
var StructUshortField = class extends StructFieldType {
  static {
    __name(this, "StructUshortField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    pack_ushort(data, val2);
  }
  static unpack(manager2, data, type2, uctx) {
    return unpack_ushort(data, uctx);
  }
  static define() {
    return {
      type: StructEnum.T_USHORT,
      name: "ushort"
    };
  }
};
StructFieldType.register(StructUshortField);
var StructStaticArrayField = class extends StructFieldType {
  static {
    __name(this, "StructStaticArrayField");
  }
  static pack(manager2, data, val2, obj, field, type2) {
    if (type2.data.size === void 0) {
      throw new Error("type.data.size was undefined");
    }
    let itername = type2.data.iname;
    if (val2 === void 0 || !val2.length) {
      this.packNull(manager2, data, field, type2);
      return;
    }
    for (let i2 = 0; i2 < type2.data.size; i2++) {
      let i22 = Math.min(i2, Math.min(val2.length - 1, type2.data.size));
      let val22 = val2[i22];
      if (itername !== "" && itername !== void 0 && field.get) {
        let env = _ws_env;
        env[0][0] = itername;
        env[0][1] = val22;
        val22 = manager2._env_call(field.get, obj, env);
      }
      do_pack(manager2, data, val22, val2, field, type2.data.type);
    }
  }
  static useHelperJS(field) {
    return !field.type.data.iname;
  }
  static fromJSON() {
    return StructArrayField.fromJSON(...arguments);
  }
  static packNull(manager2, data, field, type2) {
    let size = type2.data.size;
    for (let i2 = 0; i2 < size; i2++) {
      packNull(manager2, data, field, type2.data.type);
    }
  }
  static toJSON(manager2, val2, obj, field, type2) {
    return StructArrayField.toJSON(...arguments);
  }
  static format(type2) {
    let type22 = StructFieldTypeMap[type2.data.type.type].format(type2.data.type);
    let ret2 = `static_array[${type22}, ${type2.data.size}`;
    if (type2.data.iname) {
      ret2 += `, ${type2.data.iname}`;
    }
    ret2 += `]`;
    return ret2;
  }
  static unpackInto(manager2, data, type2, uctx, ret2) {
    packer_debug("-size: " + type2.data.size);
    ret2.length = 0;
    for (let i2 = 0; i2 < type2.data.size; i2++) {
      ret2.push(unpack_field(manager2, data, type2.data.type, uctx));
    }
    return ret2;
  }
  static unpack(manager2, data, type2, uctx) {
    packer_debug("-size: " + type2.data.size);
    let ret2 = [];
    for (let i2 = 0; i2 < type2.data.size; i2++) {
      ret2.push(unpack_field(manager2, data, type2.data.type, uctx));
    }
    return ret2;
  }
  static define() {
    return {
      type: StructEnum.T_STATIC_ARRAY,
      name: "static_array"
    };
  }
};
StructFieldType.register(StructStaticArrayField);
var structEval = eval;
function setStructEval(val2) {
  structEval = val2;
}
__name(setStructEval, "setStructEval");
var nGlobal;
if (typeof globalThis !== "undefined") {
  nGlobal = globalThis;
} else if (typeof window !== "undefined") {
  nGlobal = window;
} else if (typeof global !== "undefined") {
  nGlobal = global;
} else if (typeof globals !== "undefined") {
  nGlobal = globals;
} else if (typeof self !== "undefined") {
  nGlobal = self;
}
var DEBUG = {};
function updateDEBUG() {
  for (let k2 in Object.keys(DEBUG)) {
    delete DEBUG[k2];
  }
  if (typeof nGlobal.DEBUG === "object") {
    for (let k2 in nGlobal.DEBUG) {
      DEBUG[k2] = nGlobal.DEBUG[k2];
    }
  }
}
__name(updateDEBUG, "updateDEBUG");
"use strict";
var warninglvl$1 = 2;
var truncateDollarSign = true;
var manager;
function setTruncateDollarSign(v) {
  truncateDollarSign = !!v;
}
__name(setTruncateDollarSign, "setTruncateDollarSign");
function _truncateDollarSign(s) {
  let i2 = s.search("$");
  if (i2 > 0) {
    return s.slice(0, i2).trim();
  }
  return s;
}
__name(_truncateDollarSign, "_truncateDollarSign");
function unmangle(name2) {
  if (truncateDollarSign) {
    return _truncateDollarSign(name2);
  } else {
    return name2;
  }
}
__name(unmangle, "unmangle");
var _static_envcode_null$1 = "";
function gen_tabstr$2(tot) {
  let ret2 = "";
  for (let i2 = 0; i2 < tot; i2++) {
    ret2 += " ";
  }
  return ret2;
}
__name(gen_tabstr$2, "gen_tabstr$2");
var packer_debug$1, packer_debug_start$1, packer_debug_end$1;
function update_debug_data() {
  let ret2 = _get_pack_debug();
  packer_debug$1 = ret2.packer_debug;
  packer_debug_start$1 = ret2.packer_debug_start;
  packer_debug_end$1 = ret2.packer_debug_end;
  warninglvl$1 = ret2.warninglvl;
}
__name(update_debug_data, "update_debug_data");
update_debug_data();
function setWarningMode$1(t2) {
  setWarningMode(t2);
  if (typeof t2 !== "number" || isNaN(t2)) {
    throw new Error("Expected a single number (>= 0) argument to setWarningMode");
  }
  warninglvl$1 = t2;
}
__name(setWarningMode$1, "setWarningMode$1");
function setDebugMode$1(t2) {
  setDebugMode(t2);
  update_debug_data();
}
__name(setDebugMode$1, "setDebugMode$1");
var _ws_env$1 = [[void 0, void 0]];
function do_pack$1(data, val2, obj, thestruct, field, type2) {
  StructFieldTypeMap[field.type.type].pack(manager, data, val2, obj, field, type2);
}
__name(do_pack$1, "do_pack$1");
function define_empty_class(name2) {
  let cls = /* @__PURE__ */ __name(function() {
  }, "cls");
  cls.prototype = Object.create(Object.prototype);
  cls.constructor = cls.prototype.constructor = cls;
  cls.STRUCT = name2 + " {\n  }\n";
  cls.structName = name2;
  cls.prototype.loadSTRUCT = function(reader) {
    reader(this);
  };
  cls.newSTRUCT = function() {
    return new this();
  };
  return cls;
}
__name(define_empty_class, "define_empty_class");
var STRUCT = class _STRUCT {
  static {
    __name(this, "STRUCT");
  }
  constructor() {
    this.idgen = 0;
    this.allowOverriding = true;
    this.structs = {};
    this.struct_cls = {};
    this.struct_ids = {};
    this.compiled_code = {};
    this.null_natives = {};
    function define_null_native(name2, cls) {
      let obj = define_empty_class(name2);
      let stt = struct_parse.parse(obj.STRUCT);
      stt.id = this.idgen++;
      this.structs[name2] = stt;
      this.struct_cls[name2] = cls;
      this.struct_ids[stt.id] = stt;
      this.null_natives[name2] = 1;
    }
    __name(define_null_native, "define_null_native");
    define_null_native.call(this, "Object", Object);
  }
  static inherit(child, parent, structName = child.name) {
    if (!parent.STRUCT) {
      return structName + "{\n";
    }
    let stt = struct_parse.parse(parent.STRUCT);
    let code3 = structName + "{\n";
    code3 += _STRUCT.fmt_struct(stt, true);
    return code3;
  }
  /** invoke loadSTRUCT methods on parent objects.  note that
   reader() is only called once.  it is called however.*/
  static Super(obj, reader) {
    if (warninglvl$1 > 0)
      console.warn("deprecated");
    reader(obj);
    function reader2(obj2) {
    }
    __name(reader2, "reader2");
    let cls = obj.constructor;
    let bad = cls === void 0 || cls.prototype === void 0 || cls.prototype.__proto__ === void 0;
    if (bad) {
      return;
    }
    let parent = cls.prototype.__proto__.constructor;
    bad = bad || parent === void 0;
    if (!bad && parent.prototype.loadSTRUCT && parent.prototype.loadSTRUCT !== obj.loadSTRUCT) {
      parent.prototype.loadSTRUCT.call(obj, reader2);
    }
  }
  //defined_classes is an array of class constructors
  //with STRUCT scripts, *OR* another STRUCT instance
  //
  /** deprecated.  used with old fromSTRUCT interface. */
  static chain_fromSTRUCT(cls, reader) {
    if (warninglvl$1 > 0)
      console.warn("Using deprecated (and evil) chain_fromSTRUCT method, eek!");
    let proto = cls.prototype;
    let parent = cls.prototype.prototype.constructor;
    let obj = parent.fromSTRUCT(reader);
    let obj2 = new cls();
    let keys2 = Object.keys(obj).concat(Object.getOwnPropertySymbols(obj));
    for (let i2 = 0; i2 < keys2.length; i2++) {
      let k2 = keys2[i2];
      try {
        obj2[k2] = obj[k2];
      } catch (error2) {
        if (warninglvl$1 > 0)
          console.warn("  failed to set property", k2);
      }
    }
    return obj2;
  }
  static formatStruct(stt, internal_only, no_helper_js) {
    return this.fmt_struct(stt, internal_only, no_helper_js);
  }
  static fmt_struct(stt, internal_only, no_helper_js) {
    if (internal_only === void 0)
      internal_only = false;
    if (no_helper_js === void 0)
      no_helper_js = false;
    let s = "";
    if (!internal_only) {
      s += stt.name;
      if (stt.id !== -1)
        s += " id=" + stt.id;
      s += " {\n";
    }
    let tab = "  ";
    function fmt_type2(type2) {
      return StructFieldTypeMap[type2.type].format(type2);
      if (type2.type === StructEnum.T_ARRAY || type2.type === StructEnum.T_ITER || type2.type === StructEnum.T_ITERKEYS) {
        if (type2.data.iname !== "" && type2.data.iname !== void 0) {
          return "array(" + type2.data.iname + ", " + fmt_type2(type2.data.type) + ")";
        } else {
          return "array(" + fmt_type2(type2.data.type) + ")";
        }
      } else if (type2.type === StructEnum.T_STATIC_STRING) {
        return "static_string[" + type2.data.maxlength + "]";
      } else if (type2.type === StructEnum.T_STRUCT) {
        return type2.data;
      } else if (type2.type === StructEnum.T_TSTRUCT) {
        return "abstract(" + type2.data + ")";
      } else {
        return StructTypeMap[type2.type];
      }
    }
    __name(fmt_type2, "fmt_type");
    let fields = stt.fields;
    for (let i2 = 0; i2 < fields.length; i2++) {
      let f = fields[i2];
      s += tab + f.name + " : " + fmt_type2(f.type);
      if (!no_helper_js && f.get !== void 0) {
        s += " | " + f.get.trim();
      }
      s += ";\n";
    }
    if (!internal_only)
      s += "}";
    return s;
  }
  validateStructs(onerror) {
    function getType(type2) {
      switch (type2.type) {
        case StructEnum.T_ITERKEYS:
        case StructEnum.T_ITER:
        case StructEnum.T_STATIC_ARRAY:
        case StructEnum.T_ARRAY:
          return getType(type2.data.type);
        case StructEnum.T_TSTRUCT:
          return type2;
        case StructEnum.T_STRUCT:
        default:
          return type2;
      }
    }
    __name(getType, "getType");
    function formatType(type2) {
      let ret2 = {};
      ret2.type = type2.type;
      if (typeof ret2.type === "number") {
        for (let k2 in StructEnum) {
          if (StructEnum[k2] === ret2.type) {
            ret2.type = k2;
            break;
          }
        }
      } else if (typeof ret2.type === "object") {
        ret2.type = formatType(ret2.type);
      }
      if (typeof type2.data === "object") {
        ret2.data = formatType(type2.data);
      } else {
        ret2.data = type2.data;
      }
      return ret2;
    }
    __name(formatType, "formatType");
    function throwError(stt, field, msg) {
      let buf = _STRUCT.formatStruct(stt);
      console.error(buf + "\n\n" + msg);
      if (onerror) {
        onerror(msg, stt, field);
      } else {
        throw new Error(msg);
      }
    }
    __name(throwError, "throwError");
    for (let k2 in this.structs) {
      let stt = this.structs[k2];
      for (let field of stt.fields) {
        if (field.name === "this") {
          let type3 = field.type.type;
          if (ValueTypes.has(type3)) {
            throwError(stt, field, "'this' cannot be used with value types");
          }
        }
        let type2 = getType(field.type);
        if (type2.type !== StructEnum.T_STRUCT && type2.type !== StructEnum.T_TSTRUCT) {
          continue;
        }
        if (!(type2.data in this.structs)) {
          let msg = stt.name + ":" + field.name + ": Unknown struct " + type2.data + ".";
          throwError(stt, field, msg);
        }
      }
    }
  }
  forEach(func, thisvar) {
    for (let k2 in this.structs) {
      let stt = this.structs[k2];
      if (thisvar !== void 0)
        func.call(thisvar, stt);
      else
        func(stt);
    }
  }
  //defaults to structjs.manager
  parse_structs(buf, defined_classes) {
    if (defined_classes === void 0) {
      defined_classes = manager;
    }
    if (defined_classes instanceof _STRUCT) {
      let struct2 = defined_classes;
      defined_classes = [];
      for (let k2 in struct2.struct_cls) {
        defined_classes.push(struct2.struct_cls[k2]);
      }
    }
    if (defined_classes === void 0) {
      defined_classes = [];
      for (let k2 in manager.struct_cls) {
        defined_classes.push(manager.struct_cls[k2]);
      }
    }
    let clsmap = {};
    for (let i2 = 0; i2 < defined_classes.length; i2++) {
      let cls = defined_classes[i2];
      if (!cls.structName && cls.STRUCT) {
        let stt = struct_parse.parse(cls.STRUCT.trim());
        cls.structName = stt.name;
      } else if (!cls.structName && cls.name !== "Object") {
        if (warninglvl$1 > 0)
          console.log("Warning, bad class in registered class list", unmangle(cls.name), cls);
        continue;
      }
      clsmap[cls.structName] = defined_classes[i2];
    }
    struct_parse.input(buf);
    while (!struct_parse.at_end()) {
      let stt = struct_parse.parse(void 0, false);
      if (!(stt.name in clsmap)) {
        if (!(stt.name in this.null_natives)) {
          if (warninglvl$1 > 0)
            console.log("WARNING: struct " + stt.name + " is missing from class list.");
        }
        let dummy = define_empty_class(stt.name);
        dummy.STRUCT = _STRUCT.fmt_struct(stt);
        dummy.structName = stt.name;
        dummy.prototype.structName = dummy.name;
        this.struct_cls[dummy.structName] = dummy;
        this.structs[dummy.structName] = stt;
        if (stt.id !== -1)
          this.struct_ids[stt.id] = stt;
      } else {
        this.struct_cls[stt.name] = clsmap[stt.name];
        this.structs[stt.name] = stt;
        if (stt.id !== -1)
          this.struct_ids[stt.id] = stt;
      }
      let tok = struct_parse.peek();
      while (tok && (tok.value === "\n" || tok.value === "\r" || tok.value === "	" || tok.value === " ")) {
        tok = struct_parse.peek();
      }
    }
  }
  /** adds all structs referenced by cls inside of srcSTRUCT
   *  to this */
  registerGraph(srcSTRUCT, cls) {
    if (!cls.structName) {
      console.warn("class was not in srcSTRUCT");
      return this.register(cls);
    }
    let recStruct;
    let recArray = /* @__PURE__ */ __name((t2) => {
      switch (t2.type) {
        case StructEnum.T_ARRAY:
          return recArray(t2.data.type);
        case StructEnum.T_ITERKEYS:
          return recArray(t2.data.type);
        case StructEnum.T_STATIC_ARRAY:
          return recArray(t2.data.type);
        case StructEnum.T_ITER:
          return recArray(t2.data.type);
        case StructEnum.T_STRUCT:
        case StructEnum.T_TSTRUCT: {
          let st2 = srcSTRUCT.structs[t2.data];
          let cls2 = srcSTRUCT.struct_cls[st2.name];
          return recStruct(st2, cls2);
        }
      }
    }, "recArray");
    recStruct = /* @__PURE__ */ __name((st2, cls2) => {
      if (!(cls2.structName in this.structs)) {
        this.add_class(cls2, cls2.structName);
      }
      for (let f of st2.fields) {
        if (f.type.type === StructEnum.T_STRUCT || f.type.type === StructEnum.T_TSTRUCT) {
          let st22 = srcSTRUCT.structs[f.type.data];
          let cls22 = srcSTRUCT.struct_cls[st22.name];
          recStruct(st22, cls22);
        } else if (f.type.type === StructEnum.T_ARRAY) {
          recArray(f.type);
        } else if (f.type.type === StructEnum.T_ITER) {
          recArray(f.type);
        } else if (f.type.type === StructEnum.T_ITERKEYS) {
          recArray(f.type);
        } else if (f.type.type === StructEnum.T_STATIC_ARRAY) {
          recArray(f.type);
        }
      }
    }, "recStruct");
    let st = srcSTRUCT.structs[cls.structName];
    recStruct(st, cls);
  }
  register(cls, structName) {
    return this.add_class(cls, structName);
  }
  unregister(cls) {
    if (!cls || !cls.structName || !(cls.structName in this.struct_cls)) {
      console.warn("Class not registered with nstructjs", cls);
      return;
    }
    let st = this.structs[cls.structName];
    delete this.structs[cls.structName];
    delete this.struct_cls[cls.structName];
    delete this.struct_ids[st.id];
  }
  add_class(cls, structName) {
    if (cls === Object) {
      return;
    }
    if (cls.STRUCT) {
      let bad = false;
      let p = cls;
      while (p) {
        p = p.__proto__;
        if (p && p.STRUCT && p.STRUCT === cls.STRUCT) {
          bad = true;
          break;
        }
      }
      if (bad) {
        console.warn("Generating STRUCT script for derived class " + unmangle(cls.name));
        if (!structName) {
          structName = unmangle(cls.name);
        }
        cls.STRUCT = _STRUCT.inherit(cls, p) + `
}`;
      }
    }
    if (!cls.STRUCT) {
      throw new Error("class " + unmangle(cls.name) + " has no STRUCT script");
    }
    let stt = struct_parse.parse(cls.STRUCT);
    stt.name = unmangle(stt.name);
    cls.structName = stt.name;
    if (cls.newSTRUCT === void 0) {
      cls.newSTRUCT = function() {
        return new this();
      };
    }
    if (structName !== void 0) {
      stt.name = cls.structName = structName;
    } else if (cls.structName === void 0) {
      cls.structName = stt.name;
    } else {
      stt.name = cls.structName;
    }
    if (cls.structName in this.structs) {
      console.warn("Struct " + unmangle(cls.structName) + " is already registered", cls);
      if (!this.allowOverriding) {
        throw new Error("Struct " + unmangle(cls.structName) + " is already registered");
      }
      return;
    }
    if (stt.id === -1)
      stt.id = this.idgen++;
    this.structs[cls.structName] = stt;
    this.struct_cls[cls.structName] = cls;
    this.struct_ids[stt.id] = stt;
  }
  isRegistered(cls) {
    if (!cls.hasOwnProperty("structName")) {
      return false;
    }
    return cls === this.struct_cls[cls.structName];
  }
  get_struct_id(id) {
    return this.struct_ids[id];
  }
  get_struct(name2) {
    if (!(name2 in this.structs)) {
      console.warn("Unknown struct", name2);
      throw new Error("Unknown struct " + name2);
    }
    return this.structs[name2];
  }
  get_struct_cls(name2) {
    if (!(name2 in this.struct_cls)) {
      console.trace();
      throw new Error("Unknown struct " + name2);
    }
    return this.struct_cls[name2];
  }
  _env_call(code3, obj, env) {
    let envcode = _static_envcode_null$1;
    if (env !== void 0) {
      envcode = "";
      for (let i2 = 0; i2 < env.length; i2++) {
        envcode = "let " + env[i2][0] + " = env[" + i2.toString() + "][1];\n" + envcode;
      }
    }
    let fullcode = "";
    if (envcode !== _static_envcode_null$1)
      fullcode = envcode + code3;
    else
      fullcode = code3;
    let func;
    if (!(fullcode in this.compiled_code)) {
      let code22 = "func = function(obj, env) { " + envcode + "return " + code3 + "}";
      try {
        func = structEval(code22);
      } catch (err) {
        console.warn(err.stack);
        console.warn(code22);
        console.warn(" ");
        throw err;
      }
      this.compiled_code[fullcode] = func;
    } else {
      func = this.compiled_code[fullcode];
    }
    try {
      return func.call(obj, obj, env);
    } catch (err) {
      console.warn(err.stack);
      let code22 = "func = function(obj, env) { " + envcode + "return " + code3 + "}";
      console.warn(code22);
      console.warn(" ");
      throw err;
    }
  }
  write_struct(data, obj, stt) {
    function use_helper_js(field) {
      let type2 = field.type.type;
      let cls = StructFieldTypeMap[type2];
      return cls.useHelperJS(field);
    }
    __name(use_helper_js, "use_helper_js");
    let fields = stt.fields;
    let thestruct = this;
    for (let i2 = 0; i2 < fields.length; i2++) {
      let f = fields[i2];
      let t1 = f.type;
      let t2 = t1.type;
      if (use_helper_js(f)) {
        let val2;
        let type2 = t2;
        if (f.get !== void 0) {
          val2 = thestruct._env_call(f.get, obj);
        } else {
          val2 = f.name === "this" ? obj : obj[f.name];
        }
        if (DEBUG.tinyeval) {
          console.log("\n\n\n", f.get, "Helper JS Ret", val2, "\n\n\n");
        }
        do_pack$1(data, val2, obj, thestruct, f, t1);
      } else {
        let val2 = f.name === "this" ? obj : obj[f.name];
        do_pack$1(data, val2, obj, thestruct, f, t1);
      }
    }
  }
  /**
   @param data : array to write data into,
   @param obj  : structable object
   */
  write_object(data, obj) {
    let cls = obj.constructor.structName;
    let stt = this.get_struct(cls);
    if (data === void 0) {
      data = [];
    }
    this.write_struct(data, obj, stt);
    return data;
  }
  /**
     Read an object from binary data
  
     @param data : DataView or Uint8Array instance
     @param cls_or_struct_id : Structable class
     @param uctx : internal parameter
     @return {cls_or_struct_id} Instance of cls_or_struct_id
     */
  readObject(data, cls_or_struct_id, uctx) {
    if (data instanceof Uint8Array || data instanceof Uint8ClampedArray) {
      data = new DataView(data.buffer);
    } else if (data instanceof Array) {
      data = new DataView(new Uint8Array(data).buffer);
    }
    return this.read_object(data, cls_or_struct_id, uctx);
  }
  /**
   @param data array to write data into,
   @param obj structable object
   */
  writeObject(data, obj) {
    return this.write_object(data, obj);
  }
  writeJSON(obj, stt = void 0) {
    let cls = obj.constructor;
    stt = stt || this.get_struct(cls.structName);
    function use_helper_js(field) {
      let type2 = field.type.type;
      let cls2 = StructFieldTypeMap[type2];
      return cls2.useHelperJS(field);
    }
    __name(use_helper_js, "use_helper_js");
    let toJSON$1 = toJSON;
    let fields = stt.fields;
    let thestruct = this;
    let json = {};
    for (let i2 = 0; i2 < fields.length; i2++) {
      let f = fields[i2];
      let val2;
      let t1 = f.type;
      let json2;
      if (use_helper_js(f)) {
        if (f.get !== void 0) {
          val2 = thestruct._env_call(f.get, obj);
        } else {
          val2 = f.name === "this" ? obj : obj[f.name];
        }
        if (DEBUG.tinyeval) {
          console.log("\n\n\n", f.get, "Helper JS Ret", val2, "\n\n\n");
        }
        json2 = toJSON$1(this, val2, obj, f, t1);
      } else {
        val2 = f.name === "this" ? obj : obj[f.name];
        json2 = toJSON$1(this, val2, obj, f, t1);
      }
      if (f.name !== "this") {
        json[f.name] = json2;
      } else {
        let isArray = Array.isArray(json2);
        isArray = isArray || f.type.type === StructTypes.T_ARRAY;
        isArray = isArray || f.type.type === StructTypes.T_STATIC_ARRAY;
        if (isArray) {
          json.length = json2.length;
          for (let i3 = 0; i3 < json2.length; i3++) {
            json[i3] = json2[i3];
          }
        } else {
          Object.assign(json, json2);
        }
      }
    }
    return json;
  }
  /**
   @param data : DataView or Uint8Array instance
   @param cls_or_struct_id : Structable class
   @param uctx : internal parameter
   */
  read_object(data, cls_or_struct_id, uctx, objInstance) {
    let cls, stt;
    if (data instanceof Array) {
      data = new DataView(new Uint8Array(data).buffer);
    }
    if (typeof cls_or_struct_id === "number") {
      cls = this.struct_cls[this.struct_ids[cls_or_struct_id].name];
    } else {
      cls = cls_or_struct_id;
    }
    if (cls === void 0) {
      throw new Error("bad cls_or_struct_id " + cls_or_struct_id);
    }
    stt = this.structs[cls.structName];
    if (uctx === void 0) {
      uctx = new unpack_context();
      packer_debug$1("\n\n=Begin reading " + cls.structName + "=");
    }
    let thestruct = this;
    let this2 = this;
    function unpack_field2(type2) {
      return StructFieldTypeMap[type2.type].unpack(this2, data, type2, uctx);
    }
    __name(unpack_field2, "unpack_field");
    function unpack_into(type2, dest) {
      return StructFieldTypeMap[type2.type].unpackInto(this2, data, type2, uctx, dest);
    }
    __name(unpack_into, "unpack_into");
    let was_run = false;
    function makeLoader(stt2) {
      return /* @__PURE__ */ __name(function load2(obj) {
        if (was_run) {
          return;
        }
        was_run = true;
        let fields = stt2.fields;
        let flen = fields.length;
        for (let i2 = 0; i2 < flen; i2++) {
          let f = fields[i2];
          if (f.name === "this") {
            unpack_into(f.type, obj);
          } else {
            obj[f.name] = unpack_field2(f.type);
          }
        }
      }, "load");
    }
    __name(makeLoader, "makeLoader");
    let load = makeLoader(stt);
    if (cls.prototype.loadSTRUCT !== void 0) {
      let obj = objInstance;
      if (!obj && cls.newSTRUCT !== void 0) {
        obj = cls.newSTRUCT(load);
      } else if (!obj) {
        obj = new cls();
      }
      obj.loadSTRUCT(load);
      if (!was_run) {
        console.warn("" + cls.structName + ".prototype.loadSTRUCT() did not execute its loader callback!");
        load(obj);
      }
      return obj;
    } else if (cls.fromSTRUCT !== void 0) {
      if (warninglvl$1 > 1)
        console.warn("Warning: class " + unmangle(cls.name) + " is using deprecated fromSTRUCT interface; use newSTRUCT/loadSTRUCT instead");
      return cls.fromSTRUCT(load);
    } else {
      let obj = objInstance;
      if (!obj && cls.newSTRUCT !== void 0) {
        obj = cls.newSTRUCT(load);
      } else if (!obj) {
        obj = new cls();
      }
      load(obj);
      return obj;
    }
  }
  readJSON(json, cls_or_struct_id, objInstance = void 0) {
    let cls, stt;
    if (typeof cls_or_struct_id === "number") {
      cls = this.struct_cls[this.struct_ids[cls_or_struct_id].name];
    } else if (cls_or_struct_id instanceof NStruct) {
      cls = this.get_struct_cls(cls_or_struct_id.name);
    } else {
      cls = cls_or_struct_id;
    }
    if (cls === void 0) {
      throw new Error("bad cls_or_struct_id " + cls_or_struct_id);
    }
    stt = this.structs[cls.structName];
    packer_debug$1("\n\n=Begin reading " + cls.structName + "=");
    let thestruct = this;
    let this2 = this;
    let was_run = false;
    let fromJSON$1 = fromJSON;
    function makeLoader(stt2) {
      return /* @__PURE__ */ __name(function load2(obj) {
        if (was_run) {
          return;
        }
        was_run = true;
        let fields = stt2.fields;
        let flen = fields.length;
        for (let i2 = 0; i2 < flen; i2++) {
          let f = fields[i2];
          let val2;
          if (f.name === "this") {
            val2 = json;
          } else {
            val2 = json[f.name];
          }
          if (val2 === void 0) {
            console.warn("nstructjs.readJSON: Missing field " + f.name + " in struct " + stt2.name);
            continue;
          }
          let instance = f.name === "this" ? obj : objInstance;
          let ret2 = fromJSON$1(this2, val2, obj, f, f.type, instance);
          if (f.name !== "this") {
            obj[f.name] = ret2;
          }
        }
      }, "load");
    }
    __name(makeLoader, "makeLoader");
    let load = makeLoader(stt);
    if (cls.prototype.loadSTRUCT !== void 0) {
      let obj = objInstance;
      if (!obj && cls.newSTRUCT !== void 0) {
        obj = cls.newSTRUCT(load);
      } else if (!obj) {
        obj = new cls();
      }
      obj.loadSTRUCT(load);
      return obj;
    } else if (cls.fromSTRUCT !== void 0) {
      if (warninglvl$1 > 1)
        console.warn("Warning: class " + unmangle(cls.name) + " is using deprecated fromSTRUCT interface; use newSTRUCT/loadSTRUCT instead");
      return cls.fromSTRUCT(load);
    } else {
      let obj = objInstance;
      if (!obj && cls.newSTRUCT !== void 0) {
        obj = cls.newSTRUCT(load);
      } else if (!obj) {
        obj = new cls();
      }
      load(obj);
      return obj;
    }
  }
};
;
manager = new STRUCT();
function write_scripts(nManager = manager, include_code = false) {
  let buf = "";
  nManager.forEach(function(stt) {
    buf += STRUCT.fmt_struct(stt, false, !include_code) + "\n";
  });
  let buf2 = buf;
  buf = "";
  for (let i2 = 0; i2 < buf2.length; i2++) {
    let c = buf2[i2];
    if (c === "\n") {
      buf += "\n";
      let i22 = i2;
      while (i2 < buf2.length && (buf2[i2] === " " || buf2[i2] === "	" || buf2[i2] === "\n")) {
        i2++;
      }
      if (i2 !== i22)
        i2--;
    } else {
      buf += c;
    }
  }
  return buf;
}
__name(write_scripts, "write_scripts");
"use strict";
var nbtoa, natob;
if (typeof btoa === "undefined") {
  nbtoa = /* @__PURE__ */ __name(function btoa3(str) {
    let buffer = new Buffer("" + str, "binary");
    return buffer.toString("base64");
  }, "btoa");
  natob = /* @__PURE__ */ __name(function atob3(str) {
    return new Buffer(str, "base64").toString("binary");
  }, "atob");
} else {
  natob = atob;
  nbtoa = btoa;
}
function versionToInt(v) {
  v = versionCoerce(v);
  let mul = 64;
  return ~~(v.major * mul * mul * mul + v.minor * mul * mul + v.micro * mul);
}
__name(versionToInt, "versionToInt");
var ver_pat = /[0-9]+\.[0-9]+\.[0-9]+$/;
function versionCoerce(v) {
  if (!v) {
    throw new Error("empty version: " + v);
  }
  if (typeof v === "string") {
    if (!ver_pat.exec(v)) {
      throw new Error("invalid version string " + v);
    }
    let ver = v.split(".");
    return {
      major: parseInt(ver[0]),
      minor: parseInt(ver[1]),
      micro: parseInt(ver[2])
    };
  } else if (Array.isArray(v)) {
    return {
      major: v[0],
      minor: v[1],
      micro: v[2]
    };
  } else if (typeof v === "object") {
    let test2 = /* @__PURE__ */ __name((k2) => k2 in v && typeof v[k2] === "number", "test");
    if (!test2("major") || !test2("minor") || !test2("micro")) {
      throw new Error("invalid version object: " + v);
    }
    return v;
  } else {
    throw new Error("invalid version " + v);
  }
}
__name(versionCoerce, "versionCoerce");
function versionLessThan(a2, b) {
  return versionToInt(a2) < versionToInt(b);
}
__name(versionLessThan, "versionLessThan");
var FileParams = class {
  static {
    __name(this, "FileParams");
  }
  constructor() {
    this.magic = "STRT";
    this.ext = ".bin";
    this.blocktypes = ["DATA"];
    this.version = {
      major: 0,
      minor: 0,
      micro: 1
    };
  }
};
var Block = class {
  static {
    __name(this, "Block");
  }
  constructor(type_magic, data) {
    this.type = type_magic;
    this.data = data;
  }
};
var FileeError = class extends Error {
  static {
    __name(this, "FileeError");
  }
};
var FileHelper = class {
  static {
    __name(this, "FileHelper");
  }
  //params can be FileParams instance, or object literal
  //(it will convert to FileParams)
  constructor(params) {
    if (params === void 0) {
      params = new FileParams();
    } else {
      let fp = new FileParams();
      for (let k2 in params) {
        fp[k2] = params[k2];
      }
      params = fp;
    }
    this.version = params.version;
    this.blocktypes = params.blocktypes;
    this.magic = params.magic;
    this.ext = params.ext;
    this.struct = void 0;
    this.unpack_ctx = void 0;
  }
  read(dataview) {
    this.unpack_ctx = new unpack_context();
    let magic = unpack_static_string(dataview, this.unpack_ctx, 4);
    if (magic !== this.magic) {
      throw new FileError("corrupted file");
    }
    this.version = {};
    this.version.major = unpack_short(dataview, this.unpack_ctx);
    this.version.minor = unpack_byte(dataview, this.unpack_ctx);
    this.version.micro = unpack_byte(dataview, this.unpack_ctx);
    let struct = this.struct = new STRUCT();
    let scripts = unpack_string(dataview, this.unpack_ctx);
    this.struct.parse_structs(scripts, manager);
    let blocks = [];
    let dviewlen = dataview.buffer.byteLength;
    while (this.unpack_ctx.i < dviewlen) {
      let type2 = unpack_static_string(dataview, this.unpack_ctx, 4);
      let datalen = unpack_int(dataview, this.unpack_ctx);
      let bstruct = unpack_int(dataview, this.unpack_ctx);
      let bdata;
      if (bstruct === -2) {
        bdata = unpack_static_string(dataview, this.unpack_ctx, datalen);
      } else {
        bdata = unpack_bytes(dataview, this.unpack_ctx, datalen);
        bdata = struct.read_object(bdata, bstruct, new unpack_context());
      }
      let block = new Block();
      block.type = type2;
      block.data = bdata;
      blocks.push(block);
    }
    this.blocks = blocks;
    return blocks;
  }
  doVersions(old) {
    let blocks = this.blocks;
    if (versionLessThan(old, "0.0.1")) {
    }
  }
  write(blocks) {
    this.struct = manager;
    this.blocks = blocks;
    let data = [];
    pack_static_string(data, this.magic, 4);
    pack_short(data, this.version.major);
    pack_byte(data, this.version.minor & 255);
    pack_byte(data, this.version.micro & 255);
    let scripts = write_scripts();
    pack_string(data, scripts);
    let struct = this.struct;
    for (let block of blocks) {
      if (typeof block.data === "string") {
        pack_static_string(data, block.type, 4);
        pack_int(data, block.data.length);
        pack_int(data, -2);
        pack_static_string(data, block.data, block.data.length);
        continue;
      }
      let structName = block.data.constructor.structName;
      if (structName === void 0 || !(structName in struct.structs)) {
        throw new Error("Non-STRUCTable object " + block.data);
      }
      let data2 = [];
      let stt = struct.structs[structName];
      struct.write_object(data2, block.data);
      pack_static_string(data, block.type, 4);
      pack_int(data, data2.length);
      pack_int(data, stt.id);
      pack_bytes(data, data2);
    }
    return new DataView(new Uint8Array(data).buffer);
  }
  writeBase64(blocks) {
    let dataview = this.write(blocks);
    let str = "";
    let bytes = new Uint8Array(dataview.buffer);
    for (let i2 = 0; i2 < bytes.length; i2++) {
      str += String.fromCharCode(bytes[i2]);
    }
    return nbtoa(str);
  }
  makeBlock(type2, data) {
    return new Block(type2, data);
  }
  readBase64(base64) {
    let data = natob(base64);
    let data2 = new Uint8Array(data.length);
    for (let i2 = 0; i2 < data.length; i2++) {
      data2[i2] = data.charCodeAt(i2);
    }
    return this.read(new DataView(data2.buffer));
  }
};
var struct_filehelper = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  versionToInt,
  versionCoerce,
  versionLessThan,
  FileParams,
  Block,
  FileeError,
  FileHelper
});
function truncateDollarSign$1(value = true) {
  setTruncateDollarSign(value);
}
__name(truncateDollarSign$1, "truncateDollarSign$1");
function validateStructs(onerror) {
  return manager.validateStructs(onerror);
}
__name(validateStructs, "validateStructs");
function setEndian$1(mode) {
  let ret2 = STRUCT_ENDIAN;
  setEndian(mode);
  return ret2;
}
__name(setEndian$1, "setEndian$1");
function getEndian() {
  return STRUCT_ENDIAN;
}
__name(getEndian, "getEndian");
function setAllowOverriding(t2) {
  return manager.allowOverriding = !!t2;
}
__name(setAllowOverriding, "setAllowOverriding");
function isRegistered(cls) {
  return manager.isRegistered(cls);
}
__name(isRegistered, "isRegistered");
function register(cls, structName) {
  return manager.register(cls, structName);
}
__name(register, "register");
function unregister(cls) {
  manager.unregister(cls);
}
__name(unregister, "unregister");
function inherit(child, parent, structName = child.name) {
  return STRUCT.inherit(...arguments);
}
__name(inherit, "inherit");
function readObject(data, cls, __uctx = void 0) {
  return manager.readObject(data, cls, __uctx);
}
__name(readObject, "readObject");
function writeObject(data, obj) {
  return manager.writeObject(data, obj);
}
__name(writeObject, "writeObject");
function writeJSON(obj) {
  return manager.writeJSON(obj);
}
__name(writeJSON, "writeJSON");
function readJSON(json, class_or_struct_id) {
  return manager.readJSON(json, class_or_struct_id);
}
__name(readJSON, "readJSON");

// core/ast.js
function exit3() {
  process.exit(-1);
}
__name(exit3, "exit");
var idgen = 0;
var strtable = /* @__PURE__ */ new Map();
var hashtable = /* @__PURE__ */ new Map();
window.strtable = strtable;
function strTableAdd(type2) {
  let hash = strhash(type2);
  let entry = hashtable.get(hash);
  while (entry !== void 0 && entry !== type2) {
    hash++;
    entry = hashtable.get(hash);
  }
  hashtable.set(hash, type2);
  strtable.set(type2, hash);
  return hash;
}
__name(strTableAdd, "strTableAdd");
var AstTypes = [
  "Function",
  "VarType",
  "ExprList",
  "VarDecl",
  "InitDeclaratorList",
  "StatementList",
  "Ident",
  "IntConstant",
  "ArrayLookup",
  "Call",
  "Assign",
  "Return",
  "Program",
  "BinOp",
  "Precision",
  "TypeQualifier",
  "FloatConstant",
  "BasicMemberLookup",
  "Trinary"
];
for (let key of AstTypes) {
  strTableAdd(key);
}
window.jsonCompress = function(json) {
  let delim = `"',.{}[]|: `;
  let delimMap = {};
  let dicti = 0;
  for (let i2 = 0; i2 < delim.length; i2++) {
    delimMap[delim[i2]] = dicti++;
  }
  let delimPat = /["',\\.{}[]|: ]/;
  json = json.replace(/[ \t]+/g, " ");
  let dict = {};
  let ret2 = [];
  let word = "";
  for (let i2 = 0; i2 < json.length; i2++) {
    let c = json[i2];
    if (c in delimMap) {
      if (word.length > 0) {
        let j = dict[word];
        if (j === void 0) {
          j = dict[word] = dicti++;
        }
        ret2.push(j);
      }
      word = "";
      ret2.push(delimMap[c]);
    } else {
      word += c;
    }
  }
  if (word.length > 0) {
    let j = dict[word];
    if (j === void 0) {
      j = dict[word] = dicti++;
    }
    ret2.push(j);
  }
  let s = [];
  for (let k2 in dict) {
    s.push(k2.length);
    for (let i2 = 0; i2 < k2.length; i2++) {
      s.push(k2.charCodeAt(i2));
    }
  }
  s.push(0);
  for (let i2 of ret2) {
    let n2 = i2;
    let ok = true;
    do {
      if (n2 > 127) {
        s.push(n2 & 127 | 128);
        n2 >>= 7;
        ok = false;
      } else {
        ok = true;
      }
    } while (!ok);
    s.push(n2);
  }
  return s;
};
var ASTNode = class _ASTNode extends Array {
  static {
    __name(this, "ASTNode");
  }
  constructor(type2) {
    super();
    this.id = idgen++;
    this.type = type2;
    this.parent = void 0;
    this._getTypeId();
    this.line = state.line;
    this.lexpos = state.lexpos;
    this.col = state.col;
  }
  toJSON() {
    let ret2 = Object.assign({}, this);
    delete ret2.parent;
    ret2.length = this.length;
    for (let i2 = 0; i2 < this.length; i2++) {
      ret2[i2] = this[i2];
    }
    return ret2;
  }
  loadJSON(json) {
    this.type = json.type;
    this.id = json.id;
    this.ntype = json.ntype;
    this.op = json.op;
    this.line = json.line;
    this.lexpos = json.lexpos;
    this.col = json.col;
    this.polyKey = json.polyKey;
    this.noScope = json.noScope;
    this.qualifier = json.qualifier;
    this.value = json.value;
    if (typeof this.ntype === "object") {
      this.ntype = VarType.fromJSON(this.ntype);
    }
    if (typeof this.qualifier === "object") {
      let n2 = new _ASTNode(this.qualifier.type);
      n2.loadJSON(this.qualifier);
      this.qualifier = n2;
    }
    if (typeof this.value === "object") {
      if (this.value.Class) {
        this.value = VarType.fromJSON(this.value);
      } else {
        let n2 = new _ASTNode(this.value.type);
        n2.loadJSON(this.value);
        this.value = n2;
      }
    }
    for (let i2 = 0; i2 < json.length; i2++) {
      let child = json[i2];
      let n2 = new _ASTNode(child.type);
      n2.loadJSON(child);
      n2.parent = this;
      this.push(n2);
    }
    return this;
  }
  static equalsVarRef(n2, vref) {
    let ok = false;
    if (vref[0].value instanceof ArrayType && n2.type === "ArrayLookup") {
      ok = n2[0].value === vref.value;
      ok = ok && n2[1].value === vref[1].value;
    } else if (n2.type === "Ident" && !(vref[0].value instanceof ArrayType)) {
      ok = vref.value === n2.value;
    }
    return ok;
  }
  /*
  
    get ntype() {
      return this._ntype;
    }
  
    set ntype(v) {
      if (this[0] && this.type === "Call") {
        let name = this[0]
        if (name.type === "VarType") {
          name = name.value.getTypeNameSafe();
        } else {
          name = name.value;
        }
  
        if (name.search("sqrt") >= 0) {
          console.log("\n\n\n");
          console.trace(util.termColor(`${this.line}: Set ${name}'s type to ${v}`, "red"));
        }
      }
      this._ntype = v;
    }
     */
  static VarRef(name2, type2, idx) {
    let n2 = new _ASTNode("VarRef");
    n2.value = name2;
    n2.push(type2);
    if (type2 instanceof ArrayType) {
      let n22 = new _ASTNode("IntConstant");
      n22.value = idx;
      n2.push(n22);
    }
    return n2;
  }
  static isAssign(node2) {
    return node2.type === "Assign";
  }
  _getTypeId() {
    let hash = strtable.get(this.type);
    if (hash !== void 0) {
      return hash;
    }
    return strTableAdd("" + this.type);
  }
  set(idx, n2) {
    this.length = Math.max(this.length, idx + 1);
    if (this.idx && this.idx.parent === this) {
      this.idx.parent = void 0;
    }
    if (n2.parent) {
      n2.parent.remove(n2);
    }
    this[idx] = n2;
    n2.parent = this;
    return this;
  }
  copyPosTo(b) {
    b.line = this.line;
    b.col = this.col;
    b.lexpos = this.lexpos;
  }
  prepend(n2) {
    this.length++;
    for (let i2 = this.length - 1; i2 > 0; i2--) {
      this[i2] = this[i2 - 1];
    }
    this[0] = n2;
    return this;
  }
  copy() {
    let n2 = new _ASTNode(this.type);
    n2.noScope = this.noScope;
    n2.qualifier = this.qualifier;
    n2.polyKey = this.polyKey;
    n2.line = this.line;
    n2.lexpos = this.lexpos;
    n2.col = this.col;
    n2.ntype = this.ntype;
    n2.value = this.value;
    n2.op = this.op;
    for (let n22 of this) {
      n2.push(n22.copy());
    }
    return n2;
  }
  push(n2) {
    if (n2 === void 0) {
      throw new Error("ASTNode.push got undefined");
    }
    if (typeof n2 === "number") {
      let isint = Math.abs(n2 - Math.floor(n2)) < 1e-8;
      let n22 = new _ASTNode(isint ? "IntConstant" : "FloatConstant");
      n22.value = n2;
      n2 = n22;
    } else if (typeof n2 === "string") {
      let n22 = new _ASTNode("Ident");
      n22.value = n2;
      n2 = n22;
    } else if (n2 instanceof VarType) {
      let n22 = new _ASTNode("VarType");
      n22.value = n2;
      n2 = n22;
    }
    n2.parent = this;
    return super.push(n2);
  }
  replace(a2, b) {
    let idx = this.indexOf(a2);
    if (idx < 0) {
      throw new Error("child not in node");
    }
    if (b.parent) {
      b.parent.remove(b);
    }
    if (a2.parent === this) {
      a2.parent = void 0;
    }
    this[idx] = b;
    b.parent = this;
    return this;
  }
  remove(n2) {
    let i2 = this.indexOf(n2);
    if (i2 < 0) {
      console.log(n2);
      throw new Error("item not in array");
    }
    while (i2 < this.length) {
      this[i2] = this[i2 + 1];
      i2++;
    }
    if (n2.parent === this) {
      n2.parent = void 0;
    }
    this.length--;
    return this;
  }
  insert(starti, n2) {
    if (n2.parent) {
      n2.parent.remove(n2);
    }
    this.length++;
    let i2 = this.length - 1;
    while (i2 > starti) {
      this[i2] = this[i2 - 1];
      i2--;
    }
    n2.parent = this;
    this[starti] = n2;
    return this;
  }
  lineStr() {
    return `${this.type}:${this.id} ${this.value}`;
  }
  toString(t2 = 0) {
    let tab = indent(t2, "-");
    let typestr = this.type;
    if (this.value !== void 0) {
      typestr += " : " + this.value;
    } else if (this.op !== void 0) {
      typestr += " (" + this.op + ")";
    }
    if (this.ntype !== void 0) {
      typestr += " <" + termPrint(this.ntype.getTypeNameSafe() + ">", "red");
    }
    let s = tab + typestr + " { line:" + (this.line + 1);
    if (this.length === 0) {
      s += "}\n";
    } else {
      s += "\n";
      for (let c of this) {
        s += c.toString(t2 + 1);
      }
      s += tab + "}\n";
    }
    if (t2 === 0) {
      s = termColor(s, "cyan");
    }
    return s;
  }
};
ASTNode.STRUCT = `
ASTNode {
  type   : int | this._getTypeId();
}
`;
register(ASTNode, "ASTNode");
function visit(root, nodetype, handler) {
  let rec = /* @__PURE__ */ __name((n2) => {
    if (n2.type === nodetype) {
      handler(n2);
    }
    for (let n22 of n2) {
      rec(n22);
    }
  }, "rec");
  rec(root);
}
__name(visit, "visit");
function traverse(root, state2, handlers, log4 = false, bottomUp = false) {
  let visitset = /* @__PURE__ */ new Set();
  handlers._visitset = visitset;
  let rec = /* @__PURE__ */ __name((n2, state3, depth = 0) => {
    if (visitset.has(n2)) {
      return;
    }
    visitset.add(n2);
    let visit3 = /* @__PURE__ */ __name((state4, nb) => {
      if (visitset.has(nb)) {
        visitset.delete(nb);
        for (let n22 of nb) {
          rec(n22, state4, depth + 1);
        }
      } else {
        rec(nb, state4, depth + 1);
      }
    }, "visit");
    let key = n2.type;
    if (log4) {
      let tab = indent(depth, " ");
      let line = termColor2(tab + key, "red");
      console.log(termPrint(line));
    }
    if (key in handlers) {
      visitset.add(n2);
      handlers[key](n2, state3, visit3);
      visitset.delete(n2);
    } else if ("Default" in handlers) {
      visitset.add(n2);
      handlers.Default(n2, state3, visit3);
      visitset.delete(n2);
    } else {
      visit3(state3, n2);
    }
  }, "rec");
  rec(root, state2);
}
__name(traverse, "traverse");
function walk(root, handlers) {
  let rec = /* @__PURE__ */ __name((n2) => {
    let key = n2.type;
    if (key in handlers) {
      handlers[key](n2);
    } else if ("Default" in handlers) {
      handlers.Default(n2);
    }
    for (let n22 of n2) {
      rec(n22);
    }
  }, "rec");
  rec(root);
}
__name(walk, "walk");
function scopeWalk(root, ctx2, handlers, log4 = false, bottomUp = false) {
  ctx2.pushScope();
  function visit3(n2) {
    if (n2.type in handlers) {
      handlers[n2.type](n2, ctx2);
    }
  }
  __name(visit3, "visit");
  function dodescend(descend, ctx3, node2) {
    if (bottomUp) {
      descend(ctx3, node2);
      visit3(node2);
    } else {
      visit3(node2);
      descend(ctx3, node2);
    }
  }
  __name(dodescend, "dodescend");
  let handlers2 = {
    VarDecl(node2, ctx3, descend) {
      let name2 = node2.value;
      let type2 = node2[0].value;
      ctx3.setScope(name2, type2);
      dodescend(descend, ctx3, node2);
    },
    BinOp(node2, ctx3, descend) {
      let pop = false;
      if (node2.op === ".") {
        pop = true;
        ctx3.pushScope();
        let name2;
        if (node2[0].type === "Ident") {
          name2 = node2[0].value;
        } else {
          name2 = "";
        }
        if (!(name2 in ctx3.scope)) {
          ctx3.error(node2, name2 + " is not defined");
        }
        ctx3.setScope("this", ctx3.getScope(name2));
      }
      dodescend(descend, ctx3, node2);
      if (pop) {
        ctx3.popScope();
      }
    },
    Function(node2, ctx3, descend) {
      let name2 = node2.value;
      let rtype = node2[0].value;
      ctx3.pushScope();
      ctx3.setReturnType(rtype);
      dodescend(descend, ctx3, node2);
      ctx3.popScope();
    },
    Default(node2, ctx3, descend) {
      dodescend(descend, ctx3, node2);
    }
  };
  traverse(root, ctx2, handlers2, log4, bottomUp);
  ctx2.popScope();
}
__name(scopeWalk, "scopeWalk");

// generators/generator_base.js
var CodeGenerators = [];
var CodeGenerator = class _CodeGenerator {
  static {
    __name(this, "CodeGenerator");
  }
  constructor(ctx2, args2 = {}) {
    this.ctx = ctx2;
    this.args = args2;
  }
  genCode(ast) {
  }
  static generatorDefine() {
    return {
      typeName: ""
    };
  }
  static getGenerator(name2) {
    for (let cls of CodeGenerators) {
      if (cls.generatorDefine().typeName === name2) {
        return cls;
      }
    }
  }
  static register(cls) {
    if (cls.generatorDefine === _CodeGenerator.generatorDefine) {
      throw new Error("missing generatorDefine static method for " + cls.name);
    }
    CodeGenerators.push(cls);
  }
};

// generators/javascript.js
var keys = /* @__PURE__ */ new Set([
  "abs",
  "sin",
  "cos",
  "acos",
  "asin",
  "log",
  "sqrt",
  "exp",
  "tan",
  "min",
  "max",
  "floor",
  "ceil",
  "trunc",
  "fract"
]);
var mathcode = "";
for (let k2 of keys) {
  mathcode += `let _$_${k2}_float_float = Math.${k2};
`;
}
var jslib = `
  ${mathcode}
    
  let _$_trunc_int_int = Math.trunc;
  let _$_pow_float_floatfloat = Math.pow;
   
  function _$_atan_float_floatfloat(y, x) {
    if (x !== undefined) {
      return Math.atan2(y, x);
    }
    
    return Math.atan(y);
  }
  
  function cachering(func, count) {
    this.list = new Array(count);
    this.length = count;
    
    for (let i=0; i<this.length; i++) {
      this.list[i] = func();
    }
    
    this.cur = 0;
  }
  
  cachering.prototype = Object.create(Object.prototype);
  cachering.prototype.next = function() {
      let ret = this.list[this.cur];
      
      this.cur = (this.cur + 1) % this.length;
      return ret;
  };
  cachering.prototype.push = function() {
    return this[this.cur++];
  };
  cachering.prototype.pop = function() {
    return [this.cur--];
  };
  
  let vec2cache = new cachering(() => [0, 0], 2048);
  
  let vec3cache = new cachering(() => [0, 0, 0], 2048);
  let vec4cache = new cachering(() => [0, 0, 0, 0], 2048);
  let mat3cache = new cachering(() => [[0,0,0], [0,0,0], [0,0,0]], 2048);
  let mat4cache = new cachering(() => [[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]], 2048);

  let vec2stack = new cachering(() => [0, 0], 128);
  let vec3stack = new cachering(() => [0, 0, 0], 128);
  let vec4stack = new cachering(() => [0, 0, 0, 0], 128);
  let mat3stack = new cachering(() => [[0,0,0], [0,0,0], [0,0,0]], 128);
  let mat4stack = new cachering(() => [[0,0,0,0], [0,0,0,0], [0,0,0,0], [0,0,0,0]], 128);
    
`;
var JSGenerator = class extends CodeGenerator {
  static {
    __name(this, "JSGenerator");
  }
  constructor(ctx2, args2) {
    super(ctx2, args2);
  }
  static generatorDefine() {
    return {
      typeName: "js"
    };
  }
  genCode(ast = this.ctx.ast) {
    let ctx2 = this.ctx;
    let outs = "";
    function out(s) {
      outs += s;
    }
    __name(out, "out");
    function endstatement(s = ";") {
      if (!outs.trim().endsWith(s)) {
        outs = outs.trim();
        out(s);
      }
    }
    __name(endstatement, "endstatement");
    let inputs = "";
    for (let k2 in ctx2.inputs) {
      if (inputs.length > 0) {
        inputs += ", ";
      } else {
        inputs = "let ";
      }
      inputs += k2;
    }
    if (inputs.length > 0) {
      inputs += ";";
    }
    for (let k2 in ctx2.uniforms) {
      let n2 = ctx2.uniforms[k2];
      let type2 = n2[0];
      let init = "0";
      let setter = `    ${k2} = val;`;
      if (type2.value instanceof ArrayType) {
        setter = "";
        init = "[";
        for (let i2 = 0; i2 < type2.value.size; i2++) {
          if (i2 > 0) {
            init += ",";
          }
          setter += `    ${k2}[${i2}] = val[${i2}];
`;
          init += "0";
        }
        init += "]";
      }
      let s = `
  
  let ${k2} = ${init};
  function __set${k2}(val) {
${setter}
  }
    `.trim();
      out("  " + s + "\n\n");
    }
    outs = `${jslib}
    
    program = function() {
  let __outs;
  ${inputs}

` + outs;
    let outmap = {};
    let oi = 0;
    for (let k2 in ctx2.outputs) {
      outmap[k2] = oi++;
    }
    let totoutput = oi;
    let tlvl = 1;
    let usestack = false;
    let state2 = {
      stack: [],
      stackcur: 0,
      stackscope: {},
      scope: {},
      pushNode: void 0,
      copy() {
        let ret2 = Object.assign({}, this);
        ret2.scope = Object.assign({}, this.scope);
        ret2.stackscope = Object.assign({}, this.stackscope);
        ret2.copy = this.copy;
        return ret2;
      },
      vardecl(name2, type2) {
        this.stackscope[name2] = type2;
        this.stack.push(name2);
        return this.stackcur++;
      },
      leave() {
        if (usestack) {
          for (let k2 in this.stackscope) {
            let type2 = this.stackscope[k2];
            out(indent(tlvl) + `    ${type2}stack_cur--;
`);
            this.stack.pop();
            this.stackcur--;
          }
        }
        this.stackscope = {};
        return this;
      }
    };
    let statestack2 = [];
    function push(pushNode) {
      let s = state2.copy();
      statestack2.push(state2);
      state2 = s;
      state2.pushNode = pushNode;
      return s;
    }
    __name(push, "push");
    function pop(pushNode) {
      if (state2.pushNode === pushNode) {
        let s = state2;
        state2.leave();
        state2 = statestack2.pop();
        return s;
      }
    }
    __name(pop, "pop");
    function rec(n2) {
      if (n2.type === "ArrayLookup") {
        rec(n2[0]);
        out("[");
        rec(n2[1]);
        out("]");
      } else if (n2.type === "VarDecl") {
        let ok = n2.value in ctx2.inputs || n2.value in ctx2.outputs || n2.value in ctx2.uniforms;
        let inFunc = false;
        let p = n2.parent;
        while (p !== void 0) {
          if (p.type === "Function") {
            inFunc = true;
            break;
          }
          p = p.parent;
        }
        if (ok && inFunc) {
          let n22;
          n22 = n2.value in ctx2.inputs ? ctx2.inputs[n2.value] : void 0;
          n22 = n2.value in ctx2.outputs ? ctx2.outputs[n2.value] : void 0;
          n22 = n2.value in ctx2.uniforms ? ctx2.uniforms[n2.value] : void 0;
          if (n22 === ctx2.getScope(n2.value)) {
            ok = false;
          }
        }
        if (!ok) {
          out(`let ${n2.value}`);
          if (n2.length > 1 && n2[1].length > 0) {
            out(" = ");
            rec(n2[1]);
          } else {
            let type2 = ctx2.resolveType(n2[0].value);
            type2 = type2.getTypeNameSafe();
            if (type2 === "vec2" || type2 === "vec3" || type2 === "vec4" || type2 === "mat4" || type2 === "mat3") {
              out(" = ");
              if (usestack) {
                let i2 = state2.vardecl(n2.value, type2);
                out(`${type2}stack[${type2}stack_cur++];
`);
              } else {
                out(`${type2}cache.next();`);
              }
            }
          }
          out(";");
        }
      } else if (n2.type === "PostDec") {
        rec(n2[0]);
        out("--");
      } else if (n2.type === "PreDec") {
        out("--");
        rec(n2[0]);
      } else if (n2.type === "PostInc") {
        rec(n2[0]);
        out("++");
      } else if (n2.type === "PreInc") {
        out("++");
        rec(n2[0]);
      } else if (n2.type === "ForLoop") {
        push(n2);
        out("for (");
        let tlvl2 = tlvl;
        tlvl = 0;
        rec(n2[0]);
        tlvl = tlvl2;
        outs = outs.trim();
        endstatement(";");
        rec(n2[1][0]);
        outs = outs.trim();
        endstatement(";");
        rec(n2[1][1]);
        outs = outs.trim();
        if (outs.endsWith(";")) {
          outs = outs.slice(0, outs.length - 1);
        }
        out(") {\n");
        tlvl++;
        rec(n2[2]);
        tlvl--;
        out("}\n");
        pop(n2);
      } else if (n2.type === "Return") {
        let i1, i2, off, type2, p, tname;
        let tab = indent(tlvl + 2);
        if (usestack) {
          out("{\n");
          i1 = state2.stackcur;
          pop(state2.pushNode);
          i2 = state2.stackcur;
          off = i2 - i1;
          let p2 = n2;
          while (p2) {
            if (p2.ntype) {
              type2 = p2.ntype;
              break;
            }
            p2 = p2.parent;
          }
          type2 = type2 ?? ctx2.getReturnType();
          tname = type2.getTypeNameSafe();
          out(`${tab}${tname}stack[${tname}stack_cur]`);
          out(`.load(${tname}stack[${tname}stack_cur + (${off})]);
`);
          out(`${tab}${tname}stack_cur++;
`);
        }
        out(tab + "return");
        if (n2.length > 0) {
          out(" ");
          for (let n22 of n2) {
            rec(n22);
          }
          out(";");
        }
        if (usestack) {
          out("\n" + indent(tlvl) + "}\n");
        }
      } else if (n2.type === "Trinary") {
        out("((");
        rec(n2[0]);
        out(") ? (");
        rec(n2[1]);
        out(") : (");
        rec(n2[2]);
        out("))");
      } else if (n2.type === "If") {
        out("if (");
        rec(n2[0]);
        out(") {\n");
        rec(n2[1][0]);
        out(indent(tlvl) + "}");
        if (n2[1].length > 1) {
          out(" else {\n");
          if (n2[1][1].type === "If") {
            tlvl++;
            out(indent(tlvl));
          }
          rec(n2[1][1]);
          if (n2[1][1].type === "If") {
            tlvl--;
          }
          out(indent(tlvl) + "}\n");
        } else {
          out("\n");
        }
      } else if (n2.type === "UnaryOp") {
        out(n2.op);
        rec(n2[0]);
      } else if (n2.type === "BinOp" || n2.type === "Assign") {
        let paren = false;
        if (n2.parent && n2.parent.type === "BinOp") {
          paren = n2.parent.prec < n2.prec;
        }
        if (paren) {
          out("(");
        }
        rec(n2[0]);
        if (n2.op !== ".") {
          out(" " + n2.op + " ");
        } else {
          out(n2.op);
        }
        rec(n2[1]);
        if (paren) {
          out(")");
        }
      } else if (n2.type === "Ident") {
        if (n2.value in ctx2.outputs) {
          out(`__outs[${outmap[n2.value]}]`);
        } else {
          out(n2.value);
        }
      } else if (n2.type === "Call") {
        let name2;
        if (n2[0].type === "VarType") {
          name2 = n2[0].value.getTypeName();
        } else {
          name2 = n2[0].value;
        }
        if (name2 === "int_cast") {
          out("~~");
        }
        out(name2);
        out("(");
        rec(n2[1]);
        out(")");
      } else if (n2.type === "ExprList") {
        let i2 = 0;
        for (let n22 of n2) {
          if (i2 > 0) {
            out(", ");
          }
          rec(n22);
          i2++;
        }
      } else if (n2.type === "FloatConstant") {
        out(n2.value.toFixed(7));
      } else if (n2.type === "IntConstant") {
        out("" + n2.value);
      } else if (n2.type === "Precision") {
        return;
      } else if (n2.type === "Function") {
        let fname = n2.polyKey ?? n2.value;
        if (n2.value === "main") {
          fname = "main";
        }
        out(`
  function ${fname}(`);
        let i2 = 0;
        for (let c of n2[1]) {
          if (i2 > 0) {
            out(", ");
          }
          out(c.value);
          i2++;
        }
        out(") {\n");
        tlvl++;
        push(n2);
        rec(n2[2]);
        pop(n2);
        tlvl--;
        out(indent(tlvl) + "}\n");
      } else if (n2.type === "StatementList") {
        let noScope = n2.noScope;
        if (!noScope) {
          push(n2);
        }
        for (let c of n2) {
          out(indent(tlvl));
          let slen = outs.length;
          rec(c);
          outs = outs.trim();
          if (!outs.endsWith(";") && !outs.endsWith("}")) {
            out(";");
          }
          out("\n");
        }
        if (!noScope) {
          pop(n2);
        }
      } else {
        for (let n22 of n2) {
          rec(n22);
        }
      }
    }
    __name(rec, "rec");
    rec(ast);
    let argset = "";
    outs += "  let __$func = function(outs";
    for (let k2 in ctx2.inputs) {
      outs += `, $${k2}`;
      argset += `    ${k2} = $${k2};
`;
    }
    outs += ") {\n";
    let footer = `
    __outs = outs;
${argset}
    main();

  `.trim();
    out("    " + footer + "\n");
    outs += "  }\n";
    outs += "  return {\n    call : __$func,\n";
    function buildType(t2) {
      if (t2 instanceof VarType) {
        return t2.type;
      } else if (t2 instanceof ArrayType) {
        return t2.name;
      }
      return t2;
    }
    __name(buildType, "buildType");
    for (let k2 in ctx2.uniforms) {
      outs += `    get ${k2}() {return ${k2}},
`;
      outs += `    set ${k2}(val) {__set${k2}(val)},
`;
    }
    let os1 = `    outputs: {
`;
    let os2 = `    outputTypes: {
`;
    for (let k2 in ctx2.outputs) {
      let type2 = buildType(ctx2.outputs[k2][0].value);
      os1 += `      ${k2} : ${outmap[k2]},
`;
      os2 += `      ${k2} : "${type2}",
`;
    }
    os1 += "    },\n";
    os2 += "    },\n";
    outs += os1 + os2;
    outs += `    outputCount: ${totoutput}
`;
    outs += "  }\n";
    outs += "}\n";
    return outs;
  }
};
CodeGenerator.register(JSGenerator);

// parser/parsetab.js
var parsetable = "N4IgDg9mD6AuCGAjEAuA2mgDAGgIwF1s0AmY3PQks7Yy0gFhruJwKNNeYHYn3ifafAd2wBmEYKoBOXtLHMAHBT5LMdUaOUkNW4qIBs2AKzrDXU9n3qe49qOF2Zax7vo5zdzp+z069TbYk/q6MJnbkbNrkknpKkbGypJoxevJ2jPGiGX6GMfSGgcT0Rq4l8cWlleVlfjV2ddoNesSuPOU2fi3lLYX0Lb7s9DLlw36j7EYRdJNpJEZd0wsTS3MrxPO6G/Fbi5trO8t7R9v7p0cDc23TVxM3l5t3649Gz3HTSjFGhvH6XiS/s2IAJ+U3Y+nIhSMmgu62yEzhcwR6ya9FBQWidH0SKxiRxYX+jEKOJh+iapMB5JJJSsYJK+KB30xHyZun0zLBbzBDn+HTBMkKXBwMUFgK4aP44tIiS4LWFPWYJRSioVPhVNKoJQ8GuwChVSsB61V7C4mniXDpdHNRpIXEZxtylseXF5NqUAqUMK4SK90vGNr9/ADXCDId0wbDobNkct0eNsf9EcTUaTMZTcbTCeTWdT2fTuczOcLeaLBeLZdLFcDGar+ZrJbr5YblfDtZb9bbjY7zfjTd7Xb7Pf7Q8HI+rw7Ho9bk/b087s+7E8XU6XM5Xc7XC+XW9X24mfyByUxASPFOhmLW+ll0wDQN0t8KCnFj90z/ir7o7/Yn5I3+Iv//T7ivQnJBG6H77goOD0gopofseX5IgohIfk0CglA+do/gUH6PAoLp/iBBGAgoAYkcR/J0FI+5UYCNGFHRlE4PR4pSBClFsewUhrFxtHypxsH8bR8EkFIwnEFISISboUnxDJH5rAoV5fkpP4qeJmHqdJ3LieyIlgZxMgxFIfqiJgQqUKZ5lEKZaKmSspkCSJTRSCUMIudJ6GUcqnHeWgpkNKZCKBVowWRKFFmYEFkWzKIuB/KZJmYCBpmPLeYVJSFcUhZgiV3KZjKECA8AAMawHASCoBgLA4B6uSaIpNCMJBNAlM+t7hvwOqMH+OqKjIMFiDVBTkHhYgtAobr1fyjB0SUrFiIYPH2JYARxJgPSGZg5BuDQ60+NEmDQl0W0+KaZk+DNMgVLgUi1Xgxk+G0UiGEMPhKEYOCvTMH3GC033QjwRiMCaxiaqEZh0jwonGEoUlGDI7kAji4KWNSLT6IY+iaPoPDI0o5L6DIGPYCKOMk+QbIk+jMi2iT7g8GKJNKDKeCHSTZ3AxkmCamUmBmN8mAM20GVcGtNPDFlzW4NLOrkM9OotFIPADbdXV4Lg41lLg9XfLgTVtLgrVxLghhkdLUOsLgsMRDd2A8RrODQxrcsZFK7ka5o8sazNbSGqrGuLcMnVxawPVxRE4ms10pms6asWsxkojHWUWx83gUKs20OhxXEWSs8Moha6wBjqxEy3S9HxumkD6uJxLZQ7dL3yourbR9OrcTBNLwz0K7rBGGU1B64PXT5HgqR677GTAePDdB98P0a20Mwa3EXzj8MLx4DHhu5xE8Pb10wLZyj2sZJe29lFj2/fDi2ttOS2txMT2vDGTeusJTesRITeDt7gIo9amkZnrDILNh54BBnrb4PpJ6QIbnEWmethjOnTqwUW6cIgti2FLDOVt94ZAaobMoA1DbfCQunNoaF05xAUAvYYo0TasAmngU+ZsL43U/qaeaJsMj20fk7F+Ml37uxFNdMUdBzp3VSA1IoOohStWiGYQyytupKGoZHAaMc6FiBGjYcak0dTTTtkxOaEJFo9FxqtKOYhNrbSFHtFuLAjqs22mdT6l0fBlFVmPG6V0novSuu9T6MhvpQT+uQDO9BAbA00APEm4MSaQztnE2GoQEbUhwMjCmaNLCY2xrjRglMCZEzMFkhmFNmbUxJmUkmFSmZU1juzBOCTWY81ZvzTOdTWbMzFiTCWNVLYjTlqbRWytPbqIyBrXq6sda1x1AbI26tTYSwth3O2NsEZdBYCk8eLtx6K0Hp7b4cilazztnEW8D0l6s1DmtCOww9ra1YGzbWERora2TunY6C8zpZzOrnLmBci431LtvA2ldZnpymXXdWDdLbNxtm3LoVs/6mltqA8e/dB4RGulKaB49TTRPHtPS5c9x4L1DsvCOa8Tmbyzv3Pe6cC5H2LqaU+ecTbRyvnHW+icH5lFEM/b4og35t0/p3H+PcuiAK7iA3ukDR5lCgb42BxKAEIMgc3FBy90FrywZvLouDTSvhrlbLo8SrbV3IRkLeVsU60PoXgRhwIWEmwiOwroNETbcJ/nwo+3j2XfGEU9ZVn1lUQhls4PyMsAC0B0cDxp8IYJNDVU2JuGdgJN4ZU2MFTSUVNmhU0pr0VmkaShU0yCTTRat5Bq0tCTdfJNcUG0HTrQdVtu0i3vPbbcstdsq0RFVs2h6I6S1vX7a9JNP1p29uJdm7trTs0FrlouqS1aV2WDzTk/txNG08EbRWimg66b9sZtmzttNs0HvIBg5tbN73braf2uK464o3p6S+nKL6srNrjSM/tZzq1HvVp26Wi7pZPulpupuP6P3SxA93F9Ozm3UFQ2B1IqGoOGlQ2+zqqHEOR2bTHYjvbPkvo2M2jOxGIN52IzBkuxH4NCoo1B0VL6drNpblxsDwQuNQfiVxmDY8uPwZnlxk9hsM2YIo2+reVHEMH2bQCZTZGL7KYgziZTMG90/3g5TZTkmRTNvPVgsDIMTNQatCZt9qCTOIZzR66T+CX1po9RBihzbqFebfaNLziGyIjuc/NEdYHoYjqg+5JNFR40WTjd1c6sbGAiaag2pqiamp1uBlWpqeamoFqakWpqKb9ZZqahWpqOWTFlY2TVniSWVo1ZbTVlgWXdppa7U1k6DWQ51aqzdCr91+vywa+J5LVWZ2hDa/O2JNWfQNeszNIrds8t2wK1umr5IGt7qKQeopg3f4LYy+TObHWr3Az2w0nrD6uarbiut19XXLs5y6/139Uy2sjZ9nVwbFcmva3+3dw2/2Sut3+7922PWUOuzaxrDrHsmtyKhw928UPns9Sh/1kjidYdJya5R21y3tZE7o4nB7jH+VNZYz1muPX2M9c49PWH7cGdE4VTTh7MXp6g7gQz37U7bXHcNrD9eNPntGF+0p8+QuUY9fU+fInWnz4PZ26w57Bnz79eM2A2HLMesWbAXdxbWqmt2bAb9nNhChfPh62mwhRPPOEIezo23z2WG2+G0LkL/qmvhb4XdqLyWCtxbrYqRLrkU2tQba1RNiis2aira1PNrUC2tSLa1SPCz486gra1RP1XY1mOz/V6k6ebGF92qH9r2fnHZ/DnX8PA66/Du8fnm6mfxOuXzzOukVf52ajL/N9pFfwtzWT2t7PWnqSp7yZPg91Jc+WHz8ZzUVe9eakz3ZzUi+4pl7iuP+7DfM/vobzv79Ffpax7BSPzPQG5o7+mRfgHT+D/A6f8fgBdfUVP7byhnFdepQL9MNB4D8cNB5j98NB4d8iNBUr83k688cL9KMU498dAL86NBUZ9tZj9lp0Cd9adBU29OMG4q89Zo80U692cU4sCYsG5j9+8/4d8p0U44CZgkDj95MHU68lMr44DZcr5yCfU68p9WEsC90r559WEd9Dsw069z1lVBCLNlUD9rNlVj8t9IEd8c0SE4CbcSFBCBoL9PMSEsCXcSFJCrYd9AtvE4CQtvFBDR97oD8otXJU86AAcAFupIdid3CUF6QMVaY5UtRWsfAHF+gDojpJEwFDIMVmox4ZFZR0sWpZYaBlEaBVEaB1E+odQAghpdEs88cWEdAyI85ZpasS4lorExA1oNpK9Qjq8nE2Z/4Tou5zoFUHprofFg1/F7pAkJ0fovpIlwljBIkAZjBZt4kfR14rQt5oYJcVtjAMlLAskikd0L5iZr4yY8ZUYl9Z9SZ6lKYWZf5aYRRUFGYMFwE2YoFopYFuYkkOkakulUEXsME4pxZ1ZBkwVnx5YGozkVZJlQMZlwMdRdZStoMc9lkjEwdvVUUeFbZ7YdknZqAZI3Yjk7YTlvsNZ78KUm8bletV5XEN4bFnkml4D99D5n1DYfl04/lt4AVt4gVL4PjQVpYy4IVt4q5oV5lX44U/4EU/4kU/4UVO50Ue4+505/8IE4c/4TkiUp5GDzlkEcSpNx5qVx5aUiTDYGUaFt594WVWE2VWEy5z5uVWFeVWFKcTZBVhVt4xU+SpCBTWFpVIFWA5VcUwElVIEiUYFp42grQ9ZEFtVIFdVNCZMAFDVnV+4TUCFnULUSFrVnVbUqEuCrYnUrYH5mFn4PU34vUuF7o/V7oA17og0nC1d7pZDxEwpnVChvDoo+N98ois0KEyAq0KERMKE00OzE0Oy60KEc0Oy80OyC0Oyi0OyU0OyD0OyK0OzWyZpuyZpeyZoG0KEm0KFmtY1mzutNzlyEtRyuZFy+0NzPEjz7ppy+FZzeimzkszyfALyZ0KE2C2zJzZsTz5s+zhylsryFiTyosVzByikPzZ8TyyZgKbzDs+z5yTtXydzHjXznyrs1yH1EL/zn0TzHs0LBYvyXsMKLzL8sK40KERtCL4Lh01zH8yK9z5k0K38yLxypl4KEN8LcKUM1y0NWKYKEc0KkdWLAKA4sL8NWKbyNZcKSM1z440LEC1zKMpLKLicsK6MxLeLGMxKGLqcpKUKeS0LOM1zuMdKOK+MdKNLBMdLeL2zfSsLxMdLcL7zbUDyyEsL5MpKhKlM1yVNXK7L1NXLZKtNXLeK91XKGKDNXLcLjM1zz0wqOKLMwqNLrMwq6LgysK70wrcLmo0Kbc1zOz7csLPMMreKXcMqGL3cMrcKa01yQsyqOLwsyqNLfyg8rzKB4j6pEj5Fki2o0jOpmysiaB+pciQT8jRpCjDESi5yxAi8KjLFGsWNmt2MQidoWBwjOtmi3E+12irpvE7o/FHpLzXoZ4BjQkhjfoRjjAxia4QZJjEkZioZUkFiD5EYVjLA1j0Z8lLBClLB8ZqRSlT0yZGZDjqkTj6YTsLjjpNBrjOZn1/S04kFMLniRY+kWxJYhkUifixkciLk1Y/tqFgSdFIMs9wS3UTYoTzZqtGK4StksVdlnYFjpT3ZUgvZTlfZsS+Lrlg5zoCT69hLiSd5Xl45yTyND8qSHjDZaS5KXsz584mS8LsCwV75ASn4oVDYYVbTeSP5ITv4wcyD1kgF1YxTybiE9k/4R4ZTCU/55SAzFTXo+KVS8SV4w514OatTt5GVdTmUKSmE6SjSGTWFTShCpbeFwVRCOTWERU7SVaTZJUnShSXSKCAF3TFUDavSjbPCTb4EFSAEgyAEQyAF9VIEIyrYoznUYzzUJTqz04bVKFnUUzsaD50yDTnUsznUcz7o8yboCyboiyboSybpz5Q0o7KyxAy0boGqTV+Qy0WBGzOEaBIcOii1jJGzY1UEWys1UERNUE01V7E1V660ziq1V681V6C1V6i1V6U1V6D1V6K1V6d61l56oYt6oYG1UEm0YaH6BBusF69ob7OtP769v7EtUFR1njh1AGr7LzP7xNl6QGZ1UE2Dl6z6GYj6GY96GYD6rql6oYkGJ9P6tNH6UGgLH64G3q0HdjP7jMzi77GkSGT6hYiG70YaEGWlf7cH0KYaCHsKYaQG8Lv641/6qG7YCGgH2SuH6GcauGmGCauHWHv9njIdniUNZHyHpTv7MNZGMGsSiG+KlHWGMdZGOGSNnjxL9GX7vl1HqN9HhG6N9GmHGN9HWHqdnjad9GOHONnjuMXGjGtbv72d7GmGYsXHeHecXGL624OGoG1Tv7Rd7HWH5jwmOGVNnjZd4n3Gn6H5VGtt4n/GQL4mgmI7v7SG/SFG9dniLMinVHrMin/G7Minsnwz1HUrnibd6n3HDD6nVHvN6n/G/N6nqnAtAGN6noFH6tAHhH11AHcHfHgjop56Yid6roT7+oH7+oN7+ot73ipm1Y1m2meql7+o5ms8NmL7+oZmC9wwQsTmFnGs1n1yOo37Npzna9LmbnDyTmjmBttmhs3n283nwGrojmoH9qvmz6aYj6aY96aYD6EZgXvyTnwWNs1m0nPq4XAXCG4WjnSGaYVmKHwwr0sWkXaHHlIXySHmYXmHHkkW2HHkXnf14aMWRsTmkWgGJZzngTLm9YPm394bdmiaWWDntaPm5Gg4MXFGWxlGg5QXzlLnUdhWyXtGg4Xm9GC5BXEDsEmXTGC4CWLHgUPnrGC4yW7HN4xXNKWxnGe5BWWcjWCWvHN5iXfGe5OX50jWeWlTLm/mZNnXOX5NsFHWlMWw4m35BX1MfWCXsG35iW90fWyWDMfWXm0XIFBXCmUECX5sWwymUFOXKmUFHWc0Ww6mGFBW16GECXPNs3iWXds2yX3ds2Xma0WxTnhhBm62CWRm62YWbW57mpF6NzPpxyaplzPjO2Uj+3+yapByaphyapRy8j+2/NmoiqapWzHZuzHZezHZe2LmpYP722tywimyHEJ3CT+3et+3R0pZSLWBj2z3u2J1+2p1mp7yoJl2trB2923z3Ax3dkj2R3MHmofKsk33/Lykd3kXv353T1B2H29dmor1IPJz3BpyXk93CX12330L12YPP0D3z8pZf0sOH2iLHY0PT3ASD3n8sPP3wTiPL2uWsO4PeWD2WLQ4H3FGpZMNmOyOcNmPKOBK7lAOOaD3RLi5GPJL+5V2haeO0CpYFLi5kPlLi40O5aD3acJOQOVaD3dLXSRODLXSyPjLXTkP2zXS5PLLXTlO73XXcFKPHKnaFPlO3LP5GPPK8yD2f2A6nPKOQKpYgrP5lPQr0FGOIP0EEOX2U6D2oP0E5Okr0FlPUqpZ0rmERPDCYuyPvMYvKPp3MyePAsT3F38yeP6sT2EP10T232YtII23ohIdnx2yRplyRpuzM0Nzb1WyRpByRphyRpRyRpxzS0GuISevMu5Y6vaseu8uKYOvy82otyO0myIjpv93XxEtvimvTzZvNqevPmevLLtolv7zIleztpJzb0xu3zb02v33viWuv2KYLuttnx/KKYDugPj1ZvQrb09uKHnwoPb0Hukr3kxvEP3lTuUP3kHvsL5ulvOHXwCKANhuHvSKbYauoU1vWWkfAfxHIeQfv9IfweWKI43umOI4/vuKI5AfUdXwBKaUVuiNXxRKy48fJL94EfRO1vxPjSVvC42euv/bmfpyYzmfwftLcU8eWdXwDLY61vjLcVAeqvk61vNu/5weduzP95OeHbxeeeXa1u3Kf48fPKf4/ufKf5Ae7uyzNf1eTZweXvY2VuIOsE/vjvgvXxPuEq1ufuc6VvouPU8fOz3N3eLv7V3eVfp2PUzf+um6Vvyqh1Geqqh0/ffzto2u23ZQKv+hxzxplzxpuzxpeyWh+zxpBzNYmzxpRzxpU+9mGoirxpWzFZM+hvfj0+13jp6+QiNzZQN3W/i+5vjoa/j2vVpyvUq/QGGpLL+gB/7yIlC/H2Gooqc/8/7iW+zvFZZ/fz0ZZ+bunqJ/3P0Y+/iGp+a/wqc/6+oOc/Jyc/t/d8J/EOvl5+UPjoT/0OiFMOUUa/WSJ+iKUb5/SKUV6/mWiFkff/hyUUpfKjsKQv7J9ya1/Nitsm/4sdtks/NRhAKAECVtkZ/KntHGf7iUiEklC1N/2oyYCO+Yta/uz0IFADcCmAs/op2jgD8VORCXSqPG/4GVR4cA4yp6Wv7tlR4d/M2qwKoFj8zOFqIAY5QtTkCqBblI+Nny9oX9VyR8OAWvyDoSCOBQVI+FQNCoyoxBACb/tP0gRwDYqMqIAXZiIRJUZUVA6LkalUGdkjU+AnKkagAHOogB07I1Gf0y65kL+5VL1N/yqpeo4By/LxIXzbbJAKu0Icck1SbL1Ruy9UXsiDVbL1RBy9UYcvVFHJzINy9UScvVGnJTRghBeFWOELtjLlsY8Q8bskC3IFCchX9UhIUMPIqxIhy3RIe82qHrcBollaEJUPvJxIsh86AaFFRBrRC5+KsPIYV09ixDYWA0G7tjECEvV0hQVbGJUNCog0shEHEGqML0Eg1UhTSWoZM1KEDCUOtJVYcsLeLpCIe6KLIURU9jJC0atQ8iuijyEiNSENFdFKMKo7oodh/g8AaQjYqmhACLwy4dxTeEbDSebwk4QSVqFU844oQ52rUMkrVxihTPUhOJzjhdDtYGw5SnHH+FqVq4cI+nKQm0pEoshGtWoQZSJRwjjKRKDYe2TlJ7CGh8vPYc0LM4JlahjlauDsJcrsoQR7qPYZ5XZSXCfK7KDYf5XZT/CJhOTUhNMKt61C5hCdEUXCNirAI7hiw0MiKMqF509h6VE1JCIS4mo4RyXE1HcOnYmodhmXbhMyPKrcJIRVVbhHCN/LQhYhvhLNGchYB5ozkfGJWHPQBAdsAQImAEGmndGJp3RdaAEDmndF5p3RBad0UWndEpp3RB6d0RWndFVoAQNaWMT6JXZZokYIYl5A2mdHdZ0xaY3dkmJeQJjDysYmMWeyjFntCxoDV0cWNvI5jjAXo+9lWPnS+iUxS6X0UGMdiNj10sYlsbCyRidi90SMCMVkgrGHZfRNYqCr6KzGwVfR/Yq7MCAfQziAxLyTsehRnFTjsKM40sZw2BBxpYxYY/DlWOHSbjxxzLTcfON5KxpNxO4sHGeMtgVikMV48AcCDQwPjDxmGB8SePgEPiLxNyO8QCIfHriSMx8PMeRm/GUZgQ1GY+I2IIHHxFxjGY+CuOpygS3x9OYEJxmQmASWcyEiCezlAmLiYsyEz8fWNdI3ip0oEkccLirH2VgJK46JqBPXEqZgQsueiYeKbT0S3xW2eiZ+JAr0SbxQ49BKRPPTAg9cAkiCfNgEmLir0AklcXegEnrjUqrqQCR6OYQQTPMrqRcS7ldQrj3crqdcXGLPaAT6swIcLAZLfFRZXRLYp0eVxjHbQwx1XJMbV1skDsUYfo5rvZO8woxDCbk6yXszclRiRolkgvCjBCwBS0xo3eyeuRRjN9wpH9SKSGJ7ShTEsAUvya8zPFDpEpI2FGOJnSl+SZ0KMNgulIjGHd7JIkk7vZMMn7JkpmDFGFpkqlBiKYnkziZUnslDjb0Xo17oVOCkTivuhUnySsNPiTNepNUh4uVJPxDSMoI0xKb+lPhbjoeAU/KacMmntSjxNsAMTbAGmwYhpn+dad1NvGnwUMO0n0RHAWkviI4y08VjtM8lfidpW0ojByhamgiOUC0kCfvBinu0hpdGDlKtJglslQp8E3nhykSkoTBeoU9CbimemYohpgmU+LhNxTnT6xuKLacRP3i3SyJ4M86fJlPjUS9SoUuidryxkLTmJBZIaWxJ/jnT6pDpQmYlOMynx+JZmUKRZipknSNUtM86XZiplbSnJkZUKTbjYQLT3JHqBma5I9TnS/MbCLaYFlPhxih0+0wsqFNKmlkhpJk+PrZKdFJ8YxKfJMWn3VktUzxWfTWX6Lz6azXJRfA2WGPGgRiDEBs1Wf5MVg+jFYaY9GCGMb6ayIprfO2V/Q4QZiu+ms0dBwn3H99NZ63C+BlJH6azsp4/bWY+wvh0yZ+usoMYrAdnfkL4JklfprLYnr9w5nErfinMtmUyc+NsihpHJNndJw5Uk4Gv7L6lX93Zhc4ae7KjHHRLZG4lFHnLSnv9E5tcojhwmfwdyAxKKWOZCXDlcsO5bc7adsi9HbI85ijDhC+NgH+ycMk8qufhknlDzrpaA/2eJQ4SIEOEIEi1PHLkr9y3pppPeVXNwLryh5tOdefXJQmjxx56E0eDvKwlxl/ZuE0eFXPrGjwh5xEi1KPNdabyq5aMwQf7KUwcI6Jog/2epiAU7yqpRZfub2KPhmyyZQC+uTnOFEcJBJMqHeSJJlS9y06/slmTKiHl6yOZ/crmUaldlWp/ZykqweQqrnCz7B5C+uXGK9Tjz9JXqHee2K9S9yn5TovwTGICFJighZ4kIXwockRChFykmIaIpDEJDr4wslIaIp4X+TPYPoz2GmNyFCKwpBQpRdXgEVuyzomiw9tfG9ncIox3CeRQHOhDGLKx2i7KS0KEX1iQakipsSDSDGewHF7Y/oUIqqnYxnFQFTYhGOxgWKhxINL0TMKEWCT5hoSvxdOLOgOLCW18Q/NoqXFbC4lo05JaYomkHChFaU44ZkosV/YElnc9FAGPRTeK1pcSjaWUtyWQ44lu0t4XosALVKYlSOapSUtRzVLIlP4t4aYv/Fxw9FG8iEWorAlxwYlb0uOCUpglIi1F8E1EZMtMUoSsRai9CUShiVYTq4JS3Cd6QWXtKMpRKUxdYu/k0i4laM+kQMtMV0T2UeisBeyLUWeKXOcS3sbyOuW5LAlUdBJfxOAQqKxRcSkScAhKXiTgE7SqScAlMWyToyaij0SahiViKK6YKsMSanaWaTh6aiuMb6iRUfKO6SKopeWVsXOKnRXhGMcljDGpYkxSRM8ZlmJX9JyVyk/LJSpDHFZKVEY8rJSvxX+SFy5K/SUUlpXl4cQEUhLGmN3Lkqf6d8eKceTvj7jzyAqtKdeXJXETQgXoqbNKoZXNJSVTY4GEGM/LKr2xM0NVV2IArkrexu2PVVGKKTMrKZwMH0cDD5UTiLs5KqSVzE5WxKuY2qpcVzEVWrjGSyqjcR9jZWEq+GbKo1e3KmT2rked8N/CGp9UDypk/q7aeKQ9WPjXYlqzinfCaWuwnVrS12K6oxxJrmVJJD1WvMTgJqQJhOAVWgTvhvSycxa8NcfMThRqz5sKD1ShKZwCr0J08e1VhNtROrcJ3OJta6oynTxs12U2ygKtFx3w0ZtqGtdmronnxzV4gj1cxPPgBjlcAq/VSbzvgGZV12a01cgo9ICq6ZhuHdU6vElgJXVtqt3h6tkmEJp1RdM9faqpXQqz14a4WYQijViy+EcqnLh6vZXFkJVC6rFcqs7VOjFQVSiPEmKjwgatZ5ILmQnjA3KSU80GkMRnmg0RilkZ4vPGBrjFF4UN2QsDcxN5hpiw8PosPHhrdm8wCN+YuaDGPWpgbVuAiMMa5CjFd4wN2U3vGBvrED4wNIk4fOSEMlj40NQY6kAGOnzYbaNYwzDWuo+rsavRq+djURvEmagkN043mPBoYaPw7imGpcbzHk2rjeYFG5kmpq3FzRhNQGLjfRvblawlNIjR+KGq1jCaB5WsEzdtMHiSb9aam+pWiRc0CbTp4BKjQvKgLeadNOax+GvMFREaBaamsCYKnM1vTMCVGmCYKk03wSU4HmzSo/BQkkEqN6EhuOZqwnUF0tfGo2mptY0KkCt/mpjd/JTg2a0ZXBMLf5rolXxSNXKKjThotKNa8tJsGzZxKvj2ahxshNTfxIUJUa6ZyhAba1tk3O9H4Uk5VP5tkkkJ6tHo+MlRpg13rH4ak8wgtvs1iybCVGwKfYS23mb2x3iPLbhPpB9TcgVSl6GGNGRJjTYXo02D6LSJnjTYAY02EGNNghjTYF2ryabCjErIrt/kxaHdqw0PaLmL8KKbkAzFg60xYOt7fuxB03am8QOpKUIhjHBoPtGUvokDuymGBcpL0CMWYGh0iSIYv2wyYtCe0VTMYpOtiZjA+2cTMY324hsTEplmAAdgkzpEDpZlmA6d5/BHSdtQog6Pt1cgWJzvPwvwJpusAHWlMWi465pusSHYjxF2k7yOIu/neUt1ic6zt94k5ADonmylft3sXXbPJOT86F5JyTnddJFRw74CCOjeQvFl1M8X4JakVArqIH27+dx8kVJzrPnB1ddKExFN7tt18YX4WEheC9vjoI63RzcKXZwMD3I60Euu7HaXTj2R7qJTqBHXRNvha6wFt8aHX7VT0h62tuumnfAtvgx6AEFu/iTAlt10yfSuu6zC/HEkwJI9UkmBCXtknkItdHo8hNnuUnkI89ak8hJHs0nkIS9cY4NFrv0nBps97Y4NCHtwnqhbRSYgQFUp4BujlYaY5WF6OVg+iGYMYjImeOVhBjxkC+vqnvq8nKwoxysHff5NvpH79JVRE/WFNfpb6tFZMe5u/AzHCwN98OkROfpqEiIwxy+n/cRMBif7cpy+iMfAyP0iTkGN+kMegxv0H6uxuMBA72NxjgHkWWxS/ZTPqQn7BJDMf/UXO+o/6udb+gMcLAQNLjhYaB1ccLEv0biDYT+tKVDDQP7jBG78TuQbFIOni2D+BgeQbCINL77xvsJ/RPN9iwGSUR+98b7B4MLzfYRB66dqXv1rys4a+4xvfrAn/IJDb0rOOQZglZwqD8E5eJweS3ioJD3Gd+OhLbhiGwZ78CGW3HIMr6Ze5hog0Adj1qHhDw65eFQeonLxaDdEh+MIbAUPwrDVUgVBIZQMrqH4RBocX6U/0x0JDuBz5X6SMO16/SPBlmX6SIN+iqEsRrmVQhUNkL79yk5MhIbUlUIqDmkqhLQbjH9MJDt+r9ffvbE90T9uEiZgGI+BVK7oZ49RGmPURej1EPo5mDGIBJdGZkIx9yeojDHqIIx6iKMeoiGP+TrYSY2GD0eB01EljdREY/NXWOv77k6x/RbDHmOI64g3s445MavaUxiJwSdY7lI9DTGlVhxNo3P0piGS0k6xkyfjEeNsT8YZxzifjFmP07mYfR0cVUnWPiTmYdxqSWtBDFrRHj8Sr+GnBGPVy1o/x3YYiYmnGwBj6JN43cf3HGwVjR442LCdDXGwzjA842CiY6P3jLkmJieZcmhPiHETs8y5KSYXmXIUT103OECct1fwN5a8fE2BNzj0nIJucIMbnFJPHzc4KJs+bnEOMoTw6iJ9CSKT2NYS14op0PV/DdGdw7jUezuIceynZ1ETw6teNqeolrxDjdE+uoibAXPwhTVU5+Gqfz1WntTa65+IccpmIIaTgkxBEKZEmIIHTYJsbYghRN+jaEXJrmbQnxPjHEyex1yY6hjPanNJtCQ43GOOM0n9JxxoU+2OONqncJuodgH1OmZJjZmRZhWCWdknLMSzfo/qAGP6hBitmZ4nZmWYjH9QoxhzEs3GIRg+iyaDZ4HY8jTF2ISzWxns6/seRdn8xCMGMXW1bO/662YYoJCWeImhIvR/zHs/WKBaVmazTxiFu2c3MmSiYm5tiQi1/icSiY05ocTTGXOjiaY/ZicTTGbPTj8WJZ2JY8jrODTf41cx5NOdRPvmJpEsMc2lIRj3n9xjLJ853IlibnFdEsOc5eJ/NfmqlQcS85TR7MTyg4IY0Vk+dnnzwML95n8bKyfP/iFW+Fm86FvfNgS1W+FiC87oLjQWZayF+Cfq3wuTn7SyFsw86RYtoW/4EFiGT3FfMEoWLOFjKT3CYsqlkLuUzeDRbRmbwvzgCt+IhYYmN1kLzEt+BBcPOyDFLOFtdW/GEuUyUEY5tQU+bpkoIILte1NgZZwtSSUEwl8swXSfMeiC2tliC65IYQ0XhZDCL82LLraIXApdbYi4ZLrYQW9z3ghs3PRFAdsxEJ9HtkvT7YigGm7gHesOyiujGYrR9SdjFbPo1QL6c7RK9WyXbZWH6WSFK+XlCtv1t289bMWVf3aAI/6jseK1UMAQAML2iV8BiEkStQNaxFV+1u4EKtJtX22VwqyM0dgH17qFVtJlkgisibSYmV4hqcQ3ruAt67gfK7BVOLpWrsVVwq4SyqtDXBpVVla2wxeS1XOGgCbho7HGtAYRQQDS2IteZZHW96lsLa2tKOu7WpGlsA63IwY6JWhWocda0jkAQ4Zfr41r8b9amu8dAEejATh9aVbCcPrpjQ0hVYIGg37r1jWThDeBsONi4B15xq6XmuR04bfGWVLdeLq437rK9Azh9easUi4bbV11oAgib9xdr0TGmwdbiZ2cPrAbRzoAmwafx7rYbT+LtcjZecPrpDXzoLauvFN0EBNxmXDexZhdBbwNrNswlms2W4ba9RSR9aLbMJ7rpbZhLtYrbMIDrOV99fVauvhZ6rEtqLGIiGshWLJS9KyTbdLPz07JDtgducR3rOSnbbTdrnbdLbddGYFbXyXberZywt6csB+iFKdtXM20dtoc4zHuYgI367yDenLFdt1WUpdt9bozHAZbc7bUDXbnbftYFSnbSbYqU7ZNtlTGY5tq7nbbSa1Sq7Z9BqU7cOznFE7UFc4qHaWudTC7F9X7mncmZx2D67yE+sDx7td3xa4dqljbGDtYmS7dd04SAkfxz2j6S0tO+yxtiD3Lxc9ke7eJARyNceadwAtvcXsMnt7/dnEuHfwzb3N7RGEBHo1p5p2lWDPNO6YzLiH34bZcE+1LXDu4Fr7m9hxmXGTsqd5Uk9nEfKhfteN94793xtDLTv52it8qf+znepvK9H7M93eI/f/txMcZ4dgNnrzTvYNDeuDteybBQeRspUad0hlgiAeFNbeZDvelgnfvYssEKD2hgajTt1NPerDtuwUZARFsPU797286hQd+2G6adwO4bcj4iOX7IzIdCfcgchWVZS9NWfPQ1lKOtZLMBpjnx3r6yVHbTI2do5PqmyFHvXNR5o+ObWzDHgze2YY6uat8t6Lswx7HeOi2OnmisEx0lPAQAMvU+jq9izCnQswoGYcnx2fRz5H1o5KjspnHPMd71Dkhj7BujAPppyjiQT5FkcRMekNc5hjwpjny8eVNT+Vjh9JcSieoVLiXj4aZcQvp1yrHVLRueY68dnXFY5TojuAmfxNPCn5HJpyU42lNOGnW9keVY7QzgJ972yEJ0fe2TxPT7AzpJwCIGeuO9G0cJx0BPASUZFnwz3eeAgsYHy1nJTr+5ChUcK0rH9OcBM4yvlWOzWt8k5608EyHOxnfFw55M/AajxXH/j6m3wKscet/5uz71qyiscJMj4D9I+Cs9icudwEYbWBd8+6eN2ZUG9FQVY8ydijwESbTBTC5Kc5PZR8L1x3UxMFWO165grF6050c2CsXkzitkalcfVtGFVjix/UfcetPzb/QeJyFe4VL1eF89fhSDDqZhCmXFKll+szZcH04hnL0tkkIFcX00h3L6toos5eDNVF3Lq5hos5fR2ChR9XRZy8PYgwAGRilV+q9AYgxwGjQzl1AxsXcv7W9izl0mycWSulXULdxdy+wZeLOXYbApPa5FfTWglprreiDQfrhLuXlTJYSq/yccw/XfL7a1sOuLOvUTUCKlhkrFcn1slYrsN/PYuEqvkeEboNw9fRRn0HhSbnem8I3q1KVX+9t4Za710yu/rbwmN6qXzdhur7wIlVwYzjievVDUCUxkMtrd71Rltb8t7RagR2NplMrg50SlzeOkZXZrJZSq68arKx3qbleqSOHdhvfH1cQd8jKbeduPWxymV96yZEquEm7KBt0IRle2ugXJZfdxm7JlQJG7wCRd+eigSFNgERbs18F2vedufXqLoFSq/ZdK2oEa9CFW+7bd3rP3nbzpjqLffZuw+Mr05kaM1dFuRm3CIN740KC928VS9AlUh/ts+g6mZK+etlhQ9FtqVmH1Gnh9LalYCPF9SrCh+rasq8PgzDlSh6uYJYt6vKlD7Hf3I0e/6x5WBEA3FV4f07UqvD749lUoeYGyWM+i+R9BJtVVZHo+jND3paqUP2DXVXh7DYGqFPJH6a8DA3pmqUPhTYGCfWtV4faGdqlj9J6KdcwdPXSLj6NNuI70pk6n6/D6FpbfZKPKnvJbAmaeK0uP7LKZKZ65YuenPMjGNbAn6fxqaPyjV2EZ/gEBevP5912E56vuJwbPlu2BEq1tQP0i1XHtAol7C9EDEvXnr+9Wpo8OM61aqeL642ngpeKCXHrxu2po++Mu1FX4T7A77X5f4vgnhPVx49Zjr8vVn2ulx4SYmkaPT9edf14PrnwvPmTc+E58btgJ4vV77dVx+KZ7q5vw3k3HN/q9Z0aPWbK3DR4aaEIyvXDwhGF7aaEIvPnTJ9Vt668T0uPpzH3Jd8k9yz2PS3mr3QBy7z756gGnesBte+oeY8S9OPJ96zZJ4fvSVtPID9LatQz6yGq0D0zmgb0MNVoQZqXkB9XN8NgP6O2HiPokbEff9cjYj6Aat4cfJ9OjYD98d0gYfR1T7/azY1/e96w+OH+j6hZzQD6/GwH2k2pAE+JrC+Zn+99A5Wgr3moB+hvkB+VNt8mPunxtd5iM/trGmzHxfW02I+qWWsLegZsB9nXsSn35z2Zrl/U/Tx/pcRjr/B/rI1fMjRzYj/6eG01fyjEAib4l8aN/S593zeb6585r/SBjYLYj6WcoFEf6XwVFr/hGe+2fXb60m7598HP4UiP1xg3H5/lf/SXjHLWr98Z0Ew/+vzgdH8d9QMU4iv1r/6Q9ZVas/jvuJnVsR8BseUhfn3yz7Uv+lMmnWwv479IYRpEfhTZVKL6TbKprf2LZVEn9oaTbEfdTGbd38j9cOSEPvtpiQn9+dMSEMv4R2r+rbeIM/bdHH6L5GYHaifjPp723TnrxIO28SETPEjTQ7/Y8v3yYongB+F5YNJ//Dzv8jxg/48yGnf0f4LzxI7Cc0aPAj7P/rkN/3Wd/8/6/qWoP/vMff/DstQW8PH1f8RsLf1zwGNM/x7xmNM/37xKfc6mv85+B/3TweNM/xcImfM/y2x4kcQmpB58DnwwC7/FfCk0z/dfAF9iA3AKuwf/ZAIYYf/VPF5hL/Mzx/9wA0e0tRf0FgNDwlfVAPICgAojhYCqAkRhYDaAvuRYDyAxilf9IcS1D/x/8V/0AIJAvgKRwJAwQI0YJAkQIxwJAu/xzVLUcSk0Cv/ULUtRqMTQL4CMCaLVf9GMTQJEDqcPQOTxCCBAJU5LUbjDsCdAvjDsCrAwmzsDFA7fwbgRAzvHJRX/KANdY9A+gNV49ApgMNh1AlTEtR+CAQhsCm0CIJcCrSaIMCCQKCIJCCZCHrUtR5CfrVf8lCIbSyDFAq9HSCRAu9HSD1A1KktQ9CfQhsDDCMoLiDvMMoMCC/MMoJCDrCTbRAD2A6WRAC+A9dEADBA2gmO1k8U7UTxztePEu1C8a7WGCB2aYkGD1mdeFqDXtcYLMJTYefC+15gqYJrR14OwgsRxgmIIFho8MHVDwIdcYPuY7aD/wFhY8QOHGCkpO2lHQrgyPBehc8dHXXge8LHX2DH2aYnTwzAfoMQDFod4O/J1g1PHJ0tg/4KAp14JINp0tgqYJXwmdcYPXxWdaYiWCKAgWB+DCWY4KBD0KY4PhDsKY4KmDOGO2jjR1g24N9VRg04VxDdgxHlxDPg8jlxCCQrllxD7g2jjto/8TXQuCZAnXSJDi3BkNRDUcBkIxDVAulAuCSMO2i0CRUUkN0DfkfkKRCMCEVFRDTAkVAxCLAheApD6cO2mIJfdNkJZxlQpEKoJg9C4NoJm4akP7xm4OkKdY7aJ4P8CF4akM4IF4I0J4Jb4M4I9o2Q9TDtptg5rQdDUQ8QlvgMQgzCdDsQyEOFE7aGELFF/QikNUIYEakK3wYEI0O0JyEO0Jcw2Q3f070Lg4wh71Ew6kIaDyEI0OsJg0GMI2D2gq4KRCug6fXGDdQ9f0X1E8ZfUjxV9ePHX0qwiYO30aw4wn316w9PGVgKwvZi3h3cdsLLD7/a/ULx76GsJiDhYaPEf0awocy3gjg4WFDwP9GsOuCnoXPCeguw9bi3hO8ZfS7Ce8QGEnDXgiA17Cl0LeFUJUGbcK6CoYVPFeptwzANxhWwpINxg5w4hl3DY8bA13Chw2Cl3D58BmGvCudO1EmYPw48MGkPwl8PQ4PwhcNYD6DacNbC78KGDfDH8O1GfwoI5PEWQawtaSgi/w0QKgiFwv/CEN4ImQNEMMI2CPFY7ULkN9gkI1QN9gFwgUKzgNwoCTtRkCZeGbCXpO1AwJtDeCNMC9DRiLfCCCLOAXDiCNuHIj1Qyw3giqCZeG/CIEbcL4s7UfvDbg3w5ghDJhItgkojWwoIOXhWIhcPCD/DeCMdCgjVSJwj4g4SPEIH4JCK9CH4BcJXx8meCPXw/SGiKTphIvcOW87ULfAyMTIhcNKCqEciN38qEcyIbC71O1DMIyjeCI7DKjeCLWCajYSJLwnocyMPDf1JcOPC56aGA7ZoYETGhg00eKMTR4outGhgc0eKLtFxFWNHiiZ6BIXiiD0eKIrR4oqtGhga0EqJSjlFa0WlcnYD+mijusWqIbRaonKP3ZqopKM9hiojVyyiTFSqNAZYowqL1dOo6sW6i2CWKPyiTXAaPmxUogtBKimo9dBKipo7GAyidiAaL3RoYEClWi+o4hlSjWoqClSiGor11SjRoq7Gqimowlmqj5owaWqjDo7Cmqj2o3TSdg40EqJTQSow6OHR7ovaMR57oxaPI57op6PTduo0QPujboh2H+i0MJEnejOKJEi+icMJEl+iK3AaIBEkSIGJIwnYcShRjwYyjCdhqMFGJOi6MFGPOiP7FGKujqcTGK+j6cJ2E4xyY8qJxtyYk6PZxMY/GJixyY2GN5xyYjaKdZMY7aORlMY5mPkxMYtmKUxBETmNlxBEcGKbRBEL6K2xBEZmLWj2UNmMOwnYYzAViqY/S3hiLMBWK+jrMBWOZi7MBWLZi0ok1E5ibcJ2ASjv3eGM8xjY/GJdxjYq6PdxjYoGNKiUVeGPqwnYcLBdivoqLFij5oqKMQ8so5D19j7bKSFSpA4lKKw9/Y82Nw9A4mejpUw4/KMZUw44qJGp/YkLCkhnY6j39j1yKSGb5M4mqP5V04uqK5gko48hkhXozj2Linonjykgp0OGELiyfSuNjilVKSAmjxPJOKjjvyFOKmiikO0Xk8pIFaKU8e4wqONVrRNTyHidoi1RHir0RuPri70GSAfQZ4ruNQoZ48uLM8Z4geNHsZIX9HXiQ4qexTj64kuKI5141uJEZ14juL7l14+uIBipkBOPAEUSLeMUYUSQ+KRwUSE+I0YUSc+IxwUSK+JzUZIVGPzUR40LRkgsYxOEPjcY8tXTjGMb+PPjiY21HnjNKGSApjG1dOJZw4Ew+LpiqvRBOfi4o8ykQTV49mMFw/44aNtQl41XgAScEgWOlw/44WL6904sWMG9qE5+N7iTeYRBwT5Yqbz/jz0GSD1wOEw+KbjguDhKISdY83DYTP4oOIvU/4hKKyp048OLvUZIK2MIRz422MIRP40qL4Rb41OPqNi4mBI9i6qX2Kii3va0Q+93IBKO+8so373cg0o4/0MSpo4HxMTj9QxPyjkNQxOKjoffRKG53IZ2Jf93YGqOR8bEoc3ch7mTxJSi//FxNHR3YV6OADQkp6MJ8bEquJJ8XE4aNch7EhuLBgXEzWLmgZ6FALcSrE2FkRgsklaJwCXEgzERgnE0DjMTAkihjMTIkouTMTCoxTRcTTo8XzqSETTxMSTro2XxsTOGd2AeiOAtxMSSwk/eI192k5Hk6SsktaU6SWk7/E6Tik4GPaTQYs3xpp0khkxpoRk1HBpoWk9+MHgpk5GMFQykoCXdgMYj33aS0Cd2FxjjA45MqTaLY5JqSuSQ5KmSKYtLXaSkEzLTqS6Y2P3dhGYhPweSWk8TDeSpkmdD2Sdk0XD2SWk6Jj2SpklTHdhhYqIPaSxYq+DtEr4EZLyTGEqv2hSpkxWLr92kzhMb86kiaJb9sU85J1jlUK5JqZ2koON78SUhqPm0SUuFOkSR/OpL8x3YW2JIQpk0qJn86k9xPUTvEalJugsk95KiiBg60SGCsokYJ+Iko27QFSuXH4jtFntcVMMIfiJ6MWCZUwqJ+0hUgvHlhk4zYJVSxYnYPFSs4g4JVT/EgWBSjTg8VJCTg0JVJqEvYEbHlhvk9HXlg/k54PFT50eWDViPg8VM1jvgk1KlTMGeWC0wfUqaKp1xUtaLBDNU4qNqQVU9hLMAGo1nWdT8ojnXFSudL2EmZE0/1IuiBYWNPQ5E00NLuixdE1PlTCQtVPNS8lL2Gfxi0r1O+jdYPNK5Zi0wtKnoTkUVOc06aKNONoVU4tzpoU0l+JOR00hGL5CW05GJFQjUikhbSMYsUN7SZ6R3XjSiBL2HATZQidMLTacKdKzSVOL2G4xl0ptI8Zl0stMExl09tLiiI9eNJtSKbL2HtTXWI9MrTeYq0PjSBY20PjThY2+DXStUl0K9hJY2+ErSg0smSfTF0xWJgQB0lWK9gXUzQXjT3U5bz/Su06eOb140oOLb0IMtdNlSy6FtO8wvYK2P70IMwtMCxLU+tJbp4052In0sMstI9iXof1LbZ+UjckFSdETsjGCSMgdh0R+yR7SbJpUyjIS53tOjLL5lghjNbJFobsn+1mMvLmepKM9ch0Rm+ATI3YodZjJ/psaBbnOC+M0im6JRMoijuDmMm9ix1OMsnx0Q2hPHWYy3yQnUoyqqEnW4zhyAEMoybuANMMzJyYNJ0RwKMNOozeySNI0zxyMwFMyEKRENEy1hAWH0zBpcTIczQeAWHYzdNbGgIpFoOzMJCdEaTKI4/M0clBJRMmigrTIszzMx5dYHzOmTsaNihORlyVkKSzByE5DcyNGJLM8yMcJLISzRKftNEzJKG3VEzcBEVHCzPaPjKIFsaZShnTqs6cgVDishLO0pVQ7GmF5m4SrLBkq6LLJK49Q0TLUyitdrISz7yBeGszWvKuk8zomKugSy3KdPVEzPKLPQWyMslzmxp/KD0IWzGsgURgRlMuIz4yIOGBC6zNMh3lDDRMvQQjCzshLOi4oMvjPIyS6W7JWz/eW7MCya6W7K2yrYBLNKpR9WTNSz6jbGkK5CwyjL6yGqUsg7Z+ABxDzRwc06CzQocotChyG0cHKtF40BVBe9MUbdAVR6yBVG7QUcstF7gkciBFRyKgdHNchsc9CFxzFQcnPxz4iSZgJR0cl6GxyCgXHNyAmcqnNfp0c5fVxzl9bHJsBOcmgE5yqcj4BpyZ4dHI9Bsct0FxyPgCXKpzNodHKuhccq6GxyR6ZHMMh5c/HJ+hUcgYjLQBibtB+gdcoUC1zo0DtjIkNc7aC1zlqeNBmAdc6IDNy1c1vm3QNge3P6AdcnoC1zZQV3LVyChe3OhAtc6EB1yAgH3L5yLcmskHQa4DXOSwtc5LB1zCQCPMDyFaNXLDx7c1yC1ySc5PP7oLcinPTy1csHXtyXoLXPpy88tPPspW0L4DVy2crXI5yLcrnPLzC8scPLy1cwXPtyPQLXNFzm8mvMlyLcvMxIBvCA+A1y5ci3IVytcpXNCDY8+GHxz0xbdFdEy0V0W7QAQGfP1z40X4DHyDoCfNNyF883JZEZ863LXyx8u3Knz+gPfOhyF8l3KPzY8y8DHzPcqfO9yF833MvzC86+FbQsYMfISwJ88PIXzI8qfOjy380/JhBvCckFRzKQKfJTyF8snOALT8/wkHRiYf/NzyF8/PJgK785nJgKx8svIXyK8oh0Py0CmfIEAp84Il/yG8qfKbyF8lvMIK789vLDox8mXKny+883nQLf4GfJVyF8qQHxzirbdDEQy0MRG7QRQDgvnzS9JguXy2C1fLiN6yRmA4Kt8mOiYLd8+NB8c2Cp3OkLC8lmFbQZQJgovzJCq/IAQb8lQrkLkgNguDy2C5/N0KfAfQqELP8pOgUKf8wdCtBUcq0BYKgCxmQ4KM8jVCYLs8tgugLsFIQsZzJChArTomC5AozoDCyQqrz/CuQqwL/CpgrwLJCggrW8hC8XPCLY80WCYKKCyQqoLwwIQqHyOoNgsYL2Abwk3Zt0OIjLQ4ibtGagCi7gtK5MiwdAm4cigQsq4CiiEDyLRCx8HxzZEGnKH48imQvjQGoAordy2imICyLlCshRyL1CshQKKtCtop0K2ivQrGK/Cq2HfyJigou6g8iswryKE8xYsmLqEesmoQCi+wrQgGipwraKXC1TIKL3C1Mljy6EBop8LRoHIoCKa6AouCL0yBorCLLCFYqIKHigotIKJoBooSKPslYoHy2iofLIhW0EiHxyaIVHJoht0EEu7Q6IMtCBLISw3O8J5oYEoEL5oesnmhwS0QtYhASiQrn9QS1orn9wSzorX9SiyEt6LYowkvQLoYcEuGKO6QEvGKu6SYsrjwS4wszjIShYvjQ/EmnPchQSmwvchwS+wpchASnYs+ZQS2As+ZwSzwuehASnwvtFISy4rORwSm4sdECSlkvuKfESEqeLVYcEtILboQEo+KOiSEu+LNqcEvoK/EJHOqhdoSHLaIYctojhzzoK0vnzqoY0pOgXvWagtLzckIitKt81rHtKJCrYzNLWirYytLOi+antLlC2vDNL1C2vCtLhi5xHtLxi+fTNLpi+fStK5i2NFtF7SpYuTK7iM0qAKWAEAuzLA87MvtKdilgGgKiyw/JLKrShAqLL7S5ApYAK8mstLLMKK0uCKay+0rCKWAAgrbL6y6Io7KEcpKHtKEilgD7yBy+sqVyhynsoyKu8qtDIAIcmHKyhIc2crhysoBcttK4oY0plhHSmWDnKXSmWAXL3S6WFXKvS6ZDnLfS6ZAXKAyjWFXLgygHDnKwygHAXLIy7WFXKYy1ljnL4y1lgXKkysgGZKyANMu/K/C38r4xfyhcozzvy1csLKCaOctgKyAdwqgq8yk2FXLqyz/DnKAisgB5zkyz/ARyAEVctbLUUOcqIKyALstRQMKzvLBzbYdcsHLbYACttgFy+gpbJjSnZEdKdkSHMYq4cnZBYrbSsegVLSAPguTLqAJipdLqAFivdKyAOiq9KpQJit9KpQFioDLSAOiuDLUgJirDLUgFisjK9AOipjK5EJivjK5EFio/KigOip/LDQJiqzLDQFiuAr1gOisLLbwJisgr7wGHNvAEcoEDorqyzqCYrkKzqBYqmy/gDorWynqCYq8KnqBYr280gGIrIcUgH7LI4Jiu+KwqtPOiqHK8crByY4R0pjhIc5KrhyY4NKttLTIY0vjgkq1fL0AXS+ODSr3S2KGyqvSvHBSrfSvHDSqAypOGyrgynQBSqwynQDSrIyjQGyqYyvOBSr4yvODSqPyrIGyqfy9nhSqsy9njSrgKwuGyrCykuBSrIKkuDSqKygwGyrqy5aBSrkK5aDSqmy+wGyrWyljBSq8KljDSqgqoVGyr+y9jBSqoq9jDSqaK0VGNK5qSZiKBPoGHJ2gAKnaDhy5qJ6phLJyxokhyW4H6pdKW4N6vdLUQW6q9L24H6t9L24N6oDK+gW6uDLggH6rDLggN6sjL/AW6pjKMcp6vjKsczGrzK8czioqBHSonKeqsyioDergK4oFurCyseB+rIKseDeqKy/IFurqy4lB+rkK4lDeqmy6JFurWy4XKeq8KmeDeqgq4CFur+ynaieqoq16DeqaKoYGNL1c+6s1zky7XJhzdc5WttKPoWWu4r1gPKpmAAKy3OVr3SyYFlqvSh3OVrfSjYDhyNgBHPmBZa4MqiRlasMozgLayMqhBZamMprhIc92otrP82EDzKgYWWp/Kt/ZWqzL4kC2uAqB4WWsLL14D2sgr14C2orKS8zirHD5a2sqXCLa1CqeBfanAsnL5iR0vmIPavCvmILaoKolxZa/soPgPaqKoPgLamitHzOK8fJhzJ85MunyG6piBbq8yxfLrrNa9KQbqXSlGDhzwpHuuNKL4R0sDkG630ovh+6gMrPy664MuvhIcuev7r/cpusjLH8uupjLiQBuvjKcQfuo/KsQdwhg9TS3oiHqfygAqbqsy8kH7rgK0kBDwYc3aETRFHZRwz5b6m3A0dn6yHNGNdHEvmfqD0c2WTKoSP+prQzHABoRyLmR2T/rm+Ox3AaH0Rx1vrD2Fx1gbh0P2T/r1ufoArRg5P+pnQw5foB/qlVUJxz4C0CJwAb36qLGTk/6rbDTl0YHBoMxqkP+uMx0nWhpAar0Y/lvq70UuWQb7q1CmpJ2GnBuwoKnZBt/RqnABpTR3+ep1gbH8FFDhyqKHuTEbhGy8RAF+GycvAEx5WBsAIhnFRvfr4BbZFkavxZARUbFGnNTmdYGxAmwFYG6jGjhJGggQPlo4bRtwIdnC1A0b6cUeHvqh3OgVgaAKzi1MaCG0PWfk3GnhvEwHnUxucbkZF52Qb5Md5wtR9GlTBAVkG9TH+dYGrTCgUj4bRpAoj4NBpyZIXWBvPQZUEBrULMmjRuswdBTJp4bWG09SNQgml+tjJYGwwiNQNG7zCNRtGvzFoVkGwLCcFkGkLFcEEGixvXR2FW+pixJAWKDrQChRNGZd+FQRVjQOXcZq5cohLNEyj+XSZpdwhXeZorRRXT2GGahuCqMmam0M6AbQ5XSZqHNFXGZv3Z3EQ5tHQOorqMmb1ucxUOap0OJDWa2CMYkmaLMToUObrMFxROa80a1wWjDmrbBGFvmg9H8VvmqtFddHmwZooYvXEGn+arsaJUObCWM6ALQzoFNC2F6SC5vPx0UNZpf5JmkbFjcJkGFsfxE3C5uR5ilXFsRbLxTNwJagW8ATzcLmwAkLcYWpHG+E6Wklq/E3hZZqJILmkjB6UYWxAn6ULm6jBbd2Wj5qZJ2WpltwI44Vlr2d2WilpU55lC5pZxR3WVsFa9aWVvhb8tGdyJRxWm5tcNq4UFoolq4SFtQdeWqVpUxzlGFvUwrlC5q0wuRU1qZaQKWWNNapW4zGAQdWvXFvcYW+bB+U3WplrsxgEcVpzQDYmFptxlRANqLQ1RANpVajii5r8wgPSNqlaa0R2Ig8Lm8LFNEYWqLAtEZm9wj4R2jIoUnoYiSJEX1sYIUFZZwpYHGHqCaG6EX0YkSeneh+UjOA4BDqLisWIaAKUBzrUgE0sFzcgQ0AEB44D4HKq6oUszkR22OPHagVENWB6gNELZm0RhoAonNliiYxDKJkSzYOWhr4Kaj2gZqFom3ZGiFxHrxWiDxCbxOiDag6I24GgCmpFQGanQq5qYHCKBrcooFONKxXahaswkQ6n+gtqU6jiRkk6YmSQ5iV41upMkDbGqlLAdfl8U/296l2IGdADh+oQTY4lqQyGBpEuITXckluJ2kR7ChpqGF4jhoBkFqhf5viS7T+IcWsigL4saCLMYRgcfGh+0iaGEkWMkMBElbF9aFEmicEcOmkxI/YZk1xIWabjnZpI4ZrBJJz+Mkg+Q8cfmlTgxQk/BFoMoMWl2FffSWhLgX+GWj+w5aYEj2ccaHknBJQ6MtpbgiaDWkYotaJDExRgYvWkpopSfFF8QJ4dVDkQzaNRiVJLaReGDgbaDUnto6Ip2jJJq6fjvAkPaMTvXli/X2lLVQjOTvt0Q6RuA1NSHDTtlQnWjxv0spSFVGr04ERmTM6kEC2nsY9UMMmVYOZUThcwFOohDKCEyKYvLp/eVByOLh8mujdoHilkU+KGtCeh9oeEUVXbopY0sjQL59LWt2gBAS2ruJ1gAoQ+AzUURHDRY2G+vjQ5EE0p66/YvXTcwB2jNAHb20OREcwB27dAHaV0Adu7QB2ktAHab0AdqPQB2wdFOQRuijz116sPXSbQ9ddcj11m+A7o/ojuubuY9+uw8i261uzNtHpOPPbpGw9dcTAe6ruwaPO62CB7qW6XyPXXmwvumbvVUtuqbpk9zurTB27fuoCh26Pu5Fh27nu4zC+6xusePO6r0L7oh670PbofRUegHtQpUehbpdUbu9DlR7nuzhj27/0U5Gx7CQrbpW6pkVtFM7n8Inox7yOIntJ6uWInop7aOPbpQw2euHoORcezijZ66enDDZ7Ge/DDZ6We3jj26SMMXs56gJPbsoxpe07pekxeunqIExexntwIxekXtpwxegns4w9u7jB16qeltW572caXtB6hInXsZ750HXpF6p0aXo27XWaXsZ75MaXvV6CelTD27ZcN3v16zSbnuB7TOrbDd7GekCjd6Rew7D26Ye0ztMxw+z3tybzuiyND6TexHvD6Ietbxj6Juzbxj6bcPbqG6JEzPrp7vMTPsZ6/MTPpF7AsO7tt7MMmPu27TO8LDu66eqLAe7Qez8tx6yAOXqNzeuhEz11HeuRFd6u+znvUw7uiHo165EUXA765emXqH7nu6Ji+7ceq3u56G+jaQO638A7qb6actvoh7cy87o7LXu37u661GPrrUYRMNRiG7jEw/rG6oNHruP9D+mbusTD+hbqv9z+3rkP61u5xPv6QsNRkr6X/czuO7DQQ7u/6v+tH1HoMfe/sPY3+p/qqFzO0dHAHb+q9n37QBmdDUY3uwyqW7KfNRm+7O2q/vfY3+qboZ8AB2FjUY/ew0F0wCBpAch6CB0AbD6iAlAap7SAlAeIGUew0C51P+rAcx76B9vpYHiB7Ck/7QBwnvoHiejgLf7iB4dHM7H8IQbm6tYJgfp6eBqAaZ6eBlbq1guB9nvoG0MczsAJlB0QYZNlB9AY0ZlB9gYxxlBrgfF76B8SnM7ECczrH6Dk4wbUGCBYwc0HGMYwfYHqcUwfEH6cczu176B3XrcGqB8rxcHxBwTBcHNBg/rcH2Bx7rcGuBuAfoGEB8rRwHVeUwdkGNeczu76C/IAb776B3bpSHxB/AavgpBwPpSHYh6gqAHyB4UXM69cIocsHUB3FPyGpBuzCKHchibp0IohjPvoGj++7PM7PMFoc0GXcFofYH3cFoa4Ga0cAdP72g8AcsH10cAfQGYsXfuR4JhtQdb6w8KAc77f2+/vd6CBzwfLacBwfrpA5htQbMHG2+/sn7O2nAdyGfBnAZQrjhxfu/7jhlfrDxiB9ft37RpeAav7GyIEC1ABS+cz2ojqH6A2Bn24lFfbQYVpA/bjAVBnmI4YJYiRhViHYnWJnqLYn2xwRz6n2ITsX6l2J/qbpHOIQTc/lBpWkQ/AhpOkE/BhpekcWnhpPiLDoAxfiQ/VVh8OoEgBw/MsEhI6STQmk/wKO2rCo7enJEn2RqaNEkY7fVN/pY7maKcLZoToe2ieQuaTlt5p+Ou4gFpHsFLswoROwFHFoJOrKF9oZYGTumQ5OjwjNRWWJTuBwVO33XU7/4VFC06MUBVF06JAyXi56CUBHCi7TOmeBcGsLK2ms6Keeyjs7tSXLp5onOr5xFoOUPrwk64lKTq86A6Hzq900C0OgC6I6ILtdIQunTqucE6M0bVQ/STVGwULO+LtDIyJGpnFHjUGyzS6H5MhQdGpKYo1y6ZsgR1roiuthEboyuuJQq6fceIPRV89GksDGOu7wTEKCS+HIBwJQaHP4B+m/9ESrEsEkgP7tEVtG0QM0bRHbQY4RzG0Rt0bRBXRtEbtEnay0bRBvRtEI9G0RB0GOD6HlxoccTF40GOF26uaPsYcQ1xrRRJJ7mbju6wjxgcZqsZxosXPGahbjvu7kqhcZasNxqCFPGyfbsbnGurS8e+7hxicZo6Hx78hJI6+zcbHHf2S8d0xNx18ch7NxpcfcAnx0zGHGdx2ChJIqh4cbvGVhI8cAnMermhLQuaMCY4GuaSCd01uOjsZOtLxoDD/HkJvJQImpxy2DQn6eneHEYCJ7Ce/wCJvCemTuOpQZ3gVB9icon1B9ia/HT7ViewndB9ieYnxeneCMHRJuCdC1uO6jG460CGSeomle0ScwnkbH8fk4pJ+SeYnteneF16tJiSfrItJ6id8GtJ3ib4tuOi3q0myJ63p3g4Bqyb3GKJKSewnJ+qyeYnXeneHd7XJiSa3HP4aib97XJpSZN5uOgzACnmJmHp3gYJ9BAkmLMbjo/H0EYycR7Qp7CZR7Qp5idSpuOjPp3g3MdKa4msulSbz70pvydezUpsiZL6d4Fcd0lLxufxUnq+kqeon/xzrp/HG++qZp7Eq7wk7G/Jx3s3GnxtyayQJJkiZjgNevqbamuJmXr6m8JxyfcBLxiyfKneJk4canppy8dRzOxsCZuHOx5CcMnPq60TCKfEGemIq1hPRI3IPvahE7JjEw6d7Iz+w6cHJT/Q6dHIENfabL5kNQ6dbJn+6hHKon/Jshf9MaDdm8SNET6ZKFABj6e7JsfW6aSlMaY9m8RxyKJNWLHpl7uoRHyBJLemlVahDfJh8Z6eunvyZ6eHJ0A6hBu5WfeGfc48ArGahnQqIgMRnlyUgMRnJyYXyBmkKXmAunUKD6fBmzPD6enI2kzGmw4FfeGaIo5oCmdOFWZ0mcR5WZ2mfI5WZhmao47NeGdvFMaFiikDJZvmc4pJZwWfY4vNIGYEp7fSWahmc1TGgwFXfIGekoDkzWdRmCBTWYxnQUIGdIFA/HWcFn0RUPyBndKCP3FmDKBuEFnjKBuGNm+LTGjaFNUG2fVn7ydP3FnRcTGkcoqtAOfVm3KRIcxpPKYvyBmfKeFPFn/KCQljnmZgUR61MacKkyCU5g2aRmHeNQnFm9BQlJzn1Z6LjJTMaI6fuzi5wWeS5aUoGenZx/cWcy4WgkGdOn2gkGYNnCuJf1umSufwjm7rbHrqrJ40RCu7RMKogEap+2pIkNA2qClQ6o1EGZE0ReqHRG7b9ECElnaxAEanZ4F2rDSXbrEaagHM7qhahDKYGndoug92yjV8RD27aleGH2g6k+HRiF9omJ32wnVmJrqYEYnxQRh6nBHAOx122ISkPYnA6GpFJ0eJlrQGlRGriAN0Q77iZDrTTukNDvxGMOnDiRocO0kYBIMaDXypHcaGkchIzYekevFGR+EmZG83OjonwGOjEk5HmOnEh5G+0PkYeROaeDmdoRRr5HFG04SUY0NRaTlG/Q5R4uBzSlRyFHk61R2FGU7G4VTsFINOvUa7gDR8Uj06h4PFB8bzRkztJRzaG0as61SNmgZD6UR2h1JHO/UkK6T4VnlK72eH2h9HLSQLRtIlO8wwlRHSagtDHo6eVG3VwujZSToou6P0DIKRXwqtpXiFeCS6FRFLtNQdvYuizG7aHMehU8xtMhdR0uYrs9Qw+crtbp+EQNFkEaxkRArII0CyAHp18vcusgB6AYofL8zbqCtBu0b9HrIcoBqj7bZEUeaHb2qDIjHbsiLRDyJ55saEXm0hUolMRyiRdqqIV22olmoN2mbiWpoc3rFWp6xroneZ1Ua1PPnKxR9qvnjqG+eaR4A/4YfmYYG6hBH7qf9ohHGsKEcIYv5sDrGEIOxpCg7T0GDqBomkdEdAWsRx4hxHhYPEd2ECRzDplhsO0s1w60ackdZm5kHGmI6lkWDAwW1kEmk2QsNYGJZGqaVEmNoORs5C5HSFoOF5Gw4fkc47BR6hd47f4gTupJGF92mYXGSNhZZJFR8uGVGpqVUcVoNR0P1gw1aHUZAF9RnWiNHJSSRcTpjO02itGQh5UgUWwyW2j5CHaKSaZR8u5zsNJiuzlHc6vezzoMXA/asfYxAx/zvDpzF/+GC6reCMc9Jcm6MfMpouq0di6dUWPTW9kx9xbTHUus1HS75tbMaTIAl+Yjy7q6YJbrpXOsJdLGUVP2jn9Kx6rtiWe6UvXrGJEdgHSIF5/gCbyaSo3MtKy0MyAaoElzJcyJSsP8HxA1EYjJbHHSjOzhzhCmHJjsQ1yIEVAWELtpGhj20eGPa14Y9piIBAC9sVAnERqDwL6uksvEgDoRrtb5FQWtoygfal4f6IL5waNGWokStrOo75+4mmWgR9JGfn5lx6lnwgOz+fE01l76l/m/qaDvqRdltEZAXHVMBchoIF3EYaQzlmBcRorlkkdRoyRynopGHl1lieWISF5dWRiaWEg+XqOimmRIgveZKxMtuhmjRomaYFfIXQVyha46hRmhb466FwTppIukaUc9pxO3RflGpOlFfZIVR6ZUU7eVzUf4XtRz/CEWlTbTsNGdkcRZNHpSM0bJXxDMzspXLOqlBpXbOzjvs61Fl0Y0WXO1lc9HdF70b5R/aSsampfOssiDGBV98yFWwxkVcNHIx8VdVRJVhxZNwExzOlcWWHVMfzplV7xb07SEPxY1WcurVfzGCu11HroSun2Wbpyx6WVNXO6ENCxVLVyskoAi1+9uGXL58fnLXxiCZarXLqXZFrXG2u6j/bG1jYg/noR1ZdqR21whj/mkRnZaAX4Om4n7XDllDsgXYaaBeZJYFidZRp/idGmmR7lvqkeW4I0jrpG3l1dd5Z1175fwXt1/5b3X/YK5EPX8SY9c1IIV0kh5oL1ykivW4V29bE7WFh9fYXpaVFa4WMV7kg/XsVgRfVpdRv9dEXdaY0fjoQNoztJFLeuRapXoN5MdpXNSeDedHMZPmmQ2PR8QS9HzSY1fLhDFmJd5WTFh0lxWCNjJq06rFuOhsXE6GMZToYu9OkTH5VtxdzolVrxcqbmNzLv8X2NuM3y7dVosezJmt71DLHIlqruE3u6UTYtsreYeaKWWqMeaUQJ5spa6oZ5waD6pqlwajEA6llebGomlyajWM12+xAaIOl/eeOael/duTR+lnAuSB5SrvO6hVYZvurxF6MgDzbJ6AtsnowR38tLbg0Ctvk38K4wBrbkgHZEtrqAHvObaPgVtqkRdoDts1Bj26NeaB/thIkahTtkpYu3R2q7Ynaql0tHu2l5+pdGpGl9eeaW3t7efaXFqb7ZWpPEP7ZPmeiVlgSBL2s9qTXC2lNevarRwZeLXpN0tdk2TqW+b+H75wEe/a5l9Tbfmm1rTZWXW13TYOJIOmmC7XAFxpF7WWkA5boCjl6GhOWR179HOXbN4kfs28Omdec2UFhdfc3Xlldco6cF8ml82t19kaIWAVkhYPWK3ULd2MBRleR46ot6FbFHYtvBClHs4UTpYXNWSTo4XUtwOm4XMVzLftIcVtTp/Xct6Ony2iV/WgM6pFsDbK3rRirZD2bOhPUdHVFurZdoGtllaa2dFjzv0XMNjrZ5W/O0xd63nSS1YG3Y6MLvERbF0balXHF6jblXaNt3no3r1xjfm2MumvaW2A5lbZ1WMyPVdCWSxrbaNXKuv0bNWRNurpmA6y9YFzWWoVrpag+EeJa67rIONDzg+uzqsRaiVcZpJU84QNtDjn9j5tw9n9kNujjn9/5rjjn9oFsTjSiQZqXIZmtOJYWdmuj1AOtFG/YfQWF4A8PJSiAA6qFOUU5r4R79q9k6qkDmdDzh7moTygOnmsGkf25+Uoi/3vyUonhbO4qA5+aikdA9tboRog8Ow84R1o08iDl1u098D3/ahaDPIg9hb+1ng4RMWFzg+wok9qA84ZOUa/Zmh0DoDFKJlmmdZ4Pn8cQ/f3TxcQ/QOuWcQ9kPaOTlBQwtD+A8UYtD0g+LctDig9PstDoQ4xwtDpA5zVOUcSmsOID1Q05Q+WoBNEO6Maw+MOP7aw6EPqcBw6UPNKTlE4w/D3Q7laDeng/ZwHDtw5iw/D1Q/nQ/DjQ6dYHD4ZsHUeD0XAcOhD6JgcPLD41qnVRDs1oVxsjnw+oO1LNlaEODMNlcsPmD4UU5Q2DsUUqOfD15rARVD71sESeDv1rT7OUF/cqaeDwwjaOfD7zDaPVDqNtO9Ojyw7jaVE0Q/qwUDgw/XQUD4w4iOvCJQ/B2iDjthgP0D+TDzhMj1+YYO7D1YaIPacHA5WPSDyjBwOsDjQ84PYjnw+MOZpm/bfwb9qA5e8YDzg/X6YDjQ8Ex+qzIo+ak+ENtb5hm+R3GbW+RFr+h/m9GG+ONjvHDNavUQE/k3fjtHZma/oT48OooTpTDxw0jxR0KIdmp+qhPA21+oxP3j0Y0KI4ThZoMcMT5Zsr4YTgvDxwQsck7ROLmUUapPm+PHH2b2+Uk5/pRR4E9Obe+Jk7ZOSYUk+JPQGcqp5Obmv6GBP7m7BtJOnm0JzxxXmwhvJOcT1NtIbQT+FrTlQTiE5KOaGiU+BPz0CU6pOr0CU4hO70UUbhPYWq/lFH/jsz1FGeT1E347f0S08GbFYE0+kPRGqE7yVLTg08JbpGx0/EZLTiE9EDLToFt6dHTtDH46aWtRv9OcT+AUDOTT5lt0b/T309UXHTmw+jgqT0LX46+W8xqZOXDg+X47GMTM69OvD+xrTOYz6VuOdHTuVrOdiz0M5eOWBfjpEwqzr0/Ewqzgs+wOLUG09a9kzr0+RONeZlaZPZcZzsTOtmqQS7OFTwo9BdHTlU5yZ+Ox1uhdHTl1rQUmT91sRcpziM+9a8FWc4LPUqfjsxOOj9c4NPPMdc8HOI29c69P3cdc4LO428l0dPxjlhQ5PQz2U6Csqzpk8HPLjpPgfPSTu49b4ITx49b5iTjNrKx82n87vq/zjtmJQSypLEBg9sXGAyxcYLLFxg0sJ6DAvIT74ZKxAYIrEBgYLnYe+GKscsL/O7casJAuB2YlEtxd9YlG8wiL5C+P0iLuC/dwiLnLGvpiUb3D7DcLptHVQP6IC+6wWL1C/uYmLqC8PJaL6i6qEBl3i4ou/z9bhZqMLyxW+GILsnxZq4Lg3EQY/zxbH3DaLvLCPC/zpXCQMVLxC5E1iUDXFxgBLiS/PR8L1C/OxqGXC7vQmL0i8JYmLgrGFgNL4aSYvRL1E3VR3sYCNwuvsJgz/Ph0Ry9QvmWRy6UvTxRy5suNpRy/svIcEzokukLEzq8vMMGRaEucMEzpsv8MEzvsuiMdVGxwyIoS8QJ1UAnGoj0r8y9JwGI3C4/sUruC/k5Mr3y80p1URnC4ihLlnAqvzL9nEyurL0PQqubLmbHEjqr3i5EtMrri4olMr4q+iZMrjq5Ux1UWXGGuvLxi5SYhLrbGGubLkCmGv7Lw7HVRtcYyIKu9cRa/Mv5sRa8avsFFa+KvTLv0g6vUqdVBtwjrry8MIjrsq+IuqEGy78wjr+y8CwBlsK7ov2ggZfMv10AZcauucI9oKvGrmaaAu38IC4AvJmFi7gv1+li9EvBMLmreOysLNuhv/zpLHaMcsdtthv5MGeCGv8YLLHxg0sY4z2x3oPLGrbkborHegsbtC/egKsToxng7cXo1hvjrwY2pu8b0YwpvCbsi6mNqbsm//qZ4GtA5uMbwHVRumb9chnhm+AW+YvBcvm9Yu1oDLAONYbpKWl3Ebrk/hudQKW6+wPQNm4FwrjeW7YJhcnG6VUZ4Da+ZgCsWGCZu3r2GH1vYWVG5NudsfGC1uNcfGFlvtcZmG5vVr5mBKxwTWG9MuoTKW6Bu1oE2/QorRzCnlvsKX29lvOGK0fixYYZ28JCObtm7yUQ7vm+R4Q772/EYQ7rW9ECQ7oO+hxqTKW8AIKVvm6RwKV729RwKV5O4xwKVoO+xwmUf24yu+TKW+owrRtAlrv6b33wrvw72i1ruo72nFrug7xnHlMrRmq6VN/b+q9VMpbrnE7hm7mbE7go71W9cMrRjW41J/blG7Xg27oO7Rv7Qq0flwbTKW6Vx7TDe+bvZr5+CjuFrxBAlvhRaVeJvo+6VYbvFsRxf9uzcIMylvLcUMyluabjo6tGzr2hAbviLuM39ubr2hCjv7r44yPvy+6XdPu/cY4wbvA8D0G9uG7k29+v2jaB9huXvIW61vQbwXLZuIbkKsJAHS5sb2hIdmWDHCAcZ0SLbyuXJBgrVhk4dDzUUdeEXpa2zHdlBsdwyFx2m2oZoVvM1/YfyrmH3tuPaR5qnZSJh29Ilp3p5+ndu3Gdmdse3qsVefMR2d17ZsR3t+om9KvtwkgPnft4+ZkyKruNfTgE1yenF3J6SXb5yb2s+dl3BieXfeHFdhTeV3q11XdmX61jXYJh35sYRbXQOvXfhGDd/+YBoURk3eAWzdszYt2LN4ddeJbdsda+IHd31Qc27l5BaI63N2kY92GR0mk+XESPBb92/lgPcC3uRkLdZowt8Pbr3uad5Gj2U4WFbj2mFxPcRWkt5Fa+lZO9FbfX1RrPa1GzFvPfxWRFwlcA3CtkvdJXSty0bJQnFtKGpWqt2DZUWGVmhddHCxrRbvX2VvRYw2ZOjvZw2+V7vbU6+tqOn73Qu0jYi6AM+xbjGZVhKhcXs6FMZwQGNubaLoFthfbY2l9gl1W3V99beEdSuzfZy5jVqJa/VqxvfeigM1zCiP3doPNdP3C1usfE2obpLELaisBxAyxC2nLAcQSsKCD2wskf542OdoeXDPZQX+C6ghgXsZe+f4TnaClwoICrC7YysSK0RfDrmqCyw4rDF/WYdoYi/HZ8Xl3EJeYXyi6ytEXzm9ysqXtLAKt8X/m93H8Xoczurfn/dkbhEsHaFHRG4Dy5LF8X8l4ZevsT6DRexLx8fxeNbz6BheDcdwDyxerKl7Ze3rwa3xelcICcRedsADjVeRXha6gn+X3F4oYdoc7ABpEX0y+oXEXiy4XEGXhEw5eYXgO/2sGX97ERoqX+F6AwuXkV+jvLYNl5EZ+FgrH5IzXwK6wW/XwF/AFG4NDBDe6X5tJDfZX8VhDf4Xr8RDe3X5K+LhwXy3UbgMrqGzNea72G1Teo3xu9TfY33AlTe3X9u/RsGXxnCxtS38N48ZG4eq+xRS3n1/y1q3m17GxjOBl8mx+4PV56u6bVt6Leg3t2jNeRrz+ErfGLryYZeprz+FjfZr0xf7fe37XGFszX1a4C4GXja5iml32N7NwEu+d97fsXpW0bg7cVWzNfHcDWwZfSX7W2Pe3X+67PZk373DPZK3v3DPYc3wPDqnq31t+Zf/X7R+ZfmXoG4cQYX0G4cQRXiG5hK8scriKwE0MrG7nGiErGh2ksCmAywKYLLApg0sIdD2xIkID+hPoPhF5bgCcSJByxIkCrFtt0Pu3EdsW4Y68a4wPgl9a4yPs6865KP5D965iPnD4LwW4b3BDsyPxi/eREPjY0aIOPji9il0Pw9iY+GP6W9Tt0P2j7w/QGX6rE+BcA6nQ+Nb/bjI+DcW9FQ/FsVdDI+3ruWAKxK7dD6mua7LT9o+NcJ7hE/YPqChbhVr29Eg+i5Ez7E+udNTqBuAeMj59uh7Pj9GkbPwT/ewJ7VT/M+XXuWCs/H8XPZA+qKXPY0++5XPdo+U7j5b4/ocXewi+OPzijU7c74nns+C7iOFC/i7yhb4/scW+3S+YvrD+vX0v/z4IE1OogUK/zPlu7LgrP9u7/t7PxnEBk+Pmq5Bkqv1D6Va1OrnCgdav0L7GxcUQT8mx94eD9a81OlG/3hyvwT6GvMHGZ5i+2Pl0Jmegvx0xmfQv/T5yY1O7XAod7P0z7FFFvxr+U/lvRb9C/TLlhz4/Dr9h32+Yvqj+jN9v6b9JePUUL8ouNtvj85vJZez/qw1Ov3Bj4HvoL5a+/4ez6C/froh7I/uP2z4a7fv1TUaIxPiG/iA47j47KwvjyH5zbof4C/bgUboE+h+Rr9GDSxwT6H/bu/oErFhP0f1H7Qu/oCrEUd24O3HROifrLCxOifvLAL4ksXRyJ+sfvZiJ+Cf9m+r5of73FtkkforDAb24QW8gaufm7Bgbqf7i/gaBf6W6Qb24PbHGhof4S9QbofgXEFP0fsn8fYxfjn6XQxfgrEIb24N6+icBfpXDickfun9mvM5bX5ywc+DLHoaxf3H/OxmGgX9Mu2G5okp/UKZojp/bL46EZ+HLp/kl/4sW05Z/xf04V1Hcf7y5RR7f8jl1GnfwK/kbdR43+DflG4X6zvgz/+FzvRnSX4LvtkH34BF4/yP5zV/4cSiz//fgnG3lJfuu+jgg/or+saC/1P+px/4DH6VphfxnCLP/4Gq9LP6/oP4huWBev6d+ZsN+Ul/Zfqe6bPJf0XEr/U//q4ibJfoa+ib/4eXDibhfnX5c5x/p34N+yZcf4z/tcSc6FX/fg3BlQg/xbEKbhfs3GXOd/jP8OvMXYX+J/7s/+EdxKFY/6d+brpprP+M/zm7PP/4R78vPhfzX9/UwatX4+/hfj/9+unz2H9h+gbt87//b/7OfP6Bq/b85JYPwRFYJh4QAmH4wAuH5xIPbCw7GAEjXbGBpYbhCIA+C5xIErBxIKAFIvOJA5Ya6gwAlLD8KYICHXCZrBAS3DTNGAHEXOZqkA7AH0/WRTUAggGMfCVwwAx77SuVohoAzj7ZtOAE3YZVwwA/j5tRMrAdRLuDcvEGjCAhW4CAr7BXNIgHMAybCGueGoYAg3DPNGAGLYN5psAvLDWuYIBK4O1zIA+gGzXAFrIA5gHa4EJSqArgHnYCFoSA0y7QtAQFA3OFoSAn25bCVogVYM6DMA4O5RuYIDSAiO44tAQG+ffFoiLTQF+XW4QOAwK5ktep4OA6HBUtLuBZ3WloCA3O4MtOIH0AuN4stCIFuA7HCctAQEZXHlpdwGu78tLuCk4dtyZApIEFvMVoOA9u5xwNwGM4GVpdwGq7ytGoGBApr5EiBwHEAmXg1AlwEU2HIEZYbVplApIEo3Ndw5AtwFDXE1oCA+XDmtLuA6Amf5HucYEYAsOgOAha4XuBwH6Xd5SLA3AEWROVAFYKUSLAmYHWA09RdwMgE7vINoCAs66htI4EbAglxHAmYGUXRFRSAroHvqUQFcA9FRSAhoGB4NNoCAhoFnA365+CD4ESAhB4FCDAGg3U/YwAiG41kPLBeEIrAJYDLA+xFHJWvUIB7YIpCQgiF5FINLB8IOEHwXRJBJYUIDggpF51rDEEzLXEEpYB/YKoQ64YeBVCW4XLBlYXDxEgrEGkvIjxEgirCkeXEGc3CjztEZEEXMQ0bMXSA64gll65xdkFZYAuIUg+HSGjDy6ceUkECg+kHifHjwY5HLD8eXEEa3PA64gg3CEHUkEFYdVTtEUEGYMBVBK4eTyagkrBKeTUHigha7DxBUF8g/V7sHBUGog0y7cHdkHqg+JTsg3UFmedkHighy7WeAUEYtdoj2gl14zQJ0G+fQNSuguO5TIFUHBfeih+g70HSg4N4w4V0FZ3V2BYg4twAbQMEaMADaogtP6uwMMGZ/HHCugjK7JeV0E13Jw64ggr6gJQ0YU4SnB5giv7QJDMGpgxnAIJQ0Y1XYI7Vgm0EQ3aeDxggkGtA2RZ5ggXB4JPMFygvr4arTsFOgqXDkJPMEjXKhKGjRi60JEcHxgnbD7bQcFOgw0EvKEjYmglWIkbGMEbXMBDxg87BHqV0GWg3YFp9Q0bHXbxZ5gs677eV0HEXI7zHgpMGUXRRKugpkF3A67xCgmMFvXc/YCgrnDTwbMECg365eEQMGsghB4JYVEGg3BLDighsHgAgmrP4AmqcvPaagQkrDJIJLALDCoAjXXJDQQ+6B7YOkB5YDYZlYOkBFYOkBpYOkA5YOkAVYD7wVAO3DGJAiFZYM/oEQlCEM3axIEQyCH0/ZDQEQnCGMfDDQVAR74v+a6DMXbxKgQrCFf0ViEkQ7i6AzP7YIQ1bgVAJCGSAzojUQsbAQBCoCTYaAJE5YSEG4ZJIIQxbBpJNCHfkJiEFYdAKwQtSFAUWCHCQjXDiaBSEZYIgJCQziHnYOTTKQ0y61JASFA3BpKWQ6iG2XXmB4Q0ezXQd7DszBCFfYLmbKQjy5awTiHeXMQbKQ4P7WaPyGBXMWYCQkK7G+ASGhvM3x4oDCEMmPFCaQhMGDwYSFp/DZJ+Q7HDbJFKHeQgnAHJa6B13b3wpQuKEU4OLQpQhyEStbKH0QlTjXQbjAVQ7yF8YCqHkQpr4uzPyEpYTwKNQ4qEC4Fgh+QjW6RDASEo3KrTXQKXC8EPyFwQmdTXQRi6wpQaFxQnbDxzASG6Qhb49aPugCQ1a5YpBaF1QxSFbfdvx+Q8yG7AuoYCQ464VBHaHRQ7KbXQYi6VzI6GJQyi5MpPyGc3VlICQ5iH1GToh1QwPCuERqEdQ5SG/XQDSaQziEIPK4avQoH5h4ByEQ3fwh5YU7RFYMHQZYYjLU5ErBY6PbCYwMGEQvTGBpYJHZlYLHRAwtD5jwGu5Y6BGFoXLHQVYQVJjwO3AUZPGFZYe7R4wlGHEXOYJJYJjIUw+n6sZPGE5YDjJIwobhjwR768ZXxDMXPYIMwll4iZKmE/0VmGww7l5mpBmGCQswAMwnGHifeTJUwgXBKZBmEa3HHQMwg3CupKmGLYD1JUwt66LQArAGZMeBTXYzKaw6GHIsTWF0w0DhjwfS42ZRWGQwiz5xpbmE3YAWAow20ECwM2G2XQXSCw8/C+Id7A5pFWFmwl16LQUWHR3XWAgwgL66wdWHBfXWC6wlO7xZQWHQ4JkLcwrO6shIzo2w2K6G6cOEhw4u49pXxDY4IrLcwjK6lZbmHowl6Spwm2FFfEVD2wgt7u6QWHt3L3TcwxnCqhXxA1XTrKCw+q7ahCuGBwvizVwkOFjYIMjZw2GHIyXxD9/BeAhw/q4p6XxBDXebLcw+XBLZEeE2wrWFqWQeEhwjXDF6QWHa4b9LzwzGFn3avTcwpWFbfBvTzw72GW4aMKCw467kIZeFnXODK+IMmHnAk+Ehwyi5D6QWGc3b7Lcw5mF3Q4NA2wwPAEZOuGlwjmGBXU7SBwzGEIPMHS6w0G5g6UWEQ3OfRx3GIhFYTaAZYQsxJYTaAlYUJB7YImAQIiF5EwNLB1sOBHwXUJAwIjD6hIZBFoXUJAVYYsxQI+2yvQQ64VmAhGW4asxlYWswUI/DxEIjBE3XFsxUI+64IwBBHe4bsyvQRi59mKhGC3W5icIm7CjmKhH8fCcz8Ijy51sHLA0wBhFCIjBFjYH5hUIybArmHaioIg3AgsKhGLYbcwEIt65LEAhFK4ImAFYBFhsI1BEa4ImCiIw2HosZRHYI87B3mZRF4IlYQW0IG4vmfhFWvUlj2IqxEOXDDoEIt0EIwDBEuvBGDOI3z4SwMBEBfeuD8IxO7LrNxHf4C2ghXBCz8I0N5BwbBGxfdCxuI2K5YWBJGoItP54WNxHY4QizpI2JEE4TeD+I3eQW0UnCasdJEYIlu4FwZxHt3AuBGI8qEmsfhE1XHuB5I+q5WsWpE6Iht49wFJFSIjoGbwBBFdw8Sz8IlG5SWPpFVIoa5+sfhHy4N+B5IrREz/N+AlI2a5vwZxELXFBDdI/S4oIWJGKIgDJuIlRFbfWVYbI5xFkIwhQW0Y64MIWJFnXBhB5YBhAtIiNoHIlJGUXBhBVIzm51sLLA+WIRF5I9RFv/Nai1IvpGcIwK4xEFpHYIhB6bQVBGg3TaBWIiG7xVQlo/PGZp/PSFGwA1qbQo1Y5gvaFHdnbqbQo7Y59TD5pwvOFEhtYYjjNKCBAtVF7Qo6s6YvfsbQowNp4vHFHrMccYkorFHH6WcYko5ZqUvZcbDNGl7LjHZr0vclHrkTsaDNUqydjalHMnF5BMo+HQlTelE1CYcYkolFFYtYV4EovFEvdPqZcox9jDjalHutOV7LjalFTHJV7koy1qqvTcaItDV6bjYVGMHHV7kojU4LWaFHanI15ITFFGwHF5Doo1CgYTS1H/NF5DCoi06WwAVEYtZcY6owkLLjJ1F4tD14oo8FHKHX160TB1EG+WibSo6ZLsTOVF6HL6woo+lqhweFqhwD1HMtbjjsoojCiTV1E2HYuCso+w750dlFoEUSY2oxu6KTFFGitYuBOo3Y4lvdlH+Hct6VorNEeMfSYool466cFFGEomXjmTZtFho7A7tvBtGJo+FE6kdlGInT+CuopFEzqVya8ozVEucXyYoo21pTvVyZhox1pzvUKa1op5ri2FFGvNdBCJo71obvJKYootc7MISNFpoTKY7ogtG9HZhCJoqNrpcdlGBYEqauoik43vcVG8otVG/qZKrxoz/5WTaFGXHCXbvo99GTMRabfol9Gb9PqbxooeiDQeRwOQJ7yBQcDHcwSRBE7Lk5sPHtqxrEXantRNaNQT9FXtXR5C3bqAH7J55NdV567QNrpoHO9pXGQx4fDBXbjLStZmPJTZftSx5qbbJCa7TTZ2PbTa67L6j67TZaG7bZbdrYzbNIBDpePB4g+Pa3Z+Pd4h4Ue3ZYmSdYhPZ3ZhPeZBu7SJ7LraJ5rrXBa0dBJ6ELcQyB7RmjBbEPZpPMPbgrCPZZPFpB80GPZ5PYWgJ7GUb3rEFAKjUp5orTkgKdSp6BI6p64rWp6a0cIE6dRp7ErQ2igbVp6yLCvZQbKvb2jZRbZdKyaMrAZ6aLE1pudb2jobZrTjPblaTPbrazAnvaR0PvZukBZ5irJZ52LTa6p0NZ7OLReCT7LZ5lNGfa7PVVYl0dVbZdI57arBhCnPN1DFjTbb8bHbY77Pba4bD57urGNCDQYIiDQEKrZtHB7Q7cHYEPeHYltJPiIwsh5eEfG5UPDHbDEBto47fH6MPf85I3UgDE7ODExrcnZBCYbqtUc7YdQS7YCPVGjTjO7YiPKEgs7cR4LQSR7LtTnZ1EHeb7QHnYKPH7b87ZR4A7D76IYjR4nDB6rvvNDGJEW9o7UIjH/MEjHGPMjFvtCjGftR+Z1rGjFgjGx5a7BjE67Bx7MYpx6sYlx7IjW9CcY/ZY8Y8BZPEfjHodGzbjrIJ43LadaAkF3bhPXkju7GTFYLGJ4+beJ5c9fzZJPc5BBbc4J4kDTGEkDJ5HjYUbRbGFaC0fJ7wrQp6yjYp5mYzDYWY+Wg8LJWh8Lfkh2Y5FAOY0UihdZzHF7ElZuY5Ojl7SDadPSrbV7B0ZwbJ0ZarRDau0RrbaLEZ5hYtrbedbDYBjaLHBjQVb9bBLGirIrbJYkfaUbeMZxdGjabPRVY7PQuj5Y3xZl0elbFYzjZrbcrEbbC55VY8LE3PKsZCIfbb77bNYtQY/YtdPDFn7A7addBsYkAXRDrTAZpWiWKDdFfkDC7NODTY2DHdtObHC7E9q3Y89qoY1NZ6PH3EA/Z565lAPHdldrp9EKTbEY4YhfDCtZfYqYgq7ZTZq7Kx60YwHH0Y5ZbFIJjFwjDZYGbI3ZuPODpcY0zbg0bx5DrRHHWbITEo4kTGO7W5biYqFCu7CJ7oLXHHrIfHHyYymh+bf3bKY5J5ArdTHsdMFYcImnHnrHJ7GMCUaM4+LYiHJFZs4zhbp7dLbvrGzFfrGp784zTqOYgDa1vfTqi4krbi4tp7lbLzHW0HzF0rWrYK4+radnd0Yq40LGtbX0ZYbIxZdbEwwxYmZ697YVZxGA3HDbCVbi4k3HpYybZZYy3G5Y63GZjFjZ24zyKV0IJZlYnjYGrS56YZa567bGJYibblK90BrGL0WKDgFENZhlEGDiUfgBL1egnGAagkWQHZqx1ENqx1D5qx1eFqx1RFqx1f5qx1ZZqx1IFpR1YZpR1QZpR1VgnQFQuCYwGZrTEWQmmweQmB5aQkwo2OqiE3WCKEvFqChDQmcEheAaE/gm3wRQkBnSh5qE+6AaEwQl9tcZqUPSQmU7Swm5Abgm5AXgm5AfQmZEQwnCE2ArKEmw6x1RQn2E/HJtVTir7FGHJzzOtB/gaCo6IAhoCZZHghElgm6IGwABAVFA9VKiroQVioFAASr6IHoBugJSr8gDSpMQQyoQgKyo9ATqBLHAmgctMtqDNMto7NMtohtVTozNMtrwtMtr/NMtqItAmgBnZonDNMtpAtMtrLNZolVEjto1E3IAfNZol1Ehwl9Evh7jNZoldE3IAdE9wnFEsonuFWKBY6EYkNTeYmUQMaBugHImQIoiAAVFhDhEt0DBEooiBE9oyQ5N4pEASaDjTDQAUwB7b75DQABANE6EgT46Egd46EgBU6Egf46EgQE6EgYk6EgX07JYb47JYG07JYW4kwo7Sq/E9WAwnV2Bgk7eAQk1062oKEnvE1hAQkgM5t9KEnfE51AIk+4lNtBEmPE5Ii/HbqCvE0YlJwKeY4k7qgQkvjAEkpglEk+M6f5MklLE3rownccpRrdh4IY1PF6AZDH3Y38qPYtNaH1R56TE33G545rr5rfDH6PYvFvY0vHXzb4ZK7SvHmPavHUY39p143JAN416hN40HEt4jtaIjdvHQ49x4mbMGiYjXvEI4z9ACYilSD4wJ7D44J5O7DHESY1zbY46THQkPHFyYn3aE4tkaJPJfGk4lJ6r49UhU4rTGZPWnHb4+hZCdePb0kBLbJ7R9ap7F9blPLkhn45WgX4vnFxY4RaC4pzF34iRauYx/EWjDzGS4ylDeY90my43p7+Y/p5IbJvZ/4iWhq4wAkTPLXGgEnXGzPeLHhjEjZJY4fYUbVZ4Tbc3GJdGbZW48Mk249AnRme3FYEhvZO43Akb7N3GEEmrHEE/bakEsTYNYhknwY67HMksXYoYh7GZ4jDEtQA6A8knPE4Yk/aB4955F417HvDUUljLcUmmPSUmUY37GqbWUkA4+UmQjRUkgdY8yOPVvGdrdjHG7TvGw4nvG8YvvH6kpHFGkokYmktHGILJzYWk+daT4pdY2kmfF2kr5YOk35ZKY3dYuklfEU4tfEnrCLaR7bJ6u0fTEM4wzEBkg/Gs4p9bmYtLYVPXhafrXnEhfGMl5bBp4Jk4DaGdHXQpk1OhpkuVZ2jTMm+Y+lY5k9RZK4/MnDPf/EskYsmRY0snZ7cskQEojZQE6smG42slwE+slOLRAkW45skoE1sloExbaHPLsknPQsbO48558bDlYCbE1YCIWrG1jC/ah48cnJ47qBTk1knJrRqBS7dNZYYpcmH7Fcn54gtaF4wjGDREvFPtMUnl434b7kn7EzLJ+b/Y1+b14s8nAdGEbfzdZaqkrZYALDvGlyB8k6kp8l6kqBajrZHHGk5Gimk0fHmk8fFY4vGjWk8jq2k7zZz4zdZE4xfHgUwFbB7KCmZk9fFULSLbwUvTG5PJCk3rIzF3rRLamY9Cns4zCnhk6zGRk3CmCLfPYErIXFEUorYkU42hkUiDbkoV/FUUpRYf4+XEBYvMnwrZvaq4gAlcrdPZRYssn4bLimWLAfaLPfikrPNLENkifYiUnfGzbVAk+LdslZdTslqLR3E4E/VZ9kxSnVYoTZDkurHqU61YTla0TIFe0Qz0YIpJwYiqTQUsIw5OiD31IEqTlMEpPUqCAfU/IjJlCEo/UwtqQ5KiDREx/ZMQL/ZMQd/YNLYGl7YyGmitV6qyHJiAAHT6AJHT6DAHT6AQHR6qQ0+/bjTSGlw0pQkXtBGk3bSGkSHUOCgHYuAk019GNwCg7oIMmkenC9pk07Q48vamk40zDBZAIUBo0mwks07Ekc01HBc03/ZCgJmn400knIvMmk2HV6p00wlpuAIGlZAHoBf7HoDv7HoAUHHoD37CaiP7dImgHWogq0+oga07jBS0nwAQHffIa0pWly3HWmyHToo60pY6Q1BI4ooNWnjwa2kKHev620hWmQIW2mG0gM68/W2kAHI1DW05mlc/PWns0rn6O07mlc/X/aygE2nEkrWky08kk60kWnH5M2ni0yQCAnGqAwnV0hJ09R6/HQtoJ0995p0pQn0VH9E50/47fvFOkfnP94p0y5qMVYk73jJOBivLOnCnSV4p0sU4yvOukKnb8aV0sg6IkJumwsFuk/NHZB7oTukZ0lU5ZIX06GolukanHZDTndwD50ouTD08ukrCFumGnC15Z09Ciz0v25L06ekWnQDZWndek2nIiZZ0+06OwVel4tdemfHKiYl0647r0ielqHden70wemUtQDaIk0OBonaNEL0+lq309ukaMWen4Yd+mr01NGAbDlo/0remDpWemHHRp5H0l6Sz09M5ScEulZnH+kZ0+TiAM944Vo2en+HQDba05BkP08ryIM+BmE2RBmv06s7IMmBl1nZBnX0kSyAM/+m6tRp4wM5E79wIhnGtQDbdnWhloMvdyz0y1q0M1+k902hkwM/uljnQDYTnBdHcMhhn109ZGz0yU7rokulLnLdHcMohlrnQDaYnOLgl0ro7SMzBlPZWekEnU94L0o87SMohmnnMqYL0i85nsEBk0lHRnt0iI4cVNACAnaNa/HXFAwnfeBWMzR42M38oWM7OncVJOCLkuxnL06gAfnA6DEnIdD/HbaBeMyxTOMmVHY7G05yfBxlinRT42MyU4qfBxlTHZEgKnTT4BMruk6fBJlmM5FgJM307NSCJnBMsFrUAbU45MlJl6nIeCwHQpnvHOz4OMxemFMlJnCHQpnpM3TQBMt1HIkHxmeo5Eh+Mp05DwBQ5tMkpnKHNpmNMi+k2wFpmQ4OpnaHIeCIkg6Q2MziiDMzplhnYZk9Mj+nDMlpnf0suDfHTL51M7lpDwIBlPSMZl5ooeDpnN+ybMnpmitbZktM3Y7bMmpmFnGr51Mks71fMpmhHNZlxM0PQXMnpnRHCRYtMgU6IyMZnCnJBxlM1Y5rMo5mnMmhmYOOplgnHBxlM5hn4OEFk9M21pDwFU6kOMpkTnZb6wstE7UOWFmTMyJnLeOplLnLBAtMv1pDwKRmHfOpkHonFmfHPmRjM3o44snplRtHFktMq9FDwU873fMpkXnIdBEsuWR1M2U6KyCxmUAQE4S/X46xrblmp0pOBJ8TlmZ0/lnZ0iQrCs4C5istxnH7XlkAY/FBYtMSrEndBrCsxs5hyYVlPM4JwwncU5SgSU5SnN2DvHLX7Cs5hm6/XllsMyhoas1JlSgRg5as7470NYVnTnLJxmspc65OXllc6YVmGnI074oAQ4eswVlVMvhqusjemCNYVlys9/iBshVlEcP1mfHQP5ms8jh+s/44oob1nf4P1m+nP06usxElQCKNnM0/FDP0xP7Os7mmZs71nmHTNlJs2M6us+M4JnKNlAM/P7OsrZlF/KNlECEtmxsrngls0NkStEtlFsws5FnV1klnUs6dsvVlYMwzoKnHxrOstVlFaTtlts5VmusV1nJHfFDfM95yTsttk0M6JqussE6T/Jdm9srSJLshtloFZ1kqnRQRRsic6TnV1l2s6o74oOc7znQ9mbsx1myiQ9ltsqRlH/V1kEsnFzOsnc74oUln1NKNkUsppr3sttmnnM86usi87P/P9lrs2U50uDVkcsmE71QcDmvoieAKnPwSAnL4GQctE7KFJOAFCf45/AhDmqaZDmB4347cIVDkYHeSq+nW5qQc4U4PNTDlinFQGkcmDnvsTDkxMz5qpAZhm6AzDlsMx1zYc81mTCSDkTnUwGkcxDmwUUjlwcqFoTwIpkBuFjnxKTDnlMpFoCc4k6uAyDliHCeDX7Wmi4c+04+A0TkH0/FrKc945EtYTkenWTl8c706ycgjk30qlqicoM6xAoznqc8VhGc3DmRnFIHCc7+k1uYTnxnetzScoBnVwT478tUTnpnQoHucyzkHM0oHCc45kVA6TlIMmVqicks7ytELlmcpVohcyjl8WELk6cghk7KJznfHboF+cyznfMtdyicxE4TwGhnDA0Tlgnc1q5ciLld0o9y5cnTkqndlD6cy1bCckenLAqrmucwRkTwSU6bAqrk6cgpmvuYTlSM0FTtc7jkFGUTnPsk1DRcgk5wqaTnqM64Gic087xtCeAXnbhB1cgxljcyjnGMgUAPbBG5PUnoAvUkOkrcsOniQX0o8QAhpLQYIlLQDbkNTLbmS09mpf7GwDv7GwAUHGwD37GwC/7GwCyHGwAAHZfQJHZfTAHZfQQHCvJZAXGCgHBmA/cyQFfc3GmPUx/Y2AF7mgk4Hk208Hl20r64A8646LXP7k00xfR/c+mlPQeHkPczh7g8mlpAXC7mc0oC43c/ElAXNHmpolmpncyOns1N7lp5AHlLEyG5+QCA6GIR/Zugd/ZugCg5uge/ZugX/ZugWQ5ugAA4egBI4egYA4egWnl+FLID4wUA7MwUXn/cgW7i882lrE8XkSHS5Cy8r/adwWXnM8p2n08+Elq812mC5WXnc81Eka8xXkYkjXmM8nHkfAVnn48j4Cc8sOnC8w/JW8lXki06IpW8qnmd5blqS1L/bGIR/b8gCg78ge/b8gX/b8gWQ78gAA5XQBI5XQYA5XQCA595LIBEwUA5iI93kS8+gqR8mFGS1YPlg8hPl4tApHR88mmbwDPkbSVPne8yegZ8+ml1sbPn+89HkJ8zHmGQd/aGQT3mpEAvm+8lwmx8onnfFBPnV8kWlK5Mvni08crctXXLsEsGmyEiGmFwJiC8EpiD8EpiCCE+Gl98zWkD8k7GWE1GkT8zglZICfkj8/7nq5CflLHXXKiEy2AT8zQmk0mfmvoxeDcEqmm78j07q5cQkOILfnCE5hCr8nvkG8qfn0tdXIH8mvm78j+nq5MfmW8pWq78h/meE1upP8wlrq1ayCsEiEDsEiECcEiEDcEiR6WEiED8EiECCEiEDCEj7YQC6fmFwbaAACoXkzAXgm3oWQnmMpAVKEg/YDMy3KiEm2CYCiHnYChQ4rwEAV8stxZEC4/nlcIgXaHFeBwC3XnYC5mkH7FAV386IBgCx/lMCqAX18pgUMC0knfQIgWeEmooICpYmG1fMwwYzSlk7FPHxrFkm2MtkmXtOcmGU3kmmUgUlB4yTabkkZakY3cnkYhykAjaUnOU48muU08lLLc8meUttYsYtvG3k/yl7LPtaPk+HHHLF8kD4hGgRU+BZTrL8kEdSkZxUtBb/kxKmAU5Kn2khTFpUp0kZUoPZqY7KkULcLbaY70kIUoqm745CmfoQMkS0YMkpbUMmWYrnFYrbPbZbPFYC43ljxknxaJk00bJk6K6dUjp7pkt/HUUvql17L/EN7H/FDPELGFk0ant7Ninc47XFTUuLGQEwbaD7LFKwEhanjbISmNkhVaiUzxbrU/Z6FY7amBLbsl7U9faVYw6nu4ogl3PYcn1Yy/Y08mZoHVENoHVD5oHVeFoHVRFoHVf5oHVZZoHVIFq7VYZq7VQZq7VHZq7VVYUi88ZosYfYXqIa4VKEljBLHA6qnC42CPCvFpTUdYVK824XxrX4Wq8jQDPwR4UBnZ4VvC0wn/ChNnPC74U3854WbCtrrAi3YUfAe4U8C54XHCogqAiyOkHVc4X2854WEtY6pggZeYAvJ6kYPYkWjE8SCEk8kWbcukqki3bmEgfbne1TOKREiSCS0ieohtCeofNCerwtCeqItCer/NCerLNCepAtQOTDNQOSDNQOQ7NUerjNdYgzNSOQyirlkGAU2mltIUWrcuUUp8yeSqihQ4cIDkUWoDUV8io+CqigM7D1EUVeoDUUCi2UBsi2h4Gi7UWc04eo8i2UB6ingXD1ZUXW8i+BcinoBiimOmltbUWS0kOrsE9CCcE9CDcE9CC8E9CD8E9CCCE9CDCE1yCiE1yDiE1yCsEpPKWE6kCyE4nZJi5fkZ5QuB7TTMUE07MXX7CQIpiyElpi3/kpwAsU58iIIFiowlh4UsVRixgUb+P0U38jfwBizmkb+EMX4kjfwRit/lAFbMVBi76nZi+sWiC/EBd8u4myEh4kji1naWEl4lji0Vo1wLw4zi4Qk/EscXa092qsE1/KFwIpBji/glNQMcUrilQkkiicUp8s1A7i0gUvg/cXXHM1Cbi9Xlri/Pn7iugV8IMcUJs0PLsE7qA7iu/mYY7cW8ErJbbiwQmg7RcVPiyOkzi8QlUk8h6cEi4Bd8gIDsEgICcEgIDcEgIC8EgID8E6xCWEgIDCE6ECiE6EDiElxBIS1AXYwWQniArCWCE4YqFwRlxYSjlp4IDCXECvBAQSvfnVwXCUAivBBwS68VES3aC0SvAUmoWiXMCjHbsSqCXNi5IAMS5/nJAAiVv89QpMSmCW9ix2rsS3/mBAblrrVdYXnc1YWXc+SVQ0jQC3cxSVeHdarHC57mKS7WkrVS4WfcpdqKS/YXKwRSW6SmFHrVU4UGwRSWfCrOCWSzYXLwSyWGSy8XLQEEWv0SyUaSxgVOS2SUwipNbGS7YUCAXYUCAByXmHJyVuS0knLQXyW9i9arGSvEXBEf0XdzTSAkYTSCo4RKU/1eWAY4RKVvUyCp2pJ6lTtH6nQVVKVMi9UCQSmQpZAKSXLzGEAPEvaY6QAmlVSnDA1S4Rpg7FKXm8p6kfAN6l4VVWC7c3YnNSmKpg7JkWd5YUpGwknaMkyckyC6cnyCnR5PYrklGU7qjKC/3GqCn2rCkrck2Uncl2UyZZV4qjEGC5YjWPYwXNrRjHKkn+b6bG8l+UjUn3k2wVBU+wVW7RwVhUt8mXLVHEILRzYeCudbUjZ5YE0KJ5JUpkYBC+fGKY+TnOkzKlhCtjo5UmClRCrfExCnfEMLPfGlUxIWH4yqnH419Y1U7ClZbb9ZX42Mm5C2/H5C4iml7dzHkUrqlS4jMm9Umrb9U3MkMUoakFklrYsUsan+jFoWTUsxYVkjoWzUmskjbOsmLU/oXLUpsmrUlskZjDamSUorHSUlfayU3skzCiJZzCwckLC06lkEq3jrCmECy0ntrLzSBGWQHMXnQWNEKISFFCgHVFCgB1F805WWW851Y4oz6k6y3sXWlTWVLE11Y2rAfkSbJnlDoUait8Uah+CUag+xOyDyy80WQoy0U4o5qguyzmnYPHVH2ip2U8C7B54o1or2y+NHui72VYopPjooyQDFE9IKjUYjL+QeWWAaSFFVinFHeIeOWMC5rpYoxUCsolNbJynDAxy7mnNdB1ERrLOV4orsV3EeNHoQLlEgFHOXgo/EDA4QuBHtQuDLcsYlMQNomH82KCfwGomFtduXMSxuXgi1uWMCrKDM0/uUVEoUADEpWXdy7mn9yhokayseUdEz6BVE3WW9ymw6LlTuVLElcpEAW8rV0RWmb8gwDdzWKC9UMYlEoGok0S/eUAijwhNEm2XHy7Q4eEDolsSi+VVEziUXygYnJAOom8Sw+X4k5sZdEoHavy0kkA4Z+W9i28qvyleVSSxWn75R1a1kGwpQYgkoGABYoGAFPIGAQqUdjUD4bjfD7wEDKaO2FBVDjUj5IK9ZgoKicae2LBUdDapb4Khcb+2LBUrjIOwzjFj5YKrcbsfChUbGeAhDmehVo9KLYYKi7rxwCAY80QQYcKpcbeM2hWPdeOCWTaT7wEN7r8KucYF2eAgfjYuzwEKqZlSKRW4K3AbxwHyY6feAiB9BRXEK4hjiKgcatSLBXFDeOBxTDuziKtRUMDKPa0K+JS8dTCaOfXjqGK8/BkkX9A2KlhU3jOWCiK04Q2KvsY2wKcZL2LBU0TVewmK+fo80RiZ+K7hXgCMkhsTUZmeKzDDBKscYJfMJXmKuGLBKwxVEYMkgiTTL6JK1xWqGRzruK+Xo80OjCJKuRUf2RJVOK1SYujSJXV/MkiaTGr6lK1JUeMUpXFKpVqlK3JU9jXFAFKvhWdfExXWTHr6tKmJXRDF0aGKpTBkkFyaYOPpWVK6hUuhPpW5KkCZ6YExWBTHmgh9HmghTeFlkkHRVIshZU1K6zALKzpWITTFkmKkcZOYExVpTD1CVKwwhkkVoY80XKaCyXZUFK7oYnKwJUXeMkiv9DhWVK6RVyyW5VyK8YY5VSYZvKjJVG5HKrt9eODtTGD60KtyYIfExW9TFD60K4fq/KjJXDTbD5gqtRVOKwxU1KuRUzTehWL9HKq0Khaa+4rBXLTTxlgq3BUSbGXYLSzQUfY7QUV4i6iOUlTY/tTaVykgDpA4xvEXk2Eb7ShEa+U1x7HSgKmnSu4jmbZ8mhU/x7hU98mRUz8n3S2dYubX8lWkqfEAU95b+C4CmBCx0lgU+mgQUrKn/SiIXU4s9ZQrEGW+kmfb+khIWoUiqkhk2WhhkqzHwyzIWIy/CkF7Qiloy1qkYyp/Gpk7GVlCnqnVbWvZ9PeimN7YmVMUhoVkypoXjU9il4bamXTU+Z7QEofYMygSlMy8fYbPVmXT7YYXiUzmUHPbmU7U7Al8y/akCy7bZCy46kiytSliywQqFLZqiDtHh6lLfh7jtdbEM7adq1LbbFPbNnaVEKR5bzI7Hc7PeZnYvnZHzZbiC7R6CNkAwBO8gejYlc8qpLPuazygejRof3CF5Z8oDzUCUD0J4pWwRJZ9zQVIvLVtAvSjNAvS9tAE0RzAvS7dAvSldAvSgeaUwl5Y3oF6VHoF6WDoAmh9DXdWzqjVKwYXbpltY7qtEg9X7jVomrq/dg4rLsa7qndUCwsdVXjdoklocCpbq9HSwYOAYE0N7rgVDdXqZR9XfdOdXLq5WGwYEYa7qoDW4DAmh+9SDUvqzGC/qyHqQa+9WgcWDCmYOdWTq1nTIauDUo9E9VXqwlg3q8DXoUG9VwajgYnqxDWE9Uonnq+7q7quDWCDUoloaxHg4rSYalE/DV0TUolEaxialE0jXs9connqxRg4rcJXlExdWZZAegJwx9VfiPjVvqtlo4rcXqVEnjUmDWol0apnhSanDXZKyon4a2waVEojUODWomCakpWqdadWqhHPYKa+siqdHTW1K1Tr4ag/qqdIjWPdVTqkaz9VjZYTWteHFaO9WokSa4fKia13qNEnjV99Rok4a4HqNE/DW6YRolEawKaNE0jUw9eok8a4ob1EnDUAamBD4axHr1EojVYa8DKialKadEnjVuYTok4a1oadE/DUdDTolEa7oadE0jV7q2+E4rbbrtEnDWgawHKwYcYZwVTIrwSnPiDSicnSC9R6yCu7F6UjklZ4h55TSrNbLk2aVvPCykvYqykikpaVybH4arSqUnrSv7GGChZa2PWlVmCq8k+UtjFHS2Dqsqzx52CwdYhUqzZXS5wW8q1wViYmKmEdSTF/k7dViqrzbvSyVWfSoIUyqpjqqY8nEKq9J6ekzfEqqwqmgyv0kFPYzHlU5khH4tPawy/VXc4nCmq0PCm/rE1XNUs1XNPMXEdUvO6lCyimKLO1Vy4qoUDUomW/4l1WkyzlbuqimXGLKmWxYixa+q3ikwE8jaBqvoXBqzLErUsNV4IPLESUqNXjCjjaxqwrpyU3jZOCQWUDk5NVe40WWjk5YW+rGpb2AYiXNYPJb9NMQA+gJGrmgUdV51dPAtq+wD55ewBagGehdqrKLRoKqoYIUcgBFPCCjqsiAGUccrhi8aazYqQXaUkaW6UjPEGUyaUuM/rUmUwbVrk4bVDLayllrEx46C0lV6CmbVHkylUnk6lUKkjyk6bMHHXktUlWCllU2CzbVnS7bUOCrlWCY/bU3Sj8l3S0J6xU07UiqnwWYLPwVXauJ5Sq0CnfSkIUPa1jogrTTEb45VXGK97VqquLYQyrVW/a6GX/avVXpCqp5Rk0HWNUm/FiLJp4P40inFC2HUWdHGXlCvGX2quimK4p1Vo6+oUY6tvYRYj1WUyjiltC/HX64wnX+qnoWpY0nVm4lmWDCtmViUjmWjC1jbRqiYUyUxnX8y13GzCtnUqUk6mpqrnWh48MVg/ScqQFe6rEwACrEwfurFlSAoN1FIk36ygAENFmBBrX0qKFIgBDEnMWlEkYl4tSomf6gYm6EsYkwIT/VNE07SLEtonBoT/UTE0vnNEion9ExYlv68eVOExYkQG1NHNEgZngVHol/yuYkoG3/X36xQmkSqQkghRQnOE8wk4C9Qm2EiiUiobQkaE+wl0SgwlkGowlg6DQluE2sUWE5Qk0tSh46E5sXDEug3OE8w6UPJg1d8goDsEgoAcGutk8E3A3OE2cUFAJg3+HMQmKEuVqUPPAXuE2OriEuYkKGnQlPeX47oPaog4cyylvDQlVl4+TYO66E4Hkpymza13VGC93XuU+x6Xk73UrayHFGbTUld47Unsq3Ukh63bXcq66WZoPlVR6sfEnay0nxU0VW+C8VVJ6mjo3a6VVp62VW/Sx7VZ6j0k56yFZ560UaxCsGXxChFYs47VUpC3VVpCzPbn4+qk5bOp5xk1GVAbc1UtPS1VYyuHW2jBHU9PPzEOdLvW1C4LFsrZimY6gfXY6kAnD671XtC7imdCuakBq3oXSrJakhqufWU60FSL6+fZjCzAkxqyYVxq6YWb61nXb7dnWPwznWHbdNWcPE7ZZq8eYrY3NUVLWeZTtAahbY4ahiPZ7b7YzeartLnafbU7Hbtc7F1q15gNq6nkNTDWgH9In6toIn4ZoUn645LE4a0VoZE/FdBE/bHJf1ZHKEnD41HoIn6DoDX4vGoBoa0bbrtwXbrNEJ402ON437jXn6/G69XNEME3w6DTqCDR/4gmzxzwmx7pg1LE0vdDWhvdMGo3oJX7wm77qq/eE3V9DX7o5LX4a0YHpQm741pyOk0kmw350m/E0w9MX7toc35kmktBi/Fk1XYDTpo9O37wm0xWO/EU1+3QU1AmvhpCLVE0YtCE28m9/gQmqU1EcIRZImkRhCLRk19yIRb8m0QJCLfE0sTeP5cmtNn/G5tIadJHBmmzU1aDeP46m3Qbp/EU3i9LP5GmwdIadGXqV/NU2yTLP40moVoadWwZZ/HU0ODSv5emzSgadbXr1/J004iEM1qmo3qV/S03jDNv4imi3r1/ZU1OsF02ymok0hNF006myfqV/fU2u9cf7hmvvrj/NU30mqBQadXTDj/HU2BTRf4imjk2TnILqwmsURBdIM2rKoVYKm53hBdZM2OYM/6ymjPpn/Bs0FGDTqfGi/6Dmts0FTM/7JmkvqP/WU2v9R/79mqk0eCEU119d/5vGptUnFIeYZqynZrG5bEjtTqhrYypZCPQtVFEUR7ztCR5lqg7HSPU41yPc40tES40dES7GbUAZYbk0bWLSu3WfY+ymO6mtY14lynzamlWmCr3Uqkg6W+6tbU9rDx7cYrbXYjC6Wh6w0nh6rw2Has0lILGPX+G7wXnaoI2Xa73bXa1KnhG45A/S0IXRGo9bZ6vKlwU3TGJGj7Xqqr7VlUoMnJbaTpl6rI0ZbHI0g6hqn5GlGV16lzGFCxvXkrdp4t6m1WVGmvZI6h1W1Gt0Z1Cho2uqpo3tbZoU46to146wjYzUxLF8Uno1T6vo3MygY3TbefXhqkY1qrZfV065falYqY0VYmY2Jq7fXRLFNVxLNNXnU9QXPm/Q22Uww0kq4w1kqr81zajTZWG3aU2GgC2Mq1bXMq9bUB6sC1B6iC2oddw1h6wkYR67w1uCgVWY42PUBG+PWebL3Zk0DC2sjVPXYW9PX7rP6UxGjjpxG/KnEWy9YGYkqkoUop7pG6i2pCznHZGuqkMWvI05C/9YsWkXFJk9i3gbZvUW0VvW2qqo20Umo3f4wS31G1Dat7MZ5iWwfUSWr1VSWvXFVk6xYT64nW9GsfYz65S10bbZ4L6lVY06sY25jenWTG9fXxq/S1b7CsY764y0WrJY0Z2Dc2LYs7Y18jY27mvNX7moImHmoahztBpZrzM83HG1pbrtM43Vqi421qu831qlR5y6vMVw3Iaq8E+2zs8Nc6/ednh+tY/xfW7gn4eL60fWqNrIaL63CEsk4YaVeasE6k64aWQkbGdnj7Nf/qWEo5pBJFG2nNSjQo21bi6LLFpRJIaoQ27A7QBIar8EpVS/WzgnEHJSHo28m2ptdALs8H5o4zFG22tPAJ02iG2OtIgK/WmG3anUyEo2vU4WQ3RY/o6yH82j63DSfm2CE0ezFPLG2vW3G2eo1XwPrGG3MsB9bk26NkBQyW0k2705yDeG3hoqQK6LNg3NpHW1K27OVKzHW1q23g1stXRakS0ETm2+W2HHA5Lm29glVZc22A29w6FQrG2zi65Lm2iG3Ste5K6LeQ3oMx2aa2l44NQrG3VnZqHB2sW1xHdqFY2+5pdQ3RarHKrSx2z23GtRIZobeW1bNMaFY2+m2FHKaFobcO2MHHrS6LDU6ZBAu322iyIF2p21c253gF28O1/WwhS6LQNp7Quu0l2nc4mETW0LNVbRY2o84XQrG1xta6E42+W1JtTlKa2mm23nQDTk2hY6I2vAWE7eG1x2zaWM28QnUq7u0k23Y6oQlG18tTCHT2gm1i2km3h2pW2A2y47vQ+G0w2u47fQlG2PHP6HT27gngAnQDj26AHX2gZkoc1YV6C24Wz2nQDdnVAGP21FFxITYVofHQB8tOJCXCnYa/2w4X/bZ+0HosZrFEc4VTNKgHFEbYVA2hITFEfYW9cJebP2uNqsAnQDjHaVwJ7AB10nHgHX22A78AhPanCwVFnNc5o6ARB3AOy5oyAhqrHCmVGGuBqqIOp5rkc81woO9YVkHT5pfNZ+0/NX5qcOxB0lHNjnP2x1qccj1yP27U6WAgR0UO/B0MMBPawOxelItZFoJ7Gh1iHKNzoO3YWeopTnooAB0K2wpQf2647BA5+1qHMlrZwe+2UtQzlvCTR3M0t4Tf2sM5luD+0f06znZwVNF2c7OA2HRzn6Ow44ucj+15o2ESeOmR1ZnCZT6OtSXu2gLn6O/w7BcolCaO0KUeNNx0yOiI4bKEJ2IOzgTZwG5oLuD+33NGkTZwVY7pc6uCKO41o5cndwf2rZrsoKx1cOwo4PKfR18Osc4LA/R0anGrnZwRh2CMj1rVO1R2+Fap0UOv1r+tfR2BtQ4HZwLo4nAnp0yOhZpDczp0UOq9H6iD+0UnBNrZwJNrJtfR2ptV4FJO1J2P2y47wc5+3YOn9Foc1Z0YcwEF+EkHbVEUBEQ7Uiq4PX85dY1+YI7XrGIQ2xnkPQbG2wah4jYuh5NtcbFJASbFT2hPGSCjh4U7Ha3U7fa1TzQ63bG/qgLzI83Fqg42lqiajnmitVtLW61NEXnbdLC7FPWq7Fta0XZG62ckm68y16GmTZEqlaWKbOy0yk8w0/mj3XWG+lXeUwC1MqqHGeW03beWlw3BUtw2nLDw0wWuBbXLHw3HazwXhW5C1kdBPXBG9C3J6sI3xWndaRG3C2Z6/C2xGwi06Y2hYxbLK3CdIvW5WkvU6qsp60WiMk84kq3ZC6/EFGiq334qq3tUpvWcWuq3cWmDa8W7MnNWmoWtW1zrCWvvWdWjXHAErvY9bcAkdGmS1+q7oXDWhS2jW2VbjWqfaTWtS3TWyNWzWzVbaWgsaLW6Y0KU2Y2rWoy0c62rq9amaUvPVckF4x8H7686lLEmG7jNQXLDNBuWgixFrvQf5r4wJN0gnTG4zNbG45uyE4sYZI7vQENpE3PN2InUm55u6s7dGPN1rnfox5uv1rDGFjC9HdRDFumlEs3BN1IOuYx5uuNqLGdt3jHfGAtujlGC5QZqC5HZoi3PN3MncW5duoFrHGZZrHGad1G0h4Xtuy5rK3Ct3zu7A7vQYd3yo5mAtu91p63Lt0tuqY7G3PN2WtEDrtunumW3Y92zu4hh3CzN0anEEztu7U4u3B91Xul1kwmcd0YctaCpu007Imd93zusQ4YmLt1fu6Q6wwF914tTkhLuwlrGweFq0jCD3pukNHGwP93aHDO5Lumlp0mcd30tdp4oer93MtNkzoev90ctcu5fC0d32HNeADuvNEyjJd11ssUzju0VqSmcd27HGUzju/w7ymKahytPu6sej5qD3Jd0RHEe5MeuD2JO3Uz0ezN3IyE9rYe1Y4L3ej1/u41qWmbDbEexhnPwTj0Tom0hLu21p73cd2MHQ+7juu91x0Jd1PNRBCKeyWxTUR92V22+66ev901upWxTUA9G0IAd07nWhDQe84FWe/j1HnJMzju7t3vqKah9u+oyeegz2ptCB5Me+j15uy46wPIL1Ben9GC5OD2PHFB6lu6D1gcvXV3nG7Eda9PHIu9DFKCl51wlbDGW6qN1CkjQXougw2TarF1O6w8kUql+Z4upy0g4ly0Mq5x6GbDjGOGwKmUu86V+Wml0BWi5awWhl0hW6PV+G4VURWlC3sutC0xWrl2YWnl0BbOVXJWwV2pW4V3RC/PWx7FI3M4kzHSujI2yuwq10W4q057Ri1lWwvbC4tV1sWjV0cWl/H1Wni1Zk6o0IbFq2DPNq3NbNDaNC5o2a4ofW9W612j6ga1DbIa2RdR11UbMa3k60NVuuqnUjC0Y2aW8Y2r63mV+uvS0Bugy1zGta0huky0xusH4DEmHY1Et607ylxljEp+0KKtokgnIFVI+1FGgqpH3JHa+bY+iomAO3D5w+6s42SJH1rneri6KjokUoij6k+qok0o7rjdtLon/1NhWo+ik6UKhRW0+jlGR2JH37NGbgY+7rBRbFn2U+pKRcKuH0NE/7k8KpH11nLOzY+1H33NEJm6K2n3utYuxsK2n1THdT5w+y1o7oJH090+7ga+xn2MHDJlI+jU63ofH3anDuy6Kxn0us+Cl8+uomDSKLZi+4Q7vIIX1Wndz5I+rFqOKuH3DoPxX4+hW0eKvxW2+taR+Kh30Js8L480S+XOaMP0++geUMmMP0B+8eVwxMP2W+5A3Fs5ZllwH32HHDZkY+vNGs8LP0B+rM5fSLP2W+3Y6VfDH3+Hc5m4oH33fyqJ0ujAP0RHVr480aI5wyOH1xHN5kY+uX0tnfeAO+tI6YyDH3GtAFk/wH31bNAmTTKgP06+k3jTKy30G+l5SzKsok6e2ZUc+pX3BcWZVNEyu2bKjH1+tHZUY+wNr7K5v1dHYllb+gP0LNS767+y31XoodCo+8vr3K5v1JtF74Y+1Npsshv3N+232XHH77c+uH13HDFXfK5/2jSX5V1E6DFNtGbFJ4/XVqPRF1yCrrWKC03UDaiN1mUwUmouktbvY/L0Skj80WPDaWlexy0mCz3XN4qr0Q4mr13kjbUUupDrB6yC3+W6C2BWtr2iY+C3fkxC3de1l0ebT3bYLAb2hGob30dCI33apK14W0PZCu09bxGgqkkWgvXgynK1pGhb35WzI3Le+V3A6tb2lW5V3MWgrasW4rbVWiXHWq+HW6uo71NWk72Gus73Gu9q0crfvVdWlo2WusAmBdaS0E6wa32ul72xjINXvehLqDGr73DGj11L6jAlzWn11cbEJbA+lnWg+oN23PCH0bWkPGxu+PGsPIAMJenSlgB43WpeyAMW66ANzS63UGPMbWvm4lXvm2y1Fe0w0u6tAN0Y8r1Kkyr1Euty32G2r0nSwPUNeogNNem3Yte4THBWo7UIWrr1PSxda9eqK0MB2J5MBuK0sBhK18ujPVkLTgMTe7gPpW0V304uIXZWzVVSulPaLejnEZ7Fb0KuyQNKu5GXlW2QOVWnb3SLPb2eYg70qBmimf4lHXd6oS3aB0Z7hYvQM3enq38rdo0Pe4jamBqMYOuiwPT6510femwM5Y911MbX72OB713HPQH3cbJa0g+la2CbcH0LGvfWbWyIBI1VdqwCkEEzlWH1oVOG7uM0KqI+7HY/1f5VAh2XDUAWJpIfAEO04bHbCNXH3Y7DCo7DbHZoNfD7UANNBYh++r1cHJmTlN2xYhghp4KrENIhvZhYhjEP/1ZEi4hobjIkVENNoQpmohiBpTcIEP3MQpnBEhOwAh0dA0sykOrcHJkAh3kMjYXiqUhqdDY7GkNsEXioQh3BrhMoEMFNKJmpUoEMkNTT4wh4kNAUGENSh6hoGfHJk0hrJom+gENMNDuw5M3kPQNa32FM1UPoUCpkAh3hpO+q0MCNV30NMrkNShxBrw8W0MLlKRorSW0NkhrlhtM3kOghpRpRfYZmohzijDMucrisaZlWh/DBzMiMMEh2M7bMjkODpNZlBhsxrP2K0N0YbZnmhxjDbMqUPycNZmhhzSgSLGkNq0IEM4iCRZuhsGS3Mq0N9NVr4SLbMP+NFpXFhzBrtKhsNehsJqDfK0NKYKFmFh6EMD+q0MMhgmRQs80N7oKFnZhzUPpNLBCFh3UM6eoeAWYacN5huUPLeacPZh1hp7fHFmFhl+o7+4sPVNff04s80Mu4HFnZh93A4smMMXeGlnxhiqY0sssPdNaRwAhqsOf/NZkAhmaYgh1UNMh+6oYq9xmqad8OUhwTDCVcQUABxPGk7fjr4q3L1GPRAN7k5AP6Csw2pBtykYBgl1eUvTbZB3APWC8l3d4ny2W7IoMGku3ZD4soOUBh6VCqqoM44i7XRW+oMbrRoMELVgPELVoOpPaCmRCr0nAy6b3iujVWpG+b2DBkQNLekYPiBhGWX441VNUvIVFGqHVFC+YMUUio1LByoX8W071BYrQMXejq1bB812dbAwOcUm10mBp71mB5Z6ve03HnB6wMqWoY3pjewO3Bjsn/e+a1r6p4P+u9wOvB5SnBuj4PmGEANIYkIMpekclfB+bFcPLc17Wnc0/OrY03bY627GotX7Gk817Yy63VEC82VqyF1btG80PW95HXG561hB7PERBvPFRBi4CrDUVAhVXNovO3/qJ0t51Mkw3W2R9km/Vba3FLbNU07A63uRjbHCPbyNnW1nYXW0F1XW2xBBRq813W0KMwuq419LB81YFHrWYY8N2xRobUEYkbVoukCNWWgr3fYpIPkq9XZUqxZY7Sir2Eu+CPVe9Ulku0C0oRgoO+WyzbNe0gOte+l0UB6KkVB5l1IW56Vsu2oOz4j6XMBsiPNBtgNk4gV3tB3KmdBoi3dBxCm9BiV2CB5iPJC1iPDB0/G1UsYNZC+zHSBqYNF7bb3yB3b01WrV3yLaXHv4/GXI6wmVrB870t7HQNmuv0Y7B1o13eowP9Ww4PKR44PmBsbaKWsnWaRia1XB770RqhwP6RpwMPBnS1A+l3EvBq55g+iyM1dSH1fB8AHAwpMRw3YjJg6MMRP2mGG0xhiQL2xGFniSE5Y6RmNgSeE5Y6GMR4gwVIjBCjJipDmN+idZj0ZcmGUwhVIcxzST/1emEcxwKSA6XjLapDmMRSZ/RuyGHT5iL/RVCGTKix2mNRiMsTnGSxRSwjmO5SCOT3GJsRPGd9i6ZBWNBiLsRLRYzKwalmMGxocSgcKEKixtMQTiAgzTiHqTKaXnRvmMzyOwjmPfmXTRuwgLK0xozRzSduRy6KigBw2mOlKGCwG+MOHBx3aTOaFLLxxl8QMmITUpxxmMXSd0kpx/mMBaO6SDpLOEjpCrLxxt6RCtQuEVxiMSB0YONnyav7NwL0RDuZuCexjxjNwAMSE2ZuB2xvix7pYOMZSCmzpk+uM+iVry9w+OPUSDXjXpYOOsxhrTTxkMQuhW+A9x3sQrqeBQ5MHbLxx/iQ6ew7IbxzuOS2U7LBxlmSyiVLW7w4ONcyDo4JhU+O7x1yTnA5DKnxg2OfFYONxid9TBoNuOGSOWSA5F+H9x8eO0xmaafwn+M/xvqQA/VWOqaABG0xiGTgA387z0OG5A81+gn0J+3gXJegbHaC6IJ7Y6VtKBMRMBF4oXRBPesPEGYXKBNr0VRzO2Lly76RsL4Jo+jH6ZWBn0Ixz/1a+g9hei536QcKIJ5viv0B+hf0CcIoJv+jw6WcIoJgBhy3IyVQJ9OzeOSxTAGbBNb0R9hbhWS5QJspjvsOAxQJ82ywsNS5QJsNgTWZJzTWbnwt2TFhLWIuSvhDhPkJjaxFObaxmea3YCJ8/AGwDei2eKexuXORMX0RpyI8DgwoJ9lh9yA2BUJ0QIGwHejgCdCICJ/ezNpeUheJg+jjOOGKyGFBNX2WM5pXARNKsRty5fDQzhJvehCtLOBwJrtx1xwwwoJg5zMWKq4CJs1hR+KJ0CRFBO+MfLRtwFxPgMCmxSRMJjLwBJMesPtE+GFBNxMe0IPwVhN7uCa4CJtJjl+E3iRGapPuJyrnLXP0j1J4pjrIiwMCJ7FjO8OyIDJjpN1MD9wdHVyIoJoth/uc4HeRARMVsSfxPQcxPl9J6D1Jk2x3eX9TL6fxPJuVOnI7KBP2M4IrIFV+hUJ9fqv0GxOXOYDH2yxehuAboqDkQEOJupsiwApG4bkJ+0Zux5Oy4bN0vJ7Y643R5P+zBF4lul5MuUPEGdGKt0vJ6LhUZLlzDGLqhgp0cjH6Nt0zGR5OZcDIS18QHT9ux5P8ZDYwjux5P3MXYxfJhbjw6Gd3op49hy3Rd23tF5OWUSxRq3Dd2PJtoQIzJdB7ul5NVUNGZfsQYRLRb4zvJychAcHfigce26PJiDiwUJ914jPFOwpxDh0zdzKMze/ij2Y2Ddka/Bh3R5NAYED3op8ij8zKihQepVPjkS8TkmJVOtkZ4TOaS5DLkZtKXIO5PwCFjpfJgSj5xy5A6pjWagiXOAGp0LSke9FPicKrIimR1Map2ix0er5OKcav6dwGVNFhzuB2pgyhROrj2dwYcj5aLUzopilNOsNeC+px8gTZcuiep6cga8Z+C+pj5Mzqde5fJnyirZNSzPwTlOzAjNNWp0KjCiRBB2pqKjrIv0zopqDjO8Uz2IIK1Pgp2MIRmdFMJcU772extNup6dh6rL5NIpi7ypmIlN2pplMGM7Mw0p0NN/8VOntGTlP2M9vJhFCL3Yp1TTRewFPDkcAH9ymnpQo+NBEi1dNT29dOO9BFHrp93rIo9dPbHLKAa9DFGbpnJbwnQ9ODofFHrpg/qYvZwXrpjPpkoyWDboUdgurfDySwEtA1QG9AZWF9Ml9Bdgvp1/rrjLKC7dVMQvpw7qlWfuVo9XMQvp4AZnjfdOCDPl7rpz9OSA+Ub3dSVFXpi9MEm9qyzlRDORTBukIZldDfjLKAjDdVGAZp9NLRQDPvpkTSAZo9AD0l9Mw9Oay0Z1tDj02jPYZ6jMoTa1FQZ1TTyjdvovIRDMcDO177p2xWOvQjMUZkiZ70qDPCDX1ECZ0jP09X17yjefoBvOTPoZlibvWfdMqDR+nyjc01xoqDOo4DTO8Z3QahwJTPi9cGz7pkwbpveUbSTWGyPraTNK9ZLYmZ3jMODfuDWZpTPa9atHyjFnBuZ09NgyczP4Z0PRuZijO84NzOsZlM39wDNBdo/dPD9Lt7hZoLO9KwdFQZ3dMzqeUZAZkZVc2OLP+ZwPpTvRLNKZujOFDcKZQZnDPrI+UarKkRn7pqoYbvQrNKZlKZ7oqDNuYfd7yjVoZHvfdMdDVRl1ZoLM/p0DzIZ9tB3o2DOeZojO/qWco+ZyYb9wEDPyZzOn9ykDM05Aunrpm4bF0zdP4ZuL2BBjKPta0aXgBk3XRR+PEZenNaRBzqM5eiy15evqNIBxIOfmnF1QR7aXa7DIMTRiwWHSjy0gWrUkYjeaNoRxaPFB5aOlBuC3rRqgOVB1BbbRugOyYiVWDe0iPE4nC2URt0mKql7W563gOZW4qm3R/oNCBliPPrUQPsRl6MSBt6NIygikQ6viMN636OKB8o1dPGXHLBgmWOquo2SRiGObB9XHQxi124bPYN9WuZ5j6o4NkbFGOj7N70aRpMZaR2wM6Rm4MaWu4PLbAmO+u4yNuB8JYeBt4Pkx81bB4q1aRAH+qQ+ENYNwSXOp0/gCAacXMH25MoWFaXMBrWYbK5v26y5iN2K58+1a50Bga5/xpWFScozEe+ozEYIlWFeXO4NHnyQ5HnwP6ym0a57ppw+G3OwsDXPkNK0BDh13Pm56hqu5w3OagY3NEBDXN64f3PCNHnzm51hoQ0INY0zaXPxKDXMWhiGjm53hoQ0b3O6aaPNxoO3NB59yE65xBo6+BHI6+cPNSNHXyO5taTJ5uPPf4ZPOJ56ZLR5tDAV57PNuaCvNW5weAF5pKW2+OPNpS23xl5hKXO+U3PazaPOUYbvO553eTR5tMPO+AvOZh53xx56nDd5uvPV/aPOcYafOd5nGzT5vvPs4bvMF5vprR+NPMy8afNoNFPyR5zBpZ+OfMUSbvNx56Jjd5svNRNCvz752JoV+PvMJNCvwF5t3NTQ6POe5q+Bl5uhr+kLJpv56vNiiaPPzYb/MF5phpv5uPOh5rvw65hUQgFl+r+kbEMQFvvOeYaPN1NCAvr517KwFrfNd26POANf0jtNdAuf5x4GoFyfOkEnXOr5/EDi5hQmK55uAhrP/X8AU7REFzOkUFvMq0wANYMxsgtAJmgvr9ZgujSGgsoNQIhb59HQ0F3fMOpEguPsGgszhk4hW5rTI0F8LBiFkQuYMGgs35zGAP64zLSFqgue5zGCG5sNKCF03MmwwQtB5+zKMF0PNOZfguEsdgsfhqGhaFszyGFrguj2dgsCNJBAp52mBCh2wtUFzPMy6RgvMsSwuSF8jiWFkwveh6wvmF28TsFlDB+F9Qtc9fQuYYPwtuF2qVIIRvOdpZwst5ntLsF9vPpwuIvZ5rOHsFsxpIINAhxFtwtECOIueF2xppFnwsIhtIsqF5izsF7jAlFpIvleEotuF78OxdOQv5aEotUFzgQlFoosiWFIuBFg/NIIMJodF/IvNFs/PDw9guX5seH9Ftwsu5l9LOFlJpIIJQvpNJBCv5xeH6FgPPTFoNarw9gsFNaYueFuzDLFnws5odgupUbYttFyAsXx7YtuFuAvkITwuNNJBCHh84vNFtAu3w9gv1YW4uLFuWS3F2our59UDi5/hP8AL64fFmXML0DaRfF+xl/FkNbVld+hB545OAlzXN/FtguAMEEtXsL4uih6BjG59cJgl+dBfFoQuSJlEsP6/cJfF+3PKXRXMnhL4su588Jgl8YtXhIkuG5hmAIlqCgol7PN4GMEvrFs4hb54WBBrYWBW5sgxglmPOUGNkuQlmgxslqwvOXLEvQloDBYlhktEcL4suF6Rgsl08Sil8RhSlt4sG+KUtklpRryMNkuqNWRhMlhkyil8ItSGZUuylgEQalhUsGNfRim55QxslnvP2MNUv95/RgSlxu6ilkfPMRXEt1x0UsFF9iJslmfMuMI0vz5lxjmlpfPeMF0sYluosuMHUv654JgmlikvBNexjQl1XiOl4Uvua0Utn5lSL2l2eOxl80s350IwJlt3O6RNkue5gyJsl1/PLXUUvzFsyI5lq0srF1Iw5lnUuh5/a5slnYv1Md0tXqUUvVNFphVlv0sRtess6li4t+RBMtoFwKKilu4tDMNkvYl39SwljEtgcxXOLu+1Z3h1xYhrMdNTl6gsYIbPOtlOcsImcct1lUcvglxctb5slPjl/XMegQ3Nq3ccsShjBDIli4hBrZmBW5hlPjl8QsYIe3NHu1cs35093jlt3MXu28sbl4hjjl1/O8p1cvzFp24zluktCp8ctc6f8v3VPx4P6z90zl4aSAVl8uomf8tWFgD2rluwuwwcXOKp1ct5KaCsnlvPNqp5CvSl14i/F7CuQV0KqvEfwsEV03P6psCshFgitnlsMMEVoPOXIRCv5x/8tEYf8vt58u6MV+cuqGf8upFwUxgVwfMup5Csj53OC0VnMOuLCiv5h14iul+Uz/llnASVtCvlh1xYgV7xqiV6isb50SuQVuEvRpsCsHl2e7sVgSvH51xa7l7rz/l6EOvES/PppgyvCVl3PKegysCVz3OumMCvvl4UT/lr8tf514g/55ytyV7a4OVgSuh5mtNgV6su0IYisdHf8sNlt+4+Vtyt7h14hnFn+4+VvSsnh14gYF44ysV7AuxV4SskNQ8sgVkctVgLfM9wENZZ8xXPIY3KuzlmirXMK3PQI7KtMF65gP64FGlVjgvzmfKtwlpcylVg8s9EfKtCFpRHNViqvvsKsD25jRFVgG/PaI0qtu5omDi508z9Vw3MXmUqvv568zjVoPMWI5quZVlYQ1gICt2I/Ksx5xxHLVyEsUsKqtWFv8ylVuwuAWHatzVlCvw0INbgWTavtVwvPw0Iatyl+GijVxUsCsKqsql1Cz3V4quUVpJE1gSMPCsA6sMVlsDt5zJE1gYxpJdZaupF8izLVwfNFIv6vTVrnh/Vg6sFFypFVV10s1I5auSV81hw156tKtGsCr521hw1y6uNFo1g3VlovYIU3O9IwGvY1nSubwPGtn5kZHLVy/PjIqqu9Vlzg1gAasm8BmsHVw7A1gV/O6WKqvzFhNic11GsrF0yzLVuksZsTmt416su5sKquQF+yzLVmAvFscWsQ1xAvZsA6stNGtjG5h5FVV3ssNsNWuo1lKvvI3KvpVmdiBE5OnJlXBAG12xlG1z9Fm1vMrZFE2vAXP8CTZ22vglzdhoNE9jCNOIhO1+8b21zBq3sPYm10i2szhyDhHEuV7218QvNQbpoh18InDWe2vkNb9gu1jV6R1t2uvlyDj31SDje1ihj21phrQcE2usNddhw5ddgB1zhrrsGOumF9djx1qCtYcJOuOvIOuF1wUsh1kuviNLDg514+kW19wtYcQuveh6jgm13wvMccuvOae2uKMXushF1jgd12qUccIes/1Zjgl1hisScbuuW6XuvGNXBAI5NMZN19IsScPOvWliTit12xoScEusIhpTgd1mfNSwUosH1hetEbJutL53BDh17xoH11uvIlg+sl10UO4IaesSh8zgd1sJq4IbeuTlDzjT16EMecY+te9JusJNDzgX1x0y91lJoecEuus1qWB0NSBsp1lWK91v2sropusFNSBut19YuQNkutbFmLjT1l+oxcX+sFGXuswFmLhANvcMxcMesXo/Bsf1y94d19ponsXBvB1+95UNi+t9NEoqmMwInmMv8CWMo2vWMzhum19hvUFtqCsNw+rcNm2sTcMesHQcInYq7hsoNSrhO16X28Nz2u52bhs31guy8Nn/MfccRsdV87gCNkhq3cI4la+3htDh27iiN5Fj6Nj+uG+lRt7EvUPcN9OuGhj7gyN+avzcXRv51gewCN8CvzcOxul1m2BJ1+0NXLbhvV17z4uNuutuKgJuON5uveKyRu/FyHjuN0Kpk8Lxs91sngL1gnguNpHC8NzRpk8F2vJfJJvuNyeuLMlxt0E6ngJNtiumoHOsphyRtph6njqNj+wpNzetlfFxs71kv0pN/es1fBpsFNjxgNNkJvfhkXgVNkTANNoxuNFkXimN1wwpNp+ufMoZu9N4/OmoAZt9vFJvf1nsOSNhkOvgABtgs6ZvpNpmsLN9xsQN8cMuNrJqO8Fpt+1rBAhNpBtYIFZstOlJtZ1lcOvgHYsXNixsBVi5vFN074pNupoXN45uNNC5vuNlpqvgQBofN65vnhj5t3NgxkpN7Rtss9ht61rll/gHllgtmXOyICJu//I2sBlRopHEv46BEwAGwth2ufnJFu65ofhO19BoQtz2tYNIfhj19Vkot1Rv4NdFvB1xfikt8ImkNCFtR1ihoNQUBuG/alsf1k37ot7ZsH8Flsu1q34QtrOtsNCFsGFh/iUtwaS8t9XMP8LFsWF3/hJ1wRoQtoUOTrFFuINX/gL1iRrotkRi8tt/AqtjltyNX/iitzut+nXluV5ohCqNfVs516eQot1JtaNJVuRh/VtatyesryE1t5NstkmtnvPpdI1svSXltlNqxqYCdVu0WV1tatneuUCJVv71os68tySs0CZ1vlh/LEmtphuDsoNsEtorRBtpluDN9Lp7EkJq8t1+vhNdLrxtqZtEIb+u/OJVvzN/s4mtmltqWXlv0tsmTFtjNtQNyc68tgPP6CUNvEt4LhVtz1uoNvf5VtjNuXNo/68t7ENEIappdthFt3qDtuetl5tNNDtsZtz5tnnXlt3FohBktx4uTtgVuRtvWsQco2sHyxduQt2DmBElZ1/gSMoDQR0pbtpcs7tsesFCcImAgjdsYtmQHHt++uEc5dtP1h5rHtv2sqAm9uHtjRuewI4nWuY9sAN3QGvtl2vMc19tO1/h03tpOumAm9sL1r1w3t/dtXYY9sAV0oTPt/OsItNdtF15Frgd8/DgdgRrXCPYnYW5dvV1nwFIdoDuI8JDtQd5ut6OpDugd0QJIdj+s5uWDtIWcDsGt2IGUdvDvD1mx3LtnRovCH9tstcDsJS6ESodhMMsbbDtM8Vjs517x0MdrIvQiT9uQ16ETMdiVqsd0jvFFjEQcdksMYiPjtRO8DsdNpoEMd7psYiIjv+NDESSdlossbGTui4RTtEd8ZvZO8jtRNUhDf1/J0Md+ZtFO4zsPt4BumdojvUNUztadqBshdBjvVt11qudvDtINprngd1Bs+tcjsYNjp3gd7BuHAoLvyd7KZBdmzvENoZ1BdsTvvNsZ0Md6hsJtcDvB1mZ3Jdh9tMNwIBj1rcVG1k8V/gGEk5dnhvNkVVvNkQIkxlTcgu1n8Gldh2v/gqrtSNnjx5dyxQNdz2vyqArs31l8gNd1RvNxBrvB1qTxVd7RuUHArtR1mg5Vd0Bv0HBrsQNo0EddvYnw9DrsVdouQddp2vcHBrt8tvg7Ld3ds49Aru8NRCgf1l0GbdlPOEUObvV1r0G1duuu+gvbtHEgMEndubtt1yNQndnbtKNVijTdoIvLdgeuheWrvD112DXdi1vRed7v3dgxpiUJ7tASZbuOt1LzLd5euJwC7tCtMHvXdzet5eTbs71utTLd/esIJJHsL14I5I9yHto1kyi1d1TtYJJHuLdimzA9pOuJHYHvXd1+sdeeHt/dkztZHTbuxNLyi1dgBuLqWnvXd0bult4Ki1dqBs64Dnto9r/PRUDnvhE+o4c9rLuyiZbsYNtPrLd7Bv7giXs51o8Gbdx5unguXvC9h4py9v7ufN0Y6bdidt8IGXvTtx8GtdgXt611qCBEqXNG1ksUm9wrsK571aW1n8rfTF2sn2y3ssF76ZO1sGZG9mEuQzF3ue16AKW9m+uU+S3uqN4fCW94OsoBAPvhE9AKW9qOsM2sPtj1vAJh9j+s+5l3vbNvnzx923vzdxGZO9+xsR5s3tR5+mYu91xv2QnPuId1mZJ1lyEB95PvV11XyW9lCvObTPuRE1mYh9vuQV9iJvBQhvux9h7tSBCvsGtmvPyzHPvD1pWbt9qPt0VtWY59tjtpQzPtz1oqmZ9sxr6zIftHE4wIV9zMOazfvs5hgOYz9qfPuzIvsuNd2YL1p5KZ9s+ux+CvtMNj5L79xfsadnwIV9j3uusM/vJ9yMtHPCfst9zNuJDCvt09yOaP9lftaRR/tX90BvIpR/t39qBvopCvvVtpaH/91/tIN7OaZ91Bt5zMAd39y5tkpCvudtylKwD1/uPNyuawDxfuHh4uZ39z5vXQivsTt6JaZ90OttzL3sh9+bMARxbOgBzrWhBiaVrZ4ymZerbNW6rqM262INaCzF0DRo7OoBhtZpBmCPOWi7Pg4ywXAWmHFsqwgMLR3x6vkul12bKKno4jaOPSz7PVBnaP0BvaOxWn5ZNB3l3HR10nhC57VpWy6N0466PJGvoNMRn7Ww5jCkn4rClA6ziPRksHU8Rwo3169V1zBv6P7enV3dPPV3He+vZMrI10obKSOQxmSNk5uSMU56Z7wx6nOPeroXIx1SOnBtGNWB5nOYx5LrYx9S0FYv734xkrE851wPEx0yOkxzwOe4yyM+B0XP/+150tarSnWRtPFaPbKOrZsN1QBjqN0DnbM9RhAP7ZsCOHZlAOQR9gfQRsaPnZuCOXZoC3XZ/gf5BwQcPZ4QdOCsgOrRkfESD97ObRmgNfZ16WJ6zl0NBxQeHR5QcUR9gOnRynEdB2CkiurQdJGz7VM477WUWkp5VUowdwykweGqriPmD2vXTB76NtUmwdY5ri3KBhweqBlYOgxwnNuD4nNFk8mUwx+SMj64wM05pGN054Ieoxp13rPC4Ms5rGN2B9nMxDznMO4hnW85pIf85syMe43faLCs6lhQCA7oQL/b+i0A6Bi5EdKS0mq/7cMWoj+nBZAaMWoj7WlE5eEdC82CGojjEcS8jMXAQgA7oQBI5awVEdp8wVC0j9/am9nEcAikaGoj12kJy5kcDMo6FsjxEc38gmqMjnHmKge/aKgUkfmHAmqUj63mSQrEfAHCuXAQxkcnc4cWP7UcVKj8cVZAScUqjmGkfE0A5fE7UeT8jHLAHAEm6j9/brilUe/7bLtqj3Gl2yrHIJHKZC6jtPmJwO0fGjvlkkbO0f37Lwi6j+ml3ilUcJslHJf7Z8Uejp0fZylHJuj/HmEki0dE86YoWjig50i3Ud+juHbajhqg/EiZgSCnIfABxL3LZigecktbObZ0ofZeuANy7SofLS6y0JBqZa1DlIP1D07PA4pofmCngdXZ0l03Zpw13Zzod8Yy6W0u3odiD/lWdeoYf4RhKl9eoiME4lPVKDkb1RGuYfURpVU8BjK1iuyHOMRub36Dh6Nw5tiPPRg1W2Y6vVMWz6NbegoU/R04fP4hYP2D3HOiRzvXiR5XHo6y71uq673k5qZ5WuvweVkxGOBDj4cpYkIffDjLEYx113/DtnNz7DnN4x+4PxDlwNr7PnOGrFIeC5rwPpDkXOfPFYW/HBEcwnJEcQT1UcmVf46hiqCcBRmCfYjwyrfHWMWITks5ZikypoTlPmKDRCftM43tJwJkf0DQE5XwRCeIkjkf0DX04kIciefHdOXkT9455rcifwT/Enf9Yk7ZEGCekkw0AKnMuWITuifxjiCeS0+8CfHYQ0wnAoAKnAoD/HAoCAnAoDEnKQ1iTyflWVG04vQNE7Ry+8DfHUg1JwE5AKT9pmkF345/6rScAitKBSTxiX2VDSc9ytKByT0vn2VVSfs0+yoSTzgX2VGSc8C+yq+ndwm3gByfxnOYn2VV06FStE6xEmE5yS344KS4KdKS9yqAne7mBT6qOhTpBmvcqKclnIHlJwEHlRTuTm+wFKefHaHnWdFKcRTy8WFEm04uS0KcDM4ODEnLtpRToM7eS0KfZywon/HAKVlTkqeW8lyoZTyOnuVfKcU8vKfvHLUDpR4aVLZpF2FDqKPFDzNYbZv3G0DvMdAR3bO9Rosf9R3QWsDuodbSyw2cD8aPND2setD+sftDggMDrIQf94vbXtj26Ude3w3dj6QcER1C39jlKn/Z9KktB2YdtB+YfnRxYdTevgMze3QezjjYd/agq0I55cdV69b0fRzb0tU/iMKBncdCRnHNAxjvUGulweaBu4cjUs8fbBi8etC/YOvDgIfdGyfWPjxnM/Dl8fZYyIcAjj8dAjr8dc5n8c9k54PJDgglkx4CcUxjIdgTrqcIumyPkDlL2UDgafrZ9qP8k7bP5j23VMD4sdTakw1DR2vFu60aNnZulVLTn3Ukuhw15B9accqnbVLRzCMuC9r3lBwYdSDqTGBGvsd1Bgcfcuocck4kcdXTsceg5icdXRlYdkWtYcUWpIVUWhcdPR4wcZClcefTyYPfTyHUY57cdWq7HOAxioXAxsSMaBiSPgzxo26B2SOd7HwdXjkMZwz28cIzk4NfD5GfPj8Ievj9GfvjvZ56RrakGR5wN4zkyMQjwCfmR4mfC5+yO+BqsiogYqXrQYgdDSimf5Dmcl9TmmdtR9L30z3DGjTp80VD7ckTag7OljiCPljuafczqse8zmsf8z9y2rTur0CDjaddDradtjlaMdjxl2SDvCOHT3se7RoCl/ZyYcA5xK0nRtWcAymiOvahI0Q5m6Mzj9Yf6zzYcwy8vVFW16NGqg4cquo4ebjk4dl7f6dKB4SOXDvHMgxgnOuD4amuzqGNAE7weXjwwPezhGM8U2nNG4xmVnBlGfBztGceLKIe6Rz8eRzuIe7U3S3gjgCeEz1IfQjxY0pzzOetag3U9TrKMKCoocFzwadFzyN3mU+gcxBl80szqafgR53UleisfzTxocNz5bXEu5ueCz/ANzR5secqkgPizg7WSznCOCqifFx6moNyD4ecTDhfHBCi6cTzqiNTz8cddB5YekWwvV3RuccGzwwcA6ivX0W8YPvR82emq9HPWDvec2z84eHz/ccOzw8dOz48e9608eiW92cTUyS33en2cPz94dPzknWhDpnNTbCIcfzjGfhz7+eL7HmWExsEfyUgmdKUqEeqUymNgL//mrCyCe3C6CcaAFEduLpSWjVfYWYjrxfYjoaqnC9CdeLuVpDVFxeWAcJe+L/7mI28JcvCqkfhL6/Y62hJfrCwiex2hJdRLj04T22JdBLnuV122JcpLmEWZyrxfZyxG27CkUexLw4UcTjxfW89njbC3if+L2Jd4iwgupjoIOZRqmd5zrMe0z6gc5jhmdlDpmeMDjF2szwr0zTmucjRhbV/mrANZBqaN+6maO3Z83ZUu4gNizgJ6ULtaMDD3CO0Lnr2yDn7MhGkiOjz86cqDyClPagi0XRpYc+kh6dQ5vQfPT0vWvTpce7D02dSB8Rdo5qwezB6RdlG2ReAz+2fAz9QOgz52fnzkS1uzrwcezm+cKRg4M6Lu8d6Lka2Bz4Smfet8ez7MxdYzn+ffjv+dExmxdxzoBdATtIckz0CcNY6SWCG1YWiT24XiT/FfeL6SfErtSXyTwleT86arnClSfErzYUyEylf7C4gsaABAosr0yUFAU4WaTqTqXCig2UrvEUGTqTpMrxyXAGylfaHKTrHC8hDErix29E0Vf0rzmklwbmkKroVdBSyYl0r9YULEylcuOuYkKr/lfgL3Ifpj3qcwL/qdwLumclD3pclz3Q3wB8uf26my1VzzBfDRrmfjLzAN7SqZc4B6aMNj+r2kL0WdPZihdBW17NrLmhdeCkYfT4jl2MB3ZfMLu7UzDthfA59QeTeuiP3ThiPkWyGVoUmV1GznYcmzj6cPL1HO8R55dbj15clC95d2z9vV8WxRc/L5Rcmu1RcArq+dArmGdU5m8dgrv2f05+An9G34fGLtak4xiOcWLiY1GRxIeorwBd2L+YXeB7FfLCp42v5TFDrC0qW3C83LnEvVdpj4IPtLo1f5zhcmFzs1fFzpBflDq1fjam1cljtaXFeh1cWGuueLa/83YB3gdtD1ucdD9uctjqC2+r8gP9D9wWBrll3BrwiMKz06d7LlhcHL+VUpWm6dAyt7UJr6cdJr4vUGDrYdCLtedI5jec16redfRnecWqmHX/RyvZt6xHX6u75eBY8tcbBh4dY6p4eez2+e64/we+z+mWIzgOfqR1+dGLkOcmLsOdtkrmVaW7nO/js57M6tFcDr4WVDr5OeZDogDkzyBdkD5L0dL1qPLr+BerrxBewBsadlzrddvmtmfYutge1zp1ewRxud2GxCP+65CPOGr1fUun1fLLv1dULt7PrLoNcyD77NvS8Yfhrr6VHRqNeqDo5dcB26fxruec6Di5dPTpecvT+HO3LjNe5GiYPZrywdyB3eeYygtfaui4fyLr5fODlDeMUlRfSR0nPVrjRdwxu+e4bhtf4b/2cM5ojdBzkjfvz9tfRD23HYzkEcLW6xd0b/tdHU94NYr5jdkz1YWJ024WG1jQBDZ/Lem1wrdCsxKq5bwRulb8Vm/o4rePHFaYVbyh2oZ0rfJOqumlbtJ0+10reMO3DOdb7YXN05cabC9VGlby1qbjXrdAUIbf7CgcQVbxg7DjU4X0Z4rcutYca7C81EWo4rcusrmgDb21F2o1bfL0rmiHC/jOlbpR2OvUrdYtZcYTb04QHbz4WSZi7cbb6Nm0TJbektWiZ7bzQ7sTWbcR+9iaXCx+kHb+lo8TBreKr6DarboKUGZhrcctUSbnCzNENb9x05og7deO4uA3butlFo1beitUSZPbltmiTY4WukV7dFhg7ehLk+vY7m7cvHIyYNb6s5aTM7eJOrSbo7rVo2TCHf3b1XgHbtI5OTBre5Olmyrbs1qjoxnc3brh3jvRnek7vh0C2VbeCOhdGLohrddbhp0rvfnc0771qhTFHftOhWwNbrp2yM1be9O5hA3b3o55TOXek7o87pTCncXeA7cTOrrO679YX0N1bdzOuqalbw3ezr1pdQLhdfjSzpcmr7pfDT3Mfrr/peoLwZfoLmofVzrBcSb383OrzIOTRt1czLj1dtzkWdKbjCMqb29fiD+9dhWraNab0Yehr4iO+7W7XkRlTGXT9hcg5jQenL1VXnLhed6zqGWpr6qmA6+zeKusRdOb1V3Qbko2wbuweeboGclrkGe+b51X+bjweBbksm3eynNaL++ddGiLdNrwSnoxt+fIE64OYzxLeIrnGfIr1Ld4E/slEzzFdJzpYUaUlpekDymecbxde27njemrmKPmrp3eCbzddxB5gfTTssee7sZfe7qTf4LhCPurtackLy9dkLpZc8q1TerLyPc/knsdyzoee/Zphf6b6YfJ76NdqD45emb39fmb1Yf74gYPzjwRerz0YNgb/YcQbmQNQb9GXl7zV2V7uRfV7pDc+bwak96itcBb1indW2GOt768e0y2S1E6rveWBwxdIEoYWfzwEeD7rtcA+qxe9rtLf4EhjfzGrLfT786lsbvIdJegoeL77jfck6aV8bmANqCjfcFj61cib4Ze77/ddlehafVjo/fTLvgfnr4WeuGxZfKbq/fh7zsf7TmWdnarZc6bsNcJ7rC2v75fGfr8b3fr2iPf7qcfzzgDf/7gRfAboA8cRvYdmDsA/rjn6dWz/Ne1WgGO4yxDdOD6oVlrvzfIHxveoH/QNYbkFfaLjvdyWgjdRbhAkDCv4ehzuFcUb2nVRz6jcxz/8dUHjLdC5kgl0HsXOz77qccb5g8271g99aoad8ktdcCb0ueb7tBeVz3dfJBvfeOrg/dcDvmcybk/cSHs/fB76Q+h72Q99DiPehWu/cDzh/cMLp/d6bxPcGbt/dGbr9eAy3Q+zz/Q8Wb7PfJrvK2Gz/PfCL1b3I57iOHDiA/FG6HXQH3cdV7z5c175DeIH9YPuDknMeHzDfArl4ft7umV+HyLfNrpS2tr0jfxbr+cIr0g+GRx4MUHsfdb6ifcgLz4NOLlhvxeufc5zsaX6U41fL7+3dZH/jdcH3I88H4TfxB0TeDR+y24u9AO4LpbW2Gghc5BvANeW6o9SH9CMiDnaeR6vadMuxQ90L5Q9jD1Q8gU5WeA5lPcxrz/c/rgY89BoY+GHmHMAHkw9yuxHOmD1ccbeiRe5r1zelG9zf2HhDeNW64enzsGd/L012eDoLeeqjA+hb+te+HnA+fDgI8tr1Gd97og8D7zamXH6OdTC6I/j74BcOL0mdjkpI/Zzpg+5zlg/zktg/m6mgeO7nI+WrgE9b7oZcsDgQ+czg9eSbso/Sb6E+yb2ZeNj+ZeNex7N1Hzw0NH+Q9on/ueyzyK1tHnZdqH4b0qz/l2TztPdxrvQ8kn3/eSu8k/GHledUn96cOb4vfg6nNcubmDcLHgGdFrxw9qBhA+o69Y/3Dq71Qz6+e1rtvdhboU/PekU9HHnvexbiU+mLsI9eu4fegjm48HUwN0Yrh4+OLljfPHhbPJH+fepHj49Lr7U+ZHlQWMz7g/Mz13cFH6bV7rs09CHiE/Hr11enrludCz+E8LLxE89D7ue7TqWcabx9cx7kNf9e+Pc4nqYfDj/0+p72NcnLu6c/7nWd/78M/Lzmi1iB6k/mH2k9fT+k8JnqA+CRg+cfL4tfwH5w917pA9ob7M/qLvk++DgU9YHu11BDh8eEbwI+z64I9kb0I8zW2IdIrms9/jgBcxHpNWZbqfewji3evH9U/vH7rVanjI8ILzg/rkg08Dn0CNGGu1cjn783gnnmeQn1y1iHs9cznhTfn771dOn0QdLn6hdR74Ydrn59fyDkecRrpPeaHsb1nRvo8zz8HODH0M98Lq5d577YcF7yvUxnlHNxn5zczBvNdubuw/wbhq2ODtM+vntY/gxiGdqLwFfBb/k84bwU/7H4U+AX0U/HH8U+EHis8QX4EeWLhIcwXvtdwXwy2Jz+I9IX1jeqn9jftnjU9pHjC9m6ns9Ze9ff/HvC9VDgi+FHjmfEXjgfjnyZd+7qc9ELuE/UXmo/zn7aeLnlE/Lnh9fR7o6fyzti/P7zo8aH0b0cB66e8XsHOTjkM/HnsM/3RiM/nnt6d3LzNeObqS+l7yA/zHh8+2zhw9sn/HMCWzk8kyyteXz5ve7Bn886Xv8/j6lSMGXks9hDss8mX8jdmXpLcWXmjdM624/1nhOeT7+y+mWxI8vHts9vHlbOfH7s9YXuKMbrw0/5H6oeEXoo+CHki/1zsi8nruscRX+TdNjmi8h7pE9xX7CPqbxK/MX5K+P7709bnseesLno/aHnK+az7hf8B2b2Lz3PdDB8Y+gbmk9mzkvfbz6q8CR2weLH2A/LHl8+rB24dcn1q88n9q/oHzq80yzo16Xos99X7vcDXgg+qWyU/wrkg9SU7tfXHqy+UHhU8NnpU/DrmfcLXtU8Zj6mdL71a8cH9a/O7yy2TToc/sz0E8nZnBekXic9hX46+5B4hdRXhE+Ony68vZtTcBrpi/37z0/bL3Tc+n3E/jz1688X6ee5XrWc8LgQPQ5oq9nnm5fGz8S9F7yS8WDqq9zHsG9nDjzeQ3589OHmG9nzlq8oHx4fQz3HX5n3S/YH9G/G4zG/4HinWs58C+euyC/VnlLe1nhNWQjwdcgT7LfkE28oswBg8Gr6BduXtL28b1ffZHv4+4XgZf4X21cBX9m/YLw9cTLl1c83lacnX2aMC3uc9C3hc8i3m/dNH6gMS3+hdS37E+Dj7c9+noHMf7kzdEn/i/5X3hdq3/hca32zda3kRdTHzefgHjceg3v6cyL429Pn1M/snpq+/Ly2/uH62+5n22+YH1G8O33q9O3vA/Eb7G/aR92+4xoffJbntfE3ya8C56a+Nn5U/c6zIi36/wDdzR7B5LeBVjdUGGj0cdW3gIboUZPigNDe7S33qbr0ZW+9zdNdVX3pbqsZW+9rdeWNM0M++A6PiipDFWN8UH/p6pIB9o9NKDHjcB8jdSTKW0QQZpQCAZwPhbriwvijW9DydQP58ZWVd+9KqPiioDLTJM0F++/jK5AzdAzL/3oh9g9W8DZDYNL/3r+9Ia9qC/34obtQRB9FybB8rdPQuW0FfquZC++DSNh+YPjgbgP6h/cDN2FM0Rh8kTK5AsPlU1pQGnoSPx++niS2h0TCR88PxiYSP/h8KDSOGW0FQZpQcJUaP6R/wCNR+MPsTUaPsR+i9NKAGDdOGW0EwadPKnojpMx/4PqwbGP0h95K4x88PhwadPbR/ODNKCuDAzXuPyx9eDdx/aP3wbuP+x8BDPuOW0YIbtwrzE9dBzURPpzWdPHh97DFPSW0bvrDwhJ/ePvdwJP7R/4DUYtRPrdkJPwx8h9NKBh9WYuW0eh/bxrJ84P4LhFPvR9VDfJ+GPibonxy2h33jo71Pmx+tDSyf2PjoaWTnh/dDSyf8PvoZwP3+8VTGB82PkYZwP0h/jDHyfSPhY5AP7whmTxh+d9ZmNRPpYbwwzh8HpjyfSP4foeT/B9j9PmOcPuJ9y3W+/LPvx+cPpFU+T0h/eP1HJmTzB83DMydiP/x+n3mcZQ/DcaKOcjAZTdE7PPocbvGwohjjKn7PPqcZ/G559zjX+rPPpcbM/R59DccjDbdUE6/P8vDkYQ7r0nY7pwvqF8/0PTEDjIX580ThVINNF+YTaX6gvyyZy/UF/CKkU6gvyKYSnL59z8cF9QvkYbknCcakNcjA+TJk1Kne5/gTGhrkYEKb0NFl99je1lEvgF8Cm/U6Mv3DUkW0F8Ea0UbcvnCbSmy04ov6/DgvrF9k9ck4LjL/h8vpqaRswV8oqwAQKvkV/+KlFDAvoJWBnd59BFvmjhKwM6kvnR/hnPl9C9QM5yvyTWZnCV+W6PmgmDZM4cv3L62vxF/ZKzM7Uvk2a2vkV8ODZM5Gv5wZVna1/aTVxqCvvSaMCPl+GTFgR80HsbsCPl98KgJqCv6ya9/ON/SvrpXvOPmi9Kzs6CvtyY5tjN+Iv4HrOdN1+OmBrYivqZW7swV+svwobjnB1/R9Pmgfjec7VvpN+ITPf7VvrV+gFvmhpTEhR8vw5XrnI1+5TN9mCvwvrrnC18PxtF/Wvu5UdNQV9VTBc3jvt1+vK0OWMvyZ/0nFqaIt/F/cvlybowXV999QCPcv/qaY/Rl/STJE4OvtN/jYol+Mvwd9Gvt19Iqhd/nvud805OF/cv5aZot/F/Uvxsj+AW5OnQHQ3dRvI+Dn7a9J347Mp3i0+LTq0/H7gPen7nO8On7oexXgu93rou8fZj0+l3lQ+bniu/PXj9fcX7K+K3j69nLxNe6zkY/CBsY+iXiY/rz0A9rji2eSLl5dyXuDfdUw73Hzx2cuH+vduHzY/j3mteT338/T3/8/3jue8vzmLeL3t2/U6j2/mXwm/kHje91nre/2L3fVNnvujHbTNVKy9Y2uRlwm/OjyM7GgF2nW5ebAuiqPC68tUnGmqOOIeR73WhqOPWiKMA7fHJiVObqSAHnUDzGwqGwfHJNEHJajFB3Lp4Wd+F4Y/LW1RrXC65rVU35y9LXzMfpHjy9rXvs8+X+O9+XxO/Dn3a+jn/a9Hr0K8tDgWd83yK9nX6K953iD9YR/1e374u8tHyW/wfxWcHRpD+Gbw5e9HtD9cLjD//rrD+Abik+Rni8/RnnW/THyDfd3g2+93t5f93lM8NXk+fD31DcbH9Dfnjie+aLqe+2unq8AX9j8GLhe+u32Fc8fle8ynyI9yn2C+k37e/k3wO8jr4O+uf1s/U3w1cR38IMr73U9r7/U8fvza9fv/y9BfwK8OW4K9c38L/LTyL+wn06/2nwoNxfrueQfxo9dj9E+bL7TdYnhD9Kzyu94n9/fGbhYd13vK/aDwS9N34S9/XvD8A3q89A3yq8g36r+Y5/ed1X1k9KXoe9Hj1w8fnyGdfnlvfI3n1VvD8FfzUtSPAXl11xb9mXnH/G8r6q48Cf2jeb3v2+MbgO8JHkKzEZQIgn0EYK0wOpgixk4g70WjLz0ejI0/o+iUwmn9n0VjI0/hn/HMLjJM/wHS0wJ+gqxugtv0PVLC/1n+VWY1J8/gBgPqpBDS/7VziwwIjc/qBh8FwIgc/pVTCFpehaZWwvi/kZhqwzX8KJ2Qv6/sNhOxvn+RsZQv6/0hjuxk4gP0VnQnENX+0MPQtQ0PegcPvn/MMCBau/izzeZfX+HWN2G2Fqn+EhWwsX0Jwuu/5pwRZEP8H0aLIh/tX+uJ5OMRFjeiRwiIs2/nxNELV39/WETURF6P/aMHtJpF+P+giNItJ/0LQdF8X+rOcdKu/rLzVxsv/R/uxhNZMv/c/gByqhWLoF/vGwdx73+XObuPe/leh9x2LpB/4pNDxjotb0c0Kt/6P8M2FPQTF3P8siV38BsMeETF539AuTJ8TF6P9m/nJjTF8f9XuCvTe/4pirw6YsR/5bzTF6P8O/09TnF8f8NMA+He/5phwZc4s7/iNrnF6P8VsK+Gu/6ti3w2X8F/k2wLGh/87/3xjqgMCcveHiAxRRRw8QBKJ0TgAAlKIsTgAAu0QqfgAAmeg/jQAA/KJf6gAA4qIQXx4gZOI2fiyiSxxUAPLwX/86okgaTACoAOaiT2R0AJCSdk50ANW4e2ArUmxfHiAq4jxfHbkQAMfYHiA1YlCcOgCpokIaJADwAO9SUhoeIEliNOQOANgA5FgOAIQAkpJ6GjoAhqJOXzoAngDp4jYae2Ak0iv4SQCnolv4a0QXfnkAteJ3fmIAh6IvfgIAngDXonlfFQDcAKPiN057YHEYfQCeAIBiTV9FAOmSBEgaALviYM4ESFYA+AQESFkAuGIESEKibZB+AK/iQxpiAMQIe2AMYkrZe2AjkhrZdwCmAJNmHwCjAOJiPM53AJcAimIizntgJBJSziiAmwCt0hYEKID7AJZiTv5iAMoA1wxPAIsAwFILUCMAkFJh/mIA8FJomn4QYQC/634QGwDOALUsfhAjAMKSEt97YEViSc5agOKA6PpagJsAzWJt/lqAowDxANPUe2Ag4iP+boDGgNlSGppTAIQyXt9ugKMA22ISXFMA0qIzzlIAxoDXYknfUgCAgMZiGIAHngnITIhmlzc/Rg8aby43dy8V12jvX48cLw2/Xy8Wb2/fHb9k7y93fF1LT1EPf3dxDyovGL9Bb3A/S78Ev1FvJL8YPyUPe78493S/M6d31yy/LQ8Fb04XTQd8vwMPQr8jDxbvRcc270mPcDciP1vPGS9GTwr3CG8B7wa/aj83z0zPdS8q10RvZ4dYZz2PGe8ev2fnPr9OPwG/EI8hv07XAm8yD0svQn8hP2J/Gg9ELzmvHA1e4HWmJupWyguMfuouyguMBuogqkpgYxo2QCHqasoyYHP1dOpeQIbqJsoyYE5AnAp0cmZcLWg3MFIBF40Jmi1oLs0qAQlA7405mglA3k1FmglAoE1RXC1oPoZPAS5NDZotaGhNbZpccl2aLWgGFWCAQ8ZWiB1Ai7pPARBNDqItOggGUQEVQOgGeGprQIJNYIAiTQeaWUDschUBWUDFQIwGTwExQMwYPUD/QL96bQEHQMD6bQF1QPUVCgFpQKgoWUCnjS9cWUCSTV9cZHIbAS06IXJ7AWTArh9WiETAvHpWiGdAwnoRFgtA+7pPAWzAjE0NHUNA+jUAgXLA+noRFgdApnoRFgjA28QtOnZ6aIELQN41aIFPQPUGaIEfQKtNP4QqwNtNTpQqwIdNDIEtOhMGHIE4wMdffIEOwKsGfIFuwN9Nfx0RwIbAjXp8gTzA0M0ZWi06dzMagSnA6M0J3AzA03oagVrAxM11WirA63pOgSrAt0CnNRyBbMCDWi06XpVxgWjAif8tOkLNc1pHwP9ArSJHwNrAsMC7Wl3AkPo5UHvA0zA5UHHAqt85UFfAls0muQG2K8CUejlQPMCUpj2BVsDJQNNiLTpPjX65KsCOhj2BK8Duhj2BPMCtQMdiW0DAIKpNGZ1bQJ9AuM1Ril98BaZExV98PSYQClIgmcYqCV7gZahe4BjxGcYninxFNABe1S+VIUpFqg9WIVBgEWSwUSE47xd3BO8d11OA399zgPSDPBcoTyA/G4D+bzuA3O8HgJKDJ4DC7xu/d083gNj3Dc9PgLfXSNduj2y/N69cvwBAzPdMPxPPdW8bNzBA9Ndtb1EXXW8Zjyq/X6cwfz7vFk9FLyuHRq8Yf1o/OH8NL15PRH8vZy6vFj9uvzY/XECnx2hXS4NCQJ+9cxcSQPx/MkCJrwpA+OcRP3WtCm8trRWNST8lsRcjPh5Co2JJI60FPxqWQF0fI3OtU81KowCjcF0brVqjKF0a1V0/cKMmo0PaK+19nXGacBEZmlllEqtKoOR9eBFqoJBOJBFGoNRRUJAPmnQRRqC+WiwRTqCgWlwRRqDqznmYRqC1zhIRdjA/WnIROqDejnrMdjAFmn6gf5p6EQmg3qCyTk7MRqDxjiJgENoOETqguk5uEU2g2A4+ETqgw9h2MFOaKcwWoKOgo2l+oBOgxFoaqzOqRaDsDhXMM6o5oNJtVqtRoPhaVRFDoPagzBh2MEtaPqs6oJ7pQatGoJKOQxFGoMdaExE6oJdaNjFQYIegvU5HzH2gn9Elq15WAQ5Vq3hg5ZoNq32gq05tqzqgrFo9qwxg5GCw2T8RFqDCWkCRVGDLoNJaCWAcYNvEXlZtDjurfaCaWkeramD3oLDOJJEKYIeggEQKYMWgqw5MkV5WbloIyH2grqDQGQLgemC62WosFqDRWjKRFqDdjlhrfaD/DgRrXlY5WnqRFqDQjiaRSWCXoNVaNpF5YLJgm5oukTFgwZoia15WVY4BkR5gtmDjWkprLrYdmhprfaCvoInRaZEWoNtaOZFrYLZg4GCKjhWRFqCnmiMsZ2DlYO2uXlZvWiFrfaCxoNrtMWt9oIPRSWteVh3Oc5EWoJmggsYA4LJgq9FPLBOg7WD2gl5WJNp/LBOg5WCIjiyrHmDGoMuOH5EM4Izg2GCgEzXaZWCAMVCQF6DjShF1INYYx0Vzb2opiBDWC4AfgxdyXuAv/1yIOuDbjUiJCFF0ymBDNdM86QtKJ+1u6XvqLJBgiT3TQDZBSyggM0o0Pkx2K0p4Tkx2ScpL00YqYRpMXh2QHYscXi7grYsErDbguppiXlXg2eDyQy/TVeCp4ILwREh+4MB0bulx4PXIHOkD4KHMHOlj4O6wQDZEsERIXeCkpEHg3eCf6jy3QeDN4P8ad2sq6Ux2A+DkSzfGNuCf80Drb8ZESBHgkhoI61VebulN4JSaSbc24NZrQ1FR6QPggPMmM1/gp+CwO1Nea+CR4KjzF5BN4PArR1Eu4KgrF1EcEJTzbelESCQQxBpLrHwQ4+CW4MlLX1516SQQ4jsXrBwQ/wsVM1vpHspm0lvpNBDapQTRehCaELSlIHc24IMaYzMf6WYQ0LRgGRwQ9ItYdxEQghpbM2gZERC0GkczERC74JnzatFUGRwQgCotOBwQ78Mm0V4Q7ptSbE0QmRDCexCzNRCD4IPzSLNGnl0QmMtYs14Q6ENB3hwQhkMR3gsQiRCi215saxDTEOgQl5RuGUMQ+BCv8wQbbhl7EPcrGWxeENYaSLgcEIXgpWxpGUEQ6ppldyCQnxC9w1UZaRlTEJaaShteEPaaLrNB4OPg7poz2HsQvppDa0aeLuDHw3NreiockPuqO2sHEHsQzfpMdgkQxJZe4E7yWuCYqkqlPoILoHHKCT9NzSk/bc0koLcjFKC/nU2xUqNlP18jcag1PzBdDT8IXQKgkKNlqGKg3pYD2iF2fs9/P2OA7b82bxEg/fcLgIA/K4Dwryi/U784cXO/OSDnswUgqD8lII2XWgNVIJOnfaMvgM0gri8sr3VndPdDzwEvAq8hL2s3a5dW71Mg9u9IQLpPJ5c7zxqvcG9kz3qvKH9HIKUXWH8Wv0/PTS9vzw8glG8uv0fnNH8kZ2i3fyDQLzOPYg9pTxCg2U9/52svCb8ooKY3Mn8bVmKAQ3J/A0ADEgcNryOAiucTgNmQ8Td5kLEgw69Jz15vE79s7xkgsD9O53kgiWdFIIUPZSCMT3eAtSDX1w4vLo8TkNHHDhcNZzy/fSCCv0Mg5u9jILTXMS8HkMI/J5D4zxhAxM9ar0LXD5CHIMa/JyD3z1+Q+H9/kPcg7DcgUKUjVH95LTBQjH8Tjyx/Ka1oUMo3CI9cZzG/BFC7j0VPUT8j2jDva3cPj2m/ZY0PnTyjaT9WkNk/IqMC1S8jDKCyo12xXpCN5lyggZD8oK0/a80RkLaIWF19P2ajFa8sMR6XGO8faiNyZkpL2nb6VMUSOi1yEB0SOmLyLWQSOnbQM/oSOntyUYwSOh1yY/QSOhvQZDQSOhDyAvBgcFf6V6YLcguYTUZjum8SKNDE0MPGQAZy0IzQQGZNRkEGYAJP1jjQxfo5czjQ+xlG0JLQKJJgcGt6WJJS0Le6OGZS0MimeSFgcFWVSm0i0PTQuvp0AhLaFdAGbRLaXNDIej0hMdD60JjAxPth0O7Qph9KZnLQrNDcNWshctDN0OGkctCj0DaSTUZbFRchItDN0JImVXwz0MTQ5lgz0PTQ+noVbTPQxdDdTQ1tUtCWJikCTUYVBjc0b9DH0P56JWZv0NfQ3QZkoQ/Q8XoR+01GEwZx+01GaSYItFbQ7JVjAkgww9DVenNmGDDH0OcGa2ZP1hTQnGxP1l3Qo3pY/E/WOdD8tE/WV9DHuh8CGDDV0ORkGDDD0Md6KrQYMILQvt5NRnd6KFImMN3Q4HoY5g/Q3TApoSYwk9CcmE1GGHp0Un4wu9CR0IKzcoZ+MMPQqoYIB34whjCUpjJSTUY3MEpSeTDH0Lz6SuZ5MNfQ7oYu7UbQyjDi0MGGXAdG0MfQ6dCgrEvaDtCachPtKNCiMM36Cz8FSlaJEtBhYQXyJDNx1RGCKdUp8gHYOdUICmwVJ+9yYRelWzC9mE3VFzCS+m/vXn9d1QfyMtDAH3ZhezCGFS5hE9V20El/O9UXMKSkdol3MMmGP/UUDRvQP+N7MPW4V9UXMOt6E2Mv1Riwx9g51RnyJdBANRcw6vobYzA1FzDgekN/ezDdMBN/SDUj0HN/ezCYendjVDUXMMR6bQsmsIawlCZrYXiwzjM7YV6wtLC8ei9/DLDbFUEfcON7MJImL2F4sOEGX2FpsInyGR9I/1Y1abCusMbAutJ4sKUGdOMMsPCVFP9yiRXQETVyiUGwgERyiSSw8XpTH2FCeLCZeisfcuMMsOyVKUJ4sNsGerJKiRWwjXpy4T01eLDdelbjd7CisK8zBuFzNXewnzCAs0NCd7CksLgGSJ9aiQBwx3oL0gyw3pUp4y81eLC++jHhRol5sLfAzJ9gtXhwlbCQ+nXjDLDTMHX/bHDvsO+6eLV4sPaw9s0LsmxwpLCUphuyTokQsIHNODI8tXiwjoZb406JFbCAsPazcrUX43iwsrCnlVq1T+NmiRcw//IgE1aJPbCsOQa1XZ0sokBDKqCxcJiiDdNYEWtEWe0iYBSiBe0UEVlw+dI0PlCQGeh4TlCQYqI8QXwRQaCxcKDiAdhVmHGgyhE9cPVwq2I9mHmgtswxcNKiVxJAdDWg2XCM4g2MbaDNoHVwn+hHkCSieHRjoLFwkgC5bnOgr3CrUivYaRExcL+SWuJaAIbiJdAwWFlw12I24m9SbJIlogRYP6CxcMKSTaISkh2icpJYKBmrGmBCohWER5A7RAXiC6Jl4gzSNeI7omvwDxFI8PyiU4QQLC9wktIqKEJgqCx7cI2kUmD68K1wswCG0iCLWmD4kSDgKaJT7EPWL3D34jZaAuB3cMt0fUgvcIxiXL5ga35g+3DJ0kCArnhRYJHw3PDYEmYsBGs2LDlgr3C6YkJsHix7cLiiGXge4Czw9mJ0gJPSVrwVFhHw3fCBYm68SmsFLDNg5Sx7cMliCoDGEnfSHJhFkXtw9hIdPW5rL3CJol4SYDJneG9gyyx7cP1w2MIjkV/wl3DzYmkSc4EdLS9w22JJ/Bjgv3CFcIqmDWs/cPnwj2IgrDTgnKs8qyzgyXDZcJ//IBNNoC7wzfoi4OtEY0pzihzrGwA9iXTqUaBwiUX0I4lgiAepWAF+tQSlOEo3qRdKeaBduUjQJ6lhBXN1JkUwoHj4d/I7IBO5cCVQDkglfgjVRyRqe/Z4JUEIrw4kagAOVCVBCPxHTCUSpSJHHCVH9jwlOQjZDkIlU0CuRz3lOQiJDjeEQQi7aSXbTQiKDmAQHQiRCMYlU0CEjm4QHQiVCNL5U0CIDmSAd/Yn5UEIwOlkgF/2ASUHCMkIyUc4kDEI4A4l6jkIqnkgFVAOPFdH9gJXLIAiV0CItEdSV1CI8QiKV2CIvUcXoGAOWldQiPf2BldoiN/2Zld4iH8IxPkOV3SIiQ5tJ1CIu2k9J2iI2HkADVyI+/YRV2iI+mkwDVyI2Q4WDXiICA4YDVCIoMcuDTKIlIieBXiIAA53CTRhdIiRaTmJeIhxaXVAVwgfVkbgzEV4qliJBuVxID3lMYj6+QmIhitYojhyOYgnqTiJeYjupT8EAGkiQEJFGgiuShepcpcfqQLlbYiqRSzKdyBduXqXcSAcyj8SJkVBxVYJaWlZCVlpK4jVR3NqXgllaULgVWlLCXVpR4jJ+QdycQl+gAuI1AV0YBuI/gl5RUtqG4i1+RVFZ4iDxW2QG4jSBR5ZV4izxRlQcEj7iMYlJrpwSOEJT2kQSOYFZ2VXiLv5WUBuCVlAOEjn+XW5FEikSOt5T4YbiM8JGOlLal/5T4Bl5jilGUoXqT8lJ6lapx+pAQA0GhtEN6lkKjOQXbliCLpI7qUKCLpIvwBl5kqlB6A6CKr5J6lDIHqlEdofqUMgJkjDIDepKKoHoF25WPFhSO6lGIgAaU75VYV/ZVqqPgBl5mlldvk8UQhAJlFogHRRdgVIUXO2HFFogAdRaIB6UWiAHUjreROgeNEWCJNIinlMHgNIs2VRqAtldEjTEBtlK8UljmigDloHnixRf0ccUW6gdFE3xQDIzgUHngdRMMcHnjxRSMdooHjRcuDgoD9IgScIMTXlc2VTCTdI62V8+U9IgZk2YB9I5IAsUXvlByB2aTZgbOUiyJ1RJwjIURcInFFP5UrI60iPCOrIjNFvCKLI8FFAgAjlZVAo5RhRb9AfSJiISFFNoG7InuVWFnpRQyAsUXoeXsjY0SFInFERSJHIh1EJSJHIvFEm+W/QeNF5SPHIh0ilSO7IiTZxJ1bI1g0syJl5HFF2jEhRLXkdyL7I2hA9yNL5AtZWUQ+AdFF4RQPI3OUkRWPI8w4C1jxRdEUMoHjRTqUDyKxRQ4k9yLXI0agNyIUNPFFkpxxRRHl/yK7lFKA+yKoQSFFSp0AomlonnnRRRrowKNDI+kjgKLvIgQBfyOtIwGBYKIzRVCoEKPBRZ4Z1yKdpTci8UUyInFFSiPjxJlEKiPygFOUWDX8DSFE6iLIo4sjGiPjxB1FcgHpRVVdCKOtIjVcyKIzROYl48XBRdUAa5VEiUahk3RPKNokYSLGJfUURKMYlaZBL5RNFMSiQ/UdlMSiaWgkogYlMSJqJbEjlKLflPEjo8Ut5Q8oqiT+gVSjF5RjpCSjCWnbVNABeKLrlHOpUDV1ImoksEEsoy8U1yjKJA6BrKPMovuVogCqJaIAKiX1I6yjs5TXKJolTSI8orolLSOso7+VIkGsoxeVhBQGaRMiUlmMo6CUg4AWgLeVi2g6JeJcxiUInGDCaiVbIxKibKLjlNKjL5STlNKiQ/VPaFKib+QUFfKjPKKFHIqiGiR2IyglNKK7FYHA6iXqXCqiqiVHtFKiJNiiom2kDAFiohH09xVigE8VOqL5ZdUYGiXPgGol3RzGJBLABqJ7ldUYuiW0pEaj5KMDIyai6iVxJSai+qJ4FYXYOiUjHVlhZqL/lKklhdkMo5kpYoH5ANokJYBqJaKixiQLgA6jX0QxQOokUEBOoj05DnROoy+Ui+SOovuVByJuoiokK+Ruo86jOBVIqBolpyPuo5A0m+RudE6jF5Tb5Q50BiTBRDoltyNigd4UxiXl5SGjCxXBo06i/hVhonPk9RiaJXcjoaMvlY4waiSPI1GiqiTx2DGj2aUIqOokTeVxoj+lCKi6JFqVcaO/ld6BcaMXle3lCKkMopKMaiT/I2KALJTGJNKcWaJhovPYGaJ6ov0hOaKuogCimaKAon9YOiVAotmiB5QEACokKp35ozyjaSJFoholGSM5o5A0Ain5ouokOSLZoqoluSJZoyz8nil7KZz97ADm/LFCFv3DvTs86b0wvBm9fP34g5m9cUJmQsTdZp0JQ4Q9xIPIva4DKL2kgs79Np1bHalCVl22QulDdkKfXY6cX10OQjSDOL0yvdlDAzwPPMzdLkMbvS5cbkJEvEDdgD0BvLNdgf1mPayDrZ1q/OyDKPwPHWvdVLyJzVEC2r3EtJG9AUOR/eGdO92LPZ29+vxhXQKCO12CgvH84UJRXEm9jULJvU1CYoKP1UegBilUqD1ZigEepYoAqkItEFcj8gEA+ePAFdT/5C6lV03XyLaBxdW+KWuo/IGtEc3I0Sg7VFhADKHpopup+yl/gc/URymXohuoaKloKBHJCYEXTZ6peTRvTQl4XjUXg5HIH00JedHJn02Po19NCXj3o3zDCXiBNSl4VaC1Aml4H6KeNNlFQ6GO6O6ouTTAzVl5cckgzC+jgBi5eEE0Lxj/ou0DGrAvo3E17xhVoOAZkXk/ogrCDXmxyXDMVaBbNAjMuXjPogMDIXlQY4MCxrB/oyjNIXjvoyMDDUUQYmBjihgNea+iqhgNePBiGBg5eVBjRTQwQ7Bij0I5eChjrFX4WQ+jJXy5ea+iSJldeOhjhBn4WeBiqKBU6b41ZM34WEk0FM34WQBiglRDeGBi2wPUzSN46GP56GN5ZGOEY/ONQ6ASVVN4WGJtfVN4X6LSVCmleGN3kUOhslVTeARj3X1TeRRjVJgppahjnBmreNRjdemreTRiqlWreahjfBmreQxiTJkbeOhjwGIpsUOgoGLCzTxjr6OiGCmkKGNvA8xCgxkkYws1HOCDGahjMGLUsIMYTGKrNPndQ6A5NOd54mNsYyKZG4HJNMXd4mN8Yshiys1SYsRiW313eSRjJQNqzXd5qGLz6Xd5fGML6Xd4KGMnNBJDQ6BnNLrNamJ0YkYYeXkMYuM10UI+JL/9971gBGWg9JizqZNAZCgYg3wlqSk6qGcZpijFoKcYkyjPgfeoDnWSjPB5Ydkb6YtpiHnaJZHYrnWhOIbEm2judaFVSAEedfHZE6RYeTFChpUaQz518o2+dB1D2kPk/f510oKU/HbFDjX8jFpZqo0GQn1C6oz9Q3do9P1KgoXZ3P1QvZa8JpSZvPbNpkMC/fFCbaJKPBZCRDwkgii9pz2dotZDXaOvXMPcXT17naWd6ULu/fZC/aIUHFlCMr1VnPc9CT36Peu8vvyuQn78o6L+/GOizD3uXCq89bxB/JOjbD3I/RYMj53To1Y8MzzUvC+cEb1zojEC6126vEFD1UKAvMU9e9yGvZe9iQKro0b94UNroqa8kUJAnbMcHdzW/Lg8HLy7yAIRO5gAydrE9BU6xf6lTnR6xSeg+sU/wFZifyLGWOtosdk2Yhh4nnTbaFKN9mInJQ5jbUJaQyeZTmOu2YqMTrQe2IF0ekJe2fpDrrQ+2IZDdaSKg/1DGo3GQragDaItQ9C9nsQYHASCAvyEggFjRlyBYolDubwi/QhcVkPJQl2iO5zdozZCaUM9ot09vaJYvX2jUrw6PdQ8dz2rvN78dDz4vT79tZwjoqzdfr0ejf69Y6MB/eOjSWMTomw8yPxgPBEDPkJlQ75DnIPlQ1yD0QK8PXY8CzzRvWe9fIKhXII8212x/XVDwj1/naC9yQN9vSKD/byxXUVifj2wvdrpJWN7aeKoMUP/DLOcPmK2AzU9I71W/MNDogwJVX5jLaP+Y62ig2PNPUo9FkNBYx2jwWOi/KNir13IXGFie51RPPudE2PuvL09pbyevfZcfgJQ/M5Cgz2JPHFi82J+vFNcCWNMPS89iWNjPMtirIIrYpk95Lwo/ESMFFwzoulis6IZYpvcmWObYzEDW2OxAnyD9Fz8grtjTjx7YqU89UP7Y729BPyHY9FdJvwboq1DzqQBgJujokEYgjcZkL0WvT5jPPx2AqO8V2P2AtdjgI0LHTdiA2O3Y4o9d2OBY+2ijr0zvCNi5l0hY6NjoWPqPC9iEr3FvFL84Pwe/dSDUWPTY/E8a73e/LFic2JVvb68c90/Ywtj/v2LY39iLIMq/aw8pF0rY+ED6vxrYpEDM6Jdnf5cc6LQPZli7b1ZY3RdQUI5Yoy8uWJxvUy9eP1Gvfj8woI31EmNcOOFY2g8p2IgOQAVQDmAFbzihCPAFLIBIBV848QjYBV84/w5fqmAOZAVQuN84+/YMBUf2LAVU1ji4xPkLKMS4iQ4I4F84u2kOGwC450crKJS4mLiTCPsolLiADg9QXzjvaVcokrj39kNIxLjA6R8oqrjZDn8oxLjBaSCoxLiRaVCopxBxaSbo1dNLikFgK0RokCTyLugd+kKJLsYXKgW6SsIeuhwuG5AGhjrCMbjsFQ6oGbpD9Gm49p9KE1HoM/RluP/qG5Benx7Cdbiqejv0CnFtuLoVQbi9uMPGFmgxuinCabj4H24TabjVuDxIe7oXKhW6FcJVuLCGREtpuIt6TqBIple4qbpoDDO4ubpZE3W4ubjcBk6gfAZCS2m47IYSS2B4tbpyS1W4iPoGYD24hPpjLhuQOgZGS1W43DUWaD+4gjUWaCW6YxMKcXB4/CZg4GJ6KGARuLJ6TqBYH0EYPEhJH3sTS7izhgNgAnjpBj4MJHjpn19gEbpPEzxIdR8sIku4801g4H56DnjqeKF6Dni7uMk1YOADBjCTPEhzH2XgPbjFNQF477iqsmF41HjbBgF4jHi642toD7iSlWDgVwZ0kzxIdzMVeMl4rzNrOlR4sZ824Gp4l7i2rku4lB8pInKFS7j1n08MJHi9hiqTS7ju+njLPEhkhnUiW3ileLfA4OBCBgzLW3i+eLyGPEgw+mWuH3ixeLe4pIwkeNWVYOBYePbNUPiveIm6bIwkeMm4xp9ipy14lp9ijEu4xbiI4LxILp8Oy2u4xnj31Gu4sXjq+mDgYZ8mjBuQPXiBJxuQSZ88p2x44C4bkE76BBNgeJO4he1ruPl4wfpAYAJ46SZOoDH6QGBseOt4vZ8OqCR4l3i/uOOfRfR++NW4859QS2m4q58zkwe4ubjvzmiQGmNdaLnYiBdNgMW/I2ivP12A2jiJ2OQXddiJpyY44E8Rl1Y4sc8Dv3TvMNiYTyQjSNjeONPYy/dnT0E4xi9mj1g/TE8PgOZQl/dJONe/HL9/gIz3eiMeUMKvPlDbkJMgwVCIQOFQm89nkLFQ+883kMfPXTjpUP04iDjDOO5PaDiTONg4llivILZY/w9+rxdvMuiwLyJAyuiqNwNQgViif2HYkn93OJpAhUookHTwZYj48CXqF2prMLOqKcYwUXRyZBViPieNNBViPi5NTBU1aE+Nan0WBOxyaj5kcm64FgSgTRIVNWgtQPIVLgS/7xbgaE0aFSEEw7ouPlxyXn1cVmPGGz4XjSTsKQSwBie+EE0JfTVoXE1pfTVoKBiFGzUEkk0xFRM+GgSyXyY+DgTfxiY+b41NPjVoYMClFREE3QTIehEElQSkNRM+JgSKGDVoRHoTPhsEyCDu7CEE3DUbPjMEzMCLFRs+XgTR7DsxeQTWGOh4fgSbBIxNF0MvBJp6XPYDBOrAsJtoyWiEwITGwLi+EISkLFxWFQY4vmME4twMhN8Eq00Mmy8E2000vlxWB01klUK+egStGMz9EoTshP0Y3ZkvBN9NAv0ShOSEpcCS/VxWUM1ylWa+CoS7GLF4XFZHGJNGLwSHjUaVRQTOBDaE+wSRLF6EpwS7Jn6+GwTrwP6+MYS8zQGVMb5hhNEEkZUpvmWE3k0JlS8Eqs0YWVxWDk15lUW+LoSUmP2bYYSWzSObE4SZhI8E09RcVhggw75rhK6Ew5U1OlYEu9RrhI2E1PjHhOSEyc1z/WGEmc1xHC8Eqk1b/VxWJc02WW/gcAFI4AWOMESb4I2JWqDI4DCaBqCfqQ2OSOBYmiVw+ESEQw6glETZiIngzXCnqTxBCKp6pXtsTRAXqQHYSOAti3GgzRBduXw8TRA8RMaaeaDNEDepPeDloPhEu4s7cPhEk+CBzHhE8+DncOxEn+hwVkJE7kNPcM46PkS5bk0QLkShQxqrCKo6RMwaFcwIqhSlXBpWq2JE8kTxCwRgAGkpC33MbETyGgRYRESZROoaQGD4RLoaEGDiRIRycGDiRJlE1hpoYPBWZUSo80eQPETwK0/MLkTEO1cRTjoU81LwxkSZRMQaSvDHRIxE5VtCYMdE60Tfi0bwlkTQqkiRFkTK8xiRLkSQi3iRTjpapVerHvDIxKZIljsB8K5Euglh8Lg2Q0Tcvk46dIsJ8JZErIshYKzEmUScwwYsLMS6RJU4TjpSizYsEsTPRKXzRWCSxPJEviwSxLzE/xohLC5EyUSL+yJrJHUWROPzMmsuRKiaSmtOOiREv+texItE9USi2ztIFkTtRPSaR/CWRKyaJ2DJxM9En/M/CC5EphptkU46U0TSmgYQQkTYwk46bENJa03Ei0S6mmcsLkTqRI7TTcSixMAaVWsWRKZE+owBRItEkhodaxLEpsTsRMfDNAiwRIfE+6oAURfE8kTSkLwIn6l79QSSd8ija0BDHqA+ukAk6JsN0x6gV+tZ7R6gb+sF7TDgautITjAkl2sEXjAkhes0Q3Ldf8TVO3xEqm5/xOwbLlwx2iOJD+pm3UCJY/Qx2jHrXrgx2g/rPeCe3R6gCdtQGjWMf8SIGixTOiToGlxTUFYk63h0GCSnaxqEHqASJI4kqRtXe0a7PctqUzQkkiS/ayXQLiTwiQ0bb8gqJPEkgBslokgkhCTQG2MbG25CJKgbSkt73S4khCTUGzA7d25/xL5bfOtBWzWgEiStuzFbJPNYKyokhCTYJLlbEUtwPTDgGvtJSxg9GyTDJJLzBD1CJPLzZD0w4ANbFhCjUxck4etT7HckwyS0pUtTFyS2O1BEMOA560KbNMTOKx0kspsoe2o9KKTDJPHzNeA8JPzDH1MXJMPrefM+7jDgM+tCbEyk8STaxPDTHSSNO0J7NSsdJKfrVrxbaEMk8ZsNeDDgEzt7Qmqk5CS93GqkpKSo6yLbHNMXJIc7dJpNPR0k7Zspw29MFyTVG3rbK+4w4E0k5PohpPIk0Asw4GwkussbPRckghs+20/uCaTDJLQHSfwYJNYk8voYJPqk4Otp20HLfz0CpJck8STHwxC9OiTCJO3bJgtBcn2ktgtWsWmYyegOsXweRViFmOpVEh4bRDVYgbFVmJudYbF62nudLZiZlj1YgnY9mPn4ubFjWO4eO1CzWPKWM5jLWOdQq5iS1VU/D1C7mJkeY7FN2mdYnT9XWNeY91jVHnNQhfclvx+Yrfjt1x34008grwaHA/jfdyP4m09A9wvXWL8NkJvXWFjL2PhY69jB51vY8u8nv0y/LSDfgNQ/V/iLkIbvVW9I6ILY3D9CWJ/Y8q8/2MsgzTjSPyA4yli9xzgPM28bhwtvE8crbww3G28Ov2Y/YFCLOPZYwy9Szy4/Qb8goIuPWFD+WJronATXOJHY4XMx2N7PPpcEjwEnGSovnnQqGnpX6AzQIHl0Knb6UC42ClntT/B3emQTSQoLnVdkjXpm+Idk6SYsE3dk8wo8QUQqEtBRuM/wFKZN9AdkxzBd9GDkldB5uODkwOTfMJW412SS+mvoekZ20HouJ2SOCmhfYcJXZIYVV+h05KRfU7j6Rj9khLD5wjDkh2Sj0ACQB2THunu492TrZOfGMAww5PTk77pPuPpGdOSRhhxLJ2SWCjIzIHinZJvQUHinZL9kmHpsDE/wYoYaS1dkqoYdE1dkhgZmSwdk0xVrLmnkiU1MeO5LCeTbFWcuekZY5JImcCJp5OEGA2Bc5MmGOCIl5NjkpnpaeKXkwuT2eiZ432AFClNNXxMf1n56LUsJ5KF6IJM75MLk8XoheONLCeSZemyuCeTZJizgDuTG7h/WWwY7Sz/ksuTrkj/kwuTtejV4/nEJ5KEKKJ0f1l8GOwxp5IP6ApN4FKAUlM1TeLCYGBSD5Md6BSJp5N6VVfYJ5OdkhLMneJ/WYHpUyyIUg+TA+jaTPBTC5IHkwoZuk2nkyKYg+Ink1ZVSy0YUnuTZRB/WcOTCFB/WDPo8jGnkw5UqEB/kvPorrl4U1hTley4UwuS+hkCiQWiL5MeBQWif5Lr6LZN4FOwUh2SkVUH45RTlFJpyUfjbZKjk4XDAYCjkq+0aYylFN61o5QYLQxTVjnmfEuBuziWfQxTUUWRhGUUf7Sx0NkV4ThLgRE5sYTsU6s4RghLgNc4RYxLgP1pGf08UrkUgbUphTxS+RSQdZVIKiBFFdZoNUgsUxxSOUXCwhVcP6HiUmJT+fUl/CoghRWQOXWMfFLsUgUVeTnFhaao0lOwOPgtpqhCUp5oFYR8UgJSk2htjCogAlMtaarCLFJ5FETQLFOyUxg4w0h8UsUUwWlZ0HxTilOyUl1kesOsUjDl+sL6UkJThDmGwp9YIlLdRcbCKiBCUr31g/yfWGJTCWjjjaxSPTmDhOxTvTmTjblcxlMNFIItuVxiU+lps425XepTmWhN0FZTU0XN0FZSbDnOw6xTDjhHSKTo80VL/G5SAlPcOerIblO6U3Y5y4Sk6fw5VQneUiUV0GRb/S5SHlIiOfrJrFOiOIHCgVLSU4hlInyk6ZI4x40uUl5SwVONaYeEfRm+UxhkMNmsUn5pMnx9GIZSSjjnhaxTHWlmLQVckVJKUwRlCcJxUg5TvWlJwwVcwVK8Uyz1T/2sUro44Mik6Xo4TixWUqNp0wmZUsFS42lvhcVckVIqU5llAcmmqf5SVlICUy450sIVXOxS7jl/hMVT+lKw5ZxSuRSvtSBMnJUSwJyUBmVgTGZp7ZPGaGvil2kGaF2Ty4GkONBMwpURaJC5VVKcUjvijVLSOPBNloAPRHC4LVK1UqZpd9AtU+Fp5uItUg1S9mAtU5ZoL9CNUuNoewmWgcY479HLgBJTM5IVUnZoc5KNU5k5TuO9UoFoLuJ1UiNSjaX4THVTnVLrOKuSwpWGaJ7iVqn+aLcJloHdaT7jvVJDaWRNvVIdUjulFEyXaZ1TbWlB4pdpo1MdabAwM1KDUnjljLgzUt1SZ6Snk9VTbUVnkptSRbWMTP1To1LEOZy5vVOdU3VTzt0EYVFYc1KooVFZ81MD9ZxMQ1ITZNxMQ1O0OTxNy4BpaVni51I+aPdZW1O5pAiJp1PrU3jhy4A5aMJMt1OrUpM4P5K3UodSCBC3U0dSszjtLLdSN1N2OZ0tW1P8OdJNy4DlaXiIb1KXUrBk4FJvU51TecHvUjdSbmikicuB7mjKTENTVjiwU1tTETlwU9rYbVNnjdrYj1MtaVMt2tnfUktSyZHa2TtSK1IqOWhTW1KeaBhTy4FeaZhTMNLTUq9lKy1bUtc4nIhDUy1T7snLgHc4k+LI099So2ioQDdSr0SWTENSKTlWTBjSj1KmOJowVqlHU59Trjj2TJVT81OrUu45R+IVU3jSf/V0U1VSpmLn40O951wxk5fjqOJW/UNC6OI34hjjeDyBPfg8Pdz2vfb8Dr1DYo79w2LJQnjjwLT44s9iBOIYvG69hONv4xlCDkJRYx/iq7yk4zNj3ry5Q9/igQN5Q379lON5ksr9zIIq/Lu8hZNkvEWSq2LAEqj9S12RA+lijOMZY2ASdjzg4+29WPwhXdH9OWMGvWzjhr3s41e8xryiPcb866Lw46KCCOO+DQYjzFG6KYBBEPCh2eVjbpPjHe6TEdgudfrEq2lektXD1mI+knVjtmKYeKbEAgyxQwGTnI14eEGS6dnzVA80IZOtYzKDyo2ygvpCqozhkqtVCoKRkl5iSoNRks1DJNI7Pb1jsUKmQ7fiVNPtXEL91NLC/Q/itNOP4uTdT+L008/iZD0v4ozSxbxv4lSD1z3M09i9LNJe/eW9WZM5QvSD7NNJPYEDTz35QotiiWP5k9TiPNMtnLTjvNJ04qVC/NPA4sGNIOKC0mATPD1C0+ATFZLVQpASS6PxA1ASoUPQ4vtioLyw4wdjlrVwEqkD7nhNXOTT1+MborId6tPnYxfjDaMm0w2SvL3W/X1iLaJxk2bSiLz2/AmSNNMO/JucVtNtPT1dzr1qPYW8tkOu/L2jNNxvYsu9Hvwy/B9jmZKfYjlDzkLDojmSFOOw/IDcSv1KvQvc3NM7vKw8ntOFkuED3kMh/cAT/NIM4uG8ZZLa/Rj95ZM8ggHTG12Lo+e8QdICgtASNZNx/TASR9x9vGHS9ZLwE6kCofT7VAgioqjIgcIlFyL/AEco/ihr7BpDOmOuTLYor9jG6B5Meuk6MAkghukwk93TndK5cd3SpumhTd3S5ugmMUeg23Xd0lbpO3Vd0wtCqJO90yvo0Uwj0/bpAJIgfBiSCSCO43FM+RhG6SW449NgfOd1g9NAYAkhghh3LHPSwhkEkvPSlum3dHPTUBgZTAkg8+NeMCPS6+kgkv3SyMzkknPTshj+MZvS1ukBMcvTvdPofb8sI9KqfIVM+RkD0hhg+Rhm6UCs49IlNUFYw9KCEmyT09MlfMySc9JEfJCs2aGEGGyTB9PVNGySR9K1NBySc9N1NGyT29KCVdyTvdN41dyTV9PZ4zD02aB0zPyTt9N0GdyS99JzUNmgjBlCkqnoq7jj01vjIpPv0hvTf5NCkhbp+K2305x9EpN/02/TXBnlMNmgNeL7uEAyP9P8fENNt9ICGfKSQDMn0lM1baBn0qjDqthf00vS+0SUWW/Tu+ktMNmhkhnTTHAyP9PwGZT0cDLQMvNMcDNv0sPoPTG307vTGzSGkj/SQ+KvuNmg+9LYU0aTt9JSmCaTD9I905oYJpI/0vPoJpO/01PiJpPgMkvoVpO301/p1pNEM1fThn0HTCPSxnz/E5PTJHwblZPTWBjTdZvSZ9KWGT5M2aAX0yE4CSHWfIt1C9Kf0nYYdDMn0tAz4DIgMnPTjn0Ok5PTzDJX6adMI9KufOdMdDJH0pHJPanjwOY5XDLTyP2ovnh1qdPAwfjaxQ50bpLmYwh533mK00h5npLK0jVjbnSq0xtovpJbaWrSDWP+ksnZGtOaQxKCWtL3NDpCSoxdQ7pCsoL8jHKDYZMvNR5jBtPqjZGSRtP+2INDPWKk0ybSsZMY4/HSTT1U0+bTidMW0omTltJJkkD8KUPWQqlDY2I9ounSE2IZ0umSmdPE4o7S5b20gv4CztLf4v9cHNM/4pzSeZO/Y1zSO70sPYj8GT3FQkASIf3sg97TaWM+0qAT4bx+07Y88z06/VVCVdIxvNXSIUO7YnVDwdKrPNe8ib2h0lzjqDwQveHTl90R0xm8UUN2dYCBAdiukvLTZmM2leZifvhCMp6TK2lR2CIz3pO1Y6IzdWJ2Y5h5Z2K6nJIyEoOa01bE5P3BkxT9OtNdQm5jcjMOxB5jd5kKM55jD5hRk0ozT5nKMibSIAyqMpTTt9wwXQnSwTwW0tO8mjLJ0loyqj1A/doyY2Mpkq/jjNN20hlCkWJTYmW9nvyGMlmTn2NDo4M832M5k/NilOOmMqM8yrwkvdzSRdJI/LzTxdNAEt7SaWPTPDYzZdLHvWWT2vxC3JXT9jKLow4yOP2OM1DjTjLxvGFC+WKwEnWSIoIN0uHTvcVpnB4y+z1hHU2TJ1x8nY/UeuOOJUXDDnXBKOG5DnUHQWqCbnRvQOETbYHd6ZqCWSjdkm51QSjQ+N6TISjPTLESfTMn6fBFbYDcwRZggzIz6VZgIzP9MvPp6zAjMktBZoOjMo9BLcPhIDNAGRO92H0zdug2g0ipjxm2g/MzHTKRfN3CgzIgGT3CMUHLMvZ9fcMrM5MzoBkDwm51MzOfGJqtbYEimVqtWzJXQVRF4SH9MuvpVRJzMzsywegTwz0y0zPUVMasfTNMwSatxzLrMqoZM8KDMhgYc8LnMzjMrRMXM90y8ehRgjFBbFXRg+Eg6zJImbxE5zOEGPGCfTPVNQmCNzLrMpnp/RI3Ml0yglSpgjFAVBlpg28z/TJ0fJJFbzNXMo7C0kQxQcXpMkQ/M1tBuYLOo4szZJkzEj8yBzLyVHVg5zIcGAsSPzKvMlTgDRnbQNiwDRmLMo3pFYINGYCyD+lVgo8zHukbEo8y4Bk3gWCynNSPws6iRzPc1DFBXekprYiyfzL/rYizHzL96K2CjzMD6W2DaLKgsmHoOayPM4oZX8ICIR8zVlX5rAIhXzJR6H/CjzJSmf2DYiHIsgc1TkTnMhMzzgViIV8zuhluROcy+hjPEyszhLOr6JOCjzN7MozC04LOooMykVTQI0ipNLLZKAXDsCN0skczfBgaQzLTR6AG4iXCOaACGXXCOaDYMkhEOaAm6caCbLJm6RMzKRNHoFMyeunmgmyy1uiYRNyywX0jgSvpmRIyeDyz9uMLMiES5uj2ggUYRukERYKyEsIFE7yzc9IiqFboGzJhEqKz0HxbM4kTwrOKw+UTfLLz4pUScrOcs/7jvoI5oQgYhzMREpKz1FWJE1KyI+knM+yyFuhmreyzyrIYGc0TfLNMVcFY6rLM8AUZGrOsVR0TUrLlNfyz2rJEfPcyYrOX0w8z7aEmGR0SCrLWkMaylugvMx0T4rJYmSMSxulDEmKzNH3iRe2hOeOfMyMSZrKUYyMT5rIMGL8z0xKp6X8y4Nkys3Rj0xKm6IpF7aFl40CyYrOcfCCz0xPms1wYEa3toDXiV8Jesi6zCbBesyayrLJl4F6zGrJQfTWCYrIQGImta9iBsxqzelV7E3qylhgUse2hUhivwmKz8Bhos2GztrNIM3sT5rLD6Ziz7aHofNizlxI+syWwsbPaslp0sbMashyzOFM3Epay4+Mlre2gWn1DgmKz2nzAI6mzGrOEMqAj7aDEMp5EYrNysp5UBRIKssZ8VyOCssvjIEQ5oSviYRO2s7vp5cN8s5IZkRI5oQfo0ROlszKyx+hDM6WzyrO2s/6yWrIKs459tLOfE/myV+jfE7Wz1bLuGGETnLNBEyBNBuONzGgiVVMVzbuCa+IB403NoJNguENY4JM9ky2zUiwngk1TnbK3zEB0OqGzzLWQOqFtsrYtd9Fm4h2yGyyIkpbjLbIuLKkNr6CJ422zey1AaRhNLbIgaFhMHbLZDdhNLbLgaKGBDcyqEfPiM7PFzSQF8+KDzGEsq5Lb4s2yDywELLcJ3uIdslYsOq1kTIniH9SdzRRMAePzs8YtjGx0uCuyzbPfzVOsR5Ne4nOzQ83mrRtSUeIdsmPNTC2MTFmgM7M4YXHjo7PzswUsN5NTs8Rpt5IHsyIk95Nx4/OyvCyurWjgOeLNsijtz5IHssit1S2XUrnjt7Jzs3UtiIgHs9vMQpNfk6zpvbJ47aJMBeKtzKHt4kxPsw+zx82STVOzHGhMMVOzSiwgUzXiB7O9LbKTX1JV45eyjy1jbYMtU7N3zC/t/1JAcw+ydKyqk3BS3eNtsxMsneLd42+y3+wfgZeym7LzTN3jR7NfzeytUNND4oNZ1kVD42uz3Kz9IQ+ye7OJSYqcN7PALAKtJk1Ts6Ws+2yEUmhzD7PDsh+N8+I3sjAt2gnz4vBz/myaMFypCHKQc2uzHw1UU+Oyk7KArMqs1yyw5NviH9VBEsEEnqmBDH2I2+mEaWEEZHKiaMEZkyiRBGRztjiH6H6pR4MxBGRye8xxBIfo0Gj9iAdoEchJUUboZHK2LckFVHI/qQrAZHL3DIjxlulscr6o94Io8U5ATHNAaLmA3HIgaBjwrHLZDM7pTOhvg48gq+kMcziTgYFsc9RyhQ3q7cbBdHPvqFrsNKh/qdrtCDnG6Ahp1VFOQLRySGgG7LvpknLVDJTwu+mCc1mtJuxYOcbo3HKYaXTxxumCcgCtbsHUcj8MTPCqc+Jz0OH8cpxyx7K9UKxyInMJCU5BynPEaM7tqei0c9wtPPHUc34tbuysc3wsY1FM6SvMgvCGckIs3uwmcrJyNGFGcupzdSxTBdRyEpXTBIZzjGizBIZyzGlzBUzo0w1ASbZyFHMhrOHtTOgRDRHtp4BiclxpSvHUcl6oFOzQSS0YZnO6bPHtWwUtGRpzMGhJ7QhJ1HLCaCnsjnMac5RzapKoSX3o3qhdCX3oZnKHDKcFfenKc/JzXEK57IZyA8zAQAFyLInD6GZySnOd4cPpynIscwhRTOhfqKXsJEgxcnpy6mgV7DFz5nMPDS8EhnMAadXsq+jcc7Ate1RJcrJy+mly7fLteugGc6gsPynRqJgsEsCyc0pDQgGScxdN43UIqLsZFDOeTCh4b0DeTNooNjlRQPvpc3RFcjXp8bklcgooz03egMop/ZLd00FNUUBSmWt0RXMcwYYwVXJXQAiSRXI6GEPSEU11chVy+hh7dWEh/ijLQ2iTeXPbQJPSx3RFcpF9J3RFciAZCU1tcx1y9n0XdPUZ7uhXdEVzrejVuCh4rXIKwsvT1XJyKMl8DbjyKX8YbyzFcoNy/enZTEVzA+lb0mNyFXJh6D8tUUGKGHvTk3KFcgU1tJL1GJopMelH0rNz03I4GPpBbXNsVWCtYSBLQBCtQ3MEGPExQ3PvQwkxq3MX6GD09Rnn6LVMi3IVcliZkPT1GFQY0PVtc800z9NNTDtz83N0GQKTbXPF6cu49RhMGZ/S9RmkmN/SKPTHc7Vz3Xx/04dyj0H/04dzW3O16YAz/U2rctYpoFK49YRY53JMmWAzx7k3c1ty4BgNMSdyy3PjTSdyl3LiGZNNq3Pd6Z+AzXNSfBT1b3L3c3TBWpNtcwKYbK1tcxNzChmLTatzIpn09P9y93MR6RBB83JR6bytbXNVcpWw9RjcwaaSIPKDcp7JoPPPcgqZIqwg81tzjXOz4+Ktq3Or6UB4sPLnc8YYfhUnc0NykVUsM14pBG15c9NybhgcM96BtXPwAQqAAAHMIAFgACAByoGQAdAAqAAiASrTaHmjyBPFnxR0oxgkHCRmxIEZ0iHeQVIhbRwzqCSj3zCcI5Ok0MUvaLYA7CUMIooAGEC4PFqAqxXWAYA0gQEtFKsABbgr8NrovOGYAXLMGAH7oHjyHnSYJfjzUiEE82GBhPNZgUTzQSXE87EjjqKhyYXZ+vmGnQYkFPIORZTzkQGYlNTz8+Q08jEktPKRFKvx1gD08ogBKAFC8vgBb3DC8tAAxgE0Ic8AbLHE82RA5PNXJc9olPPeeFTyvPIUNdIh5zEfzXTynSEi8yLygQGCrdYAW0yeGAlwGQALGOzzUiFoUZ55XPKdpRTzUSVS8zzz6Kgy8/zz0iEC8xeBt6JC8zryovK68vLyevL687ryBvN68wbz+vKG80byRvPG8gbyDwGLIMbzhvNm8mbz5vIm8hby5vMW8lbzlvLW8pbyNvNW8zbz1vK283bydvP287bzDvL28o7yDvOO8vbyRdhtEHG0K+XPvIoBkfDJ2WvA2Hjq6aEEU1iBeY9pQSz0AUBNSAFfoeh5ANFZpU7R7RRwlIEALPLtgLMdeuilAUgAHCTE8vCJMiFZpRkjaHiRFETyZPLzWfUUA8WS8+rz2ujS8prz1PK3bMES/EkSqTOJr7Uk89IhpPOHqG/ZmyFGqX0iOV3NFAKUsvI0QC2l+iVyIJNYMHnPIqkdrvPDxRqAQeX1IlRA2vIFsEIkWoCblBRAI1ka6SYk2uiQoqvlzeTa6KUi/JT5pEUjLSIcJWUAgSnvyOEpuVF//P/JoogxgGbzfPIK8zLyJ0Gy8/nzcvONAezztvLK8xgkSvP4ATDEeFOq8+TzavPc8hrz3/BagdTyOEBYQFry9fKC8g3y1vO185gsONiFHIRSyvJroCrzfPIeKK3ykvKTWFLyMfMa8hRB1POSKALyHSDd883gTwEDAaYBzSIUQPmkQQEyIbEi+aUCAa8BMiEZImXzMiAx2CUjtKQjWFNYQ6TsJPmlhfMyISXzMiFl87qgVZSB2JRBQdmxIvqBeJUYohXyhQDx89vztKVyIbSkqfLe8waAGfKaxRqBmfMagVnzGoGGgYeVOfMagXajBfO6oUXzuqHF87qhpfO6oeXzKvO6oe0UsvJ08/Xz4/ONAUHYnCJalXEkFfLzWFqUnCSy86HzXfPa8qvkUfLwQUPz0fLvFCPyHfMnofLzEbQegIoAbvNAhZyjGTke8h55nvNznePEFVK7aT7zBuJ+8yeg/vMnoAHyIlyB82DEhPKzxMHzaHkh82zyz/PbYQolZEEAkuOxLUOR8+ElUfJv8/Gi7/Pt87zz3GRx8qUjT2k7849peJQc82VBV/L0ANRAi/MGgHvyQMT78l3y6fNW5AfyEKOtHFnzBoDZ83uUigEn8urzz/N58gTJ1+Rn8v8AK/JqlMcIX/JzqZ3ye8htEZ0Q/inCkVKUnRTr89g8gQEb88zzuqBb8pbyEgDllPQA8fFf8/85bvLqIe7yiyO+VQMi2XN/8uqB3vPiUvHZvvL/DKcom2n+89IhAfPJARrpLPJgC3jy7Aps8tcpEAth89Pym2gR86zykfJc863y0fJwC0wl7/PwC80iC/O6oYgLuqC781IhyApJ880VqAuPaKkc6AquTJyVo/LWAxqBmAsagRnyh/JaxEfyOArH89nzuAsGgLnzWvNj8i/z7dMECzHzRoHwCsHYxAoX8oiB1gCl81Ig8/KBAOXzKAsV8+vybPK25VQKpiI18s7zTvMm89Sd+iTx2NRBvAohbYKp8/KbaIgLj2hICvQABJRoC4KAPvPoCvQBGSJL8/vycgsH8ooBh/P0ChKAigq4C9moHSlegPny3fK0C9sURAvqCsXyWoAl8lqAWgqBANoK5ApX88SBFAq183/9lfKyWLLzVfJFHHnyI6H6C9UAn/NH83QKTSn0CkIhDAtzIvgodgugDO6pzApzxSwKm2msChPFbAoh8sAKHAogCpwKbgpB81wKTPJRC5QKEArSne2svvJ8CqYKWxn7lZzzg/KwCqfzb/NCCvALmvMICqIK5gpiC0gK4gshJRzyD/OPaJILtAtoC49pe/LWCnXyBbiYCzYKigFyCqELTIHYC/YLdAsOCngKTgs38uPzf4FOC6oLGvNqCvg05/PEgRoLJAvuCmQKa/MSlBQLUiG6CvELegsgC/4LNfPvAZsYBbl66JAK4fN8C6YLYqg78pkKFgs9WZILuQpWCtIL1gqyCoUKfgyZ8/IK9gu/QSUKyQulCiUiy/MGgIQLlQpF8lqBrgqK8yvy7gsX81oLq/NSIDoK3gteCp0UFfIb8/kKWpSb88oLZgTlCqUj1AvO858BliX68iFsNAFB2aILKRQdC5YK5qmweMyUWAqgo3YLSal9Cump/QtKCqkLzgr6gVULxApalJfydQuxIhXz1/N182UKL/PkgB7Y+oFLCgnzu/J5C1YLqwq2C1gK6wqBCxsKJ/ObCurzWwtn88ML5/MxC8SAuwvkCnsK1/LTCzMLKYGzCocK2V2OIxkKywuaqSnzJwpB5GsKvQrFCgoKJQvnCjnzFwqT5IQKrgrXCyMKNwtjC7sLOgr7C7Tzfgu38oYKTvPy84ScK+TGCmHyEQuJCwCT6QuPCvQB5guvtcnyUgonC10LMgqKAbILhQu2CtgLbwobC8fyHwpsgKkKFQoF8moLLgvbC9UKq/PfCh4K4wvaC5fzOgqTC3sKlAu5UDILDQr/yAcLefPV8gELBgs18gWoCeQmClALzeUiCqCL8fNiChrsuQorC3kKnJUFCmijPQryCm8KfQs4CpsKcIt4CgQL8IqVCwiLVwrVC9cKNQpjCsiKrdPjCyiLEwr1Cr8LaIs+C3Xzvgr3CnLzqCmNCwYKpvIMALPzCwp9AAwAApX38zoKj/J0i+iKz/KYiv4LEvMpCuryQgtIqWkLTtE185doOvNm85CLhdWHlNnlk/LAiyYKIIt4iu0LTwsWCp0LhIovCpCL6fOnC2sLvQvrCmSKFwrkik4KFIuDCgiKH/NECiMKJApIi6QLHgoTC3UKpvLeClMKegvoi4yK+Ar+CliKAIomAH3kJSLaCyCK4IqSi0vz9fOEC/KL1Iq0iiiKXgr0i83UVfIzC/4LiQtepUcLYgoSixCLxIpFC9CLpIoOC2SLjgun8zHyXwtUit8KSop0i20UaIpd8tyK/wuN8lXVZECdFJyLkpVP8gkLdovlCjyLr/KpC7yKq+VU8hQ18vNQQIVAsllknekB+RUa6S3zLorc8sPzcAruiqPyN/N/CwKLzfOqIJEUHIreC46LUpRcis6KAYsv8zAKroq8igTdMfMj8x/zCwuf8tnyQQvf8ubEHvOMCvIK88RhChgKnnnhCokLRym/6QeV7ArM8yALnAqxC80K3AtxCkNRVwokoy0LwIr8CskLrGQpCuGLbfPD83yKfPMgimKKxwpZC5sYKAq18snylgvPCxCLGAo2CmaK0ItnCwoK/QsyipaKTIq38+UKcouXC7qK6gqIitSLioq7C2QKyorb8waKPgp3Co0KGoq68vR5RUD5pLiL4fJtC3HyJouZCwSKKfNSCqsK3QuCiyWKZwrSiucKsIpKCrKLAwv18lWLQwpXCjOo1oqKi6MLSIq1C7SLPwoGiiqLkwoMi3cKGIp+CioLmItzC4YKpDX1IkCLCQuQCi2Lj21tC62KHQtti+CKXQodijqKPQtmi6WK7wvdio4Kygrwi3KKlIvyi1aKOwqjC5oKNIpDi/qKtwtr8waLI4qGiwyKBblqi86KcwtSIOfR7wF//amLQIqJi7iLLYtmC6CL7QtgikWL7Yup8guLnYtSiqSL0ooWiuWLy4uVihWULguri9WK3wt6ijaK+oqeCqiLW4u2i/WKXfK7i6GK1At7iobzx4tFQZ8UpDR0eUVBRgqbadkKqAsxC0VBc/IiikeKXfMQC6KKs4uvtbuLAgpD866KEYrCCukKp4oQi/OL7e2Si1CKXYoXit2LigrLi3CLV4pDC5SL/YtripoKpAq1i7ULm4vDipXzUwpjis+KGQCf85CVByPsQIUByqgdKHydaHl+80HyslkcC4HyWorfi9OLwfPsqOmKA/J5i7+KnCMR88kLPopt876KaQt+i7mKQErzimeKgQHiC67FSfLUQCWL48Qki0UKC1kXi2WLsIvlixgKgwpVi3+LVYpVClSKUEu3i9BLQ4swSroKo4twS8yKhgr0eNwABJXNi60KM4qtik8K+Ypzi50LKwqESsSLJEqLi12KZYvvCj2KFEoQSvKK1YvUS4iKg4p3i7WLNot1iiOLD4pwSmqKRopUSo2L/wrzCn4lxEvdCiuLVEsYokiK/EqwS/ULhor6CliKxovb8thKbEpEiy8KUouvCmRKYEqlCx8Llosa8muLGgp3izBK24voi7uLmABegZrpB4tTiq0KSQtYSyxKBIvaiqaKwEvsSq8LJIvyS5xLS4oDCqoLFIvXizxLkEu8S+uLg4tKi/xKW4sCSg2Kj4pCSvoKwkoTiyLyY5TcAQqUmiFPI2pLgIofioeK04rMS5pLx4tiix0KhItFijpKJEq6S6RLxQswi2BL+korin2KkEoaCjWKfEq0SpuLngt0SyqK9ErmSo0KFkvPiibyve37lHKK4krrinvJEkteSo+LaorSSyYLxopaS5kL2kpniueK8kouSjKL5ErKClWLSkvXC8pLngsqS/6K44vd8vnzUQHNIkQLeouBS14LQUpGi8FLZEEhS/ZK+YphSvvy4Uu6ShFKl4qRSlsK14rbCrxK0Us3CjFLtoqqS6GL8vPOKd+UEkowS4lKcErBSlvz0koZCylLJouOS2FKHEqlipxKS4quSopLK4o38VFL1ovZSygLMUv7C7lKvwD55NRABUr1ioVLSUpFSiFKMkqhS8sLJUppS6VKoEp6SuVLCks9ixVKWUpGStlKPwoqSzlKsUqzCwcLjYuFyS9pGYsiiniKZgrFS/iKbYraSs1K+QvASlCKpErmi2RKXErgS+SKlEuZSnPyN4tZSreLNYo/C4FKXkuoimZLgkq+C0JLT4oMSj8AQ+UmJQVKeguFS3uLRUr4imCLxwsES81KzkojSgpLFouRSuNKCotfCnOp0UrVSl1KNUuxSvaLjYpBKdCoSUtSSw1LyUuNS8VLoUuDSqcLIEvniq1LLkptS+WKUUs3i5tLVUq189VKfwo7SwGLu0palfVK+0pLSo1L/UvLSrJLEotpS85KMIsRS1xL60ufC2dLOwqdSjlKDYq5S5dLxynYgfaApSINSzdKB0u3SieKK0tsSqtLckrpSw9KGUuPSplLT0sTSudKL0tbSq9LXUv3C91KRIGQFdvzH0pN859Ky0tfS3dLpootS8dL6UrkS39KlwobS5VLAMs0i51KQMvbSt1LgvIgy3WlLSOgyyApYMt5iiVLp4o/SsdL4Uu/S1DLo0qfClaKz0obi9vzL0sNC69L8MpxSxEpwfOLSmDKAkvIy4dLKMr5C/dKa0t6S+VLbUpnSgDLz0uwy1jLf/3YysDKCMt6CvoAgdn7SvjLMkupSoTKkMpoy+aK6Mv6SiTKHUpVSoDKF0rbSpdKOMr/CxTLeujJS1TKTUrPCwTLR0vDS4uLJ0rrSv9LGMsky5jLJkreSnaLNUpEgI6AI1isyodLTUtsynJLqMq/S7TKo0t0yjDKmMvGS9zLF0pj80zKV0qOgVvypkv4ygLLQEqlS6tKHMqPS+jLikqVSyLKW0qMy3DKTMvkynFKh+EKJZLKbMtSyqjL7MtlSxzLl4ucykpLcsvnSraKCstiyorKzMpKylqU1MpHSoLKqsugS0TKp0pPSlzL9Mqwy50QcMrYy0DLTIsBikrKx4oDSlLLK0o0y9LLqssyy8LL/0qGyqTKRspky78KWsomy+KowakSqAWoY7G9S9+K9kpmyyeL4oq6y2eLNMpCyyNK+koVSm5KG0t9ixtKA4tuCsZLfEowStNKD4ozS6qKs0vmSnNLwks18g6Ltwqgi5tKT/N181yKc0q4S4ILAEq5in8N9vJKC/wBAyKdyFNYwou2SxpKoor9SuDKDkusS9TLRItOSz9KD0tCym7LbUruyxBKE0tWywFLNQomSsOLXkrbi2ZLvss+S37KE4uCi/wB74vsAcKLh4vTi47Kd0qxy87LQ0sLimVLesutSpzKY0u9i+7K7ksKi57K0EpTSt7L94umSw0LacqMi7NKb0rwSgYLJvO1yLUBMQFnlYipy6hmodtg/ijaimgLectiSh7LCUt1SiqLe0sNilTKkss6ywLK+cstSlDKwsoVSvTL7koMy6TLgMrGyvDLWssCik7ypvN7gAUBl9BRyWmAhUHpAAHLHIrRSkHKBbjBypXK2Yq+i6kKfIr4SmHLGov+ATFx4vMxIq/yY8puixGL8otNI8bLFYtvSvgA1qFcoiB5zRXDQDHYb4o+PO+KqEsoCm/ZC6htEQ7L04shim2lzEumyrnKVEohy7AKocvjy80iBEvfSkNLOkrxykTLBctqy4XKzgtFy0nLncsDil7Knkr3i3SKzcvXSi3LvkoiSxfLE8uXywsL3/hZyg7LTEqaSr+LrMriio5Kbct5y4TKMsp/SrLKBkrtS+NLhkvHyiXKKcvIi6fLyovvyGnLM0oVyn7Ko8r+ytiKbIvO0SIAL4vhqe/J3rUDIt/y7vIRfQaUnvNMCtkk//IsCwALEQpJi0AKyAHACgTyoApcC+pLGEvgCzwKCQrrysxK0AoCC6PLuEtjy26L0vOx87fL/MsJ8kRLhdjESw5K7YoqykNL6Ir7y4LL8cuuysTKFEpUS9xKq4ovy8XLycrcy3eKdYqmS7BKi0pIy1iLtAAJUDtoAhCTWCPAJySxiyEKf/NAK2ELD9kJioAKbAtJi1ELyYoxCyMLNksM8r6TaYqh81ArN8tQCjhLWYrbygBKPPOhyiIL0crKysgLWQsFi0grucv3yqgrccpoKgfKassZS3gLGCtjSknKWCqbSq/L2CtTSmXLuCoNCnjKVcpqSx6BQoq2ShpKmYtHil9LMcqDS/fLqCp6yidKlstuypgqhkrUSsnLUEuvyjgr3MupyoJKvsqfy+nKX8sWS1fLbjBMS+hLdkoIKk7Ld8vIKubKccvdCw/LFsuPy65L4iqF8sfLWCuSKjwrpcpny+/KMioNCj5LGIoZyhfL8vLnqL0B8vOJNJNZkcuCKn1LQioxyqxKIiooKioqnYsuy2gra0qHy7KLnCo8SxIrL8rYKqLLUiqpy9NK5csfyzuLFcriynuL8EvO8+6DByOVuEhKdAupyYeUACs/87GKoQtxi17yQ0oJiiArdoGAC5ELyErRCuArKYpUK2AL3ArxClArG8rQKkkKMCs4StPLsCozyoBL8CuMKzJLhErMKhIKOQrIK3OKe8vSC2nybCuiK+3LCcoYKnNK6ivPylYrGis0SqXLtEvey2fKeCo3Sw4qPfLBqNqB9srZynZKt8shKnfL4SoQyk5LKitmKuwrYiqJyrEqAUseyjRLk0s0izwrWit4ldoq6Irpyroqcip6K9IA3oAx2IQqCgvyAUQqjAvEKkAq8YoeKgAK1yVkKpEL5CpgK94rVAs+KyvK1CqYSjQr/iq0K5mLh5V0KkErIcoMKzvKxipMK/mKpPNESxIL6SuxymnzdfKiKxxKBcvsKtDKZQsxKpYrmCpxKtwq1iteygkqvCuSSlQL58tJKlELgIEDIlOKASrRyzOK6SssKqYrHYogS1EraModytkrPSoSKsMKkirxKnkqWirvy/krPso6KoUrY4v2K5XK+Cs18oaoBMguKgoKwQsAKr/yTAuhC+4r//InC7soVSqgKn4qJKJBgD4rMQq+KmmLdSvxC/UrCisBKnQr2tT0K+GKzSrwK7mLiiq5yony2QqryzkKyisRKh0qBQpRK50qYipqK27KnCpFylwrvSqey30qp8s4KpJK9Et8KvgquQrWiisrQQodKasqbiokKhUqGypWCpsrICsoS3EK2ypoS+AqqYpTipAqPAvYFTQr+yu0K/wLgSthi9PKO8rHKggKJyvgy6EqBYthKp+LYyvKKhcrzeSXK/nKVyp0ytcqPSo3K5Yr0ytWKpor1it5KnMqDyt4K5fLCoAAAGyQAAABTfCqAAFt4ADAAVABQAFgAAAAneAAAADsAAGdCKtgAAABLCAB6KugAAABXeirWKtgAAAByVAAcABAAAABRAAAlMSqAAHkxKugAMSqRKoAAZQAATQAAOQAAYVQAcgAQAAAAGQAABQAAQTkq5SrUABaAEAAxKv0qwyrUAE0AbSr5KoAAITEqvSrVKoAAaREqgAAVVABGAFMq2yr7Kqcq1yrUABKAEAAAABFJKrcqlABDABAAAABJNSrUAB4AQKqRKvUqlAAlABAAAAAxcKqRKq0qgKroAHkqtKq4qpcq6SrUABkAEAAAAFVlKoMqxSqNKuEqlyrwqoAAWQUqjSrNKoCq8KqAADUNKpMqqqrJKoCqjSqrKp0qrSrCqvkqjSqPKqqqyKreqo0q/yqtKvkqgAAJcKqkqpCqgmhPKsmq6aqNKpiqgABxESqAAEVCqr0qsaqNKsSqrSq1qo2qraqUAFtgEAAlqpcq8aq9KqMqlAAdkG0q06rzquMqzSrlKr2qzaq+qsuqkyrHqoOq1IAQABsq8KqXKvOqjqrLqo8qgAANPKrLqv8qr6rcqrEq4yqwqq0q36rjKpiqrSqgaohqy6qdquBqyOAQAHWqhSrKqskqi6qY4BAAVSrJKq0qrGrLKs0qvSr5Kvkq8Kqlquxq1qrCqq0q6AASarJqimrLKqsqhqrGqtpq0mryauxqjyruqt6q1mr6auxq/yrBquUq7mq6avZqyyqwqraqjKrhaoZqlABloBAAaSqeapFq6WrEqoRq+WqpavYwUyryavGqlyqVaouqnaBtKpEq6artavcq4mrlKolqtmqpavbgXGrJKqqqqqq9KvcqqyqUqrSqjKqsqt2q1SrMap1qjyqXKsUqnSqRKugAEqqaqvcq/yq8auUq+SqQqrHgT6rJKvxq9yqYqqSqgmq9KtDqxKqgqsKqmyrdqvcqgqrIqpCqn6AiqvTqvyrNKrsqkSq9KscqvyqTKqDqyqrBapEqvyqmaskqvyqPKrSqrKq/Kv8qpKrgavXgCKqkqr8qmKqGqvkq1SqDKr+q+YhTKtcqwqqxKouqg+AQAHkqgAB1b6rVKvGq1AAAQFxqkmry6tCq+qr9ar0q6mqQqovgEeqk6qkqwqrS6vnq6+BPqsaquKriAGnqjyqbKv3q1SrRAGnq0GrT6voAaeqwqqaqg+rp6piqu+qz6unqxKqn6uvq0KqCqsKq0+rD6pQAEUAiqtPq8+rf6s0qr+q4qvfqlmAQAG/q6KqrKoAa6KqPKqvq6Kr+arjqn+raYBAAG2qXKsAa1BBUGrjqsBrEqtUqkSrlKpcqqSrwqr+q8MAIqouq5qBZaq3q1ABnwDIaySqqGoSqkyriqqmq6Sqqquoarqq46snq6hqPKvkqvSqqqu6q+erqEE+qwqqkqqSq8SrqGrCqiaqDKpEqv6rRoEtq8arxKvwakKqWEAga/Gq46vCqlOqEqoKquSqQ6rEq8KrXavyq4Sq5Kr0qoKrlKq0qsqqUAHmgEABR6t0alyqRKqxqsxr8qpMqgKrIGosapmqYGosajyrnGtAa/Kr/KoCqtBqf6vlgQKq0GsAas5Agmuwa/KrEquUqySrvarEq+Srvatdqu+r8qoKqmOq46vKq4Sr5Kraq4Kqp6sOqk6BtKr0qxSq6GpmqvaAsGpcq4gAAap/q8/gSmrKawBrySCqagGr36sPwEprRAHKa8qqxarjq5pqamswoJpr6mvKqxKq0GvoAFpqcmoKq/pqAapqarKASmoGahpqZYDCa0prBmr+wGZrqmrqqpmr/Gp6aw6rWWBma5pqKmuBwDZrRmrqqsKq/Gvaa1ZqiaBmagZqtmoTqkZqxmoKqg5qXKsmalqrhKrjqq2q9GugAQqrs6sOq6gAR6t4a/hqxKtwAP6rpSA+avhrdqrEq4gBfmo+qnhqAWvEq0QAQWu4az5rAWtUqpOr56rUYf5qvmp+ayRqgqtHqlqqJGpha8SrgWtRaySr0WreamKqwWq+auFqbKoUqs6q0WpaqxKqiWsBan5qDKvsq8xqOaCRawFrgWrpa/JrOqvSarFrvmoCq1lrFKtxa/Fr4CCZa7FruWokq/Jq+Ws6qkyrwqupa8Sqfms6qqyrJWs5a4FrOqo8q+VrwWrEqyFrOqv8qlVriWvhazqrb6qlarlqeWs6qx+r9WpZakVqGWpYwIqr9Wplaw6q1at6qhVrfmt1qu1rVWvVaw6qW4EtazlqSWoRai2qnWuRa4Vr6Wv6qqyqfWuZav1q2Wtda6FrVWuBauSr9Gtda/yqTWoCqqNqXKrFa11q9WvtahNr+qpiqoNqhWrTa11qqWs5amyrhGtEaxGqlSAiq/Vr82pEasRrDqszqzNqxKrLawtqRqs0q/VrPWsNaytqTKsba+FqeWqTa0TgS2o9a9tqzWpGqjyrq2qbavtrK2tja+1qqqueq+yhu2ojavxqJ2q3gd1rp2vHakarc2oXanhrh2uHyKdqvmuBa8drm2rdoedrN2pnandqUYAiqm2qVqutahrQIquqqvSrT2t+a3eqXmpPakSqz2pxAY9qr2pEqxVrDqvJAC9r72rfa/PQs6q/am9rH6vval1rZgU/al9qgOt/gX9rQOt+av+rL2pWqyNqcqsWqzSrwqpg619r42vg6w6rwGrval9q4Ouja3Jpn2pWqz1rFquVa5DqCOvQ6/yrMOvw6nVr0Otvq+9ra2ora3woQOpWq2jqi2owQCDrGOoLaujrSGuQ62lq12ooapDr72u46/1rDqpoa8jqH2pDahlqGoDw6lDqd2oGgBjqpOp46gdrkOtNawTr/eEk6odrlOp0QWTq1OtDamuhWOriq3tr1Otfqv9rF2qE6tOrFOpnajSqaIF06rdqJ2ssaszrt2rXaniBZOus6ndroYCs6g9qHOu4awhrCqpw69yAVGuIaizqwqtHqyaqNGtWGMhrGqoMq8Krzqpmq1WAQAB0qqNrJWoRah6BYuvi6smrCasuq86AQAEmqparxqugAOLq4qsla8Kq0upCIVBrpGvCqwqqqqty6lLrCuouqrYxtKrxayrr8utS6mrq2YAiqv6r59GSq2OqXKqDqkOqouuMqu4gyGq66rGqeuoIavrqwqpeaghruup+qkbr0upiqmyqI6q0qybreuvS6hOq6GuTquKqhuqm6kKqhyhHqwhqtKu+qu6rhKtMau6rNKtHq56r1Su0quyqHKvnq8HZTKsu6vBq7qo8qqJqtuu2akSqAap0qu6qwqrBqyKrmqsuqz/BLautqxRq7qqpakSrBqruqgqqiKoAAD1gAIiqaKvoq+AB8KugAAAATIirioEIquiq2Ko4q4yqrqtoqhirmKvgADHrOKp4qviqses0qgAAzHirSoHYqziqwABoqxjzGPIAATzAAIiqsepMq4qAIAFIqyAAeKsR66ABGKoQAaHrSKqIq+iqyoHoq5jz6KqIqgAB3Hnq2eqZ6rHqrKvJ6+irKeo4qpHqiKtJ61ireKoJ6rHqPKuR61Hr4AHR6qnqsev8qyHqaeqIqxirGKv16l6qwqoAAKy4qjnqeer56oiqBeqF6rHqYqrZ6+irEer4qqnqoAFgALHrEqtJ6iAAaKugAGiqTerKgXnr8eod6wXrvepeqgqrXevd6jXrLqpxqo3qg+tN6qnq7erD6x3rI+rYeEABterR6/HqU+tD6/nqI+uMqvHAQAD96gPq1er4q1PqC+qd6+PqrKvz68PqheugAEXrG+ol6qXqoAGZ6+PqPKrr69Pqi+v8qviqYetz6pXqu+sL6+PqwquKgeABGKqIq6ABCKsQAEiqi+piqofqG+vwq1ireeqL6xKrGKvF6virioAAAC0r6+vqyoCX6lfr4+oKq9frN+p36hfqM+t1q8nr8Kvwq+nqeeqZ64qBWKtV6oiruetgARnr2+rQxEABy+rYq+HrWKoAALxh64yqLaon6/CqUeoJ6wPrg+t367vr/qtr6kirQBrz6+3qoBqhCkAAzeo56kAbIBuH6/QKQADZ6jnqIAC569Abq+t0Cz/r1etYqn/r/+oD6g/qL+piq8fqzero8+ir0+ugARPqTerN6zHr/qsSq43qH+uYGziqAAEcuKp/6p/qaKsAGgqrX+qZ6xvr4AAF64yrM6uEGyfq4eoF6qfrl+oz6mYBkBqY8uiq6PMn6nga+BtYqgAaQapMqwir6etwGsqB1BqX6/gaJBqsqtXroepoqyAAWKpT6wwbH+s0GgQaQao8qtXqAADddepIGhvqbBuMGkGr/KvYG5fq1Bt4Gowa7BokGsKqzevoqujy0BqkG6AAPBsCGkGqYqoiGqIatBsjCrAaOKtD6hvrGBuT6lgb64pAAXQb9BsiG/wbbBph66ABWKsR6yGrhKuyGriqDBryG/gbChu56igbIas0qiIbGKvv6/Ib7Bt88oqAaKroq2/rGhpR65obIatr6tXqwhsn67PrdeoH6+irIascG9Xrlep169Hr/erkGw/rIAvAAYYaBevMGuAA3+rv67obPBrK8hYa6KqWGgoahhumGloayYC2GsQaiKuWGvYaRhshq33qKerAGrfqiKvgAZHqDhoKq+XrFes4qm4a7hoKGjfrYAB36sABFhpOGmHrGKthq4SqnhrAGs4blBthqzSqihtmGjPrwGqBGlPqaerp6iIbIABgARirpevf6kGAlBpoqrirSoEmGnPqwBtqGy6qfQHRGzEaQ+qaGjYarQEJGrEaQRv962GrghtoqokbsRuGG5QbIRthq+fraRopGlHqcRvN68csQAAaGkka7Bsb6jirdeo6G2Gro+o4q2Pqqevh6hgaIeuN69IbRhqRq4SrqBtYq2gb6Brb6/YbjKpoanirdetv6tIbOBrVGnQaIADo81iqx+oR6mYbtRs5GmTr8Kv1Gw0aJRoh6k0apRqT6nUakao8qi0aDRqNG6AAGKu5600aMhsEatXrUeq4qs3qnBsn620bpRodGvnyQAEh630b/RsDGgPrPRtlG7qKioDd6yUbgxrNGxKqiKpsG1/rExvtGs0aCqqD6hHqYxuMqyzrGKq36x/qyoDzGy6rLGruGsUaAxozGpgbORsc60iquKvwqtiqwACX6sfq2KqrG0saJiJAADUaaKtv6lUb8eqpGssaPKsgAXnrVeoh66saZRvzG/yqYRqV6oob8xrCq6cbOKqNGhHrXhvuG/MaYqoXG6AAlxugAFcb3hr4qr4afhvMG/4ayxsuGhXqwBq3GncaA+qb674btht+GmiqjxtUikvqrhpT6rcbVBrF6mirDRssqjLqNxq3GmYalhq36iABihulq3Jrvxvh6/CrPxpMqswaiKtUG6Ma7RprGlgaCyPAAd8byKp7G8caHRuCgEvrNBvwq7nrgBrgG+Cb+upcGmCaaes/GsKqzBtd6lIbI+uAorsbSJuSGhABq+pvCkvqLRvx6sibaJoom79AQAEQACAAIAHwq5iaGKoom8ZqAABIiatwAAABfbAAshuIq/CqjxrQAbka6KqYqqwaleqJ6gSqQADEm8SqpKpkq7RqVKvUqsSbdKqkaoyqxJrMq3SblJusqu7rnKrcq/SavKocq0yajJqCqsyayGq0m2Kr7Jodq9KrMquyq12q8qrEm4qrSqqMmyqqaqr6qsSbmaqMm8WqjJq5qvybUGqGq0Kaxqvmq2ybYmqimoyaVqvWqp6qjJt2qhKatqrEmk6qzqr0m66qMpqMmh6qUptCmt6rQprBqmGqxJoRqoyawavcmvJqTaqSm0qbtJoqm9GqQ6uq6oya8aoJqzKbJasymqqrqasNq/yamqq6m2Lqeqvkq3qaBaqFqs2r2pvaq3qa5aramoyblasmm/SaNaq1qmaa9aoNqhabfqt6mvGrrattqsSanJqdq1ya3au8mr2qfar9q8uqxJsm6sqb5uqMmmOrJKtSa/ybVupTqsSbs6o8m+6bPqqMawurjpqxq0urCqqOmwKqq6pUmsarPpsbqiGq7ptbq7qbO6u7qoya5KpcqgerMprHqieqp6uOmuerrJqXqleqjJvkqjerCmsiqz6aT6vvqsSbMZufq7Gb4GrumyBqCZriq8+qiZtUq6+qPJsJm/+riZqMmkBqyZqMmymaYGrEm/GaqmsCm9prWZpuapqbFGqIajqq7psymwpqjJsiq/maPJuUq5hqxKtYasSb9Kq662GbBWrKm9jqAZpHqs6q5Kp5muRqFGpG6pmbVGsqq26a+6p0avRropvzqkxqHGrEm6xrvqrsa0xqyqv8mymavGtxmwKrmZuuaw+r/JuCa6yb+mpym6JrxKrianKrEms2m6GrbJoyaiOrTqqSm/JqhZrqa+2a6mpJmupryZu6akObgmt2asSbo5ojmkZqo5uwamOaJmp6ah2akGpaatObZmrDmu2bU5p2akObrmo6ap2bDmojm65rTmqLmm5rk5tLm3OaHmsGq1Srnmsemq1rlZrja5GbOWvVasSa22tJalubVWpRa8lq8Wq7m/dqxWvbmntrSWsHmwVqDWr7aoebp2sNayebfWo7a3ub0Wpnm4Nq55uMavua7psbmgWbm5rXm1ublZq1a2FqdWq3m7uaxOo3m+1rp5r3amlrlZuraxVqPJv1atuaz5vEqgjrr5s5agTq2WsfmqeaJ5rHm7DqfZtTanKrR5t3mrNr4Otfm/dq02sXm8SqmOuPm1VqwFsAWwFrIFrHmrTrzZtgW/TrRWvnm8BbtWtJa0+bB2sQW+Ba42sXag+b92pwWu+agWvM6kBbCFvs6/1rcFuDa0haX5oIW5zr35q46nea6Fppmhha7pr/agWazOsYWlhbmFsg61hbAOovm5Drb5rM64BanOtQ6/RqHpr/awRbiOv3mzTrJFpE6h+bJOpgWvjqX2pgWkTr5Fv46o+a7proW9BaNFtoWv9rT5oUW2Dq1Frc63Rb72rgW7haX2pMW0RazFswWgWajOtCmvRaUOvwWkTrrOusWrDr3OrIWoRbKFvgWxxbXFqoWnRrvOtsmxqrJKv86o2bgus+m77qIut66iWaUus+mvLrVKoK6wmqxJqy6nLqYlriW9qbSuvK6hrrYlqa6pKb6uuSWrJa7puVmi6aOGo26iJaBusW6tWas6om64pbylrm6/GqyltsmxOq1urqW5Gbduv26sSajuqNmiKa7us+mmtrvKs+mp7qjJte697rsZu+q77qmpqtqmqrylqyq0HqxJsh68wa4eoR6kEb9erEmnHq5JpGG7ir1eqMmjca4RqY8qQajJuwGznqExvP6/kbm+sl65Ea2+s2Wp8aleuR61XriBsx6sSbFlruWsMbYJonGsSbrett68/q9ltFGj3qOKq96zZaZhqT6kPqEBsL6sSaY+u+W0YaZlueWzgb8Bu96+5b2RoZG+Aa0+uBWkvqZhq/66FajJqOWpvqxetOWlEb0VqBWp3qxJr76vXrB+rxWmFasBvH6yfrp+tn6sSajltqG6laPhu366FamRrpW0/q0VrEmq/qb+rWGh/qn+pf6t/qjJq/6kgal+rIG9FbYBueG8AbeetZW5AaRVrAGj5bqVtYq1AbJ+plWpIacBrwGxVb+VtIGgobaVqKgZPqlRoj61CallsQm7oaoVviGgQblltWGmQbmetNWkQbzVqZWpQb/evgAVQbcho0GgAaxJrKGioanVpNWogbzBssGtZbjVr5W+iqCJrcGt1aAhudWg1aOBr8G91b0Vv6G8IbVht9Wy1bw1uDWj1aeJtSGyFb9VtdWx1aE1uqGoya01uNW6oabVp5G9YbAhrEmwUb4AE6G3kaQ1pCGgYb6RqJW8FaiBor6ykbyBvkGoybrxuOG5Yb81q5Wwtajhp2GgPr61qbWg8bdhrhW6taLltPGlPqLxqHW0VaLxugAD4b9xpvGw8ax1uBGgdb+xo9WiEbNVq2W2nqdltWGxEbW+pl66lbWRrKgB5bOKs1W3nqMRqxGrob21vLW3daq1sXW3Fbj1r3WhdbGRsPWi9b91qMmttbmhv5GuHr2hpLWz5a3erBWiUa8xqLW7Va6Bt1WvsbQRrEm7satRpTWx5bnRqtG40bCJszGyDbLRtdGm0bYNrgmmtaoNtdG90a9VseWn0b8Kr9G1iqqxqDGuDaa1vDGnDbIxugAAjaUNqMmjDa/1rDGtMbwNqTGx5acxsw2mtbCxuLGpjbKNsR6ysbJ+uo2+sbGxtYq5sarRrbGrjaINprWsDayNqZ61UaxJuHG2ABRxrY2tlbLls4q2ca5NuHWpXrzxtuG1calNtFW1Ta3hoD6qdboAGbWrtb/ho02s8bQJu3GtTaChqvGvta7xrnW58aTNtfGmHqPxqM2mzbr+rI2gPq/xoAm6zaVNtAmv1boeugm2TbEJrlWzUa/Nqf6rCaeeqlW/VaCJozG7zak1tJWrirqJqYqlibNlsYm2ABotqMmjiauJpS2sSbBJsKgGHraeoD6xir6etIqjiawJsOqmZaIAFJ6nnqCtqK2oSaxJvF6osboesaGkqBJ+qY8gABrQXrUACTQLPqVepKgMqAEAFY8tAAk0AG23tBBtv7QYbbRtqG28baRtom2sbbJtpm26ba5tqm2hbbZtsW2+balttW2lbb1tuW2zba1tq22jbbttr223baDtp22o7b9tuO2w7aTtvO2s7bLttO267aLtpu2q7bbtoe2+7antru2l7bHtte257a3ts+2j7bvtve237avtr+2n7b/tqB2wHaQdoB2sHbgdvB20HaIduh2qHbYdsh2+HaYdoR2n7bCoDhGxHqiRqp6qSbQAHwqrfqjxuEqmiqcdsqgLipCoDZ65HrUABAAAABScnaAAAIAAF4qdvJ23AAAAG4QAFEm0ABZxpK2kAB8dqkmjgACKqIqgMbituEqknb2+pAAaABMACzWgnaXqpEm7AA2dsAmkyqudsJ29xkOKiyGvnbZ+pQAQXaAJuF20XbxdvvGsgBWds/6wCarKvl29AAdStsAZXb+dqEqkFaNdrJ26ABcAG12zXq9dvZ2jyqjdqoAAYAzdtV29XbSdpQAEXaQ5ux2nXbMAAd2wCb/Kud26bFedvN2tXbLds9273a7dpeq/3bpdv126eqxJud22tpB6BdWlXaBdoj2zXaw5t9253qA9uiqxPaJdrQAMkiMijd29Pakhsj26AAs9ol2r7zc9oSq/PapJp7yFPaS9ot2svbM9uj26va49vZ27MaC9px2AYJQ9vd2jPbrdsr2nXauABr28Zqk9oRuPvbS9qF2wfa29v4AUfbNKuD24CTi9pAGsPaPds12iObs9qj60fa5doL2kkLSKkcqVPbV9oH2r3boAA32qvbxIFH2w3bd9qyqQ/b+9pb263ajAFn2hQBR9qd2gvbJ9ub26faT9sf2l1bz9uf2jvbAJu2a4PaSqlv2qfardpP2/QA29o0AUfawqqAOwQAm9vD2+/bwDsgO0QBR9piq53bSHkZC3MjXdpX2u/bP9pF2rgBIDv0AUfbEqqT2mgKMDpRC7hR39oQOvA7oAAIOn/b7xoMAUfau9vr25nJs4sjgLA6qDrX263a6DqyGqvbGDv/2vrq69sqgcKRTQqoO7ZqaDoUASA6R9oEO37qhDvQACeo2AHgO8Q6wDpF2yQ76Drn6mvapQE52t/aQDo/2lQ7oACkASA6pAE0Oq/budvxFeA6uDpP2ww71DqP6zQ7X9qkm50R3AsgBNPFsDrT2vQ7y9rigNva3AE0OoPbd9oP2iw7j9pF26WBIDtj2mXbIarkO9EBD6npOGGpdDvfawI6bdtt2mw7oIs0OtA7r9rpAU9owgACOxA6gjp92qvb/AE0Okg60js4O+I6NYC8OlA6ZDtRqpPaWo1sqYULijuyOm3ah9sAG+gAa9pxq4PbG9pwO0A6PDrP2hg6pdrCO6WqF9r8O3vbYjssOoI7ujqL63o749ulqnfazDsyOjo73Ds12w2BIDr/2vo6dAG0Osw6e2lmOtw7qDv0OxY6kjqFQFo77DsJ25sY9YDqOmg6TYFn28o6Vjt8O7nbmxlxFVw6j9vqO846kjr0AFo6YDr8O03a5ju2Ojw6eDs32qgKWjtSO7naKamGOko6fjr4O5o6ZDotato7liNOOnY61Dt4O+8b8gBaO5g6jjtzIw4kYTo8OuE7fjsROmQ7datgO9E6FjusO+E7ABqMAGva3WqAOxQ7PjpGOm3bCTqxOkk6cTumOwna8aiyOs46aTryOuk6+juCANY7GTucAZk6djtZOhE72TsmOhVAuTuN2rapgTseO/k7iTtJO647Cds4g3k6PDslO/6rBTsd2t47udq8qcU6WTq8O5U7AJuJQEU6ggBpAeU7NdpYASA7tTvcqwo7ATs2Oh46aDuNOvY7TTpQAV6A9TpD2jU79DrIASA7iABr2zOrg9piOw07rdtIALw7pDr6OxQavTqryZCKxDpd6l07cjoROgM7Jjo2AR07hamdO8va9AC8O906ZDozgR06zQooI/E7fTsaO/6qUzsDOw47jdozO1sYTjoTOo06czuQij06ZTuN20ejSzt9OsY7/quMO1M7VTsJ2jOdazpP2ooAvDsbOwM6ATpbOj46tjqpOjs6kjqGAD07zTsJ2v/kfTvbO7/aiTpBqiY72duHq4PbvDP58sM74jvWANvbJgBr2merndsZqNs7vdogOpI75gA3OgY6pJsUgLM72zr3O6c6j9g3Ohk70ABKKCc7dzrXOvM7Jjt3q53b6ih3O6AAgQAfOjc6CztMZZfb+zpXO887fjoPOmQ6P2pfO+47cDpdOgC6q9qAuvo7iYD1Ox3S7zvfOyC77xugup86ezpvOvs6rToguz87gLtHOm86DTspO/87sLpgu5E6bzo8ABC6Pzv3Ox872dr/ql868zHIupC6JBqouwCbGYDgu387MLsTOhi7tBpr28BrndsBpN86KLovOlC7qLtMOyqAZ6Pouoi7JjoJG3i64DoIu+o6BLsAupi6EGoiO1epxLsou7i7mzvkOrQp6ugwu8C6OLoku6i60LtWAU87vdtBO5C7ozuou3C6jLv4u0y6JBvMu5i6SLrmAHS7OjqNOmy6Yhpr2ihqvTrYu3S6XLrXOuy7qGqPOsc6wLucu307XLqeAdy7rzrmAS07vLpCu3y73LpEu43aE6nIu0K6XgHcu786ngGMu987MTqgu5Y7JjsEahc7RfIyuv8A1zpyu9naNOvQO2eh+LsVOtTz3LsMulMo3ztMgNvbfgHcuyy6EykxIry7ittmqmg6GrqSOpq6ZDrIgOC6yLtkurq6xdp6u0I7Jjss64PaO6gQu2KBGrtnOwCbLGsmu5agHguXO+o6Zrp6uua7HGoiO5rBsSI4gaa7IzpMGmvbXOvQOms7prvLOoGBDru/OkOAMro0ANc7wTr6O3zreLvau+Y7B9rOuu67xro0u4yjNSnqu+s7kQEOu2q7p6mmuqc6sTo2uixqWrpzqAG6hrv0OwuAvDpBupLqvTopOv87Vrs4u5QLR9oy6+G7TSmuu5G6sQFRugK7jdu+qPSLojpkurY7OrqhurG63rvZ25rA4zshClS7IbvL2gwBGrvJugA6WuvRu1q6sgrEO0frSboZu1G60rr3qeq7QrtJAVG6qzv+AFPI6rumu/m67TsewR07KQAvyA8BrrvFu1G7/rpFuh55l2kSIIm6w9pJuum75bpkOl7ApbqVuwkBVbvZu+I77AEauiW62JsmutW7orpP2oVBGrqIO7W6x9t328G7BrsRurq6qrrZAefbcbp5Aa67XbpKugA7pkEdO8G78LuduqG7vbvn2+K7/gEDu9i7M9pDuu26ebrtyDK63AEauvy61mqFurXzlbqcu566T9oTunq6k7tgwKm6uSXjuxI6LzsJgefb/rpFIui7abvX2/a78RrGuim7UUEdO9gpUiHLu4m7wzvL2voA29sFAefaHLuES+O7yzrFAbfa8dt32wUAe7vbukG7KaHru3a6K7ut23uBZ9sUut5qIrtMIoK6M7pF24oB27tnuhHB67pkKUW7J7szuoG6q9plAbfa0rpBgWio3zvyAWfaJbsNAXW6c2nju5G71gG32j670YpFIlWRr7rPu7fbarpzqB54BYrcM4+6ELtPu547z7rBu9NZP7vjHOrp2jqDu1u6b7vPuru737ukcoGLG+jq6e/JQHsjuqe6IHsv2ge7udrMop66vjvX2lB7tbvjgf27AHsweqk7f7ovO2+7cHoiut8KwyKfuk+6cHr6OuShHTrNkn+7QrpNAS/bLrtZKGB6fQE/KeO6srvvG80BL9qFu0glwdlgeks6f7u4e2GqJbpLgR07IoHjuqq7bQEv22q607uke9u7bbtoeyE7B7ojuy26Rdo+gdu6c7rVq4Pbl6CcI9R6OrpbuzXatHqSO50AX9rQewnbh6h+LQh74jsmAdu6fbv6qj263wuse0sIMrvsesx7HHtda8h64ijfO+YB27sZugNqIjtge3x6ELv8esx7AnrDara6xSj8e3u6uzsmOiBA9TvjOsJ64npf2j66Zalie9u74nopu3U6k9p5O7e7NHtSe7W6Z4D1OsQUUnqyel/aHLshucp6zHuyegA7PToL2k0B3HqKe2h6gzsaexe6sHof2lp6EntjO53axdUye2p7R9rTO3i707s6er/bunopumuA9TuZFAZ6LzuDAIZ6hbt5KWZ7fjvme7W7m6ud23m6anrmeup6RqsMu6+plnr3unZ7K2ssugYKtnpWeo5712o2ep26kHvGeip7tbs3OgvauQIOenh6LnqPajZ7bHvqOqEA7ntoeteq+nvyesB6THomegA7nzsaehG6bnsKe756Enqfavp6LbuCu257BnvueoW7bQGaeyF6Kbtguvp7rno0e6AAvnoRen57DLtCegp7sXqBejSrKYD1O3fAUXtxeqF6HLobIZ57hRtQOyx70AHuwCl7tntQOj27X0GZe857UDoiu99AOXsOe1A6w7pzgXl6XntQOy678llpe/EaLnrJG9A7V5TOevl7tbpQa6V6wXqxenF6WXvlewy6Yntle4V75Xssu+UpNXrpe+V6HLq+uvV6JXuIOhl7jKPbVY17AwGIOtl6Mlkte1Z7aHok66V6OnqpOlV7OXu1umTrpXqiuuF6IXspeim6KEDJehrU7XouevK6C9vNgIV79Xodej66EMHDek173XsMu7uAY3qte917LLodgRN77XoSe/q70Dp/DIN6mDrNeuHA03oueha7Q3tbonN7tbsc6rN7nXrse4l7DqqOu4t6vXqXuol7UXoAOqSAyXv8Owl7XXrle2h6HruLezF7vXsbe317m3qjev8AC3qYO+N7xIBHest6U3pv20t6u3upe4A6Z3smOk0oyXvVIhd72duK69A6nP1Xe2Xbimo3e0Z6XXure2vBl3r3eqt6m3r66y67Xji3evrr+HomqcV6k3r6Okspl3sMeht6O3q1e+96umvQOsU7L3uW6ra7zDvbeg96zbtDezwyv3tsC5d6PnpoOl96I3sXe6Zr0DolpW9703rXev26YPqVevt6IPtje+96AcDJe706/3tPe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";

// util/lzstring.js
var LZString = function() {
  var f = String.fromCharCode;
  var keyStrBase64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var keyStrUriSafe = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
  var baseReverseDic = {};
  function getBaseValue(alphabet, character) {
    if (!baseReverseDic[alphabet]) {
      baseReverseDic[alphabet] = {};
      for (var i2 = 0; i2 < alphabet.length; i2++) {
        baseReverseDic[alphabet][alphabet.charAt(i2)] = i2;
      }
    }
    return baseReverseDic[alphabet][character];
  }
  __name(getBaseValue, "getBaseValue");
  var LZString2 = {
    compressToBase64: function(input) {
      if (input == null)
        return "";
      var res = LZString2._compress(input, 6, function(a2) {
        return keyStrBase64.charAt(a2);
      });
      switch (res.length % 4) {
        default:
        case 0:
          return res;
        case 1:
          return res + "===";
        case 2:
          return res + "==";
        case 3:
          return res + "=";
      }
    },
    decompressFromBase64: function(input) {
      if (input == null)
        return "";
      if (input == "")
        return null;
      return LZString2._decompress(input.length, 32, function(index) {
        return getBaseValue(keyStrBase64, input.charAt(index));
      });
    },
    compressToUTF16: function(input) {
      if (input == null)
        return "";
      return LZString2._compress(input, 15, function(a2) {
        return f(a2 + 32);
      }) + " ";
    },
    decompressFromUTF16: function(compressed) {
      if (compressed == null)
        return "";
      if (compressed == "")
        return null;
      return LZString2._decompress(compressed.length, 16384, function(index) {
        return compressed.charCodeAt(index) - 32;
      });
    },
    //compress into uint8array (UCS-2 big endian format)
    compressToUint8Array: function(uncompressed) {
      var compressed = LZString2.compress(uncompressed);
      var buf = new Uint8Array(compressed.length * 2);
      for (var i2 = 0, TotalLen = compressed.length; i2 < TotalLen; i2++) {
        var current_value = compressed.charCodeAt(i2);
        buf[i2 * 2] = current_value >>> 8;
        buf[i2 * 2 + 1] = current_value % 256;
      }
      return buf;
    },
    //decompress from uint8array (UCS-2 big endian format)
    decompressFromUint8Array: function(compressed) {
      if (compressed === null || compressed === void 0) {
        return LZString2.decompress(compressed);
      } else {
        var buf = new Array(compressed.length / 2);
        for (var i2 = 0, TotalLen = buf.length; i2 < TotalLen; i2++) {
          buf[i2] = compressed[i2 * 2] * 256 + compressed[i2 * 2 + 1];
        }
        var result = [];
        buf.forEach(function(c) {
          result.push(f(c));
        });
        return LZString2.decompress(result.join(""));
      }
    },
    //compress into a string that is already URI encoded
    compressToEncodedURIComponent: function(input) {
      if (input == null)
        return "";
      return LZString2._compress(input, 6, function(a2) {
        return keyStrUriSafe.charAt(a2);
      });
    },
    //decompress from an output of compressToEncodedURIComponent
    decompressFromEncodedURIComponent: function(input) {
      if (input == null)
        return "";
      if (input == "")
        return null;
      input = input.replace(/ /g, "+");
      return LZString2._decompress(input.length, 32, function(index) {
        return getBaseValue(keyStrUriSafe, input.charAt(index));
      });
    },
    compress: function(uncompressed) {
      return LZString2._compress(uncompressed, 16, function(a2) {
        return f(a2);
      });
    },
    _compress: function(uncompressed, bitsPerChar, getCharFromInt) {
      if (uncompressed == null)
        return "";
      var i2, value, context_dictionary = {}, context_dictionaryToCreate = {}, context_c = "", context_wc = "", context_w = "", context_enlargeIn = 2, context_dictSize = 3, context_numBits = 2, context_data = [], context_data_val = 0, context_data_position = 0, ii;
      for (ii = 0; ii < uncompressed.length; ii += 1) {
        context_c = uncompressed.charAt(ii);
        if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
          context_dictionary[context_c] = context_dictSize++;
          context_dictionaryToCreate[context_c] = true;
        }
        context_wc = context_w + context_c;
        if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
          context_w = context_wc;
        } else {
          if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
            if (context_w.charCodeAt(0) < 256) {
              for (i2 = 0; i2 < context_numBits; i2++) {
                context_data_val = context_data_val << 1;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
              }
              value = context_w.charCodeAt(0);
              for (i2 = 0; i2 < 8; i2++) {
                context_data_val = context_data_val << 1 | value & 1;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            } else {
              value = 1;
              for (i2 = 0; i2 < context_numBits; i2++) {
                context_data_val = context_data_val << 1 | value;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = 0;
              }
              value = context_w.charCodeAt(0);
              for (i2 = 0; i2 < 16; i2++) {
                context_data_val = context_data_val << 1 | value & 1;
                if (context_data_position == bitsPerChar - 1) {
                  context_data_position = 0;
                  context_data.push(getCharFromInt(context_data_val));
                  context_data_val = 0;
                } else {
                  context_data_position++;
                }
                value = value >> 1;
              }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) {
              context_enlargeIn = Math.pow(2, context_numBits);
              context_numBits++;
            }
            delete context_dictionaryToCreate[context_w];
          } else {
            value = context_dictionary[context_w];
            for (i2 = 0; i2 < context_numBits; i2++) {
              context_data_val = context_data_val << 1 | value & 1;
              if (context_data_position == bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          context_dictionary[context_wc] = context_dictSize++;
          context_w = String(context_c);
        }
      }
      if (context_w !== "") {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
          if (context_w.charCodeAt(0) < 256) {
            for (i2 = 0; i2 < context_numBits; i2++) {
              context_data_val = context_data_val << 1;
              if (context_data_position == bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
            }
            value = context_w.charCodeAt(0);
            for (i2 = 0; i2 < 8; i2++) {
              context_data_val = context_data_val << 1 | value & 1;
              if (context_data_position == bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          } else {
            value = 1;
            for (i2 = 0; i2 < context_numBits; i2++) {
              context_data_val = context_data_val << 1 | value;
              if (context_data_position == bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = 0;
            }
            value = context_w.charCodeAt(0);
            for (i2 = 0; i2 < 16; i2++) {
              context_data_val = context_data_val << 1 | value & 1;
              if (context_data_position == bitsPerChar - 1) {
                context_data_position = 0;
                context_data.push(getCharFromInt(context_data_val));
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i2 = 0; i2 < context_numBits; i2++) {
            context_data_val = context_data_val << 1 | value & 1;
            if (context_data_position == bitsPerChar - 1) {
              context_data_position = 0;
              context_data.push(getCharFromInt(context_data_val));
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
      }
      value = 2;
      for (i2 = 0; i2 < context_numBits; i2++) {
        context_data_val = context_data_val << 1 | value & 1;
        if (context_data_position == bitsPerChar - 1) {
          context_data_position = 0;
          context_data.push(getCharFromInt(context_data_val));
          context_data_val = 0;
        } else {
          context_data_position++;
        }
        value = value >> 1;
      }
      while (true) {
        context_data_val = context_data_val << 1;
        if (context_data_position == bitsPerChar - 1) {
          context_data.push(getCharFromInt(context_data_val));
          break;
        } else
          context_data_position++;
      }
      return context_data.join("");
    },
    decompress: function(compressed) {
      if (compressed == null)
        return "";
      if (compressed == "")
        return null;
      return LZString2._decompress(compressed.length, 32768, function(index) {
        return compressed.charCodeAt(index);
      });
    },
    _decompress: function(length, resetValue, getNextValue) {
      var dictionary = [], next, enlargeIn = 4, dictSize = 4, numBits = 3, entry = "", result = [], i2, w, bits, resb, maxpower, power, c, data = { val: getNextValue(0), position: resetValue, index: 1 };
      for (i2 = 0; i2 < 3; i2 += 1) {
        dictionary[i2] = i2;
      }
      bits = 0;
      maxpower = Math.pow(2, 2);
      power = 1;
      while (power != maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position == 0) {
          data.position = resetValue;
          data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
      }
      switch (next = bits) {
        case 0:
          bits = 0;
          maxpower = Math.pow(2, 8);
          power = 1;
          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          c = f(bits);
          break;
        case 1:
          bits = 0;
          maxpower = Math.pow(2, 16);
          power = 1;
          while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = resetValue;
              data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
          }
          c = f(bits);
          break;
        case 2:
          return "";
      }
      dictionary[3] = c;
      w = c;
      result.push(c);
      while (true) {
        if (data.index > length) {
          return "";
        }
        bits = 0;
        maxpower = Math.pow(2, numBits);
        power = 1;
        while (power != maxpower) {
          resb = data.val & data.position;
          data.position >>= 1;
          if (data.position == 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
          }
          bits |= (resb > 0 ? 1 : 0) * power;
          power <<= 1;
        }
        switch (c = bits) {
          case 0:
            bits = 0;
            maxpower = Math.pow(2, 8);
            power = 1;
            while (power != maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }
            dictionary[dictSize++] = f(bits);
            c = dictSize - 1;
            enlargeIn--;
            break;
          case 1:
            bits = 0;
            maxpower = Math.pow(2, 16);
            power = 1;
            while (power != maxpower) {
              resb = data.val & data.position;
              data.position >>= 1;
              if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
              }
              bits |= (resb > 0 ? 1 : 0) * power;
              power <<= 1;
            }
            dictionary[dictSize++] = f(bits);
            c = dictSize - 1;
            enlargeIn--;
            break;
          case 2:
            return result.join("");
        }
        if (enlargeIn == 0) {
          enlargeIn = Math.pow(2, numBits);
          numBits++;
        }
        if (dictionary[c]) {
          entry = dictionary[c];
        } else {
          if (c === dictSize) {
            entry = w + w.charAt(0);
          } else {
            return null;
          }
        }
        result.push(entry);
        dictionary[dictSize++] = w + entry.charAt(0);
        enlargeIn--;
        w = entry;
        if (enlargeIn == 0) {
          enlargeIn = Math.pow(2, numBits);
          numBits++;
        }
      }
    }
  };
  return LZString2;
}();
var lzstring_default = LZString;

// parser/jscc_util.js
var ProdSaveFlags = {
  RHS_SINGLE: 1,
  LHS_SINGLE: 2
};
var debug2 = 0;
var ParseStack = class {
  static {
    __name(this, "ParseStack");
  }
  constructor(size = 1024) {
    this.array = new Array(size);
    this.length = 0;
    this.itop = this.ibottom = size >> 1;
  }
  get top() {
    return this.array[this.itop - 1];
  }
  get bottom() {
    return this.array[this.ibottom];
  }
  [Symbol.iterator]() {
    let this2 = this;
    return function* () {
      for (let i2 = this2.ibottom; i2 < this2.itop; i2++) {
        yield this.array[i2];
      }
    }();
  }
  get(i2) {
    return this.array[i2 + this.ibottom];
  }
  shiftN(n2) {
    this.ibottom += n2;
    this.length -= n2;
    return this;
  }
  forEach(cb) {
    for (let i2 = this.ibottom; i2 < this.itop; i2++) {
      cb(this.array[i2], i2);
    }
    return this;
  }
  shift() {
    this.length--;
    return this.array[this.ibottom++];
  }
  unshift(item) {
    this.length++;
    this.array[--this.ibottom] = item;
  }
  push(item) {
    this.length++;
    this.array[this.itop++] = item;
  }
  pop() {
    this.length--;
    return this.array[--this.itop];
  }
};
var Parser = class {
  static {
    __name(this, "Parser");
  }
  constructor(lexer4, pdata, hash) {
    this.pdata = pdata;
    this.lexer = lexer4;
    this.hash = hash;
    this.onerror = void 0;
  }
  save(zipTool = lzstring_default.compressToBase64) {
    let data = zipTool(JSON.stringify(this));
    return data;
  }
  load(data, actions, unzipTool = lzstring_default.decompressFromBase64) {
    data = unzipTool(data);
    data = JSON.parse(data);
    this.loadJSON(data, actions);
  }
  compressPopTab() {
    let bits = 10;
    let next = (1 << bits) - 1;
    let out = [];
    for (let p of this.pdata.act_tab) {
      for (let item of p) {
        out.push(item);
      }
      out.push(next);
    }
    let half = (1 << bits - 3) - 1;
    out = out.map((f) => f + half);
    if (1) {
      let out2 = [];
      for (let i2 = 0; i2 < out.length; i2++) {
        for (let j = 0; j < bits; j++) {
          out2.push(out[i2] & 1 << j ? 1 : 0);
        }
      }
      let bits2 = 15;
      out = out2;
      let len = Math.ceil(out.length / bits2) * bits2;
      while (out.length < len) {
        out.push(0);
      }
      out2 = [];
      for (let i2 = 0; i2 < len; i2 += bits2) {
        let b = 0;
        for (let j = 0; j < bits2; j++) {
          b |= (1 << j) * out[i2 + j];
        }
        out2.push(b);
      }
      out = out2;
      console.log(out2);
      console.log(2 * out2.length / 1024);
    } else {
      console.log(out);
    }
    let s = "";
    for (let i2 = 0; i2 < out.length; i2++) {
      let a2 = out[i2];
      s += String.fromCharCode(a2);
    }
    s = lzstring_default.compress(s);
    console.log(s.length * 2 / 1024);
    console.log("size:", 2 * out.length / 1024);
  }
  toJSON() {
    let pdata = this.pdata;
    return {
      pop_tab: pdata.pop_tab,
      act_tab: pdata.act_tab,
      goto_tab: pdata.goto_tab,
      labelmap: pdata.labelmap,
      labels: pdata.labels,
      error_symbol: pdata.error_symbol,
      eof_symbol: pdata.eof_symbol,
      whitespace_token: pdata.whitespace_token,
      defact_tab: pdata.defact_tab,
      productions: pdata.productions,
      hash: this.hash
    };
  }
  loadJSON(obj, actions) {
    let actions2 = {};
    actions2[0] = function(p) {
      p[0] = p[1];
    };
    for (let p of obj.productions) {
      let code3 = p.code.trim();
      if (code3.startsWith("_")) {
        code3 = code3.slice(1, code3.length);
        actions2[p.id] = actions[code3];
      }
    }
    this.pdata = obj;
    this.hash = obj.hash;
    this.pdata.actions = actions2;
  }
  printTokens(buf) {
    this.lexer.input(buf);
    while (!this.lexer.at_end()) {
      let t2 = this.lexer.next();
      console.log("" + t2);
    }
  }
  parse(buf, onerror) {
    if (buf.trim().length === 0) {
      let ret3 = new ASTNode("Program");
      return ret3;
    }
    this.lexer.input(buf);
    this.onerror = onerror;
    let linemap = new Array(buf.length);
    let colmap = new Array(buf.length);
    let linei = 0, coli = 0;
    for (let i3 = 0; i3 < buf.length; i3++) {
      linemap[i3] = linei;
      colmap[i3] = coli++;
      if (buf[i3] === "\n") {
        linei++;
        coli = 0;
      }
    }
    let lexer4 = this.lexer;
    let pdata = this.pdata;
    let pop_tab = this.pdata.pop_tab;
    let act_tab = this.pdata.act_tab;
    let goto_tab = this.pdata.goto_tab;
    let labelmap = this.pdata.labelmap;
    class PcbClass {
      static {
        __name(this, "PcbClass");
      }
      constructor() {
        this.line = 1;
        this.column = 1;
        this.offset = 0;
        this.error_step = 0;
        this.src = "";
        this.att = "";
        this.la = null;
        this.act = null;
      }
      lex() {
        if (debug2) {
          console.log("next token");
        }
        let ret3 = lexer4.next();
        if (ret3 === void 0) {
          this.la = pdata.eof_symbol;
          return pdata.eof_symbol;
        }
        this.att = ret3.value;
        this.offset = ret3.lexpos;
        this.la = labelmap[ret3.type];
        this.token = ret3;
        this.line = ret3.lexer.lineno;
        return labelmap[ret3.type];
      }
    }
    let actions = pdata.actions;
    function get_act(top, la) {
      for (let i3 = 0; i3 < act_tab[top].length; i3 += 2) {
        if (act_tab[top][i3] === la)
          return act_tab[top][i3 + 1];
      }
      return null;
    }
    __name(get_act, "get_act");
    function get_goto(top, pop) {
      for (let i3 = 0; i3 < goto_tab[top].length; i3 += 2) {
        if (goto_tab[top][i3] === pop)
          return goto_tab[top][i3 + 1];
      }
      return null;
    }
    __name(get_goto, "get_goto");
    let sstack = new ParseStack();
    let vstack = new ParseStack();
    sstack.push(0);
    vstack.push(0);
    let defact_tab = pdata.defact_tab;
    let labels = pdata.labels;
    let err_cnt = 0;
    let rval, act, i2 = 0;
    let PCB = new PcbClass();
    let this2 = this;
    function doerror(p) {
      if (this2.onerror) {
        this2.onerror(p);
      }
      let line = -1, col = -1;
      if (p) {
        line = p.line;
        line = linemap[p.offset];
        col = colmap[p.offset];
        console.log(p);
      }
      console.log(p);
      let lines3 = buf.split("\n");
      let s = "";
      for (let i3 = line - 15; i3 < line + 25; i3++) {
        if (i3 < 0)
          continue;
        if (i3 >= lines3.length)
          break;
        let si = "" + i3;
        while (si.length < 3) {
          si = " " + si;
        }
        s += si + ": " + lines3[i3] + "\n";
      }
      console.log(s);
      let message = "";
      message += `${line}:${col}: Syntax Error
`;
      let l2 = lines3[line];
      message += "  " + l2 + "\n";
      for (let i3 = 0; i3 < col + 2; i3++) {
        message += " ";
      }
      message += "^\n";
      console.warn(message);
      throw new Error(message);
    }
    __name(doerror, "doerror");
    console.log("%cPARSING!", "color : orange;");
    let err_off = new ParseStack();
    let err_la = new ParseStack();
    PCB.lex();
    while (1) {
      PCB.act = get_act(sstack.bottom, PCB.la);
      if (debug2) {
        console.log(PCB.act, PCB.la);
      }
      if (PCB.act === null && defact_tab[sstack.bottom] >= 0)
        PCB.act = -defact_tab[sstack.bottom];
      if (PCB.act === null) {
        if (PCB.error_step === 0) {
          err_cnt++;
          err_off.unshift(PCB.offset - PCB.att.length);
          err_la.unshift([]);
          for (i2 = 0; i2 < act_tab[sstack.bottom].length; i2 += 2) {
            err_la.get(0).push(labels[act_tab[sstack.bottom][i2]]);
          }
          PCB.errorLabels = err_la;
          doerror(PCB);
        }
        while (sstack.length > 1 && PCB.act === null) {
          sstack.shift();
          vstack.shift();
          PCB.act = get_act(sstack.bottom, PCB.la);
          if (PCB.act === error_token) {
            sstack.unshift(PCB.act);
            vstack.unshift("");
          }
        }
        if (sstack.length > 1 && PCB.act !== null) {
          while (PCB.la !== eof) {
            PCB.act = act_tab[sstack.bottom][i2 + 1];
            if (PCB.act != null)
              break;
            while (PCB.lex() != null) {
              PCB.offset++;
            }
          }
        }
        if (PCB.act === null || PCB.la === eof) {
          break;
        }
        PCB.error_step = 3;
      }
      if (PCB.act > 0) {
        sstack.unshift(PCB.act);
        vstack.unshift(PCB.att);
        PCB.lex();
        if (PCB.error_step > 0)
          PCB.error_step--;
      } else {
        act = -PCB.act;
        let prod = pdata.productions[act].rhs;
        let p = [null];
        p.lexer = lexer4;
        for (let i3 = 0; i3 < prod.length; i3++) {
          p.push(vstack.get(prod.length - i3 - 1));
        }
        if (debug2) {
          console.log("P", p);
        }
        let actfunc = actions[act];
        if (!actfunc) {
          p[0] = p[1];
        } else {
          actfunc(p);
        }
        rval = p[0];
        sstack.shiftN(pop_tab[act][1]);
        vstack.shiftN(pop_tab[act][1]);
        PCB.act = get_goto(sstack.bottom, pop_tab[act][0]);
        if (act === 0)
          break;
        sstack.unshift(PCB.act);
        vstack.unshift(rval);
      }
    }
    let ret2 = rval;
    globalThis.noderet = ret2;
    console.log("%cDone.", "color : orange;");
    return ret2;
  }
};
function getParser(lexer4, parsedef2, tokenlist, prec, parserName, force = false) {
  if (parserName === void 0) {
    throw new Error("parserName cannot be undefined");
  }
  let grammar = "/~ We use our own lexical scannar ~/\n";
  let visit3 = {};
  var _i = 0;
  for (let list2 of prec) {
    let prec2 = list2[0];
    if (prec2 === "left")
      prec2 = "<";
    else if (prec2 === "right")
      prec2 = ">";
    else
      prec2 = "";
    grammar += prec2 + " ";
    for (let i3 = 1; i3 < list2.length; i3++) {
      if (i3 > 1) {
        grammar += "  ";
      }
      grammar += ` '${_i++}' ${list2[i3]}
`;
      visit3[list2[i3]] = 1;
    }
    grammar += ";\n";
  }
  for (let t2 of tokenlist) {
    if (t2 in visit3) {
      continue;
    }
    grammar += `'${_i++}'  ${t2} 
`;
  }
  grammar += ";\n\n##\n\n";
  parsedef2.reverse();
  let idgen2 = 0;
  for (let p of parsedef2) {
    p.id = idgen2++;
  }
  for (let p of parsedef2) {
    let lines3 = p.grammar.split("\n");
    let li = 0;
    for (let l2 of lines3) {
      if (li === 0) {
        l2 = "               " + l2;
      }
      if (l2.trim().length === 0) {
        li++;
        continue;
      }
      grammar += l2 + ` [*_${p.id}*]
`;
      li++;
    }
    grammar += "\n;\n";
  }
  let actions = {};
  for (let p of parsedef2) {
    actions["" + p.id] = p.func;
    p.func.grammar = p.grammar;
  }
  let parser5;
  let hash = strhash(grammar);
  let storageKey = "parseTable_" + parserName;
  if (!force && parsetable) {
    parser5 = new Parser(lexer4);
    parser5.load(parsetable, actions);
  } else if (!force && typeof globalThis.localStorage !== "undefined") {
  }
  globalThis.grammar = grammar;
  if (parser5 && parser5.hash === hash) {
    console.log("Old hash:", parser5.hash, "new hash:", hash);
    globalThis.parser = parser5;
    return parser5;
  } else if (!force) {
    console.log("Old hash:", parser5.hash, "new hash:", hash);
    throw new Error("parser is out of date; run build_parsetable.js");
  }
  console.log(`Building parse tables (will be cached in localStorage[${storageKey}]. . .`);
  let parse_grammar = jscc.require("lib/jscc/parse");
  let integrity = jscc.require("lib/jscc/integrity");
  let first = jscc.require("lib/jscc/first");
  let tabgen = jscc.require("lib/jscc/tabgen");
  let lexdfa = jscc.require("lib/jscc/lexdfa");
  let global2 = jscc.require("lib/jscc/global");
  let printtab = jscc.require("lib/jscc/printtab");
  let MODE_GEN = jscc.require("lib/jscc/enums/MODE_GEN");
  let SPECIAL = jscc.require("lib/jscc/enums/SPECIAL");
  var templateString = global2.DEFAULT_DRIVER;
  let ret2 = parse_grammar(grammar, "grammar");
  let driver = templateString;
  if (!ret2) {
    integrity.undef();
    integrity.unreachable();
    first.first();
    tabgen.lalr1_parse_table(false);
    integrity.check_empty_states();
    global2.dfa_states = lexdfa.create_subset(global2.nfa_states.value);
    global2.dfa_states = lexdfa.minimize_dfa(global2.dfa_states);
    let pdata = {};
    var pop_tab_json = [];
    for (var i2 = 0; i2 < global2.productions.length; i2++) {
      pop_tab_json.push([global2.productions[i2].lhs, global2.productions[i2].rhs.length]);
    }
    pdata.pop_tab = pop_tab_json;
    var act_tab_json = [];
    for (var i2 = 0; i2 < global2.states.length; i2++) {
      var act_tab_json_item = [];
      for (let j = 0; j < global2.states[i2].actionrow.length; j++) {
        act_tab_json_item.push(
          global2.states[i2].actionrow[j].symbol,
          global2.states[i2].actionrow[j].action
        );
      }
      act_tab_json.push(act_tab_json_item);
    }
    pdata.act_tab = act_tab_json;
    var goto_tab_json = [];
    for (var i2 = 0; i2 < global2.states.length; i2++) {
      var goto_tab_json_item = [];
      for (let j = 0; j < global2.states[i2].gotorow.length; j++) {
        goto_tab_json_item.push(
          global2.states[i2].gotorow[j].symbol,
          global2.states[i2].gotorow[j].action
        );
      }
      goto_tab_json.push(goto_tab_json_item);
    }
    pdata.goto_tab = goto_tab_json;
    var defact_tab_json = [];
    for (var i2 = 0; i2 < global2.states.length; i2++) {
      defact_tab_json.push(global2.states[i2].def_act);
    }
    pdata.defact_tab = defact_tab_json;
    let arr2 = [];
    for (var i2 = 0; i2 < global2.symbols.length; i2++) {
      arr2.push(global2.symbols[i2].label);
    }
    pdata.labels = arr2;
    var eof_id = -1;
    for (var i2 = 0; i2 < global2.symbols.length; i2++) {
      if (global2.symbols[i2].special === SPECIAL.EOF) {
        eof_id = i2;
        break;
      }
    }
    pdata.eof_symbol = eof_id;
    var error_id = -1;
    for (var i2 = 0; i2 < global2.symbols.length; i2++) {
      if (global2.symbols[i2].special === SPECIAL.ERROR) {
        error_id = i2;
        break;
      }
    }
    pdata.error_symbol = error_id;
    pdata.whitespace_token = printtab.get_whitespace_symbol_id();
    let labelmap = {};
    for (let i3 = 0; i3 < pdata.labels.length; i3++) {
      labelmap[pdata.labels[i3]] = i3;
    }
    pdata.labelmap = labelmap;
    pdata.productions = global2.productions;
    let actions2 = {};
    actions2[0] = function(p) {
      p[0] = p[1];
    };
    for (let p of global2.productions) {
      let code3 = p.code.trim();
      if (code3.startsWith("_")) {
        code3 = code3.slice(1, code3.length);
        actions2[p.id] = actions[code3];
      }
    }
    pdata.actions = actions2;
    ret2 = pdata;
  }
  globalThis.grammar2 = "";
  for (let k2 in actions) {
    let act = actions[k2];
    grammar2 += "" + act + "\n";
  }
  parser5 = new Parser(lexer4, ret2, hash);
  if (typeof globalThis.localStorage !== "undefined") {
    globalThis.localStorage[storageKey] = JSON.stringify(parser5.toJSON());
  }
  globalThis.parser = parser5;
  return parser5;
}
__name(getParser, "getParser");

// parser/parser.js
var tk = /* @__PURE__ */ __name((n2, r, f) => new tokdef(n2, r, f), "tk");
var precedence2 = {
  "(": 0,
  ")": 0,
  "[": 1,
  "]": 1,
  ".": 1,
  "++": 1,
  "--": 1,
  "*": 2,
  "/": 2,
  "%": 2,
  "+": 3,
  "-": 3,
  ">=": 4,
  "<=": 4,
  ">": 4,
  "<": 4,
  "!=": 5,
  "==": 5,
  "&": 6,
  "^": 7,
  "|": 8,
  "&&": 9,
  "^^": 10,
  "||": 11
};
var count = /* @__PURE__ */ __name((str, match) => {
  let c = 0;
  do {
    let i2 = str.search(match);
    if (i2 < 0) {
      break;
    }
    c++;
    str = str.slice(i2 + 1, str.length);
  } while (1);
  return c;
}, "count");
var keywords = /* @__PURE__ */ new Set([
  "CONST",
  "BOOL",
  "FLOAT",
  "DOUBLE",
  "INT",
  "UINT",
  "BREAK",
  "CONTINUE",
  "DO",
  "ELSE",
  "FOR",
  "IF",
  "DISCARD",
  "RETURN",
  "SWITCH",
  "CASE",
  "DEFAULT",
  "SUBROUTINE",
  "BVEC2",
  "BVEC3",
  "BVEC4",
  "IVEC2",
  "IVEC3",
  "IVEC4",
  "UVEC2",
  "UVEC3",
  "UVEC4",
  "VEC2",
  "VEC3",
  "VEC4",
  "MAT2",
  "MAT3",
  "MAT4",
  "CENTROID",
  "IN",
  "OUT",
  "INOUT",
  "UNIFORM",
  "PATCH",
  "SAMPLE",
  "BUFFER",
  "SHARED",
  "COHERENT",
  "VOLATILE",
  "RESTRICT",
  "READONLY",
  "WRITEONLY",
  "DVEC2",
  "DVEC3",
  "DVEC4",
  "DMAT2",
  "DMAT3",
  "DMAT4",
  "NOPERSPECTIVE",
  "FLAT",
  "SMOOTH",
  "LAYOUT",
  "MAT2X2",
  "MAT2X3",
  "MAT2X4",
  "MAT3X2",
  "MAT3X3",
  "MAT3X4",
  "MAT4X2",
  "MAT4X3",
  "MAT4X4",
  "DMAT2X2",
  "DMAT2X3",
  "DMAT2X4",
  "DMAT3X2",
  "DMAT3X3",
  "DMAT3X4",
  "DMAT4X2",
  "DMAT4X3",
  "DMAT4X4",
  "ATOMIC_UINT",
  "SAMPLER1D",
  "SAMPLER2D",
  "SAMPLER3D",
  "SAMPLERCUBE",
  "SAMPLER1DSHADOW",
  "SAMPLER2DSHADOW",
  "SAMPLERCUBESHADOW",
  "SAMPLER1DARRAY",
  "SAMPLER2DARRAY",
  "SAMPLER1DARRAYSHADOW",
  "SAMPLER2DARRAYSHADOW",
  "ISAMPLER1D",
  "ISAMPLER2D",
  "ISAMPLER3D",
  "ISAMPLERCUBE",
  "ISAMPLER1DARRAY",
  "ISAMPLER2DARRAY",
  "USAMPLER1D",
  "USAMPLER2D",
  "USAMPLER3D",
  "USAMPLERCUBE",
  "USAMPLER1DARRAY",
  "USAMPLER2DARRAY",
  "SAMPLER2DRECT",
  "SAMPLER2DRECTSHADOW",
  "ISAMPLER2DRECT",
  "USAMPLER2DRECT",
  "SAMPLERBUFFER",
  "ISAMPLERBUFFER",
  "USAMPLERBUFFER",
  "SAMPLERCUBEARRAY",
  "SAMPLERCUBEARRAYSHADOW",
  "ISAMPLERCUBEARRAY",
  "USAMPLERCUBEARRAY",
  "SAMPLER2DMS",
  "ISAMPLER2DMS",
  "USAMPLER2DMS",
  "SAMPLER2DMSARRAY",
  "ISAMPLER2DMSARRAY",
  "USAMPLER2DMSARRAY",
  "IMAGE1D",
  "IIMAGE1D",
  "UIMAGE1D",
  "IMAGE2D",
  "IIMAGE2D",
  "UIMAGE2D",
  "IMAGE3D",
  "IIMAGE3D",
  "UIMAGE3D",
  "IMAGE2DRECT",
  "IIMAGE2DRECT",
  "UIMAGE2DRECT",
  "IMAGECUBE",
  "IIMAGECUBE",
  "UIMAGECUBE",
  "IMAGEBUFFER",
  "IIMAGEBUFFER",
  "UIMAGEBUFFER",
  "IMAGE1DARRAY",
  "IIMAGE1DARRAY",
  "UIMAGE1DARRAY",
  "IMAGE2DARRAY",
  "IIMAGE2DARRAY",
  "UIMAGE2DARRAY",
  "IMAGECUBEARRAY",
  "IIMAGECUBEARRAY",
  "UIMAGECUBEARRAY",
  "IMAGE2DMS",
  "IIMAGE2DMS",
  "UIMAGE2DMS",
  "IMAGE2DMSARRAY",
  "IIMAGE2DMSARRAY",
  "UIMAGE2DMSARRAY",
  "STRUCT",
  "VOID",
  "WHILE",
  "INVARIANT",
  "PRECISE",
  "PRECISION"
]);
var tokendef = [
  tk("HIGH_PRECISION", /highp/),
  tk("MEDIUM_PRECISION", /mediump/),
  tk("LOW_PRECISION", /lowp/),
  tk("ID", /[a-zA-Z$_]+[a-zA-Z0-9$_]*/, (t2) => {
    t2.isKeyword = false;
    if (t2.value in t2.lexer.structs) {
      t2.type = "TYPE_NAME";
      return t2;
    }
    if (t2.lexer.prev && t2.lexer.prev.type === "DOT") {
      t2.type = "FIELD_SELECTION";
      return t2;
    }
    if (keywords.has(t2.value.toUpperCase())) {
      t2.isKeyword = true;
      t2.type = t2.value.toUpperCase();
      t2.value = t2.value.toLowerCase();
    }
    return t2;
  }),
  tk("FLOATCONSTANT", /[0-9]+\.([0-9]*)?/, (t2) => {
    t2.value = parseFloat(t2.value);
    return t2;
  }),
  tk("INTCONSTANT", /[0-9]+/, (t2) => {
    t2.value = parseInt(t2.value);
    return t2;
  }),
  tk("UINTCONSTANT", /[0-9]+u/, (t2) => {
    t2.value = parseInt(t2.value);
    return t2;
  }),
  tk("BOOLCONSTANT", /(true|false)/),
  tk("DOUBLECONSTANT", /[0-9]+(\.[0-9]*)?d/, (t2) => {
    t2.value = t2.value.slice(0, t2.value.length - 1);
    t2.value = parseFloat(t2.value);
    return t2;
  }),
  tk("LPAREN", /\(/),
  tk("RPAREN", /\)/),
  tk("STRLIT", /".*(?<!\\)\"/, (t2) => {
    let v = t2.value;
    t2.lexer.lineno += count(t2.value, "\n");
    return t2;
  }),
  tk("NL", /[\n\r]/, (t2) => {
    if (t2.value === "\n") {
      t2.lexer.lineno++;
      t2.lexer.line_lexstart = t2.lexer.lexpos;
    }
  }),
  tk("WS", /[ \t]/, (t2) => {
  }),
  tk("COMMA", /\,/),
  tk("COLON", /:/),
  tk("QUESTION", /\?/),
  tk("LSBRACKET", /\[/),
  tk("RSBRACKET", /\]/),
  tk("LBRACE", /\{/),
  tk("RBRACE", /\}/),
  tk("DOT", /\./),
  tk("PLUS", /\+/),
  tk("NOT", /\!/),
  tk("MINUS", /\-/),
  tk("TIMES", /\*/),
  tk("DIV", /\//),
  tk("EXP", /\*\*/),
  tk("LAND", /\&\&/),
  tk("BITAND", /\&/),
  tk("LOR", /\|\|/),
  tk("BITOR", /\|/),
  tk("EQUALS", /==/),
  tk("NEQUALS", /\!=/),
  tk("ASSIGN", /=/),
  tk("LEQUALS", /\<\=/),
  tk("GEQUALS", /\>\=/),
  tk("LTHAN", /\</),
  tk("LSHIFT", /\<\</),
  tk("RSHIFT", /\>\>/),
  tk("GTHAN", /\>/),
  tk("MOD", /\%/),
  tk("XOR", /\^/),
  tk("LXOR", /\^\^/),
  tk("BITINV", /\~/),
  tk("INC", /\+\+/),
  tk("DEC", /\-\-/),
  tk("MUL_ASSIGN", /\*\=/),
  tk("DIV_ASSIGN", /\/\=/),
  tk("PLUS_ASSIGN", /\+\=/),
  tk("MINUS_ASSIGN", /\-\=/),
  tk("COMMENT", /\/\/[^\n]*\n/, (t2) => {
    t2.lexer.lineno += count(t2.value, "\n");
  }),
  tk("MOD_ASSIGN", /\%\=/),
  tk("LEFT_ASSIGN", /\<\<\=/),
  tk("RIGHT_ASSIGN", /\>\>\=/),
  tk("AND_ASSIGN", /\&\=/),
  tk("OR_ASSIGN", /\|\=/),
  tk("XOR_ASSIGN", /\^\=/),
  tk("SEMI", /;/)
];
var GLSLLexer = class extends lexer {
  static {
    __name(this, "GLSLLexer");
  }
  constructor() {
    super(tokendef, (t2) => {
      console.log("Token error");
      return true;
    });
    this.scope = {};
    this.structs = {};
    this.scopestack = [];
    this.linemap = [];
  }
  pushScope() {
    this.scopestack.push(this.scope);
    this.scope = Object.assign({}, this.scope);
  }
  popScope() {
    this.scope = this.scopestack.pop();
  }
  input(data) {
    super.input(data);
    this.linemap = new Array(data.length);
    let li = 0;
    for (let i2 = 0; i2 < data.length; i2++) {
      this.linemap[i2] = li;
      if (data[i2] === "\n") {
        li++;
      }
    }
    this.scope = {};
    this.structs = {};
  }
};
var lex2 = new GLSLLexer();
var binops = /* @__PURE__ */ new Set([
  ".",
  "/",
  "*",
  "**",
  "^",
  "%",
  "&",
  "+",
  "-",
  "&&",
  "||",
  "&",
  "|",
  "<",
  ">",
  "==",
  "=",
  "<=",
  ">="
  //, "(", ")"
]);
var precedence = [
  ["nonassoc", "LPAREN", "RPAREN"],
  ["left", "LSBRACKET", "RSBRACKET", "DOT", "INC", "DEC", "FIELD_SELECTOR"],
  ["right", "UNARY"],
  ["left", "TIMES", "DIV", "MOD"],
  ["left", "PLUS", "MINUS"],
  ["left", "LSHIFT", "RSHIFT"],
  ["left", "GEQUALS", "LEQUALS", "GTHAN", "LTHAN"],
  ["left", "NEQUALS", "EQUALS"],
  ["left", "BITAND"],
  ["left", "XOR"],
  ["left", "BITOR"],
  ["left", "LAND"],
  ["left", "LXOR"],
  ["left", "LOR"],
  ["right", "QUESTION", "COLON"],
  [
    "right",
    "ASSIGN",
    "MUL_ASSIGN",
    "DIV_ASSIGN",
    "PLUS_ASSIGN",
    "MINUS_ASSIGN",
    "MOD_ASSIGN",
    "OR_ASSIGN",
    "XOR_ASSIGN",
    "RIGHT_ASSIGN",
    "LEFT_ASSIGN",
    "AND_ASSIGN"
  ],
  ["left", "COMMA"]
];
var opmap = {
  TIMES: "*",
  DIV: "/",
  MOD: "%",
  PLUS: "+",
  MINUS: "-",
  GTHAN: ">",
  LTHAN: "<",
  GEQUALS: ">=",
  LEQUALTS: "<=",
  NEQUALS: "!=",
  EQUALS: "==",
  ASSIGN: "=",
  MUL_ASSIGN: "*=",
  DIV_ASSIGN: "/=",
  PLUS_ASSIGN: "+=",
  MOD_ASSIGN: "%=",
  OR_ASSIGN: "|=",
  AND_ASSIGN: "&=",
  LEFT_ASSIGN: "<<=",
  RIGHT_ASSIGN: ">>=",
  XOR_ASSIGN: "^=",
  MINUS_ASSIGN: "-=",
  XOR: "^",
  BITOR: "|",
  LAND: "&&",
  LOR: "||",
  LXOR: "^^",
  BITAND: "&",
  BITINV: "~",
  LSHIFT: "<<",
  RSHIFT: ">>",
  INC: "++",
  DEC: "--",
  DOT: "."
};
var Precedence = {};
var pi = 0;
for (let row of precedence) {
  for (let key of row.slice(1, row.length)) {
    Precedence[opmap[key]] = {
      prec: pi,
      assoc: row[0]
    };
  }
  pi++;
}
function indent2(n2, chr = "  ") {
  let s = "";
  for (let i2 = 0; i2 < n2; i2++) {
    s += chr;
  }
  return s;
}
__name(indent2, "indent");
var Node = ASTNode;
var Node1 = class extends Array {
  static {
    __name(this, "Node1");
  }
  constructor(type2) {
    super();
    this.type = type2;
    this.parent = void 0;
  }
  [Symbol.toStringTag]() {
    return `${this.type}(${this.length})`;
  }
  push(n2) {
    if (typeof n2 === "string") {
      let n22 = new Node("Ident");
      n22.value = n2;
      n2 = n22;
    }
    n2.parent = this;
    return super.push(n2);
  }
  add(n2) {
    this.push(n2);
  }
  remove(n2) {
    let i2 = this.indexOf(n2);
    if (i2 < 0) {
      console.log(n2);
      throw new Error("item not in array");
    }
    while (i2 < this.length) {
      this[i2] = this[i2 + 1];
      i2++;
    }
    n2.parent = void 0;
    this.length--;
    return this;
  }
  insert(starti, n2) {
    let i2 = this.length - 1;
    this.length++;
    if (n2.parent) {
      n2.parent.remove(n2);
    }
    while (i2 > starti) {
      this[i2] = this[i2 - 1];
      i2--;
    }
    n2.parent = this;
    this[starti] = n2;
    return this;
  }
  replace(n2, n22) {
    if (n22.parent) {
      n22.parent.remove(n22);
    }
    this[this.indexOf(n2)] = n22;
    n2.parent = void 0;
    n22.parent = this;
    return this;
  }
  toString(t2 = 0) {
    let tab = indent2(t2, "-");
    let typestr = this.type;
    if (this.value !== void 0) {
      typestr += " : " + this.value;
    } else if (this.op !== void 0) {
      typestr += " (" + this.op + ")";
    }
    let s = tab + typestr + " {\n";
    for (let c of this) {
      s += c.toString(t2 + 1);
    }
    s += tab + "}\n";
    return s;
  }
};
var BinOpHandler = /* @__PURE__ */ __name((p) => {
  if (p.length === 2) {
    p[0] = p[1];
  } else {
    p[0] = new Node("BinOp");
    p[0].op = p[2];
    p[0].prec = precedence2[p[0].op];
    p[0].push(p[1]);
    p[0].push(p[3]);
  }
}, "BinOpHandler");
var parsedef = [
  {
    grammar: `var_expr: ID`,
    func: (p) => {
      p[0] = new Node("Ident");
      p[0].value = p[1];
    }
  },
  {
    grammar: `intconstant: INTCONSTANT`,
    func: (p) => {
      p[0] = new Node("IntConstant");
      p[0].value = p[1];
    }
  },
  {
    grammar: `floatconstant: FLOATCONSTANT`,
    func: (p) => {
      p[0] = new Node("FloatConstant");
      p[0].value = p[1];
    }
  },
  {
    grammar: `boolconstant: BOOLCONSTANT`,
    func: (p) => {
      p[0] = new Node("BoolConstant");
      p[0].value = p[1];
    }
  },
  {
    grammar: `uintconstant: UINTCONSTANT`,
    func: (p) => {
      p[0] = new Node("UIntConstant");
      p[0].value = p[1];
    }
  },
  {
    grammar: `expression: INTCONSTANT`,
    func: (p) => {
      p[0] = new Node("IntConstant");
      p[0].value = p[1];
    }
  },
  {
    grammar: `intconstant : INTCONSTANT`,
    func: (p) => {
      p[0] = new Node("IntConstant");
      p[0].value = p[1];
    }
  },
  {
    grammar: `uintconstant : UINTCONSTANT`,
    func: (p) => {
      p[0] = new Node("UintConstant");
      p[0].value = p[1];
    }
  },
  {
    grammar: `floatconstant : FLOATCONSTANT`,
    func: (p) => {
      p[0] = new Node("FloatConstant");
      p[0].value = p[1];
    }
  },
  {
    grammar: `boolconstant : BOOLCONSTANT`,
    func: (p) => {
      p[0] = new Node("BoolConstant");
      p[0].value = p[1];
    }
  },
  {
    grammar: `primary_expression:  var_expr
                                  | intconstant
                                  | uintconstant
                                  | floatconstant
                                  | boolconstant
                                  | LPAREN expression RPAREN`,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else if (p.length === 4) {
        p[0] = p[2];
      }
    }
  },
  {
    grammar: `field_selection : FIELD_SELECTION`,
    func: (p) => {
      p[0] = new Node("Ident");
      p[0].value = p[1];
    }
  },
  {
    grammar: `postfix_expression: primary_expression
                                 | postfix_expression LSBRACKET integer_expression RSBRACKET
                                 | function_call
                                 | postfix_expression DOT field_selection
                                 | postfix_expression INC
                                 | postfix_expression DEC 
               `,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else if (p.length === 5) {
        p[0] = new Node("ArrayLookup");
        p[0].push(p[1]);
        p[0].push(p[3]);
      } else if (p.length === 4) {
        p[0] = new Node("BasicMemberLookup");
        let n2 = p[3];
        if (typeof n2 === "string") {
          n2 = new Node("Ident");
          n2.value = p[3];
        }
        p[0].push(p[1]);
        p[0].push(n2);
      } else if (p.length === 3) {
        let type2 = p[2] === "++" ? "PostInc" : "PostDec";
        p[0] = new Node(type2);
        p[0].push(p[1]);
      }
    }
  },
  {
    grammar: `integer_expression: expression`,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `function_call: function_call_or_method`,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `function_call_or_method: function_call_generic`,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `function_call_generic: function_call_header_with_parameters RPAREN
                                    | function_call_header_no_parameters RPAREN
            `,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `function_call_header_no_parameters: function_call_header VOID
                                                 | function_call_header`,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `function_call_header_with_parameters: function_call_header assignment_expression
                                                   | function_call_header_with_parameters COMMA assignment_expression`,
    func: (p) => {
      if (p.length === 3) {
        p[0] = p[1];
        p[0][1].push(p[2]);
      } else {
        p[0] = p[1];
        p[0][1].push(p[3]);
      }
    }
  },
  {
    grammar: `function_call_header: function_id LPAREN`,
    func: (p) => {
      p[0] = new Node("Call");
      p[0].push(p[1]);
      p[0].push(new Node("ExprList"));
    }
  },
  {
    grammar: `function_id: type_specifier
                          | postfix_expression`,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `unary_expression: postfix_expression
                               | INC unary_expression &UNARY
                               | DEC unary_expression &UNARY
                               | unary_operator unary_expression &UNARY`,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else if (p.length === 4 && p[1] === "++") {
        p[0] = new Node("PreInc");
        p[0].push(p[2]);
      } else if (p.length === 4 && p[1] === "--") {
        p[0] = new Node("PreDec");
        p[0].push(p[2]);
      } else {
        p[0] = new Node("UnaryOp");
        p[0].push(p[2]);
        p[0].op = p[1];
      }
    }
  },
  {
    grammar: `unary_operator : PLUS
                              | MINUS
                              | BITINV
                              | NOT`,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `multiplicative_expression : unary_expression
                                         | multiplicative_expression TIMES unary_expression
                                         | multiplicative_expression DIV unary_expression
                                         | multiplicative_expression MOD unary_expression`,
    func: BinOpHandler
  },
  {
    grammar: `additive_expression: multiplicative_expression
                                  | additive_expression PLUS multiplicative_expression
                                  | additive_expression MINUS multiplicative_expression

                                  `,
    func: BinOpHandler
  },
  {
    grammar: `shift_expression: additive_expression
                               | shift_expression RSHIFT additive_expression
                               | shift_expression LSHIFT additive_expression
                               `,
    func: BinOpHandler
  },
  {
    grammar: `rel_expression: shift_expression
                             | rel_expression  LTHAN   shift_expression
                             | rel_expression  GTHAN   shift_expression
                             | rel_expression  LEQUALS shift_expression
                             | rel_expression  GEQUALS shift_expression
                               `,
    func: BinOpHandler
  },
  {
    grammar: `equality_expression: rel_expression
                                  | equality_expression  EQUALS   rel_expression
                                  | equality_expression  NEQUALS  rel_expression
                               `,
    func: BinOpHandler
  },
  {
    grammar: `and_expression: equality_expression
                             | and_expression  BITAND  equality_expression
                               `,
    func: BinOpHandler
  },
  {
    grammar: `exclusive_or_expression: and_expression
                                      | exclusive_or_expression  XOR  and_expression
                               `,
    func: BinOpHandler
  },
  {
    grammar: `inclusive_or_expression: exclusive_or_expression
                                      | inclusive_or_expression  BITOR exclusive_or_expression
                               `,
    func: BinOpHandler
  },
  {
    grammar: `logical_and_expression: inclusive_or_expression
                                     | logical_and_expression LAND inclusive_or_expression
                               `,
    func: BinOpHandler
  },
  {
    grammar: `logical_xor_expression: logical_and_expression
                                     | logical_xor_expression LXOR logical_and_expression
                               `,
    func: BinOpHandler
  },
  {
    grammar: `logical_or_expression: logical_xor_expression
                                     | logical_or_expression LOR logical_xor_expression
                               `,
    func: BinOpHandler
  },
  {
    grammar: `conditional_expression: logical_or_expression
                                     | logical_or_expression QUESTION expression COLON assignment_expression
                               `,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else {
        p[0] = new Node("Trinary");
        p[0].push(p[1]);
        p[0].push(p[3]);
        p[0].push(p[5]);
      }
    }
  },
  {
    grammar: `assignment_expression: conditional_expression
                                    | unary_expression assignment_operator assignment_expression
                               `,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else {
        p[0] = new Node("Assign");
        p[0].push(p[1]);
        p[0].push(p[3]);
        p[0].op = p[2];
      }
    }
  },
  {
    grammar: `assignment_operator: ASSIGN
                                  | MUL_ASSIGN
                                  | DIV_ASSIGN
                                  | PLUS_ASSIGN
                                  | MINUS_ASSIGN
                                  | MOD_ASSIGN
                                  | OR_ASSIGN
                                  | XOR_ASSIGN
                                  | RIGHT_ASSIGN
                                  | LEFT_ASSIGN
                                  | AND_ASSIGN
                                  
                                  `,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `expression : assignment_expression
                          | expression COMMA assignment_expression`,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else {
        if (p[1].type !== "ExprList") {
          p[0] = new Node("ExprList");
          p[0].push(p[1]);
        } else {
          p[0] = p[1];
        }
        p[0].push(p[3]);
      }
    }
  },
  {
    grammar: `constant_expression: conditional_expression`,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `type_specifier: type_specifier_nonarray
                              | type_specifier_nonarray array_specifier`,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else {
        let type2;
        if (typeof p[1] === "string") {
          type2 = new Node("VarType");
          type2.value = new VarType(p[1]);
        } else {
          type2 = p[1];
        }
        p[0] = p[2];
        p[0].type = p[1].value;
      }
    }
  },
  {
    grammar: `array_specifier: LSBRACKET RSBRACKET
                              | LSBRACKET constant_expression RSBRACKET
                              | array_specifier LSBRACKET RSBRACKET
                              | array_specifier LSBRACKET constant_expression RSBRACKET
                             
 `,
    func: (p) => {
      if (p.length === 3) {
        p[0] = new DynamicArrayType();
      } else if (p.length === 4 && p[1] === "[") {
        p[0] = new ArrayType(void 0, p[2]);
      } else if (p.length === 4) {
        p[0] = new DynamicArrayType(p[1]);
      } else if (p.length === 5) {
        p[0] = new ArrayType(p[3], p[1]);
      } else {
        console.log(p.length, p);
        throw new Error();
      }
    }
  },
  {
    grammar: `type_name : TYPE_NAME`,
    func: (p) => {
      p[0] = new Node("TypeName");
      p[0].value = p[1];
    }
  },
  {
    grammar: `type_specifier_nonarray: VOID
                                      | FLOAT
                                      | DOUBLE
                                      | INT
                                      | UINT
                                      | BOOL
                                      | VEC2
                                      | VEC3
                                      | VEC4
                                      | DVEC2
                                      | DVEC3
                                      | DVEC4
                                      | BVEC2
                                      | BVEC3
                                      | BVEC4
                                      | IVEC2
                                      | IVEC3
                                      | IVEC4
                                      | UVEC2
                                      | UVEC3
                                      | UVEC4
                                      | MAT2
                                      | MAT3
                                      | MAT4
                                      | MAT2X2
                                      | MAT2X3
                                      | MAT2X4
                                      | MAT3X2
                                      | MAT3X3
                                      | MAT3X4
                                      | MAT4X2
                                      | MAT4X3
                                      | MAT4X4
                                      | DMAT2
                                      | DMAT3
                                      | DMAT4
                                      | DMAT2X2
                                      | DMAT2X3
                                      | DMAT2X4
                                      | DMAT3X2
                                      | DMAT3X3 
                                      | DMAT3X4
                                      | DMAT4X2
                                      | DMAT4X3
                                      | DMAT4X4
                                      | ATOMIC_UINT
                                      | SAMPLER1D
                                      | SAMPLER2D
                                      | SAMPLER3D
                                      | SAMPLERCUBE
                                      | SAMPLER1DSHADOW
                                      | SAMPLER2DSHADOW
                                      | SAMPLERCUBESHADOW
                                      | SAMPLER1DARRAY
                                      | SAMPLER2DARRAY
                                      | SAMPLER1DARRAYSHADOW
                                      | SAMPLER2DARRAYSHADOW
                                      | SAMPLERCUBEARRAY
                                      | SAMPLERCUBEARRAYSHADOW
                                      | ISAMPLER1D
                                      | ISAMPLER2D
                                      | ISAMPLER3D
                                      | ISAMPLERCUBE
                                      | ISAMPLER1DARRAY
                                      | ISAMPLER2DARRAY
                                      | ISAMPLERCUBEARRAY
                                      | USAMPLER1D
                                      | USAMPLER2D
                                      | USAMPLER3D
                                      | USAMPLERCUBE
                                      | USAMPLER1DARRAY
                                      | USAMPLER2DARRAY
                                      | USAMPLERCUBEARRAY
                                      | SAMPLER2DRECT
                                      | SAMPLER2DRECTSHADOW
                                      | ISAMPLER2DRECT
                                      | USAMPLER2DRECT
                                      | SAMPLERBUFFER
                                      | ISAMPLERBUFFER 
                                      | USAMPLERBUFFER
                                      | SAMPLER2DMS
                                      | ISAMPLER2DMS
                                      | USAMPLER2DMS
                                      | SAMPLER2DMSARRAY
                                      | ISAMPLER2DMSARRAY
                                      | USAMPLER2DMSARRAY
                                      | IMAGE1D
                                      | IIMAGE1D
                                      | UIMAGE1D
                                      | IMAGE2D
                                      | IIMAGE2D
                                      | UIMAGE2D
                                      | IMAGE3D
                                      | IIMAGE3D
                                      | UIMAGE3D
                                      | IMAGE2DRECT
                                      | IIMAGE2DRECT
                                      | UIMAGE2DRECT
                                      | IMAGECUBE
                                      | IIMAGECUBE
                                      | UIMAGECUBE
                                      | IMAGEBUFFER
                                      | IIMAGEBUFFER
                                      | UIMAGEBUFFER
                                      | IMAGE1DARRAY
                                      | IIMAGE1DARRAY
                                      | UIMAGE1DARRAY
                                      | IMAGE2DARRAY
                                      | IIMAGE2DARRAY
                                      | UIMAGE2DARRAY
                                      | IMAGECUBEARRAY
                                      | IIMAGECUBEARRAY
                                      | UIMAGECUBEARRAY
                                      | IMAGE2DMS
                                      | IIMAGE2DMS
                                      | UIMAGE2DMS
                                      | IMAGE2DMSARRAY
                                      | IIMAGE2DMSARRAY 
                                      | UIMAGE2DMSARRAY
                                      | struct_specifier
                                      | type_name 
 
    `,
    func: (p) => {
      p[0] = new VarType(p[1]);
    }
  },
  {
    grammar: `struct_declaration_list : struct_declaration
                                       | struct_declaration_list struct_declaration`,
    func: (p) => {
      if (p.length === 2) {
        p[0] = new Node("ExprList");
        p[0].push(p[1]);
      } else {
        p[0] = p[1];
        p[0].push(p[2]);
      }
    }
  },
  {
    grammar: `struct_declaration: type_specifier struct_declarator_list SEMI 
                                 | type_qualifier type_specifier struct_declarator_list SEMI`,
    func: (p) => {
      p[0] = new Node("StructMemberList");
      if (p.length === 4) {
        p[0].push(p[1]);
        p[0].push(p[2]);
      } else {
        p[0].push(p[2]);
        p[0].push(p[3]);
        p[2].qualifier = p[1];
      }
      for (let c of p[0][0]) {
        if (c.length < 1 || c[0].type !== "VarType") {
          c.insert(0, p[0][0]);
        }
      }
    }
  },
  {
    grammar: `struct_declarator_list: struct_declarator
                                     | struct_declarator_list COMMA struct_declarator`,
    func: (p) => {
      if (p.length === 2) {
        p[0] = new Node("ExprList");
        p[0].push(p[1]);
      } else {
        p[0] = p[1];
        p[0].push(p[3]);
      }
    }
  },
  {
    grammar: `struct_declarator: ID
                                | ID array_specifier`,
    func: (p) => {
      p[0] = new Node("StructMember");
      p[0].value = p[1];
      if (p.length > 2) {
        p[0].arraytype = p[2];
      }
    }
  },
  {
    grammar: `struct_specifier: STRUCT ID LBRACE struct_declaration_list RBRACE
                               | STRUCT LBRACE struct_declaration_list RBRACE 
 
 `,
    func: (p) => {
      p[0] = new Node("StructDecl");
      if (p.length > 5) {
        p[0].value = p[2];
        p[0].push(p[4]);
      } else {
        p[0].value = "(anonymous)";
        p[0].push(p[3]);
      }
      p.lexer.structs[p[0].value] = p[0];
    }
  },
  {
    grammar: "function_prototype_pop_scope: function_prototype",
    func: (p) => {
      p[0] = p[1];
      p.lexer.popScope();
    }
  },
  {
    grammar: `declaration: function_prototype_pop_scope SEMI
                          | init_declarator_list SEMI
                          | PRECISION precision_qualifier type_specifier SEMI
                          | type_qualifier ID LBRACE struct_declaration_list RBRACE SEMI
                          | type_qualifier ID LBRACE struct_declaration_list RBRACE ID SEMI
                          | type_qualifier ID LBRACE struct_declaration_list RBRACE ID array_specifier SEMI
                          | type_qualifier SEMI
                          | type_qualifier ID SEMI
                          | type_qualifier ID id_list SEMI

    `,
    func: (p) => {
      if (p.length === 3 && p[1].type === "InitDeclaratorList") {
        p[1].type = "StatementList";
        p[1].noScope = true;
        let type2 = p[1][0][0];
        for (let n2 of p[1]) {
          n2[0].value = type2.value;
          n2[0].qualifier = type2.qualifier;
        }
        p[0] = p[1];
      } else if (p.length === 5 && p[1] === "precision") {
        let n2 = new Node("Precision");
        n2.push(p[2]);
        n2.push(p[3]);
        p[0] = n2;
      } else if (p.length > 6) {
        let n2 = new Node("StructDecl");
        n2.value = p[2];
        n2.push(p[4]);
        p.lexer.structs[n2.value] = n2;
        n2.qualifier = p[1];
        if (p.length > 7) {
          let n22 = new Node("VarDecl");
          n22.push(n2);
          n22.value = p[6];
          p.lexer.scope[n22.value] = n22;
          if (p.length > 8) {
            let n3 = new Node("VarType");
            n3.value = p[7];
            p[7].type = n2[0];
            n2.replace(n2[0], n3);
          }
          p[0] = n22;
        } else {
          p[0] = n2;
        }
      } else if (n.length === 4) {
        p[0] = new Node("VarDecl");
        p[0].value = p[2];
        p[0].add(p[1]);
        p.lexer.scope[p[0].value] = p[0];
      } else if (n.length === 5) {
        let n2 = new Node("VarDecl");
        n2.value = p[2];
        n2.push(p[1]);
        p.lexer.scope[p[0].value] = n2;
        p[0] = new Node("StatementList");
        p[0].noScope = true;
        p[0].push(n2);
        for (let c of p[3]) {
          let n22 = new Node("VarDecl");
          n22.push(n2[0]);
          n22.value = c;
          p.lexer.scope[n22.value] = n22;
          p[0].push(n22);
        }
      } else {
        console.log(p);
        throw new Error("bad p length " + p.length);
      }
    }
  },
  {
    grammar: `id_list: COMMA ID
                      | id_list COMMA ID`,
    func: (p) => {
      if (p.length === 3) {
        p[0] = [p[2]];
      } else {
        p[0] = p[1];
        p[0].push(p[3]);
      }
    }
  },
  {
    grammar: `function_prototype: function_declarator RPAREN`,
    func: (p) => {
      p.lexer.pushScope();
      for (let c of p[1][0]) {
        p.lexer.scope[c.value] = c;
      }
      globalThis.fn = p[1];
      p[0] = p[1];
    }
  },
  {
    grammar: `function_declarator : function_header
                                   | function_header_with_parameters`,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `function_header_with_parameters : function_header parameter_declaration
                                               | function_header_with_parameters COMMA parameter_declaration`,
    func: (p) => {
      p[0] = p[1];
      if (p.length === 3) {
        p[0][1].push(p[2]);
      } else {
        p[0][1].push(p[3]);
      }
    }
  },
  {
    grammar: `function_header: fully_specified_type ID LPAREN`,
    func: (p) => {
      p[0] = new Node("Function");
      let n2 = new Node("VarType");
      n2.value = p[1];
      p[0].push(n2);
      p[0].push(new Node("ExprList"));
      p[0].value = p[2];
    }
  },
  {
    grammar: `parameter_declarator : type_specifier ID
                                    | type_specifier ID array_specifier`,
    func: (p) => {
      p[0] = new Node("VarDecl");
      p[0].push(p[1]);
      p[0].value = p[2];
      if (p.length === 4) {
        p[0].push(p[1]);
      }
    }
  },
  {
    grammar: `parameter_declaration: type_qualifier parameter_declarator
                                    | parameter_declarator
                                    | type_qualifier parameter_type_specifier
                                    | parameter_type_specifier
 `,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else if (p.length === 3) {
        p[0] = p[2];
        p[0].qualifier = p[1];
      }
    }
  },
  {
    grammar: `parameter_type_specifier : type_specifier`,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `init_declarator_list : single_declaration
                                    | init_declarator_list COMMA ID
                                    | init_declarator_list COMMA ID array_specifier
                                    | init_declarator_list COMMA ID array_specifier ASSIGN initializer
                                    | init_declarator_list COMMA ID ASSIGN initializer

`,
    func: (p) => {
      if (p.length === 2) {
        p[0] = new Node("InitDeclaratorList");
        p[0].push(p[1]);
        p[0].noScope = true;
      } else if (p.length === 4) {
        let n2 = new Node("VarDecl");
        n2.push(new Node("VarType"));
        n2.value = p[3];
        p[0] = p[1];
        p[0].push(n2);
      } else if (p.length === 5) {
        p[0] = p[1];
        let n2 = new Node("VarDecl");
        n2.push(p[4]);
        n2.value = p[3];
        p[0].push(n2);
      } else if (p.length === 6) {
        p[0] = p[1];
        let n2 = new Node("VarDecl");
        n2.push(new Node("VarType"));
        n2.value = p[3];
        n2.push(p[5]);
        p[0].push(n2);
      } else if (p.length === 7) {
        p[0] = p[1];
        let n2 = new Node("VarDecl");
        n2.push(p[4]);
        n2.value = p[3];
        n2.push(p[5]);
        p[0].push(n2);
      }
    }
  },
  {
    grammar: `single_declaration : fully_specified_type
                                  | fully_specified_type ID
                                  | fully_specified_type ID array_specifier ASSIGN initializer
                                  | fully_specified_type ID array_specifier
                                  | fully_specified_type ID ASSIGN initializer 

 `,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else {
        p[0] = new Node("VarDecl");
        p[0].value = p[2];
        let type2 = p[1];
        if (typeof type2 === "string") {
          let n2 = new Node("VarType");
          n2.value = new VarType(type2);
          type2 = n2;
        } else if (typeof type2 instanceof Node && type2.type === "Ident") {
          type2.type = "VarType";
          type2.value = new VarType(type2.value);
        }
        p[0].push(type2);
        if (p.length > 3 && p[3] !== "=") {
          p[0].arraytype = p[3];
          if (p.length > 5) {
            p[0].push(p[5]);
          }
        } else {
          if (p[4]) {
            p[0].push(p[4]);
          }
        }
      }
    }
  },
  {
    grammar: `fully_specified_type : type_specifier 
                                    | type_qualifier type_specifier`,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else {
        p[0] = p[2];
        if (typeof p[0] === "string") {
          p[0] = new Node("Ident");
          p[0].value = p[2];
        }
        p[0].qualifier = p[1];
      }
    }
  },
  {
    grammar: `invariant_qualifier : INVARIANT`,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `interpolation_qualifier : SMOOTH
                                       | FLAT
                                       | NOPERSPECTIVE
                                       `,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `layout_qualifier : LAYOUT LPAREN layout_qualifier_id_list RPAREN`,
    func: (p) => {
      p[0] = new Node("LayoutQualifier");
      p[0].push(p[3]);
    }
  },
  {
    grammar: `layout_qualifier_id_list : layout_qualifier_id
                                        | layout_qualifier_id_list COMMA layout_qualifier_id
                                        `,
    func: (p) => {
      if (p.length === 2) {
        p[0] = new Node("ExprList");
        p[0].push(p[1]);
      } else {
        p[0] = p[1];
        p[0].push(p[3]);
      }
    }
  },
  {
    grammar: `layout_qualifier_id : ID
                                   | ID ASSIGN constant_expression
                                   | SHARED`,
    func: (p) => {
      p[0] = new Node("LayoutQualifierId");
      if (p.length === 2) {
        p[0].value = p[1];
      } else {
        p[0].value = p[1];
        p[0].push(p[3]);
      }
    }
  },
  {
    grammar: `precise_qualifier : PRECISE`,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `type_qualifier : single_type_qualifier
                              | type_qualifier single_type_qualifier`,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
        if (typeof p[0] === "string") {
          p[0] = new Node("TypeQualifier");
          p[0].value = p[1];
        }
      } else {
        p[0] = p[2];
        if (typeof p[0] === "string") {
          p[0] = new Node("TypeQualifier");
          p[0].value = p[2];
        }
        p[0].qualifier = p[1];
      }
    }
  },
  {
    grammar: `single_type_qualifier: storage_qualifier
                                    | storage_qualifier
                                    | layout_qualifier
                                    | precision_qualifier
                                    | interpolation_qualifier
                                    | invariant_qualifier
                                    | precise_qualifier
                                     `,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `storage_qualifier: CONST
                                | INOUT
                                | IN
                                | OUT
                                | CENTROID
                                | PATCH
                                | SAMPLE
                                | UNIFORM
                                | BUFFER
                                | SHARED
                                | COHERENT
                                | VOLATILE
                                | RESTRICT
                                | READONLY
                                | WRITEONLY
                                | SUBROUTINE
                                | SUBROUTINE LPAREN type_name_list RPAREN
    `,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else if (p.length === 5) {
        p[0] = new Node("SubroutineQualifier");
        p[0].push(p[3]);
      } else {
        p[0] = p[1];
      }
    }
  },
  {
    grammar: `type_name_list: type_name
                             | type_name_list COMMA type_name
                             `,
    func: (p) => {
      if (p.length === 2) {
        p[0] = new Node("ExprList");
        let n2 = new Node("Ident");
        n2.value = p[1];
        p[0].push(n2);
      } else {
        p[0] = p[1];
        let n2 = new Node("Ident");
        n2.value = p[3];
        p[0].push(n2);
      }
    }
  },
  {
    grammar: `precision_qualifier: HIGH_PRECISION
                                  | MEDIUM_PRECISION
                                  | LOW_PRECISION
    `,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `initializer: assignment_expression
                          | LBRACE initializer_list RBRACE
                          | LBRACE initializer_list COMMA RBRACE

 `,
    func: (p) => {
      if (p.length === 2) {
        p[0] = new Node("ExprList");
        p[0].push(p[1]);
      } else {
        p[0] = p[2];
      }
    }
  },
  {
    grammar: `initializer_list: initializer
                               | initializer_list COMMA initializer`,
    func: (p) => {
      if (p.length === 2) {
        p[0] = new Node("ExprList");
        p[0].push(p[1]);
      } else {
        p[0] = p[1];
        p[0].push(p[3]);
      }
    }
  },
  {
    grammar: `declaration_statement: declaration`,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `statement: compound_statement  
                        | simple_statement
              `,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `simple_statement: declaration_statement
                               | expression_statement
                               | selection_statement
                               | switch_statement
                               | case_label
                               | iteration_statement
                               | jump_statement
`,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `compound_statement: LBRACE RBRACE
                                 | LBRACE statement_list RBRACE `,
    func: (p) => {
      if (p.length === 3) {
        p[0] = new Node("Expr");
      } else {
        p[0] = p[2];
      }
    }
  },
  {
    grammar: `statement_no_new_scope: compound_statement_no_new_scope
                                     | simple_statement 
    `,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `compound_statement_no_new_scope: LBRACE RBRACE
                                              | LBRACE statement_list RBRACE`,
    func: (p) => {
      if (p.length === 3) {
        p[0] = new Node("ExprList");
      } else {
        p[0] = p[2];
        p[0].noScope = true;
      }
    }
  },
  {
    grammar: `statement_list: statement
                             | statement_list statement 
              `,
    func: (p) => {
      if (p.length === 2) {
        p[0] = new Node("StatementList");
        if (p[1]) {
          p[0].push(p[1]);
        }
      } else {
        p[0] = p[1];
        if (p[2]) {
          p[0].push(p[2]);
        }
      }
    }
  },
  {
    grammar: `expression_statement: SEMI
                                   | expression SEMI`,
    func: (p) => {
      if (p.length === 2) {
        p[0] = new Node("Expr");
      } else {
        p[0] = p[1];
      }
    }
  },
  {
    grammar: `selection_statement: IF LPAREN expression RPAREN selection_rest_statement `,
    func: (p) => {
      p[0] = new Node("If");
      p[0].push(p[3]);
      p[0].push(p[5]);
    }
  },
  {
    grammar: `selection_rest_statement: statement ELSE statement
                                       | statement `,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else {
        p[0] = new Node("Else");
        p[0].push(p[1]);
        p[0].push(p[3]);
      }
    }
  },
  {
    grammar: `condition: expression
                        | fully_specified_type ID ASSIGN initializer `,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else {
        p[0] = new Node("Condition");
        p[0].push(p[1]);
        p[0].value = p[2];
        p[0].push(p[4]);
      }
    }
  },
  {
    grammar: `switch_statement: SWITCH LPAREN expression RPAREN LBRACE switch_statement_list RBRACE`,
    func: (p) => {
      p[0] = new Node("Switch");
      p[0].push(p[3]);
      p[0].push(p[6]);
    }
  },
  {
    grammar: `switch_statement_list:
                                    | statement_list`,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else if (p.length === 1) {
        p[0] = new Node("StatementList");
      }
    }
  },
  {
    grammar: `case_label: CASE expression COLON
                         | DEFAULT COLON`,
    func: (p) => {
      if (p.length === 3) {
        p[0] = new Node("DefaultCase");
      } else {
        p[0] = new Node("CaseNode");
        p[0].push(p[2]);
      }
    }
  },
  {
    grammar: `iteration_statement: WHILE LPAREN condition RPAREN statement_no_new_scope
                                  | DO statement WHILE LPAREN expression RPAREN SEMI
                                  | FOR LPAREN for_init_statement for_rest_statement RPAREN statement_no_new_scope`,
    func: (p) => {
      if (p[1] === "while") {
        p[0] = new Node("While");
        p[0].push(p[3]);
        p[0].push(p[5]);
      } else if (p[1] === "do") {
        p[0] = new Node("DoWhile");
        p[0].push(p[2]);
        p[0].push(p[5]);
      } else if (p[1] === "for") {
        p[0] = new Node("ForLoop");
        p[0].push(p[3]);
        p[0].push(p[4]);
        p[0].push(p[6]);
      }
    }
  },
  {
    grammar: `for_init_statement: expression_statement
                                 | declaration_statement
              `,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `conditionopt : condition
                            |
              `,
    func: (p) => {
      if (p.length === 2) {
        p[0] = p[1];
      } else {
        p[0] = new Node("Expr");
      }
    }
  },
  {
    grammar: `for_rest_statement: conditionopt SEMI
                                 | conditionopt SEMI expression
              `,
    func: (p) => {
      p[0] = new Node("ExprList");
      if (p.length === 3) {
        p[0].push(p[1]);
        p[0].push(new Node("Expr"));
      } else {
        p[0].push(p[1]);
        p[0].push(p[3]);
      }
    }
  },
  {
    grammar: `jump_statement: CONTINUE SEMI
                             | BREAK SEMI
                             | RETURN SEMI
                             | RETURN expression SEMI
                             | DISCARD SEMI /~ Fragment shader only ~/
                             `,
    func: (p) => {
      if (p[1] === "continue") {
        p[0] = new Node("Continue");
      } else if (p[1] === "break") {
        p[0] = new Node("Break");
      } else if (p[1] === "return") {
        p[0] = new Node("Return");
        if (p.length > 3) {
          p[0].push(p[2]);
        }
      } else if (p[1] === "discard") {
        p[0] = new Node("Discard");
      }
    }
  },
  {
    grammar: `external_declaration: function_definition
                                   | declaration 
              `,
    func: (p) => {
      p[0] = p[1];
    }
  },
  {
    grammar: `function_definition: function_prototype compound_statement_no_new_scope`,
    func: (p) => {
      p[0] = p[1];
      p.lexer.popScope();
      p[0].push(p[2]);
    }
  },
  {
    grammar: `translation_unit: external_declaration
                               | translation_unit external_declaration 
`,
    func: (p) => {
      if (p.length === 2) {
        p[0] = new Node("Program");
        if (p[1]) {
          p[0].push(p[1]);
        }
      } else {
        p[0] = p[1];
        if (p[2]) {
          p[0].push(p[2]);
        }
      }
    }
  }
];
var tokens = /* @__PURE__ */ new Set(["FIELD_SELECTION", "TYPE_NAME"]);
for (let key of keywords) {
  tokens.add(key);
}
for (let tk3 of tokendef) {
  tokens.add(tk3.name);
}
var t = [];
for (let token3 of tokens) {
  t.push(token3);
}
tokens = t;
var parser4;
function getParser2() {
  if (!parser4) {
    parser4 = getParser(lex2, parsedef, tokens, precedence, "glsl");
  }
  return parser4;
}
__name(getParser2, "getParser");
function initParser() {
  getParser2();
}
__name(initParser, "initParser");
function rebuildParser() {
  return getParser(lex2, parsedef, tokens, precedence, "glsl", true);
}
__name(rebuildParser, "rebuildParser");
function fullVisit(ast, cb) {
  function visit3(n2) {
    cb(n2);
    for (let c of n2) {
      visit3(c);
    }
  }
  __name(visit3, "visit");
  visit3(ast);
}
__name(fullVisit, "fullVisit");
function visit2(ast, handlers) {
  if (typeof handlers === "function") {
    return fullVisit(ast);
  }
  function visit3(n2) {
    if (typeof n2 === "string") {
      let n22 = new Node("Ident");
      n22.value = n2;
      n2 = n22;
    }
    let type2 = n2.type;
    if (type2 in handlers) {
      handlers[type2](n2);
    } else if ("Default" in handlers) {
      handlers.Default(n2);
    }
    for (let c of n2) {
      visit3(c);
    }
  }
  __name(visit3, "visit");
  visit3(ast);
}
__name(visit2, "visit");
function controlledVisit(ast, handlers, state2) {
  function descend(n2, state3, do_n = false) {
    if (state3 === void 0) {
      throw new Error("state cannot be undefined; use null if intentional");
    }
    if (do_n) {
      visit3(n2, state3);
      return;
    }
    for (let c of n2) {
      visit3(c, state3);
    }
  }
  __name(descend, "descend");
  function visit3(n2, state3) {
    if (typeof n2 === "string") {
      let n22 = new Node("Ident");
      n22.value = n2;
      n2 = n22;
    }
    if (n2.type in handlers) {
      handlers[n2.type](n2, state3, descend);
    } else if ("Default" in handlers) {
      handlers.Default(n2, state3, descend);
    }
  }
  __name(visit3, "visit");
  visit3(ast, state2);
}
__name(controlledVisit, "controlledVisit");

// generators/internal.js
var InternalCodeGen = class {
  static {
    __name(this, "InternalCodeGen");
  }
  constructor(ctx2, args2 = {}) {
    this.ctx = ctx2;
    this.args = args2;
  }
  genCode(ast) {
    let out = "";
    let _state = {
      indent: ""
    };
    let newState = /* @__PURE__ */ __name((state2) => {
      return {
        indent: state2.indent
      };
    }, "newState");
    traverse(ast, _state, {
      Number(node2, state2, visit3) {
        out += node2.value;
      },
      Ident(node2, state2, visit3) {
        out += node2.value;
      },
      IntConstant(node2, state2, visit3) {
        out += node2.value;
      },
      FloatConstant(node2, state2, visit3) {
        out += node2.value;
      },
      VarDecl(node2, state2, visit3) {
        let type2 = node2[0];
        let tname = "<error>";
        if (type2 && type2.value) {
          tname = type2.value.getTypeNameSafe();
        }
        if (type2) {
          let t2 = type2.value;
          let qual;
          if (t2.qualifier) {
            qual = t2.qualifier;
          }
          if (typeof qual === "object") {
            qual = qual.value;
          }
          if (qual) {
            tname = qual + " " + tname;
          }
        }
        out += tname + " " + node2.value;
      },
      ArrayLookup(node2, state2, visit3) {
        visit3(state2, node2[0]);
        out += "[";
        visit3(state2, node2[1]);
        out += "]";
      },
      Trinary(node2, state2, visit3) {
        out += "((";
        visit3(state2, node2[0]);
        out += ") ? (";
        visit3(state2, node2[1]);
        out += ") : (";
        visit3(state2, node2[2]);
        out += "))";
      },
      PreInc(node2, state2, visit3) {
        out += "++";
        visit3(state2, node2[0]);
      },
      PostInc(node2, state2, visit3) {
        visit3(state2, node2[0]);
        out += "++";
      },
      PreDec(node2, state2, visit3) {
        out += "--";
        visit3(state2, node2[0]);
      },
      PostDec(node2, state2, visit3) {
        visit3(state2, node2[0]);
        out += "--";
      },
      UnaryOp(node2, state2, visit3) {
        out += node2.op;
        visit3(state2, node2[0]);
      },
      Assign(node2, state2, visit3) {
        visit3(state2, node2[0]);
        out += " " + node2.op + " ";
        visit3(state2, node2[1]);
      },
      BinOp(node2, state2, visit3) {
        let paren = node2.op !== ".";
        paren = paren && node2.parent && node2.parent.type === "BinOp" && node2.parent.prec < node2.prec;
        if (paren) {
          out += "(";
        }
        visit3(state2, node2[0]);
        if (node2.op !== ".") {
          out += ` ${node2.op} `;
        } else {
          out += node2.op;
        }
        visit3(state2, node2[1]);
        if (paren) {
          out += ")";
        }
      },
      Function(node2, state2, visit3) {
        out += state2.indent;
        out += node2[0].value.getTypeName() + " ";
        out += node2.value + "(";
        let args2 = node2[1];
        for (let i2 = 0; i2 < args2.length; i2++) {
          if (i2 > 0) {
            out += ", ";
          }
          visit3(state2, args2[i2]);
        }
        out += ") {\n";
        let state22 = newState(state2);
        state22.indent += "  ";
        visit3(state22, node2[2]);
        out += state2.indent + "}\n";
      },
      Return(node2, state2, visit3) {
        out += "return";
        for (let n2 of node2) {
          out += " ";
          visit3(state2, n2);
        }
      },
      Call(node2, state2, visit3) {
        if (node2[0].type === "VarType") {
          out += node2[0].value.getTypeName();
        } else {
          visit3(state2, node2[0]);
        }
        out += "(";
        for (let i2 = 0; i2 < node2[1].length; i2++) {
          if (i2 > 0) {
            out += ", ";
          }
          visit3(state2, node2[1][i2]);
        }
        out += ")";
      },
      ExprList(node2, state2, visit3) {
        for (let i2 = 0; i2 < node2.length; i2++) {
          if (i2 > 0) {
            out += ", ";
          }
          visit3(state2, node2[i2]);
        }
      },
      StatementList(node2, state2, visit3) {
        let indent4 = state2.indent;
        for (let n2 of node2) {
          out += indent4;
          visit3(state2, n2);
          out += ";\n";
        }
      }
    });
    return out;
  }
  static generatorDefine() {
    return {
      typeName: "internal"
    };
  }
};
CodeGenerator.register(InternalCodeGen);
var internalCodeGen = new InternalCodeGen();

// core/parser.js
globalThis.count = /* @__PURE__ */ __name(function count2(s, chr) {
  let ci = 0;
  for (let i2 = 0; i2 < s.length; i2++) {
    if (s[i2] === chr) {
      ci++;
    }
  }
  return ci;
}, "count");
var tk2 = /* @__PURE__ */ __name((id, re, func) => new tokdef(id, re, func), "tk");
var keywords2 = /* @__PURE__ */ new Set([
  "in",
  "out",
  "uniform",
  "if",
  "else",
  "while",
  "do",
  "for",
  "return",
  "switch",
  "default",
  "case",
  "break",
  "continue",
  "struct",
  "function"
]);
var tokens2 = [
  tk2("ID", /[a-zA-Z$_]+[a-zA-Z0-9$_]*/, (t2) => {
    if (keywords2.has(t2.value)) {
      t2.type = t2.value.toUpperCase();
    }
    return t2;
  }),
  tk2("NUM", /-?[0-9]+(\.[0-9]*)?/, (t2) => {
    t2.origValue = "" + t2.value;
    t2.value = parseFloat(t2.value);
    return t2;
  }),
  tk2("ASSIGNPLUS", /\+=/),
  tk2("ASSIGNMINUS", /-=/),
  tk2("LPAREN", /\(/),
  tk2("RPAREN", /\)/),
  tk2("STRLIT", /"[^"\n\r]*"/, (t2) => {
    return t2;
  }),
  tk2("NL", /[\n\r]/, (t2) => {
    if (t2.value === "\n") {
      t2.lexer.lineno++;
      t2.lexer.line_lexstart = t2.lexer.lexpos;
    }
  }),
  tk2("WS", /[ \t]/, (t2) => {
  }),
  tk2("COMMA", /\,/),
  tk2("COLON", /:/),
  tk2("LSBRACKET", /\[/),
  tk2("RSBRACKET", /\]/),
  tk2("LBRACE", /\{/),
  tk2("RBRACE", /\}/),
  tk2("DOT", /\./),
  tk2("PLUS", /\+/),
  tk2("MINUS", /\-/),
  tk2("TIMES", /\*/),
  tk2("DIVIDE", /\//),
  tk2("EXP", /\*\*/),
  tk2("LAND", /\&\&/),
  tk2("BAND", /\&/),
  tk2("LOR", /\|\|/),
  tk2("BOR", /\|/),
  tk2("EQUALS", /=/),
  tk2("LEQUALS", /\<\=/),
  tk2("GEQUALS", /\>\=/),
  tk2("LTHAN", /\</),
  tk2("GTHAN", /\>/),
  tk2("MOD", /\%/),
  tk2("XOR", /\^/),
  tk2("BITINV", /\~/),
  tk2("SEMI", /;/)
];
var lexer3 = new lexer(tokens2, (t2) => {
  console.log("Token error");
  return true;
});
var _parser = new parser2(lexer3);
var binops2 = /* @__PURE__ */ new Set([
  ".",
  "/",
  "*",
  "**",
  "^",
  "%",
  "&",
  "+",
  "-",
  "&&",
  "||",
  "&",
  "|",
  "<",
  ">",
  "==",
  "<=",
  ">=",
  "=",
  "+=",
  "-="
  //, "(", ")"
]);
var precedence3;
if (1) {
  let table = [
    ["call"],
    ["array"],
    ["."],
    ["**"],
    ["*", "/"],
    ["+", "-"],
    ["=", "+=", "-="]
    //["("],
    //[")"],
    //    [","],
    //    ["("]
  ];
  let pr = {};
  for (let i2 = 0; i2 < table.length; i2++) {
    for (let c of table[i2]) {
      pr[c] = i2;
    }
  }
  precedence3 = pr;
}
var primtypes = /* @__PURE__ */ new Set(["number", "boolean", "string", "symbol"]);
function printobj(obj) {
  if (primtypes.has(typeof obj)) {
    return "" + obj;
  }
  if (obj.toString && obj.toString !== Object.prototype.toString) {
    return obj.toString();
  }
  let s = "{\n";
  for (let k2 in obj) {
    s += `  ${k2}:  ${printobj(obj[k2])},
`;
  }
  s += "}\n";
  return s;
}
__name(printobj, "printobj");
function parse_intern(src, ctx2 = state) {
  let ret2;
  let parser5 = getParser2();
  state.parser = parser5;
  parser5.lexer.line_lexstart = 0;
  state.lexer = parser5.lexer;
  let ast = parser5.parse(src);
  if (ast) {
  }
  ret2 = state;
  ret2.ast = ast;
  return ret2;
}
__name(parse_intern, "parse_intern");
function parse_intern_old(s, ctx2 = state, start = "Run") {
  let p = parser.copy();
  ctx2._parser = p;
  ctx2.lexer = p.lexer;
  ctx2.lexer.line_lexstart = 0;
  let binstack = [];
  let tablvl = 0;
  let idstack = [];
  let idgen2 = 1;
  let curid = 0;
  let flvl = 0;
  function _dolog() {
    let s2 = "";
    for (let i2 = 0; i2 < arguments.length; i2++) {
      if (i2 > 0) {
        s2 += " ";
      }
      s2 += arguments[i2];
    }
    s2 = strong(s2);
    s2 = indent(flvl, "=", "blue") + s2;
    let s22 = "" + curid;
    while (s22.length < 2) {
      s22 = " " + s22;
    }
    s2 = "" + s22 + s2;
    let t2 = p.peek_i(0);
    let tv;
    if (t2) {
      tv = "" + t2.value;
      while (tv.length < 2) {
        tv = " " + tv;
      }
    } else {
      tv = "  ";
    }
    s2 = "" + tv + " " + s2;
    return s2;
  }
  __name(_dolog, "_dolog");
  function logstart() {
    idstack.push(curid);
    curid = idgen2++;
    let ret2 = _dolog(...arguments);
    flvl++;
    log2(ret2);
    return ret2;
  }
  __name(logstart, "logstart");
  function logend() {
    curid = idstack.pop();
    if (curid === void 0) {
      throw new Error("log stack error");
    }
    flvl--;
    let ret2 = _dolog("End", ...arguments);
    log2(ret2);
    return ret2;
  }
  __name(logend, "logend");
  function Value(t2) {
    if (t2 === void 0) {
      t2 = p.next();
    }
    while (t2 && t2.type === "RPAREN") {
    }
    if (t2 === void 0) {
      p.error(void 0, "Expected a value");
      return;
    }
    let n2 = new ASTNode();
    n2.value = t2.value;
    if (t2.type === "ID") {
      n2.type = "Ident";
    } else if (t2.type === "NUM") {
      n2.type = "Number";
    } else if (t2.type === "STRLIT") {
      n2.type = "StrLit";
    } else if (t2.type === "MINUS") {
      let t22 = p.peek_i(0);
      if (t22 && t22.type === "NUM") {
        p.next();
        n2.type = "Number";
        n2.value = -t22.value;
      } else if (t22 && t22.type === "ID") {
        p.next();
        n2.type = "Negate";
        let n22 = new ASTNode();
        n22.type = "Ident";
        n22.value = t22.value;
        n2.push(n22);
      } else {
        p.error(t2, "Expected a value, not '" + t2.value + "'");
      }
    } else {
      p.error(t2, "Expected a value, not '" + t2.value + "'");
    }
    return n2;
  }
  __name(Value, "Value");
  function expectInt() {
    let t2 = p.next();
    if (t2.type !== "NUM" || t2.origValue.search(/\./) >= 0) {
      p.error(n2, "Expected an integer");
    }
    let n2 = new ASTNode("Number");
    n2.value = t2.value;
    return n2;
  }
  __name(expectInt, "expectInt");
  function ArrayLookup(id = Value()) {
    logstart("ArrayLookup");
    p.expect("LSBRACKET");
    let n2 = new ASTNode("ArrayLookup");
    n2.push(id);
    n2.push(expectInt());
    p.expect("RSBRACKET");
    logend("ArrayLookup");
    return n2;
  }
  __name(ArrayLookup, "ArrayLookup");
  function FunctionCall(id = Value()) {
    logstart("FunctionCall");
    let n2 = new ASTNode("Call");
    let args2;
    if (p.peek_i(1).type === "RPAREN") {
      args2 = new ASTNode("ExprList");
    } else {
      args2 = Expr();
      if (args2.type !== "ExprList") {
        let n22 = new ASTNode("ExprList");
        n22.push(args2);
        args2 = n22;
      }
    }
    n2.push(id);
    n2.push(args2);
    logend("FunctionCall");
    return n2;
  }
  __name(FunctionCall, "FunctionCall");
  function bin_next(depth = 0) {
    let a2 = p.peek_i(0);
    let b = p.peek_i(1);
    logstart("bin_next", a2 ? a2.value : void 0, b ? b.value : void 0);
    if (b && b.type === "LSBRACKET") {
      let ret2 = ArrayLookup();
      logend("bin_next0");
      return ret2;
    } else if (b && b.type === "LPAREN") {
      let ret2 = FunctionCall();
      logend("bin_next1a");
      return ret2;
    }
    if (a2 && a2.type === "LPAREN") {
      let ret2 = Expr();
      logend("bin_next1");
      return ret2;
    }
    if (b && b.type === "RPAREN") {
      let ret2 = Value();
      logend("bin_next1b");
      return ret2;
    }
    if (a2 && a2.type === "RPAREN") {
      p.next();
      let next = bin_next(depth);
      console.log("BINEXT", next);
      exit();
      logend("bin_next2");
      return next;
      b.type = a2.type;
      b.value = a2.value;
      p.next();
      let c = p.peek_i(2);
      if (c && binops2.has(c.value)) {
        logend("bin_next3");
        return {
          value: b,
          op: c.value,
          prec: -100,
          parenclose: true
        };
      }
    }
    if (b && binops2.has(b.value)) {
      logend("bin_next4");
      return {
        value: a2,
        op: b.value,
        prec: precedence3[b.value],
        parenclose: false
      };
    } else {
      if (!a2) {
        p.error(void 0, "BinOp parse error");
      }
      let ret2 = Value();
      logend("bin_next5");
      return ret2;
    }
  }
  __name(bin_next, "bin_next");
  function BinOp(left, depth = 0) {
    let op = p.next();
    let right;
    logstart("BinOp", op);
    let n2;
    let prec = precedence3[op.value];
    let t2 = p.peek_i(0);
    if (t2 && t2.type === "RPAREN") {
      logend("BinOp1", op);
      return left;
    } else if (!t2) {
      logend("BinOp2", op);
      return left;
    }
    let r = bin_next(depth + 1);
    if (r instanceof ASTNode) {
      right = r;
    } else {
      if (r.prec > prec) {
        if (!n2) {
          n2 = new ASTNode("BinOp");
          n2.op = op.value;
          n2.prec = precedence3[op.value];
          n2.push(left);
        }
        n2.push(Value());
        logend("BinOp3", op);
        return n2;
      } else {
        if (r && r.parenclose) {
          console.log("R", printobj(r), "R");
          console.log("" + left, "op", "" + op, "op");
          console.log("" + right);
          console.log("N", "" + n2);
          console.log(bin_next());
          exit();
          n2 = new ASTNode();
          n2.op = r.op;
          n2.prec = precedence3[r.op];
        } else {
          right = BinOp(Value(), depth + 2);
        }
      }
    }
    n2 = new ASTNode("BinOp", op);
    n2.op = op.value;
    n2.prec = precedence3[op.value];
    n2.push(left);
    n2.push(right);
    logend("BinOp4", op ? op.value : void 0);
    return n2;
  }
  __name(BinOp, "BinOp");
  function Expr() {
    logstart("Expr");
    let t2 = p.peek_i(0);
    if (t2 && t2.type === "LPAREN") {
      p.next();
      let ret3 = Expr();
      logend("Expr1");
      return ret3;
    }
    let ret2 = Start();
    logend("Expr2");
    return ret2;
  }
  __name(Expr, "Expr");
  function Start() {
    tablvl++;
    logstart("Start");
    let ret2 = Value();
    while (!p.at_end()) {
      let t2 = p.peek_i(0);
      if (t2 === void 0) {
        break;
      }
      if (t2.type === "LPAREN") {
        ret2 = FunctionCall(ret2);
        log2("" + ret2);
        return ret2;
      } else if (t2.type === "LSBRACKET") {
        ret2 = ArrayLookup(ret2);
        t2 = p.peeknext();
      }
      if (binops2.has(t2.value)) {
        ret2 = BinOp(ret2);
      } else if (t2.type === "COMMA") {
        let n2 = new ASTNode();
        n2.type = "ExprList";
        p.next();
        n2.push(ret2);
        let n22 = Expr();
        if (n22.type === "ExprList") {
          for (let c of n22) {
            n2.push(c);
          }
        } else {
          n2.push(n22);
        }
        tablvl--;
        t2 = p.peeknext();
        if (t2.type === "RPAREN") {
        }
        logend("Start1");
        return n2;
      } else if (t2.type === "RPAREN") {
        log2("" + ret2);
        let t22 = p.peek_i(1);
        p.next();
        return ret2;
        if (t22 && t22.value && binops2.has(t22.value)) {
          ret2 = BinOp(ret2);
        } else {
          logend("Start2");
          return ret2;
        }
        log2("t", "" + t22);
        logend("Start2b");
        return ret2;
      } else if (t2.type === "SEMI") {
        if (!ret2) {
          ret2 = new ASTNode("NullStatement");
        }
        return ret2;
      } else {
        let n2 = Value();
        ret2.push(n2);
        logend("Start3");
        return ret2;
        log2(ret2.toString());
        p.error(t2, "Unexpected token " + t2.value);
      }
    }
    logend("Start4");
    tablvl--;
    return ret2;
  }
  __name(Start, "Start");
  function TypeOpt() {
  }
  __name(TypeOpt, "TypeOpt");
  function VarType2() {
    logstart("VarType");
    let type2 = p.expect("ID");
    if (!ctx2.hasType(type2)) {
      p.error(p.peek_i(0), "Unknown type " + type2);
    }
    let n2 = new ASTNode("Type");
    n2.value = ctx2.getType(type2);
    logend("VarType");
    return n2;
  }
  __name(VarType2, "VarType");
  function VarDecl() {
    logstart("VarDecl");
    let type2 = VarType2();
    let t2 = p.peeknext();
    if (t2 && t2.type === "LPAREN") {
      let id2 = type2;
      if (id2.type !== "Ident") {
        id2 = new ASTNode("Ident");
        id2.value = type2.value.getTypeName();
      }
      return FunctionCall(id2);
    }
    let id = p.expect("ID");
    let n2 = new ASTNode("VarDecl");
    n2.push(type2);
    n2.value = id;
    n2.modifiers = /* @__PURE__ */ new Set();
    logend("VarDecl");
    return n2;
  }
  __name(VarDecl, "VarDecl");
  function Statement() {
    logstart("Statement");
    let t2 = p.peeknext();
    if (!t2) {
      p.error(void 0, "Statement error");
    }
    let ret2 = void 0;
    if (t2.type === "ID" && ctx2.hasType(t2.value)) {
      let id = t2.value;
      ret2 = VarDecl();
    } else if (t2.type === "ID") {
      ret2 = Expr();
    }
    p.expect("SEMI");
    if (ret2 === void 0) {
      ret2 = new ASTNode("NullStatement");
    }
    logend("Statement");
    return ret2;
  }
  __name(Statement, "Statement");
  function FunctionDef() {
    logstart("FunctionDef");
    let type2 = VarType2();
    let name2 = p.expect("ID");
    p.expect("LPAREN");
    let fn = new ASTNode("Function");
    fn.value = name2;
    fn.push(type2);
    let args2 = new ASTNode("ExprList");
    fn.push(args2);
    ctx2.pushScope();
    while (!p.at_end()) {
      let t2 = p.peeknext();
      if (t2.type === "RPAREN") {
        break;
      } else if (t2.type === "COMMA") {
        p.next();
        continue;
      }
      let type3 = VarType2();
      let id = p.expect("ID");
      let n2 = new ASTNode("VarDecl");
      n2.value = id;
      n2.push(type3);
      ctx2.setScope(id, type3);
      args2.push(n2);
    }
    p.expect("RPAREN");
    p.expect("LBRACE");
    let body = StatementList();
    fn.push(body);
    p.expect("RBRACE");
    ctx2.popScope();
    logend("FunctionDef");
    return fn;
  }
  __name(FunctionDef, "FunctionDef");
  function StatementList() {
    logstart("StatementList");
    let n2 = new ASTNode("StatementList");
    while (!p.at_end()) {
      let t2 = p.peek_i(0);
      if (t2 && t2.type === "RBRACE") {
        break;
      }
      let n22 = Statement();
      n2.push(n22);
    }
    logend("StatementList");
    return n2;
  }
  __name(StatementList, "StatementList");
  function isType(t2) {
    return t2 && t2.type === "ID" && ctx2.hasType(t2.value);
  }
  __name(isType, "isType");
  function isInt(t2) {
    return t2 && t2.type === "NUM" && t2.value === Math.floor(t2.value);
  }
  __name(isInt, "isInt");
  function isFuncDefNext() {
    let t1 = p.peek_i(0);
    let t2 = p.peek_i(1);
    let t3 = p.peek_i(2);
    let ok = isType(t1);
    if (t2 && t2.value === "LSBRACKET") {
      let t4 = p.peek_i(3);
      let t5 = p.peek_i(4);
      let t6 = p.peek_i(5);
      ok = ok && t3 && isInt(t3);
      ok = ok && t4 && t4.value === "RSBRACKET";
      ok = ok && t5 && t5.type === "ID" && !isType(t5);
      ok = ok && t6 && t6.type === "LPAREN";
    } else {
      ok = ok && t2 && t2.type === "ID" && !isType(t2);
      ok = ok && t3 && t3.type === "LPAREN";
    }
    log2(t1, t2, t3, isType(t1));
    log2("isFuncDefNext:", ok);
    return ok;
  }
  __name(isFuncDefNext, "isFuncDefNext");
  function TopStatement() {
    logstart("TopStatement");
    let t2 = p.peeknext();
    if (t2.type === "IN" || t2.type === "OUT" || t2.type === "UNIFORM") {
      let modifier = t2.value;
      p.next();
      let ret2 = VarDecl();
      ret2.modifiers.add(modifier);
      let map2;
      if (t2.type === "IN") {
        map2 = ctx2.inputs;
      } else if (t2.type === "OUT") {
        map2 = ctx2.outputs;
      } else {
        map2 = ctx2.uniforms;
      }
      if (ret2.value in map2 || ret2.value in ctx2.scope) {
        p.error(t2, ret2.value + " is already declared");
      }
      ctx2.scope[ret2.value] = ret2;
      map2[ret2.value] = ret2;
      p.expect("SEMI");
      logend("TopStatement1");
      return ret2;
    } else if (isFuncDefNext()) {
      let ret2 = FunctionDef();
      logend("TopStatement2");
      return ret2;
    } else {
      let ret2 = Statement();
      logend("TopStatement3");
      return ret2;
    }
  }
  __name(TopStatement, "TopStatement");
  function Run() {
    let ret2 = [];
    ctx2.ast = new ASTNode("Program");
    while (!p.at_end()) {
      logstart("Run");
      ctx2.ast.push(TopStatement());
      logend("Run");
    }
    return ctx2.ast;
  }
  __name(Run, "Run");
  function Intern() {
    logstart("Intern");
    let ret2 = new ASTNode("StatementList");
    while (!p.at_end()) {
      if (isFuncDefNext()) {
        ret2.push(FunctionDef());
      } else {
        ret2.push(Statement());
      }
      while (p.optional("SEMI")) {
      }
    }
    if (ret2.length === 1) {
      ret2 = ret2[0];
    }
    ctx2.ast = ret2;
    logend("Intern");
  }
  __name(Intern, "Intern");
  p.errfunc = (tok) => {
    log2(ctx2.ast);
    return true;
  };
  let starts = {
    Run,
    Statement,
    Expr,
    TopStatement,
    FunctionDef,
    StatementList,
    Intern
  };
  Run.Statement = Statement;
  Run.TopStatement = TopStatement;
  Run.Expr = Expr;
  p.start = starts[start];
  p.parse(s);
  return ctx2;
}
__name(parse_intern_old, "parse_intern_old");
function parse(src, startNode, args2, lineOff = 0, lexposOff = 0, column = 0) {
  let src2 = "";
  let argi = 0;
  if (startNode !== void 0 && startNode.constructor === Array) {
    column = lexposOff ?? 0;
    lexposOff = lineOff ?? 0;
    lineOff = args2 ?? 0;
    args2 = startNode;
    startNode = void 0;
  }
  for (let i2 = 0; i2 < src.length; i2++) {
    let c = src[i2];
    let n2 = src[Math.min(i2 + 1, src.length - 1)];
    let n22 = src[Math.min(i2 + 2, src.length - 1)];
    let n3 = src[Math.min(i2 + 3, src.length - 1)];
    if (c === "$" && (n2 === "s" || n2 === "n")) {
      let ai = argi;
      if (!isNaN(parseInt(n22))) {
        n22 = parseInt(n22);
        ai = n22 - 1;
        i2++;
      } else {
        argi++;
      }
      let sub = args2[ai];
      if (typeof sub === "object" && sub instanceof ASTNode) {
        sub = internalCodeGen.genCode(sub);
      }
      src2 += sub;
      i2 += 1;
    } else {
      src2 += c;
    }
  }
  silence();
  console.log(src2);
  src2 = `
  void __TAG__() {
    ${src2}
  }
  `;
  pushParseState(src2, "internal");
  let ret2 = parse_intern(src2, void 0).ast;
  popParseState();
  let found = false;
  let findtag = /* @__PURE__ */ __name((n2) => {
    if (found) {
      return;
    }
    if (n2.type === "Function" && n2.value === "__TAG__") {
      ret2 = n2[2];
      found = true;
      return;
    }
    for (let n22 of n2) {
      findtag(n22);
    }
  }, "findtag");
  findtag(ret2);
  unsilence();
  let retnode;
  let find = /* @__PURE__ */ __name((n2) => {
    if (retnode) {
      return;
    }
    if (n2.type === startNode) {
      retnode = n2;
      return;
    }
    for (let n22 of n2) {
      find(n22);
    }
  }, "find");
  let rec = /* @__PURE__ */ __name((n2) => {
    n2.line = lineOff;
    n2.lexpos = lexposOff;
    n2.col = column;
    for (let n22 of n2) {
      rec(n22);
    }
  }, "rec");
  if (startNode) {
    find(ret2);
  } else {
    retnode = ret2;
  }
  if (retnode && retnode.type === "Program" && startNode !== "Program") {
    retnode.type = "StatementList";
  }
  if (retnode) {
    rec(retnode);
  }
  return retnode;
}
__name(parse, "parse");
function test() {
  let ast = parse_intern(`ssss(1, 2);`).ast;
  console.log(internalCodeGen.genCode(ast));
  parse(`
void main() {
  point.x += $n1;
  point.z += $s2;
}
`, "Call", [ast, "b"]);
}
__name(test, "test");

// transform/process_ast.js
function exit4() {
  process.exit(0);
}
__name(exit4, "exit");
function log3() {
}
__name(log3, "log");
var typeConv = /* @__PURE__ */ new Set([
  "float",
  "int",
  "bool"
]);
var swizzlesizes = {
  1: "float",
  2: "vec2",
  3: "vec3",
  4: "vec4"
};
var swizzlemap = {
  x: 0,
  y: 1,
  z: 2,
  w: 3,
  r: 0,
  g: 1,
  b: 2,
  a: 3,
  u: 0,
  v: 1,
  t: 2
};
var swizzlecode = `

vec2 swizzle_vec3_xy(vec3 v) {
  return vec2(v[0], v[1]);
}
`;
function makeSwizzles2() {
  let map2 = {};
  let codeset = {};
  let codeget = {};
  let axes = "xyzw";
  let out = [];
  let out2 = [];
  let typemap = {
    2: "vec2",
    3: "vec3",
    4: "vec4"
  };
  let rec = /* @__PURE__ */ __name((s, axes2, axis, depth) => {
    if (depth < 0) {
      return "";
    }
    s += axes[axis];
    axes2.push(axis);
    let type2 = typemap[s.length];
    if (s.length > 1) {
      map2[s] = axes2;
      let code22 = "";
      let code3 = type2 + "(";
      for (let i2 = 0; i2 < s.length; i2++) {
        if (i2 > 0) {
          code3 += ", ";
        }
        code22 += `$n1[${axes2[i2]}] = $n2[${i2}];
`;
        code3 += `$n1[${axes2[i2]}]`;
      }
      code3 += ")";
      codeget[s] = code3 + ";";
      codeset[s] = code22;
    }
    for (let i2 = 0; i2 < axes.length; i2++) {
      let axes3 = axes2.concat([]);
      if (s.search(axes[i2]) < 0) {
        rec(s, axes3, i2, depth - 1);
      }
    }
    return s;
  }, "rec");
  function gen(axesin) {
    axes = axesin;
    for (let i2 = 0; i2 < axes.length; i2++) {
      rec("", [], i2, axes.length);
    }
  }
  __name(gen, "gen");
  gen("xyzw");
  gen("rgba");
  gen("uvt");
  return {
    map: map2,
    codeget,
    codeset
  };
}
__name(makeSwizzles2, "makeSwizzles2");
var swizzlemap2 = makeSwizzles2();
function transformSwizzleSimple(ast, ctx2) {
  scopeWalk(ast, ctx2, {
    BasicMemberLookup(node2, ctx3) {
      let type2 = ctx3.getScope("this");
      let member = node2[1].value;
      if (node2[1].type !== "Ident") {
        return;
      }
      if (!(member in swizzlemap)) {
        return;
      }
      let idx = new ASTNode("IntConstant");
      node2.copyPosTo(idx);
      idx.value = swizzlemap[member];
      let n2 = new ASTNode("ArrayLookup");
      n2.push(node2[0]);
      n2.push(idx);
      node2.copyPosTo(n2);
      node2.copyPosTo(idx);
      let p = node2.parent;
      let ntype = ctx3.resolveType(swizzlesizes[member.length]);
      node2.parent.ntype = ntype;
      n2.ntype = ntype;
      node2.parent.replace(node2, n2);
    }
  });
}
__name(transformSwizzleSimple, "transformSwizzleSimple");
function transformSwizzleComplex(ast, ctx2) {
  let typemap = {
    1: "float",
    2: "vec2",
    3: "vec3",
    4: "vec4"
  };
  scopeWalk(ast, ctx2, {
    BasicMemberLookup(node2, ctx3) {
      let type2 = ctx3.getScope("this");
      let member = node2[1].value;
      if (node2[1].type !== "Ident") {
        return;
      }
      if (member.length < 2 || !(member in swizzlemap2.map)) {
        return;
      }
      type2 = ctx3.resolveType(typemap[member.length]);
      let axes = swizzlemap2.map[member];
      if (ASTNode.isAssign(node2.parent) && node2 === node2.parent[0]) {
        let val2 = node2.parent[1];
        let op = node2.parent.op;
        let v = ctx3.placeVarDecl(node2.parent, type2);
        v._istemp = true;
        let id = new ASTNode("Ident");
        id.value = v.value;
        let exprlist = new ASTNode("ExprList");
        let an = new ASTNode("Assign");
        an.op = op;
        an.push(id.copy());
        an.push(val2);
        exprlist.push(an);
        for (let i2 = 0; i2 < member.length; i2++) {
          let an2 = new ASTNode("Assign");
          an2.op = op;
          let base = node2[0].copy();
          let lookup = new ASTNode("ArrayLookup");
          lookup.push(base);
          lookup.push(axes[i2]);
          an2.push(lookup);
          lookup = new ASTNode("ArrayLookup");
          lookup.push(id.copy());
          lookup.push(i2);
          an2.push(lookup);
          exprlist.push(an2);
        }
        node2.parent.parent.replace(node2.parent, exprlist);
      }
    }
  });
  scopeWalk(ast, ctx2, {
    BasicMemberLookup(node2, ctx3) {
      let type2 = ctx3.getScope("this");
      let member = node2[1].value;
      if (node2[1].type !== "Ident") {
        return;
      }
      if (member.length < 2 || !(member in swizzlemap2.map)) {
        return;
      }
      let axes = swizzlemap2.map[member];
      if (!(ASTNode.isAssign(node2.parent) && node2 === node2.parent[0])) {
        let code3 = swizzlemap2.codeget[member];
        let n2 = parse(code3, "Call", [node2[0]], node2.line, node2.lexpos);
        if (n2.type !== "Call") {
          throw new Error("internal parse error");
        }
        let ntype = ctx3.resolveType(swizzlesizes[member.length]);
        node2.parent.replace(node2, n2);
      }
    }
  });
}
__name(transformSwizzleComplex, "transformSwizzleComplex");
function transformOps(ast, ctx2) {
  function safeTypeGet(n2) {
    if (n2.ntype) {
      return n2.ntype;
    }
    if (n2.type === "Ident") {
      n2.ntype = ctx2.resolveType(ctx2.getScope(n2.value));
    } else if (n2.type === "IntConstant") {
      n2.ntype = ctx2.resolveType("int");
    } else if (n2.type === "FloatConstant") {
      n2.ntype = ctx2.resolveType("float");
    } else if (n2.type === "VarType") {
      n2.ntype = ctx2.resolveType(n2.value);
    } else if (n2.type === "BoolConstant" || n2.type === "BooleanConstant") {
      n2.ntype = ctx2.resolveType("bool");
    }
    return n2.ntype;
  }
  __name(safeTypeGet, "safeTypeGet");
  let types = {
    float: ctx2.resolveType("float"),
    vec2: ctx2.resolveType("vec2"),
    vec3: ctx2.resolveType("vec3"),
    mat4: ctx2.resolveType("mat4"),
    mat3: ctx2.resolveType("mat3"),
    int: ctx2.resolveType("int"),
    bool: ctx2.resolveType("bool")
  };
  scopeWalk(ast, ctx2, {
    Assign(node2, ctx3) {
      if (node2.op === "=") {
        return;
      }
      this.BinOp(node2, ctx3);
    },
    BinOp(node2, ctx3) {
      let isAssign = node2.type === "Assign";
      let p = node2;
      while (p) {
        if (p.type === "Function" && p.value.startsWith("_$_$_")) {
          return;
        }
        p = p.parent;
      }
      let t1 = safeTypeGet(node2[0]);
      let t2 = safeTypeGet(node2[1]);
      if (!t1 || !t2) {
        log3("" + node2);
        ctx3.error(node2, "Type system could not resolve types");
      }
      let isint1 = ctx3.typesEqual(t1, types["int"]);
      let isint2 = ctx3.typesEqual(t2, types["int"]);
      if (isint1 ^ isint2) {
        log3("" + node2);
        ctx3.error(node2, "Cannot do mixed math on integer and floats");
      }
      let isbase1 = ctx3.typesEqual(t1, types["float"]) || ctx3.typesEqual(t1, types["bool"]);
      let isbase2 = ctx3.typesEqual(t2, types["float"]) || ctx3.typesEqual(t1, types["bool"]);
      if (isbase1 && isbase2) {
        return;
      }
      let key = opnames[node2.op];
      let key1 = t1.getTypeNameSafe();
      let key2 = t2.getTypeNameSafe();
      if (!key) {
        ctx3.error(node2, `Unsupported op ${node2.op} for ${key1}/${key2}`);
      }
      key = `_$_$_${key}_${key1}_${key2}`;
      if (!(key in ctx3.poly_keymap)) {
        ctx3.error(node2, "Unknown operator overload function " + key);
      }
      let id = new ASTNode("Ident");
      id.value = key;
      let call = new ASTNode("Call");
      call.ntype = t1.getComponents() > t2.getComponents() ? t1 : t2;
      call.push(id);
      let args2 = new ASTNode("ExprList");
      args2.push(node2[0]);
      args2.push(node2[1]);
      call.push(args2);
      if (isAssign) {
        node2.op = "=";
        node2.replace(node2[1], call);
      } else {
        node2.parent.replace(node2, call);
      }
    }
  }, false, true);
}
__name(transformOps, "transformOps");
function getFinders(ctx2, typemap, argmap) {
  function findType(n2, ignoreCalls = false, arrDepth = 0) {
    if (n2.type === "Ident") {
      return ctx2.resolveType(ctx2.scope[n2.value]);
    } else if (n2.type === "BinOp") {
      let t1 = findType(n2[0], ignoreCalls, arrDepth);
      let t2 = findType(n2[1], ignoreCalls, arrDepth);
      if (!t1 || !t2) {
        return void 0;
      }
      t1 = ctx2.resolveType(t1);
      t2 = ctx2.resolveType(t2);
      let n1 = t1.getComponents();
      let n22 = t2.getComponents();
      return n1 === 1 ? t2 : t1;
    } else if (ASTNode.isAssign(n2)) {
      if (n2.ntype) {
        return n2.ntype;
      }
      return findType(n2[0], ignoreCalls, arrDepth);
    } else if (n2.type === "VarDecl") {
      return n2[0];
    } else if (n2.type === "ArrayLookup") {
      let type2;
      type2 = findType(n2[0], ignoreCalls, arrDepth - 1);
      if (!(type2 instanceof ArrayType) && !(type2 instanceof DynamicArrayType)) {
        log3("type:", "" + type2);
        ctx2.error(n2, "Not an array");
      }
      if (arrDepth > 0) {
        return ctx2.resolveType(type2);
      } else {
        return ctx2.resolveType(type2.type);
      }
    } else if (n2.type === "Call") {
      if (typemap.has(n2)) {
        return typemap.get(n2);
      }
      if (ignoreCalls) {
        return;
      }
      Call(n2, ctx2, false);
      return typemap.get(n2);
    } else if (n2.type === "FloatConstant") {
      return ctx2.getType("float");
    } else if (n2.type === "IntConstant") {
      return ctx2.getType("int");
    } else if (n2.type === "UnaryOp") {
      return findType(n2[0], ignoreCalls, arrDepth);
    } else if (n2.type === "PostDec" || n2.type === "PreDec" || n2.type === "PostInc" || n2.type === "PreInc") {
      return findType(n2[0], ignoreCalls, arrDepth);
    }
  }
  __name(findType, "findType");
  function Call(node2, ctx3, process2 = true) {
    let name2 = node2[0];
    let type2;
    if (name2.type === "VarType") {
      type2 = name2.value;
      name2 = name2.value.getTypeName();
      typemap.set(node2, type2);
    } else {
      name2 = name2.value;
      if (node2.parent) {
        type2 = findTypeUp(node2.parent);
      }
      if (!type2) {
        ctx3.error(node2, "Unknown type for function " + name2);
      }
    }
    if (typeConv.has(name2)) {
      name2 += "_cast";
    }
    let args2 = [];
    let i2 = 0;
    for (let arg of node2[1]) {
      let type22 = ctx3.resolveType(findType(arg));
      if (!type22) {
        log3("" + arg.parent.parent.parent);
        ctx3.error(arg, "Unknown type for argument " + (i2 + 1));
      }
      args2.push(type22);
      i2++;
    }
    type2 = ctx3.resolveType(type2);
    let key = ctx3.buildPolyKey(name2, type2, args2);
    if (!(key in ctx3.functions)) {
      console.log("" + node2.parent.parent);
      ctx3.error(node2, "Unknown function " + key);
    }
    argmap.set(node2, args2);
    typemap.set(node2, type2);
  }
  __name(Call, "Call");
  function buildPolyCandidates(p, idx = 0) {
    let type2;
    if (argmap.has(p)) {
      let ftype = argmap.get(p);
      return ftype[idx];
    }
    let candidates = [];
    let name2 = p[0];
    if (name2.type === "VarType") {
      name2 = name2.value.getTypeName();
    } else {
      name2 = name2.value;
    }
    name2 = name2.trim();
    if (typeConv.has(name2)) {
      name2 += "_cast";
    }
    let fs = ctx2.poly_namemap[name2];
    if (fs && fs.size === 1) {
      for (let f of fs) {
        if (f.args.length !== p[1].length) {
          ctx2.error(p, "Wrong number of function parameters for ", name2);
        }
        p.ntype = f.type;
        for (let i2 = 0; i2 < p[1].length; i2++) {
          p[1].ntype = f.args[i2].ntype;
        }
        return [f];
      }
    }
    let funcs = ctx2.poly_namemap[name2];
    if (!funcs) {
      console.log("" + p);
      ctx2.error(p, "Unknown function " + name2);
    }
    let args2 = [];
    for (let arg of p[1]) {
      args2.push(findType(arg, true));
    }
    let match;
    if (p.ntype !== void 0) {
      type2 = p.ntype;
    } else if (typemap.has(p)) {
      type2 = typemap.get(p);
    } else {
    }
    let resolveType = /* @__PURE__ */ __name((n2) => {
      if (typeof n2 === "string" || n2 instanceof VarType) {
        return ctx2.resolveType(n2);
      }
      if (n2.type === "FloatConstant") {
        return resolveType("float");
      }
      if (n2.type === "IntConstant") {
        return resolveType("int");
      }
      if (n2.type === "BoolConstant" || n2.type === "BooleanConstant") {
        return resolveType("bool");
      }
      if (n2.type === "VarType") {
        return resolveType(n2.value);
      }
      if (n2.type === "Ident") {
        return resolveType(ctx2.getScope(n2.value));
      }
      if (n2.ntype) {
        return resolveType(n2.ntype);
      }
      if (n2.type === "BinOp") {
        return resolveType(n2[0]) || resolveType(n2[1]);
      }
    }, "resolveType");
    if (type2) {
      type2 = ctx2.resolveType(type2);
    } else {
      type2 = findType(p, true);
    }
    for (let c of funcs) {
      if (type2 !== void 0 && !ctx2.typesEqual(type2, c.type)) {
        continue;
      }
      if (c.args.length !== args2.length) {
        continue;
      }
      let ok = true;
      let totmatch = 0;
      for (let i2 = 0; i2 < c.args.length; i2++) {
        if (args2[i2] !== void 0 && !ctx2.typesEqual(args2[i2], c.args[i2])) {
          ok = false;
          break;
        }
        if (args2[i2] !== void 0) {
          totmatch++;
        }
      }
      if (totmatch === c.args.length) {
        match = c;
      }
      if (ok) {
        candidates.push(Object.assign({ totmatch }, c));
      }
    }
    candidates = candidates.filter((f) => f.key in ctx2.poly_keymap);
    return candidates;
  }
  __name(buildPolyCandidates, "buildPolyCandidates");
  function guessPolyFunc(p, idx) {
    let candidates = buildPolyCandidates(p, idx);
    if (idx < 0 || idx === void 0) {
      ctx2.error(node, "Internal parser error");
    }
    let count4 = 0;
    for (let c of candidates) {
      if (c.totmatch === c.args.length) {
        count4++;
      }
    }
    if (candidates.length === 0) {
      let key = name + "(";
      for (let i2 = 0; i2 < args.length; i2++) {
        let arg = args[i2];
        if (i2 > 0) {
          key += ", ";
        }
        if (!args) {
          key += "<unknown>";
        } else {
          key += arg.getTypeNameSafe();
        }
      }
      console.warn(node, "No overloaded function found for " + key);
    }
    if (count4 > 0) {
      let msg = "Ambiguous polymorphic function call; candidates are:\n";
      for (let c of candidates) {
        msg += "  " + c.key + "\n";
      }
      ctx2.error(node, msg);
    }
    let match;
    if (count4 === 0) {
      candidates.sort((a2, b) => b.totmatch - a2.totmatch);
      match = candidates[0];
    }
    if (!match) {
      console.log("" + node);
      ctx2.error(node, "Failed to resolve polymorphic function call");
    }
    let type2 = ctx2.resolveType(match.args[idx]);
    return type2;
  }
  __name(guessPolyFunc, "guessPolyFunc");
  function findTypeUp(n2) {
    let p = n2;
    let type2;
    let lastp = p;
    let lastp2 = p;
    let arrDepth = 0;
    while (p) {
      log3(termColor2(p.type, "green"));
      if (ASTNode.isAssign(p)) {
        if (p.ntype !== void 0) {
          return p.ntype;
        }
        type2 = findType(p, true, arrDepth);
        break;
      } else if (p.type === "Return") {
        type2 = ctx2.getReturnType();
        break;
      } else if (p.type === "VarDecl") {
        type2 = p[0];
        break;
      } else if (p.type === "StatementList") {
        break;
      } else if (p.type === "ArrayLookup" && p[0] === lastp) {
        log3(termColor2("  left", "green"));
        arrDepth++;
      } else if (p.type === "ArrayLookup" && p[0] !== lastp) {
        log3(termColor2("  right", "green"));
        let type22 = findType(p[0], true);
        if (type22) {
          type2 = ctx2.resolveType(type22);
        }
        if (type2 && arrDepth > 0) {
          return type2;
        }
      } else if (p.type === "Call" && p !== n2) {
        let idx = p[1].indexOf(lastp2);
        type2 = guessPolyFunc(p, idx);
        break;
      }
      lastp2 = lastp;
      lastp = p;
      p = p.parent;
    }
    return type2;
  }
  __name(findTypeUp, "findTypeUp");
  return { findType, findTypeUp, Call, guessPolyFunc, buildPolyCandidates };
}
__name(getFinders, "getFinders");
function transformPolymorphism(ast, ctx2) {
  let typemap = /* @__PURE__ */ new Map();
  let argmap = /* @__PURE__ */ new Map();
  let doneset = /* @__PURE__ */ new Set();
  let { findType, buildPolyCandidates, findTypeUp, Call } = getFinders(ctx2, typemap, argmap);
  scopeWalk(ast, ctx2, {
    Call(node2, ctx3) {
      if (doneset.has(node2)) {
        return;
      }
      let args2 = [];
      let type2;
      let name2 = node2[0];
      if (name2.type === "VarType") {
        type2 = ctx3.resolveType(name2.value);
        name2 = name2.value.getTypeNameSafe();
      } else {
        name2 = name2.value;
        type2 = node2.ntype;
      }
      if (typeConv.has(name2)) {
        name2 += "_cast";
      }
      if (name2.startsWith("_$_")) {
        doneset.add(node2);
        return;
      }
      let count4 = 0;
      for (let arg of node2[1]) {
        args2.push(arg.ntype);
        if (arg.ntype) {
          count4++;
        }
      }
      let bad = count4 === 0;
      let cs;
      if (!bad && count4 < args2.length || !type2) {
        cs = buildPolyCandidates(node2, type2);
        if (type2 && cs.length > 1) {
          bad = true;
        } else if (!type2 && cs.length > 1) {
          for (let func2 of cs) {
            func2.totmatch = 0;
            for (let i2 = 0; i2 < args2.length; i2++) {
              let ok = args2[i2] !== void 0;
              ok = ok && ctx3.typesEqual(args2[i2], func2.args[i2]);
              if (ok) {
                func2.totmatch++;
              }
            }
          }
          cs = cs.filter((f) => f.totmatch > 0);
          if (cs.length > 1) {
            let cs2 = cs.map((f) => f.key).join("\n");
            ctx3.error("Could not resolve polymorphic function; candidates were:" + cs2);
          }
        }
      }
      if (bad) {
        console.log("" + type2);
        console.log(cs);
        console.log("" + node2);
        ctx3.error(node2, "Could not resolve polymorphic function call");
      }
      let func;
      if (count4 === args2.length && type2) {
        let key = ctx3.buildPolyKey(name2, type2, args2);
        func = ctx3.poly_keymap[key];
        if (!func) {
          ctx3.error(node2, "Unknown function " + name2 + " (" + key + ")");
        }
        log3(key, func, "" + node2);
      } else if (cs && cs.length === 1) {
        func = cs[0];
      } else {
        log3(type2, "" + node2, cs);
        buildPolyCandidates(node2, type2);
        ctx3.error(node2, "internal parse error");
      }
      let n2 = new ASTNode("Ident");
      n2.value = func.key;
      node2.ntype = ctx3.resolveType(func.type);
      node2.set(0, n2);
      node2._haskey = true;
      doneset.add(node2);
    }
  }, false, true);
}
__name(transformPolymorphism, "transformPolymorphism");
function initFuncKeyes(ast, ctx2) {
  scopeWalk(ast, ctx2, {
    Function(node2, ctx3) {
      let type2 = node2[0].value;
      let args2 = [];
      for (let arg of node2[1]) {
        args2.push(arg[0].value);
      }
      if (node2.value.startsWith("_$_")) {
        ctx3.addFunc(node2.value, type2, args2);
      } else {
        let key = ctx3.buildPolyKey(node2.value, type2, args2);
        node2.polyKey = key;
        ctx3.addPolyFunc(node2.value, type2, args2);
      }
    }
  });
}
__name(initFuncKeyes, "initFuncKeyes");
function propagateTypes(ast, ctx2, stage = 0) {
  let typemap = /* @__PURE__ */ new Map();
  let argmap = /* @__PURE__ */ new Map();
  let { findType, buildPolyCandidates, findTypeUp, Call } = getFinders(ctx2, typemap, argmap);
  let found = false;
  function update(node2, type2) {
    if (!node2.ntype || !ctx2.typesEqual(type2, node2.ntype)) {
      log3("Type update", "" + node2.ntype, "" + type2);
      found = true;
    }
    node2.ntype = ctx2.resolveType(type2);
  }
  __name(update, "update");
  function findTypeSimple(n2) {
    if (typeof n2 === "string") {
      return ctx2.resolveType(n2);
    }
    if (n2.ntype) {
      return n2.ntype;
    }
    if (n2.type === "Ident") {
      return ctx2.resolveType(ctx2.scope[n2.value]);
    }
    if (n2.type === "VarType") {
      return ctx2.resolveType(n2.value);
    }
    if (n2.type === "IntConstant") {
      return ctx2.getType("int");
    }
    if (n2.type === "FloatConstant") {
      return ctx2.getType("float");
    }
  }
  __name(findTypeSimple, "findTypeSimple");
  scopeWalk(ast, ctx2, {
    Assign(node2, ctx3) {
      let t1 = ctx3.resolveType(findTypeSimple(node2[0]));
      let t2 = ctx3.resolveType(findTypeSimple(node2[1]));
      if (t1) {
        update(node2, t1);
        update(node2[0], t1);
        if (!t2) {
          update(node2[1], t1);
          node2[1].ntype = t1;
        }
      }
    },
    Call(node2, ctx3) {
      let args2 = [];
      if (node2._haskey) {
        return;
      }
      for (let arg of node2[1]) {
        let type2 = findTypeSimple(arg);
        if (type2) {
          update(arg, type2);
        }
        args2.push(type2);
      }
      let name2 = node2[0];
      if (name2.type === "VarType") {
        let t1 = ctx3.resolveType(name2.value);
        if (t1) {
          update(node2, t1);
        }
        name2 = name2.value.getTypeName();
      } else {
        name2 = name2.value;
      }
      let func;
      if (name2.startsWith("_$_")) {
        func = ctx3.poly_keymap[name2];
      } else {
        let cs = buildPolyCandidates(node2);
        if (cs.length === 1) {
          func = cs[0];
        }
      }
      if (func) {
        for (let i2 = 0; i2 < node2[1].length; i2++) {
          node2[1].ntype = ctx3.resolveType(func.args[i2]);
        }
        let t2 = ctx3.resolveType(func.type);
        if (!node2.ntype || !ctx3.typesEqual(t2, node2.ntype)) {
          node2.ntype = t2;
        }
      }
    },
    ArrayLookup(node2, ctx3) {
      let t1 = ctx3.resolveType(findTypeSimple(node2[0]));
      if (t1) {
        update(node2, t1.type);
      }
    },
    BinOp(node2, ctx3) {
      let t1 = findTypeSimple(node2[0]);
      let t2 = findTypeSimple(node2[1]);
      if (t1 && t2) {
        t1 = ctx3.resolveType(t1);
        t2 = ctx3.resolveType(t2);
        let type2 = t1.getComponents() > t2.getComponents() ? t1 : t2;
        update(node2, type2);
      }
    },
    Return(node2, ctx3) {
      if (node2.length === 0) {
        return;
      }
      let type2 = ctx3.getReturnType() ?? findTypeSimple(node2[0]);
      if (type2) {
        update(node2, type2);
      }
    },
    UnaryOp(node2, ctx3) {
      let type2 = findTypeSimple(node2[0]);
      if (type2) {
        update(node2, type2);
      }
    },
    PostDec(node2, ctx3) {
      this.UnaryOp(node2, ctx3);
    },
    PreDec(node2, ctx3) {
      this.PostDec(node2, ctx3);
    },
    PostInc(node2, ctx3) {
      this.PostDec(node2, ctx3);
    },
    PreInc(node2, ctx3) {
      this.PreDec(node2, ctx3);
    }
  }, false, true);
}
__name(propagateTypes, "propagateTypes");
function transformAst(ast, ctx2) {
  log3("Processing AST tree. . .");
  transformSwizzleSimple(ast, ctx2);
  transformSwizzleComplex(ast, ctx2);
  initFuncKeyes(ast, ctx2);
  if (1) {
    for (let i2 = 0; i2 < 3; i2++) {
      propagateTypes(ast, ctx2);
    }
    transformPolymorphism(ast, ctx2);
    propagateTypes(ast, ctx2);
    propagateTypes(ast, ctx2);
    transformPolymorphism(ast, ctx2);
    propagateTypes(ast, ctx2);
    propagateTypes(ast, ctx2);
  }
  transformOps(ast, ctx2);
}
__name(transformAst, "transformAst");

// parser/preprocessor.js
function stripComments(code3) {
  let out = "";
  let next = /* @__PURE__ */ __name((i3) => {
    return i3 < code3.length - 1 ? code3[i3 + 1] : void 0;
  }, "next");
  let prev = /* @__PURE__ */ __name((i3) => {
    return i3 > 0 ? code3[i3 - 1] : void 0;
  }, "prev");
  let states2 = {
    main(i3) {
      if (code3[i3] === "/" && next(i3) === "/") {
        this.state = "linecomment";
        out += " ";
        return i3 + 1;
      } else if (code3[i3] === "/" && next(i3) === "*") {
        this.state = "comment";
        out += "  ";
        return i3 + 2;
      } else {
        out += code3[i3];
      }
      return i3 + 1;
    },
    linecomment(i3) {
      if (code3[i3] === "\n") {
        this.state = "main";
        out += "\n";
      } else {
        out += " ";
      }
      return i3 + 1;
    },
    comment(i3) {
      if (code3[i3] === "*" && next(i3) === "/") {
        this.state = "main";
        out += "  ";
        return i3 + 2;
      }
      if (code3[i3] === "\n") {
        out += "\n";
      } else {
        out += " ";
      }
      return i3 + 1;
    },
    ifstack: [],
    scope: {},
    state: "main"
  };
  let i2 = 0;
  while (i2 < code3.length) {
    let start = i2;
    i2 = states2[states2.state](i2);
    if (i2 === start) {
      i2++;
    }
  }
  return out;
}
__name(stripComments, "stripComments");
function preprocess(inCode) {
  let lex = new GLSLLexer();
  let code = stripComments(inCode);
  lex.input(code);
  function log() {
  }
  __name(log, "log");
  let lines = code.split("\n");
  let lines2 = [];
  function error(linenr, msg) {
    msg = "Error at line " + (linenr + 1) + ": " + msg + "\n\n" + lines[linenr] + "\n";
    console.error(msg);
    throw new Error(msg);
  }
  __name(error, "error");
  let collectargs = /* @__PURE__ */ __name((arg) => {
    let args2 = [""];
    let depth = 0;
    let j = 0;
    for (; j < arg.length; j++) {
      if (j > 500) {
        arg = arg.slice(0, 50) + ".....";
        error(-1, `Bad macro call ${k}(${arg})`);
      }
      if (arg[j] === ")" && depth === 1) {
        j++;
        break;
      } else if (arg[j] === "(" || arg[j] === "[" || arg[j] === "}") {
        depth++;
      } else if (arg[j] === ")" || arg[j] === "]" || arg[j] === "}") {
        depth--;
      } else if (arg[j] === ",") {
        args2.push("");
      } else {
        args2[args2.length - 1] += arg[j];
      }
    }
    return [args2, j];
  }, "collectargs");
  let isws = /* @__PURE__ */ __name((s) => {
    return s === " " || s === "	" || s === "\r" || s === "\n";
  }, "isws");
  let escape = /* @__PURE__ */ __name((re) => {
    return re;
  }, "escape");
  let boundary_re = `[ 
\r	()\\-=[]{}\\<\\>\\?.,\\/\\&*%@!~|;]|\\^`;
  let states = {
    res: {},
    res2: {},
    sortedmacros: [],
    sorteddefs: [],
    push(msg) {
      this.ifstack.push([this.enabled, this.pop_depth]);
      console.log("push", msg, this.ifstack, this.enabled);
    },
    pop(msg) {
      [this.enabled, this.pop_depth] = this.ifstack.pop();
      console.log("pop", msg, this.ifstack, this.enabled, this.pop_depth);
      return this.enabled;
    },
    sortmacros() {
      let list2 = Object.keys(this.macros);
      list2.sort((a2, b) => b.length - a2.length);
      this.sortedmacros = list2;
      list2 = Object.keys(this.defs);
      list2.sort((a2, b) => b.length - a2.length);
      this.sorteddefs = list2;
    },
    subst(s) {
      let found = 1;
      let _i = 0;
      while (found) {
        found = false;
        for (let def of this.sorteddefs) {
          let re = this.res[def];
          if (!re) {
            let b = boundary_re;
            re = `(${b}?)(${escape(def)})(${b}?)`;
            re = new RegExp(re, "g");
            this.res[def] = re;
          }
          if (s.search(re) >= 0) {
            found = 1;
          }
          s = s.replace(re, `$1${this.defs[def]}$3`);
        }
        for (let k2 of this.sortedmacros) {
          let re = this.res[k2];
          if (!re) {
            let b = boundary_re;
            re = `(${b}?)(${escape(k2)})(${b}?)`;
            re = new RegExp(re, "g");
            this.res[k2] = re;
          }
          let [args2, buf] = this.macros[k2];
          let i2 = s.search(re);
          if (i2 < 0) {
            continue;
          }
          let arg = s.slice(i2 + k2.length, s.length).trim();
          if (!arg.startsWith("(")) {
            continue;
          }
          let [args22, end] = collectargs(arg);
          let send = s.slice(i2 + k2.length + end, s.length);
          s = s.slice(0, i2);
          args22 = args22.map((f) => f.trim());
          for (let j = 0; j < args2.length; j++) {
            if (args2[j] === "") {
              continue;
            }
            let arg2 = j >= args22.length ? "" : args22[j];
            if (!(arg2 in this.res2)) {
              let b = boundary_re;
              let re3 = `(${b}?)(${escape(args2[j])})(${args2[j]}?)`;
              re3 = new RegExp(re3, "g");
              this.res2[k2] = re3;
            }
            let re2 = this.res2[arg2];
            buf = buf.replace(re2, arg2);
          }
          if (_i++ > 1e3) {
            error(-1, "Macro recursion detected");
            break;
          }
          s += buf;
          s += send;
          found = true;
        }
      }
      while (s.endsWith("\n") || s.endsWith("\r")) {
        s = s.slice(0, s.length - 1);
      }
      return s;
    },
    main(i) {
      let l = lines[i];
      if (!l.trim().startsWith("#")) {
        if (this.enabled) {
          l = this.subst(l);
          lines2.push(l);
        } else {
          lines2.push("");
        }
        return i + 1;
      }
      l = l.trim();
      while (i < lines.length - 1 && l.trim().endsWith("\\")) {
        i++;
        lines2.push("");
        l = l.slice(0, l.length - 1) + " " + lines[i].trim();
      }
      i++;
      l = l.trim().replace(/\t/g, " ");
      let parts = l.split(" ");
      let keyword = parts[0];
      keyword = keyword.slice(1, keyword.length).trim();
      let was_elif = false;
      let was_elif_enabled = false;
      let lastkeyword = this.last_keyword;
      this.last_keyword = keyword;
      let checkElseEnabled = /* @__PURE__ */ __name((msg) => {
        let enabled = true;
        for (let item of this.ifstack) {
          if (!item[0]) {
            enabled = false;
          }
        }
        log("check " + msg, this.ifstack, this.enabled, enabled && !this.enabled);
        return enabled && !this.enabled;
      }, "checkElseEnabled");
      if (keyword === "define") {
        if (parts.length === 1) {
          error(i, "Expected macro name");
        }
        let name2;
        let buf = parts.slice(1, parts.length).join(" ");
        for (let j = 0; j < buf.length; j++) {
          if (j >= buf.length || isws(buf[j]) || buf[j] === "(") {
            name2 = buf.slice(0, j).trim();
            buf = buf.slice(j, buf.length).trim();
            break;
          }
        }
        if (buf.startsWith("(")) {
          let [args2, end] = collectargs(buf);
          args2 = args2.map((f) => f.trim());
          buf = buf.slice(end, buf.length).trim();
          this.macros[name2] = [args2, buf];
          this.sortmacros();
        } else {
          this.defs[name2] = buf.trim();
          this.sortmacros();
        }
        lines2.push("");
        return i;
      } else if (keyword === "extension") {
        lines2.push("");
        return i;
      } else if (keyword === "elif") {
        let enabled = checkElseEnabled("elif");
        log("ELIF!", enabled, this.ifstack, this.enabled, enabled);
        this.enabled = enabled;
        this.push("elif");
        this.pop_depth++;
        if (enabled) {
          was_elif = true;
          was_elif_enabled = false;
          keyword = "if";
        } else {
          this.enabled = false;
          lines2.push("");
          return i;
        }
      }
      if (keyword === "ifdef") {
        this.push("ifdef");
        let name2 = parts[1].trim();
        this.enabled = name2 in this.macros || name2 in this.defs;
        lines2.push("");
        return i;
      } else if (keyword === "ifndef") {
        this.push("ifndef");
        let name2 = parts[1].trim();
        this.enabled = !(name2 in this.macros || name2 in this.defs);
        lines2.push("");
        return i;
      } else if (keyword === "else") {
        this.enabled = checkElseEnabled("else");
        lines2.push("");
        return i;
      } else if (keyword === "endif") {
        let count4 = this.pop_depth;
        for (let j = 0; j < count4; j++) {
          this.pop("endif");
        }
        lines2.push("");
        return i;
      } else if (keyword === "if") {
        let code = parts.slice(1, parts.length).join(" ");
        code = code.replace(/defined\((.*)\)/g, "defined('$1')");
        let defined = /* @__PURE__ */ __name((name2) => {
          return name2 in this.macros || name2 in this.defs;
        }, "defined");
        let val = eval(code);
        val = !!val;
        this.push("if");
        if (was_elif) {
          val ^= was_elif_enabled;
          this.pop_depth++;
        }
        this.enabled = val;
        log("#if", val, was_elif, was_elif_enabled, this.ifstack, this.pop_depthcfv);
        lines2.push("");
        return i;
      } else if (keyword === "undef") {
        let name2 = parts[1];
        delete this.macros[name2];
        delete this.defs[name2];
        delete this.res[name2];
        this.sortmacros();
        lines2.push("");
        return i;
      }
      lines2.push(this.subst(l));
      return i;
    },
    last_keyword: "",
    enabled: true,
    pop_depth: 1,
    macros: {},
    defs: {},
    ifstack: [],
    scope: {},
    state: "main"
  };
  let i = 0;
  while (i < lines.length) {
    let start = i;
    i = states[states.state](i);
    if (i === start) {
      i++;
    }
  }
  let ret = lines2.join("\n");
  log(ret);
  log("stack", states.ifstack);
  log("defs", states.defs, states.macros);
  log(lines.length, lines2.length);
  return ret;
}
__name(preprocess, "preprocess");

// core/mathl.js
var indent3 = indent;
function exit5() {
  process.exit();
}
__name(exit5, "exit");
var count3 = /* @__PURE__ */ __name((str, match) => {
  let c = 0;
  do {
    let i2 = str.search(match);
    if (i2 < 0) {
      break;
    }
    c++;
    str = str.slice(i2 + 1, str.length);
  } while (1);
  return c;
}, "count");
function findSlots(ctx2, ast) {
  walk(ast, {
    VarDecl(n2) {
      if (n2.length === 0) {
        return;
      }
      let type2 = n2[0];
      if (type2) {
        type2 = type2.value;
      }
      if (type2) {
        type2 = type2.qualifier;
      }
      if (type2 && typeof type2 !== "string" && type2.type === "TypeQualifier") {
        type2 = type2.value;
      }
      if (type2 && typeof type2 === "string") {
        type2 = type2.trim();
      }
      if (type2 === "uniform") {
        ctx2.uniforms[n2.value] = n2;
      } else if (type2 === "in") {
        ctx2.inputs[n2.value] = n2;
      } else if (type2 === "out") {
        ctx2.outputs[n2.value] = n2;
      }
    }
  });
}
__name(findSlots, "findSlots");
var compiledLibraryCode = void 0;
var lskey = "_mathl_library_code";
var libraryCodeVersion = 9;
function saveLibraryCode() {
  let s = JSON.stringify(compiledLibraryCode);
  if (typeof JSZip !== "undefined") {
    let s2 = "";
    for (let b of JSZip.deflate(s)) {
      s2 += String.fromCharCode(b);
    }
    s = btoa(s2);
  }
  localStorage[lskey] = s;
}
__name(saveLibraryCode, "saveLibraryCode");
function loadLibraryCode() {
  let buf = localStorage[lskey];
  if (typeof JSZip !== "undefined") {
    buf = atob(buf);
    buf = JSZip.inflate(buf);
    let s = "";
    for (let b of buf) {
      s += String.fromCharCode(b);
    }
    buf = s;
  }
  let json = JSON.parse(buf);
  if (json.version !== libraryCodeVersion) {
    throw new Error("Bad stdlib version; will have to recompile. . .");
  }
  let node2 = new ASTNode();
  node2.loadJSON(json);
  compiledLibraryCode = node2;
}
__name(loadLibraryCode, "loadLibraryCode");
function getLibraryCode() {
  const lskey2 = "_mathl_library_code";
  if (lskey2 in localStorage) {
    try {
      loadLibraryCode();
      return compiledLibraryCode;
    } catch (error2) {
      console.error(error2.stack);
      console.error(error2.message);
      console.error("error loading saved builtin library nodes");
    }
  }
  let parser5 = getParser2();
  pushParseState(libraryCode, "ibrary", void 0, libraryCode);
  popParseState();
  state.parser = parser5;
  parser5.lexer.line_lexstart = 0;
  state.lexer = parser5.lexer;
  compiledLibraryCode = parser5.parse(libraryCode);
  compiledLibraryCode.version = libraryCodeVersion;
  saveLibraryCode();
  return compiledLibraryCode;
}
__name(getLibraryCode, "getLibraryCode");
function parse2(src, filename2) {
  let ret2;
  try {
    let src2 = preprocess(src);
    let parser5 = getParser2();
    if (!compiledLibraryCode) {
      compiledLibraryCode = getLibraryCode();
    }
    pushParseState(src, filename2, void 0, src2);
    state.parser = parser5;
    parser5.lexer.line_lexstart = 0;
    state.lexer = parser5.lexer;
    let ast = parser5.parse(src2);
    let ast2 = new ASTNode("Program");
    for (let node2 of compiledLibraryCode) {
      ast2.push(node2.copy());
    }
    for (let node2 of ast) {
      ast2.push(node2);
    }
    ast = ast2;
    findSlots(state, ast);
    ret2 = state;
    ret2.ast = ast;
    if (0) {
      state.throwError = true;
      try {
        transformAst(ret2.ast, ret2);
      } catch (error2) {
        console.error("parse error");
      }
    } else {
      transformAst(ret2.ast, ret2);
    }
    popParseState();
  } catch (error2) {
    popParseState();
    throw error2;
  }
  return ret2;
}
__name(parse2, "parse");
function genCode(ctx2, type2, args2 = {}) {
  let cls = CodeGenerator.getGenerator(type2);
  let gen = new cls(ctx2, args2);
  return gen.genCode();
}
__name(genCode, "genCode");
function genJS(ctx2, args2 = {}) {
  return genCode(ctx2, "js", args2);
}
__name(genJS, "genJS");
window._parseGlsl = parse2;
function compileJS(code, filename) {
  let ctx = parse2(code, filename);
  let code2 = genJS(ctx);
  var program;
  try {
    eval(code2);
  } catch (error2) {
    console.log(code2);
    console.error(error2.stack);
    console.error(error2.message, error2);
    throw error2;
  }
  let ret = program();
  ret.sourceState = ctx;
  ret.sourceCode = code2;
  return ret;
}
__name(compileJS, "compileJS");
window._compileJS = compileJS;
export {
  compileJS,
  findSlots,
  genCode,
  genJS,
  parse2 as parse,
  preprocess,
  silence,
  unsilence
};
//!this.lexer.at_end()) {
//# sourceMappingURL=index.js.map
