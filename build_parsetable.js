import fs from 'fs';

import {rebuildParser} from './parser/parser.js';

import('./util/jscc.js').then((jscc) => {
//console.log(""+mathl.parse(test));
  let data = rebuildParser().save();

  data = `/* WARNING: auto-generated file! */
export const parsetable = "${data}";
`;

  fs.writeFileSync("parser/parsetab.js", data);
});