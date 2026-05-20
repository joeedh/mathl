import {ArrayType, VarType} from '../core/types.js'
import {CodeGenerator} from './generator_base.js'
import {indent} from '../util/util.js'
import type {ASTNode} from '../core/ast.js'
import type {ParseState} from '../core/state.js'

interface ParseStateWithAst extends ParseState {
  ast?: ASTNode
}

const keys: Set<string> = new Set([
  'abs',
  'sin',
  'cos',
  'acos',
  'asin',
  'log',
  'sqrt',
  'exp',
  'tan',
  'min',
  'max',
  'floor',
  'ceil',
  'trunc',
  'fract',
])

let mathcode = ''
for (const k of keys) {
  mathcode += `let _$_${k}__float__float = Math.${k};\n`
}

export const jslib = `
  ${mathcode}

  let _$_trunc__int__int = Math.trunc;
  let _$_pow__float__floatfloat = Math.pow;

  function _$_atan__float__floatfloat(y, x) {
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

`

interface JSGenState {
  stack: string[]
  stackcur: number
  stackscope: Map<string, string>
  scope: Map<string, unknown>
  pushNode: ASTNode | undefined
  copy(): JSGenState
  vardecl(name: string, type: string): number
  leave(): JSGenState
}

export class JSGenerator extends CodeGenerator {
  constructor(ctx: ParseState, args: unknown = {}) {
    super(ctx, args)
  }

  static generatorDefine(): {typeName: string} {
    return {
      typeName: 'js',
    }
  }

