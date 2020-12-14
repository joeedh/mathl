let test = `float val;
in vec3 point;
in vec3 normal;

out vec2 value;

uniform float factor;
uniform float size;
uniform vec3 uColor;

void main(int a, float b) {
  value = vec2(fract(1.0 - point[0]*point[1]*size + 0.5), fract(point[1]*size + 0.4));
  point.x = point.wzy;
}
`

import fs from 'fs';

import * as mathl from './core/mathl.js'
import * as util from './util/util.js';
import {formatLines} from './core/state.js';
import {parser} from './parser/parser.js';

//console.log(""+mathl.parse(test));

if (1) {
  let ret = mathl.parse(test);
//console.log("RET:", ret);
//console.log("\n\n"+ret);

//console.log(""+ret.ast);
  let code = mathl.genJS(ret).trim();

  fs.writeFileSync("test_out.js", code);

  let arr = [];
  for (let i = 0; i < code.length; i++) {
    arr.push(code.charCodeAt(i));
  }
  console.log(arr.slice(arr.length - 25, arr.length))

  var program

  console.log(formatLines(code, 0, -100, -100, 1000), "yay");

//eval(code);
  //console.log("" + ret.ast);


//mathl.parse(test);

}


