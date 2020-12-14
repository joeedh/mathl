let test = `float val;
in vec3 point;
in vec3 normal;

out float value;

uniform float factor;
uniform float size;
uniform vec3 uColor;

void main(int a, float b) {
  value = fract(1.0 - point[0]*point[1] + 0.5);
  value += point.x;
}
`

import * as mathl from './core/mathl.js'
import * as util from './util/util.js';


let r = (s) => util.termColor(s, "red");
let g = (s) => util.termColor(s, "green");
let b = (s) => util.termColor(s, "blue");


//console.log(util.termColor("test", "pink"));
//let s = util.termColor("string " + util.termColor("sub", "green") + " right", "pink");
let s = r('one' + g('two' + b('three') + 'four') + 'five');

//console.log(util.termPrint(s));
//let ret = mathl.parse('(a*3**4 * (b - 4)) / (5*3 + 2)**5');
//let ret = mathl.parse('(a*3 * (b - 4)) / (5*3**4 + call(1/2, 3) / 2)');

let ret = mathl.parse(test);
//console.log("RET:", ret);
//console.log("\n\n"+ret);

//console.log(""+ret.ast);
let code = mathl.genJS(ret).trim();
import fs from 'fs';

fs.writeFileSync("test_out.js", code);

let arr = [];
for (let i=0; i<code.length; i++) {
  arr.push(code.charCodeAt(i));
}
console.log(arr.slice(arr.length-25, arr.length))

var program
import {formatLines} from './core/state.js';

console.log(formatLines(code, 0, -100, -100, 1000), "yay");

eval(code);

//mathl.parse(test);