  genCode(ast?: ASTNode): string {
    const ctx = this.ctx as ParseStateWithAst
    const root: ASTNode | undefined = ast ?? ctx.ast
    if (!root) {
      throw new Error('JSGenerator.genCode: no AST')
    }

    let outs = ''

    function out(s: string): void {
      outs += s
    }

    function endstatement(s = ';'): void {
      if (!outs.trim().endsWith(s)) {
        outs = outs.trim()
        out(s)
      }
    }

    let inputs = ''
    for (const k of ctx.inputs.keys()) {
      if (inputs.length > 0) {
        inputs += ', '
      } else {
        inputs = 'let '
      }

      inputs += k
    }
    if (inputs.length > 0) {
      inputs += ';'
    }

    for (const [k, n] of ctx.uniforms) {
      const type = n[0]

      let init = '0'
      let setter = `    ${k} = val;`

      if (type.value instanceof ArrayType) {
        setter = ''

        init = '['
        for (let i = 0; i < type.value.size; i++) {
          if (i > 0) {
            init += ','
          }

          setter += `    ${k}[${i}] = val[${i}];\n`

          init += '0'
        }
        init += ']'
      }

      const s = `

  let ${k} = ${init};
  function __set${k}(val) {
${setter}
  }
    `.trim()
      out('  ' + s + '\n\n')
    }

    outs =
      `${jslib}

    program = function() {\n  let __outs;\n  ${inputs}\n\n` + outs

    const outmap: Map<string, number> = new Map()
    let oi = 0

    for (const k of ctx.outputs.keys()) {
      outmap.set(k, oi++)
    }
    const totoutput = oi

    let tlvl = 1

    const usestack = false

    const makeState = (): JSGenState => {
      const s: JSGenState = {
        stack     : [],
        stackcur  : 0,
        stackscope: new Map(),
        scope     : new Map(),
        pushNode  : undefined,
        copy(): JSGenState {
          const ret = makeState()
          ret.stack = this.stack.slice()
          ret.stackcur = this.stackcur
          ret.stackscope = new Map(this.stackscope)
          ret.scope = new Map(this.scope)
          ret.pushNode = this.pushNode
          return ret
        },
        vardecl(name: string, type: string): number {
          this.stackscope.set(name, type)
          this.stack.push(name)
          return this.stackcur++
        },
        leave(): JSGenState {
          if (usestack) {
            for (const [, type] of this.stackscope) {
              out(indent(tlvl) + `    ${type}stack_cur--;\n`)
              this.stack.pop()
              this.stackcur--
            }
          }

          this.stackscope = new Map()
          return this
        },
      }
      return s
    }

    let state: JSGenState = makeState()
    const statestack: JSGenState[] = []

    function push(pushNode: ASTNode): JSGenState {
      const s = state.copy()
      statestack.push(state)

      state = s
      state.pushNode = pushNode

      return s
    }

    function pop(pushNode: ASTNode): JSGenState | undefined {
      if (state.pushNode === pushNode) {
        const s = state

        state.leave()
        const popped = statestack.pop()
        if (popped) {
          state = popped
        }
        return s
      }
      return undefined
    }

    function rec(n: ASTNode): void {
      if (n.type === 'ArrayLookup') {
        rec(n[0])
        out('[')
        rec(n[1])
        out(']')
      } else if (n.type === 'VarDecl') {
        const nameVal = n.value
        const name = typeof nameVal === 'string' ? nameVal : ''
        let ok = ctx.inputs.has(name) || ctx.outputs.has(name) || ctx.uniforms.has(name)

        let inFunc = false

        let p: ASTNode | undefined = n.parent
        while (p !== undefined) {
          if (p.type === 'Function') {
            inFunc = true
            break
          }
          p = p.parent
        }

        if (ok && inFunc) {
          let n2: ASTNode | undefined

          n2 = ctx.inputs.get(name)
          n2 = ctx.outputs.get(name) ?? n2
          n2 = ctx.uniforms.get(name) ?? n2

          const scoped = ctx.scope.get(name)
          if (n2 === scoped) {
            ok = false
          }
        }

        if (!ok) {
          out(`let ${name}`)
          if (n.length > 1 && n[1].length > 0) {
            out(' = ')
            rec(n[1])
          } else {
            const t0: unknown = n[0].value
            const tArg = t0 instanceof VarType || typeof t0 === 'string' ? (t0 as VarType | string) : undefined
            const resolved = ctx.resolveType(tArg)
            const type = resolved ? resolved.getTypeNameSafe() : ''

            if (type === 'vec2' || type === 'vec3' || type === 'vec4' || type === 'mat4' || type === 'mat3') {
              out(' = ')

              if (usestack) {
                state.vardecl(name, type)
                out(`${type}stack[${type}stack_cur++];\n`)
              } else {
                out(`${type}cache.next();`)
              }
            }
          }

          out(';')
        }
      } else if (n.type === 'PostDec') {
        rec(n[0])
        out('--')
      } else if (n.type === 'PreDec') {
        out('--')
        rec(n[0])
      } else if (n.type === 'PostInc') {
        rec(n[0])
        out('++')
      } else if (n.type === 'PreInc') {
        out('++')
        rec(n[0])
      } else if (n.type === 'ForLoop') {
        push(n)
        out('for (')

        const tlvl2 = tlvl
        tlvl = 0

        rec(n[0])

        tlvl = tlvl2

        outs = outs.trim()
        endstatement(';')

        rec(n[1][0])
        outs = outs.trim()
        endstatement(';')

        rec(n[1][1])
        outs = outs.trim()

        if (outs.endsWith(';')) {
          outs = outs.slice(0, outs.length - 1)
        }

        out(') {\n')

        tlvl++
        rec(n[2])
        tlvl--

        out('}\n')

        pop(n)
      } else if (n.type === 'Return') {
        const tab = indent(tlvl + 2)

        if (usestack) {
          out('{\n')
          const i1 = state.stackcur
          if (state.pushNode) {
            pop(state.pushNode)
          }

          const i2 = state.stackcur
          const off = i2 - i1

          let p: ASTNode | undefined = n
          let type: VarType | undefined
          while (p) {
            if (p.ntype) {
              type = p.ntype
              break
            }
            p = p.parent
          }

          type = type ?? ctx.getReturnType()
          const tname = type ? type.getTypeNameSafe() : 'float'

          out(`${tab}${tname}stack[${tname}stack_cur]`)
          out(`.load(${tname}stack[${tname}stack_cur + (${off})]);\n`)
          out(`${tab}${tname}stack_cur++;\n`)
        }

        out(tab + 'return')
        if (n.length > 0) {
          out(' ')
          for (const n2 of n) {
            rec(n2)
          }
          out(';')
        }
        if (usestack) {
          out('\n' + indent(tlvl) + '}\n')
        }
      } else if (n.type === 'Trinary') {
        out('((')
        rec(n[0])
        out(') ? (')
        rec(n[1])
        out(') : (')
        rec(n[2])
        out('))')
      } else if (n.type === 'If') {
        out('if (')
        rec(n[0])
        out(') {\n')
        rec(n[1][0])
        out(indent(tlvl) + '}')

        if (n[1].length > 1) {
          out(' else {\n')
          if (n[1][1].type === 'If') {
            tlvl++
            out(indent(tlvl))
          }
          rec(n[1][1])
          if (n[1][1].type === 'If') {
            tlvl--
          }
          out(indent(tlvl) + '}\n')
        } else {
          out('\n')
        }
      } else if (n.type === 'UnaryOp') {
        out(n.op)
        rec(n[0])
      } else if (n.type === 'BinOp' || n.type === 'Assign') {
        let paren = false

        const parent = n.parent
        if (parent && parent.type === 'BinOp' && n.type === 'BinOp') {
          paren = parent.prec < n.prec
        }

        if (paren) {
          out('(')
        }
        rec(n[0])

        if (n.op !== '.') {
          out(' ' + n.op + ' ')
        } else {
          out(n.op)
        }

        rec(n[1])
        if (paren) {
          out(')')
        }
      } else if (n.type === 'Ident') {
        const idName = typeof n.value === 'string' ? n.value : ''
        if (ctx.outputs.has(idName)) {
          out(`__outs[${outmap.get(idName)}]`)
        } else {
          out(idName)
        }
      } else if (n.type === 'Call') {
        let name: string

        const head = n[0]
        if (head.type === 'VarType' && head.value instanceof VarType) {
          name = head.value.getTypeName()
        } else {
          const v = head.value
          name = typeof v === 'string' ? v : ''
        }

        if (name === 'int_cast') {
          out('~~')
        }

        out(name)

        out('(')
        rec(n[1])
        out(')')
      } else if (n.type === 'ExprList') {
        let i = 0
        for (const n2 of n) {
          if (i > 0) {
            out(', ')
          }

          rec(n2)
          i++
        }
      } else if (n.type === 'FloatConstant') {
        const v = n.value
        out(typeof v === 'number' ? v.toFixed(7) : '0')
      } else if (n.type === 'IntConstant') {
        out('' + n.value)
      } else if (n.type === 'Precision') {
        return
      } else if (n.type === 'Function') {
        const polyKey = n.polyKey
        let fname = polyKey ?? (typeof n.value === 'string' ? n.value : '')

        if (n.value === 'main') {
          fname = 'main'
        }

        out(`\n  function ${fname}(`)
        let i = 0

        for (const c of n[1]) {
          if (i > 0) {
            out(', ')
          }
          out(typeof c.value === 'string' ? c.value : '')
          i++
        }
        out(') {\n')

        tlvl++

        push(n)
        rec(n[2])
        pop(n)

        tlvl--

        out(indent(tlvl) + '}\n')
      } else if (n.type === 'StatementList') {
        const noScope = n.noScope

        if (!noScope) {
          push(n)
        }

        for (const c of n) {
          out(indent(tlvl))

          rec(c)

          outs = outs.trim()

          if (!outs.endsWith(';') && !outs.endsWith('}')) {
            out(';')
          }
          out('\n')
        }

        if (!noScope) {
          pop(n)
        }
      } else {
        for (const n2 of n) {
          rec(n2)
        }
      }
    }

    rec(root)

    outs += '  let __$func = function(outs, $ins) {\n'

    let i = 0
    for (const k of ctx.inputs.keys()) {
      outs += `    ${k} = $ins[${i}];\n`
      i++
    }

    const footer = `
    __outs = outs;
    main();

  `.trim()

    out('    ' + footer + '\n')

    outs += '  }\n'

    outs += '  return {\n    call : function() { return __$func(this.outputs, this.inputs) },\n'

    function buildType(t: unknown): string {
      if (t instanceof ArrayType) {
        const name = t.getTypeName()
        return name
      }
      if (t instanceof VarType) {
        const inner = t.type
        if (typeof inner === 'string') {
          return inner
        }
        return t.getTypeNameSafe()
      }
      return typeof t === 'string' ? t : ''
    }

    outs += `  setInput(index, value) { this.inputs[index] = value},\n`
    outs += `  getInput(index) { return this.inputs[index] },\n`
    outs += `  uniforms: {\n`
    for (const k of ctx.uniforms.keys()) {
      outs += `    get ${k}() {return ${k}},\n`
      outs += `    set ${k}(val) {__set${k}(val)},\n`
    }
    outs += '  },\n'

    const defaultValueMap: Map<string, string> = new Map([
      ['float', '0.0'],
      ['int', '0'],
      ['bool', 'false'],
      ['vec2', '[0, 0]'],
      ['vec3', '[0, 0, 0]'],
      ['vec4', '[0, 0, 0, 0]'],
      ['mat2', '[0, 0, 0, 0]'],
      ['mat3', '[0, 0, 0, 0, 0, 0, 0, 0, 0]'],
      ['mat4', '[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]'],
    ])

    let os1 = `    outputs: [\n`
    let os2 = `    outputTypes: {\n`
    i = 0
    for (const [k, node] of ctx.outputs) {
      const type = buildType(node[0].value)
      os1 += `      ${defaultValueMap.get(type)},\n`
      os2 += `      ${k} : {type: '${type}', index: ${i}},\n`
      i++
    }

    os1 += '    ],\n'
    os2 += '    },\n'

    let is1 = `    inputs: [\n`
    let is2 = `    inputTypes: {\n`
    i = 0
    for (const [k, node] of ctx.inputs) {
      const type = buildType(node[0].value)
      is1 += `      ${defaultValueMap.get(type)},\n`
      is2 += `      ${k} : {type: '${type}', index: ${i}},\n`
      i++
    }

    is1 += '    ],\n'
    is2 += '    },\n'

    outs += os1 + os2 + is1 + is2

    outs += `    outputCount: ${totoutput}\n`
    outs += '  }\n'
    outs += '}\n'

    return outs
  }
}

CodeGenerator.register(JSGenerator)
