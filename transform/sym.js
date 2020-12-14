import {Precedence} from '../parser/parser.js';

let Prec = Object.assign({}, Precedence);
//sym code internally builds exponential operators
Prec["**"] = {
  prec : Precedence["*"].prec-1,
  assoc : "left"
};

export const SymTypes = {
  BINOP: 0,
  CALL : 1,
  CONST: 2,
  VAR  : 3
};

export class Sym extends Array {
  constructor(type) {
    super();
    this.type = type;
    this.parent = undefined;
  }

  push(b) {
    if (b.parent !== undefined) {
      //make a deep copy
      b = b.copy();
    }

    super.push(b);
    b.parent = this;
  }

  //does deep copies!
  copy() {
    throw new Error("implement me!");
  }

  _copyChildren(b) {
    for (let c of b) {
      this.push(b.copy());
    }

    return this;
  }
}

export class ValueSym extends Sym {
  constructor(val) {
    super(SymTypes.CONST);
    this.value = val;
  }

  copy() {
    return new ValueSym(this.value);
  }

  toString() {
    return "" + this.value;
  }
}

export class VarSym extends Sym {
  constructor(varname) {
    super(SymTypes.VAR);
    this.value = varname;
  }

  copy() {
    return new VarSym(this.value);
  }
  toString() {
    return "" + this.value;
  }
}

export class ArrayVarSym extends VarSym {
  constructor(varname, idx) {
    super(varname);
    this.idx = idx;
  }

  copy() {
    let ret = new ArrayVarSym();

    ret.value = this.value;
    ret.idx = this.idx;

    return ret;
  }

  toString() {
    return `${this.value}[${this.idx}]`;
  }
}

export class BinOpSym extends Sym {
  constructor(a, b, op) {
    super(SymTypes.BINOP);

    if (a && b) {
      this.push(a);
      this.push(b);
    }

    this.op = op;

    this.parens = false;
  }

  copy() {
    let ret = new BinOpSym(this[0].copy(), this[1].copy(), this.op);
    ret.parens = this.parens;
    return ret;
  }

  toString() {
    let parens = this.parens;

    if (!parens && this.parent && this.parent instanceof BinOpSym) {
      let p1 = Prec[this.op].prec;
      let p2 = Prec[this.parent.op].prec;
      parens = p1 > p2;
    }

    let s = '';
    if (parens) {
      s += '('
    }

    s += `${this[0]} ${this.op} ${this[1]}`;
    if (parens) {
      s += ')';
    }

    return s;
  }
}

export class CallSym extends Sym {
  constructor(name, args) {
    super(SymTypes.CALL);

    this.value = name;

    if (args !== undefined) {
      for (let arg of args) {
        this.push(arg);
      }
    }
  }

  copy() {
    return new CallSym(this, this.map(f => f.copy()));
  }

  toString() {
    let s = `${this.value}(`;
    for (let i=0; i<this.length; i++) {
      if (i > 0) {
        s += ", ";
      }
      s += this[i];
    }

    return s + ")";
  }
}

export function sym(val) {
  if (typeof val === "number") {
    val = new ValueSym(val);
  } else if (typeof val === "string") {
    val = new VarSym(val);
  } else if (sym instanceof Sym) {
    return sym.copy();
  }

  return val;
}

export function checksym(s) {
  if (typeof s !== "object" || !(s instanceof Sym)) {
    s = sym(s);
  }

  return s;
}

export function call(name, args) {
  args = args.map((arg) => {
    if (typeof arg !== "object" || !(arg instanceof Sym)) {
      return sym(arg);
    }

    return arg;
  });

  return new CallSym(name, args);
}

export function avar(name, idx) {
  return new ArrayVarSym(name, idx);
}

let evals = {
  "+" : (a, b) => a + b,
  "-" : (a, b) => a - b,
  "*" : (a, b) => a * b,
  "/" : (a, b) => a / b,
  "**" : (a, b) => a ** b,
  "&&" : (a, b) => a && b,
  "||" : (a, b) => a || b,
  "==" : (a, b) => a === b,
  ">=" : (a, b) => a >= b,
  "<=" : (a, b) => a <= b,
  ">" : (a, b) => a > b,
  "<" : (a, b) => a < b,
};

let _n = 0;

export function binop(a, b, op) {
  a = checksym(a);
  b = checksym(b);

  if (op in evals && a instanceof ValueSym && b instanceof ValueSym) {
    let f = evals[op](a.value, b.value);
    return sym(f);
  }

  if (op === "+" && a.toString() === b.toString()) {
    return binop(2.0, a, "*");
  }

  if (op === "*" && a.toString() === b.toString()) {
    op = "**";
    b = sym(2);
  }

  /*
  let combine = op === "**" && a instanceof BinOpSym && a.op === "**";
  combine = combine && b instanceof ValueSym;
  combine = combine && a[1] instanceof ValueSym;
  //*/

  return new BinOpSym(a, b, op);
}

function makeBinOp(op) {
  return (a, b) => new BinOpSym(a, b, op);
}

let _binops = ["+", "-", "/", "*", "!=", "=", "==", ">=", "<=", "||", "&&", "^"];

export const binops = {};
for (let k of _binops) {
  binops[k] = makeBinOp(k);
}
