import {ArrayType, VarType} from './core/types.js';

let test = `
in vec3 point;
in vec3 normal;

out float value;

uniform float factor;
uniform float size;
uniform vec3 uColor;

float tent(float f) {
  f = 1.0 - abs(fract(f))*2.0;
  return f;
}

void main() {
  float f;

  float dx = tent(point.x*10.0);
  float dy = tent(point[1]*10.0);

  f = tent(dx+dy) + 2.0 + 4.23 / 3.23;

  value = f;
}
`

import fs from 'fs';

import * as mathl from './core/mathl.js'
import * as util from './util/util.js';
import {formatLines} from './core/state.js';
import {parser} from './parser/parser.js';
import {dfAst} from './transform/derivative.js';
import {ASTNode} from './core/ast.js';

//console.log(""+mathl.parse(test));

if (1) {
  let ret = mathl.parse(test);
//console.log("RET:", ret);
//console.log("\n\n"+ret);

//console.log(""+ret.ast);
  let code = mathl.genCode(ret, "js").trim();

  fs.writeFileSync("test_out.js", code);

  let arr = [];
  for (let i = 0; i < code.length; i++) {
    arr.push(code.charCodeAt(i));
  }
  console.log(arr.slice(arr.length - 25, arr.length))

  var program

  let vtype = new ArrayType(new VarType("float"), 3, "vec3");
  let pvar = ASTNode.VarRef("point", vtype, 0);
  console.log(""+pvar)

  pvar = ASTNode.VarRef("value", new VarType("float"))

  //console.log(formatLines(code, 0, -100, -100, 1000), "yay");
  dfAst(ret, pvar);
  //console.log(""+ret.ast)
}


