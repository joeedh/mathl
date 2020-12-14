import {ASTNode, traverse, visit, scopeWalk, walk} from './ast.js';

function exit() {
  process.exit(0);
}


export let swizzlemap = {
  x : 0,
  y : 1,
  z : 2,
  w : 3,
  r : 0,
  g : 1,
  b : 2,
  a : 3,
  u : 0,
  v : 1,
  t : 2
};

export let swizzlecode = `

vec2 swizzle_vec3_xy(vec3 v) {
  return vec2(v[0], v[1]);
}
`;


function makeSwizzles2() {
  let map = {};
  let codeset = {};
  let codeget = {};

  let axes = "xyzw";

  let out = [];
  let out2 = [];

  let typemap = {
    2 : 'vec2',
    3 : 'vec3',
    4 : 'vec4'
  };

  let rec = (s, axes2, axis, depth) => {
    if (depth < 0) {
      return "";
    }

    s += axes[axis];
    axes2.push(axis);

    let type = typemap[s.length];

    if (s.length > 1) {
      map[s] = axes2;

      let code2 = '';
      let code = type + "(";
      for (let i=0; i<s.length; i++) {
        if (i > 0) {
          code += ", ";
        }

        code2 += `\$n1[${axes2[i]}] = $n2[${i}];\n`;
        code += `$n1[${axes2[i]}]`;
      }

      code += ")";

      codeget[s] = code + ";";
      codeset[s] = code2;
    }
    //out.push(s);
    //out.push(axes2);

    for (let i=0; i<axes.length; i++) {
      let axes3 = axes2.concat([]);

      if (s.search(axes[i]) < 0) {
        rec(s, axes3, i, depth-1);
      }
    }
    return s;
  }

  function gen(axesin) {
    axes = axesin;
    for (let i=0; i<axes.length; i++) {
      rec("", [], i, axes.length);
    }
  }

  gen("xyzw");
  gen("rgba");
  gen("uvt");

  return {
    map,
    codeget,
    codeset
  };
}

export let swizzlemap2 = makeSwizzles2();

export function transformSwizzleSimple(ast, ctx) {
  scopeWalk(ast, ctx, {
    BasicMemberLookup(node, ctx) {
      let type = ctx.getScope("this");
      let member = node[1].value;

      if (node[1].type !== "Ident") {
        return;
      }

      if (!(member in swizzlemap)) {
        return; //not a simple swizzle
      }

      let idx = new ASTNode("IntConstant");
      node.copyPosTo(idx);

      idx.value = swizzlemap[member];

      let n2 = new ASTNode("ArrayLookup")
      n2.push(node[0]);
      n2.push(idx);

      node.copyPosTo(n2);

      let p = node.parent;
      node.parent.replace(node, n2);

      //console.log(""+node");
      //console.log(node);
    }
  })
}

import {parse} from './parser.js';

export function transformSwizzleComplex(ast, ctx) {
  scopeWalk(ast, ctx, {
    BasicMemberLookup(node, ctx) {
      let type = ctx.getScope("this");
      let member = node[1].value;

      if (node[1].type !== "Ident") {
        return;
      }

      if (member.length < 2 || !(member in swizzlemap2.map)) {
        return; //not a simple swizzle
      }

      let axes = swizzlemap2.map[member];

      if (!(ASTNode.isAssign(node.parent) && node === node.parent[0])) {
        let code = swizzlemap2.codeget[member];

        let n2 = parse(code, "Call",[node[0]]);
        //console.log(""+code)
        //process.exit();

        let p = node.parent
        node.parent.replace(node, n2);
      }
    }
  });

  scopeWalk(ast, ctx, {
    BasicMemberLookup(node, ctx) {
      let type = ctx.getScope("this");
      let member = node[1].value;

      if (node[1].type !== "Ident") {
        return;
      }

      if (member.length < 2 || !(member in swizzlemap2.map)) {
        return; //not a simple swizzle
      }

      let axes = swizzlemap2.map[member];

      if (ASTNode.isAssign(node.parent) && node === node.parent[0]) {
        let code = swizzlemap2.codeset[member];
        let val = node.parent[1];

        let n2 = parse(code, [node[0], node.parent[1]]);

        node.parent.parent.replace(node.parent, n2);
      }
    }
  })
}

export function transformAst(ast, ctx) {
  console.log("Processing AST tree. . .");

  //return
  //transformSwizzleSimple(ast, ctx);
  //transformSwizzleComplex(ast, ctx);
}