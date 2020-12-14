import * as util from '../util/util.js';
import cconst from '../core/const.js';
import * as state from './state.js';
import {ArrayType, VarType} from './types.js';

function exit() {
  process.exit(-1);
}

export class ASTNode extends Array {
  constructor(type) {
    super();

    this.type = type;
    this.parent = undefined;

    this.line = state.state.line;
    this.lexpos = state.state.lexpos;
    this.col = state.state.col;
  }

  static equalsVarRef(n, vref) {
    let ok = false;

    if (vref[0].value instanceof ArrayType && n.type === "ArrayLookup") {
      ok = n[0].value === vref.value;
      ok = ok && n[1].value === vref[1].value;
    } else if (n.type === "Ident" && !(vref[0].value instanceof ArrayType)) {
      ok = vref.value === n.value;
    }

    return ok;
  }

  static VarRef(name, type, idx) {
    let n = new ASTNode("VarRef");
    n.value = name;

    n.push(type);

    if (type instanceof ArrayType) {
      let n2 = new ASTNode("IntConstant");
      n2.value = idx;

      n.push(n2);
    }

    return n;
  }

  static isAssign(node) {
    return node.type === "Assign";
    /*
    if (node.type !== "BinOp") {
      return false;
    }

    let op = node.op;
    let ok = false;

    ok = ok || op === "=";
    ok = ok || op === "+=";
    ok = ok || op === "-=";
    ok = ok || op === "|=";
    ok = ok || op === "&=";

    return ok;
    //*/
  }

  copyPosTo(b) {
    b.line = this.line;
    b.col = this.col;
    b.lexpos = this.lexpos;
  }

  copy() {
    let n = new ASTNode(this.type);

    n.line = this.line;
    n.lexpos = this.lexpos;
    n.col = this.col;

    n.value = this.value;

    for (let n2 of this) {
      n.push(n2.copy());
    }

    return n;
  }

  push(n) {
    if (n === undefined) {
      throw new Error("ASTNode.push got undefined");
    }

    if (typeof n === "number") {
      let isint = Math.abs(n - Math.floor(n)) < 0.00000001;

      let n2 = new ASTNode(isint ? "IntConstant" : "FloatConstant");
      n2.value = n;
      n = n2;
    } else if (typeof n === "string") {
      let n2 = new ASTNode("Ident");
      n2.value = n;
      n = n2;
    } else if (n instanceof VarType) {
      let n2 = new ASTNode("VarType");
      n2.value = n;
      n = n2;
    }

    n.parent = this;
    return super.push(n);
  }

  replace(a, b) {
    let idx = this.indexOf(a);

    if (idx < 0) {
      throw new Error("child not in node");
    }

    if (b.parent) {
      b.parent.remove(b);
    }
    a.parent = undefined;

    this[idx] = b;
    b.parent = this;

    return this;
  }

  remove(n) {
    let i = this.indexOf(n);

    if (i < 0) {
      console.log(n);
      throw new Error("item not in array");
    }

    while (i < this.length) {
      this[i] = this[i + 1];
      i++;
    }

    n.parent = undefined;
    this.length--;

    return this;
  }

  insert(starti, n) {
    if (n.parent) {
      n.parent.remove(n);
    }

    let i = this.length - 1;
    this.length++;

    while (i > starti) {
      this[i] = this[i - 1];
      i--;
    }

    n.parent = this;
    this[starti] = n;

    return this;
  }

  toString(t = 0) {
    let tab = util.indent(t, "-");

    let typestr = this.type;

    if (this.value !== undefined) {
      typestr += " : " + this.value;
    } else if (this.op !== undefined) {
      typestr += " (" + this.op + ")";
    }

    let s = tab + typestr + " { line:" + (this.line+1);

    if (this.length === 0) {
      s += "}\n";
    } else {
      s += "\n"
      for (let c of this) {
        s += c.toString(t + 1);
      }
      s += tab + "}\n";
    }

    if (t === 0) {
      s = termColor(s, "cyan")
    }

    return s;
  }
}

export function visit(root, nodetype, handler) {
  let rec = (n) => {
    if (n.type === nodetype) {
      handler(n);
    }

    for (let n2 of n) {
      rec(n2);
    }
  }

  rec(root);
}

export function traverse(root, state, handlers, log=false) {
  let visitset = new Set();

  handlers._visitset = visitset;

  let rec = (n, state, depth=0) => {
    if (visitset.has(n)) {
      return;
    }

    visitset.add(n);

    let visit = (state, nb) => {
      //do children in this case
      if (visitset.has(nb)) {
        visitset.delete(nb);

        for (let n2 of nb) {
          rec(n2, state, depth+1);
        }
      } else {
        rec(nb, state, depth+1);
      }
    }

    let key = n.type;

    if (log) {
      let tab = util.indent(depth, " ");
      let line = util.termColor(tab + key, "red")
      console.log(util.termPrint(line));
    }

    if (key in handlers) {
      visitset.add(n);
      handlers[key](n, state, visit);
      visitset.delete(n);
    } else if ("Default" in handlers) {
      visitset.add(n);
      handlers.Default(n, state, visit);
      visitset.delete(n);
    } else {
      visit(state, n);
    }
  }

  rec(root, state);
}

export function walk(root, handlers) {
  let rec = (n) => {
    let key = n.type;

    if (key in handlers) {
      handlers[key](n);
    } else if ("Default" in handlers) {
      handlers.Default(n);
    }

    for (let n2 of n) {
      rec(n2);
    }
  }

  rec(root);
}


export function scopeWalk(root, ctx, handlers) {
  ctx.pushScope();

  function visit(n) {
    if (n.type in handlers) {
      handlers[n.type](n, ctx);
    }
  }

  let handlers2 = {
    VarDecl(node, ctx, descend) {
      //ctx.setScope
      let name = node.value;
      let type = node[0].value

      ctx.setScope(name, type);

      visit(node);
      descend(ctx, node);
    },

    BinOp(node, ctx, descend) {
      let pop = false;

      if (node.op === ".") {
        pop = true;
        ctx.pushScope();
        let name;

        if (node[0].type === "Ident") {
          name = node[0].value;
        } else {
          name = '';
        }

        if (!(name in ctx.scope)) {
          ctx.error(node, name + " is not defined");
        }

        ctx.setScope("this", ctx.getScope(name));
      }

      visit(node);
      descend(ctx, node);

      if (pop) {
        ctx.popScope();
      }
    },

    Function(node, ctx, descend) {
      let name = node.value;

      let rtype = node[0].value;
      ctx.pushScope();
      ctx.setReturnType(rtype);

      /*
      for (let arg of node[1]) {
        let name = arg.value, type = arg[0].value;
        ctx.setScope(name, type);
      }*/

      visit(node);
      descend(ctx, node);

      ctx.popScope();
    },
    Default(node, ctx, descend) {
      visit(node);
      descend(ctx, node);
    }
  }

  traverse(root, ctx, handlers2);

  //console.log(""+root)
  ctx.popScope();
}

