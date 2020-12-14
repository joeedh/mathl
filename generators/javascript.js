import {ArrayType, VarType} from '../core/types.js';
import * as util from '../util/util.js';
import {CodeGenerator} from './generator_base.js';
import {strong, indent, stronglog, log, termColor, termPrint} from '../util/util.js';

export let jslib = `
  let fract = function(f) { return f - Math.floor(f);};
  let tent = function(f) { return 1.0 - Math.abs(Math.fract(f)-0.5)*2.0;};
  let abs = Math.abs, sin = Math.sin, cos = Math.cos, log = Math.log, pow = Math.pow;
  let acos = Math.acos, asin = Math.asin, atan = Math.atan, atan2 = Math.atan2;
  let sqrt = Math.sqrt, exp = Math.exp, min = Math.min, max = Math.max, floor = Math.floor;
  let ceil = Math.ceil;

  function cachering(func, count) {
    this.list = new Array(count);
    this.length = count;
    
    for (let i=0; i<this.length; i++) {
      this.list[i] = func();
    }
    
    this.cur = 0;
    
    this.next = function() {
      let ret = this.list[this.cur];
      
      this.cur = (this.cur + 1) % this.length;
      
      return ret;
    }
  }
  
  let vec3cache = new cachering(() => [0, 0, 0], 2048);
  
  function vec3(a, b, c) {
    let ret = vec3cache.next();
    
    ret[0] = a;
    ret[1] = b;
    ret[2] = c;
    
    return ret;
  }
`

export class JSGenerator extends CodeGenerator {
  constructor(ctx, args) {
    super(ctx, args)
  }

  static generatorDefine() {
    return {
      typeName: "js"
    }
  }

  genCode(ast=this.ctx.ast) {
    let ctx = this.ctx;

    let outs = '';

    function out(s) {
      outs += s;
    }


    let inputs = '';
    for (let k in ctx.inputs) {
      if (inputs.length > 0) {
        inputs += ", ";
      } else {
        inputs = "let ";
      }

      inputs += k;
    }
    if (inputs.length > 0) {
      inputs += ";";
    }

    for (let k in ctx.uniforms) {
      let n = ctx.uniforms[k];
      let type = n[0];

      let init = "0";
      let setter = `    ${k} = val;`

      if (type.value instanceof ArrayType) {
        setter = '';

        init = "[";
        for (let i = 0; i < type.value.size; i++) {
          if (i > 0) {
            init += ",";
          }

          setter += `    ${k}[${i}] = val[${i}];\n`;

          init += "0";
        }
        init += "]"
      }


      let s = `
  
  let ${k} = ${init};
  function __set${k}(val) {
${setter}
  }
    `.trim();
      out("  " + s + "\n\n")
    }

    outs = `${jslib}
    
    program = function() {\n  let __outs;\n  ${inputs}\n\n` + outs;

    let outmap = {};
    let oi = 0;

    for (let k in ctx.outputs) {
      outmap[k] = oi++;
    }
    let totoutput = oi;

    let tlvl = 1;

    console.log(""+ctx.ast);

    function rec(n) {
      if (n.type === "ArrayLookup") {
        rec(n[0]);
        out("[");
        rec(n[1]);
        out("]");
      } else if (n.type === "BinOp") {
        let paren = false;

        if (n.parent && n.parent.type === "BinOp") {
          paren = n.parent.prec < n.prec;
        }

        if (paren) {
          out("(");
        }
        rec(n[0]);

        if (n.op !== ".") {
          out(' ' + n.op + ' ');
        } else {
          out(n.op);
        }

        rec(n[1]);
        if (paren) {
          out(")");
        }
      } else if (n.type === "Ident") {
        if (n.value in ctx.outputs) {
          out(`__outs[${outmap[n.value]}]`)
        } else {
          out(n.value);
        }
      } else if (n.type === "Call") {
        rec(n[0]);
        out("(");
        rec(n[1])
        out(")");
      } else if (n.type === "ExprList") {
        let i = 0;
        for (let n2 of n) {
          if (i > 0) {
            out(", ");
          }

          rec(n2);
          i++;
        }
      } else if (n.type === "Number") {
        out(n.value);
      } else if (n.type === "Function") {
        out(indent(tlvl)   + `function ${n.value}(`);
        let i = 0;

        for (let c of n[1]) {
          if (i > 0) {
            out(", ");
          }
          out(c.value)
          i++;
        }
        out(") {\n");

        tlvl++;
        rec(n[2]);
        tlvl--;

        out(indent(tlvl) + "}\n");
      } else if (n.type === "StatementList") {
        for (let c of n) {
          out(indent(tlvl));
          rec(c)
          out(";\n");
        }
      } else {
        for (let n2 of n) {
          rec(n2);
        }
      }
    }

    rec(ast);

    let argset = '';
    outs += "  let __$func = function(outs";

    for (let k in ctx.inputs) {
      outs += `, \$${k}`;
      argset += `    ${k} = \$${k};\n`
    }
    outs += ") {\n";

    let footer = `
    __outs = outs;
${argset}
    main();

  `.trim();

    out("    " + footer + "\n");

    outs += "  }\n";

    outs += '  return {\n    call : __$func,\n';

    function buildType(t) {
      if (t instanceof VarType) {
        return t.type;
      } else if (t instanceof ArrayType) {
        return t.name;
      }
      return t;
    }

    for (let k in ctx.uniforms) {
      outs += `    get ${k}() {return ${k}},\n`;
      outs += `    set ${k}(val) {__set${k}(val)},\n`;

    }

    let os1 = `    outputs: {\n`;
    let os2 = `    outputTypes: {\n`;
    for (let k in ctx.outputs) {
      let type = buildType(ctx.outputs[k][0].value);
      os1 += `      ${k} : ${outmap[k]},\n`;
      os2 += `      ${k} : "${type}",\n`;
    }

    os1 += '    },\n';
    os2 += '    },\n';


    outs += os1 + os2;

    outs += `    outputCount: ${totoutput}\n`;
    outs += '  }\n';

    outs += '}\n';
    return outs;
  }
}
CodeGenerator.register(JSGenerator);