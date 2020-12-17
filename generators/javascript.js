import {ArrayType, VarType} from '../core/types.js';
import * as util from '../util/util.js';
import {CodeGenerator} from './generator_base.js';
import {strong, indent, stronglog, log, termColor, termPrint} from '../util/util.js';

export let jslib = `
  let fract = function(f) { return f - Math.floor(f);};
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
  
  let vec2cache = new cachering(() => [0, 0], 2048);
  function vec2(a, b) {
    let ret = vec2cache.next();
    
    ret[0] = a;
    ret[1] = b;
    
    return ret;
  }

  let vec3cache = new cachering(() => [0, 0, 0], 2048);
  function vec3(a, b, c) {
    let ret = vec3cache.next();
    
    ret[0] = a;
    ret[1] = b;
    ret[2] = c;
    
    return ret;
  }

  let vec4cache = new cachering(() => [0, 0, 0, 0], 2048);
  function vec4(a, b, c, d) {
    let ret = vec4cache.next();
    
    ret[0] = a;
    ret[1] = b;
    ret[2] = c;
    ret[3] = d;
    
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

    function rec(n) {
      if (n.type === "ArrayLookup") {
        rec(n[0]);
        out("[");
        rec(n[1]);
        out("]");
      } else if (n.type === "VarDecl") {
        let ok = n.value in ctx.inputs || n.value in ctx.outputs || n.value in ctx.uniforms;

        let inFunc = false;

        let p = n.parent;
        while (p !== undefined) {
          if (p.type === "Function") {
            inFunc = true;
            break;
          }
          p = p.parent;
        }

        if (ok && inFunc) {
          let n2;

          n2 = n.value in ctx.inputs ? ctx.inputs[n.value] : undefined;
          n2 = n.value in ctx.outputs ? ctx.outputs[n.value] : undefined;
          n2 = n.value in ctx.uniforms ? ctx.uniforms[n.value] : undefined;

          if (n2 === ctx.getScope(n.value)) {
            ok = false;
          }
        }

        if (!ok) {
          out(`let ${n.value}`);
          if (n.length > 1 && n[1].length > 0) {
            out(" = ");
            rec(n[1]);
          }

          out(";");
        }
      } else if (n.type === "Return") {
        out("return")
        if (n.length > 0) {
          out(" ");
          for (let n2 of n) {
            rec(n2);
          }
          out(";");
        }
      } else if (n.type === "Trinary") {
        out("((");
        rec(n[0]);
        out(") ? (");
        rec(n[1]);
        out(") : (");
        rec(n[2]);
        out("))");
      } else if (n.type === "If") {
        out("if (");
        rec(n[0]);
        out(") {\n");
        rec(n[1][0]);
        out(indent(tlvl) + "}");

        if (n[1].length > 1) {
          out(" else {\n");
          if (n[1][1].type === "If") {
            tlvl++;
            out(indent(tlvl));
          }
          rec(n[1][1]);
          if (n[1][1].type === "If") {
            tlvl--;
          }
          out(indent(tlvl) + "}\n");
        } else {
          out("\n");
        }

      } else if (n.type === "BinOp" || n.type === "Assign") {
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
        if (n[0].type === "VarType") {
          out(n[0].value.getTypeName());
        } else {
          rec(n[0]);
        }
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
      } else if (n.type === "FloatConstant") {
        out(n.value.toFixed(7));
      } else if (n.type === "IntConstant") {
        out(""+n.value);
      } else if (n.type === "Function") {
        out(`\n  function ${n.value}(`);
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

          let slen = outs.length;

          rec(c)

          if (outs.length > slen) {
            out(";\n");
          }
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
