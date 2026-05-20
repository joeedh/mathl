import {
  scopeWalk,
  makeNode,
  IdentNode,
  IntConstantNode,
  ArrayLookupNode,
  ExprListNode,
  AssignNode,
  CallNode,
  ASTNodeBase,
} from '../core/ast.js'
import type {ASTNode} from '../core/ast.js'
import type {ParseState, PolyFuncEntry} from '../core/state.js'
import {opnames} from '../core/state.js'
import {ArrayType, DynamicArrayType, VarType} from '../core/types.js'
import {parse} from '../core/parser.js'
import * as util from '../util/util.js'

function log(..._args: unknown[]): void {
  //console.log(...arguments);
}

const typeConv = new Set(['float', 'int', 'bool'])

export const swizzlesizes: Map<number, string> = new Map<number, string>([
  [1, 'float'],
  [2, 'vec2'],
  [3, 'vec3'],
  [4, 'vec4'],
])

export const swizzlemap: Map<string, number> = new Map<string, number>([
  ['x', 0],
  ['y', 1],
  ['z', 2],
  ['w', 3],
  ['r', 0],
  ['g', 1],
  ['b', 2],
  ['a', 3],
  ['u', 0],
  ['v', 1],
  ['t', 2],
])

export const swizzlecode = `

vec2 swizzle_vec3_xy(vec3 v) {
  return vec2(v[0], v[1]);
}
`

interface Swizzle2 {
  map: Map<string, number[]>
  codeget: Map<string, string>
  codeset: Map<string, string>
}

function makeSwizzles2(): Swizzle2 {
  const map: Map<string, number[]> = new Map()
  const codeset: Map<string, string> = new Map()
  const codeget: Map<string, string> = new Map()

  let axes = 'xyzw'

  const typemap: Map<number, string> = new Map<number, string>([
    [2, 'vec2'],
    [3, 'vec3'],
    [4, 'vec4'],
  ])

  const rec = (s: string, axes2: number[], axis: number, depth: number): string => {
    if (depth < 0) {
      return ''
    }

    s += axes[axis]
    axes2.push(axis)

    const type = typemap.get(s.length) ?? ''

    if (s.length > 1) {
      map.set(s, axes2)

      let code2 = ''
      let code = type + '('
      for (let i = 0; i < s.length; i++) {
        if (i > 0) {
          code += ', '
        }

        code2 += `\$n1[${axes2[i]}] = $n2[${i}];\n`
        code += `$n1[${axes2[i]}]`
      }

      code += ')'

      codeget.set(s, code + ';')
      codeset.set(s, code2)
    }

    for (let i = 0; i < axes.length; i++) {
      const axes3 = axes2.concat([])

      if (s.search(axes[i]) < 0) {
        rec(s, axes3, i, depth - 1)
      }
    }
    return s
  }

  function gen(axesin: string): void {
    axes = axesin
    for (let i = 0; i < axes.length; i++) {
      rec('', [], i, axes.length)
    }
  }

  gen('xyzw')
  gen('rgba')
  gen('uvt')

  return {map, codeget, codeset}
}

export const swizzlemap2: Swizzle2 = makeSwizzles2()

function getMemberName(node: ASTNode): string | undefined {
  if (node.length < 2) {
    return undefined
  }
  const m = node[1]
  if (m.type !== 'Ident') {
    return undefined
  }
  const v = m.value
  return typeof v === 'string' ? v : undefined
}

export function transformSwizzleSimple(ast: ASTNode, ctx: ParseState): void {
  scopeWalk(ast, ctx, {
    BasicMemberLookup(node, ctx) {
      const member = getMemberName(node)
      if (member === undefined) {
        return
      }

      const idx0 = swizzlemap.get(member)
      if (idx0 === undefined) {
        return
      }

      const idx = new IntConstantNode()
      node.copyPosTo(idx)
      idx.value = idx0

      const n2 = new ArrayLookupNode()
      n2.push(node[0])
      n2.push(idx)

      node.copyPosTo(n2)
      node.copyPosTo(idx)

      const parent = node.parent
      if (!parent) {
        return
      }

      const sizeName = swizzlesizes.get(member.length)
      const ntype = sizeName !== undefined ? ctx.resolveType(sizeName) : undefined
      parent.ntype = ntype
      n2.ntype = ntype

      parent.replace(node, n2)
    },
  })
}

export function transformSwizzleComplex(ast: ASTNode, ctx: ParseState): void {
  const typemap: Map<number, string> = new Map<number, string>([
    [1, 'float'],
    [2, 'vec2'],
    [3, 'vec3'],
    [4, 'vec4'],
  ])

  scopeWalk(ast, ctx, {
    BasicMemberLookup(node, ctx) {
      const member = getMemberName(node)
      if (member === undefined) {
        return
      }

      if (member.length < 2 || !swizzlemap2.map.has(member)) {
        return
      }

      const typeName = typemap.get(member.length)
      if (typeName === undefined) {
        return
      }
      const type = ctx.resolveType(typeName)

      const axes = swizzlemap2.map.get(member)
      if (!axes) {
        return
      }

      const parent = node.parent
      if (!parent || parent.type !== 'Assign' || node !== parent[0]) {
        return
      }

      const grand = parent.parent
      if (!grand || !type) {
        return
      }

      const val = parent[1]
      const op = parent.op

      const v = ctx.placeVarDecl(parent, type)

      const id = new IdentNode()
      id.value = v.value

      const exprlist = new ExprListNode()

      const an = new AssignNode(op)
      const idCopy = id.copy()
      an.push(idCopy)
      an.push(val)
      exprlist.push(an)

      for (let i = 0; i < member.length; i++) {
        const an2 = new AssignNode(op)
        const base = node[0].copy()
        let lookup = new ArrayLookupNode()
        lookup.push(base)
        const idxNode = new IntConstantNode()
        idxNode.value = axes[i]
        lookup.push(idxNode)
        an2.push(lookup)

        lookup = new ArrayLookupNode()
        lookup.push(id.copy())
        const idxNode2 = new IntConstantNode()
        idxNode2.value = i
        lookup.push(idxNode2)

        an2.push(lookup)

        exprlist.push(an2)
      }

      grand.replace(parent, exprlist)
    },
  })

  scopeWalk(ast, ctx, {
    BasicMemberLookup(node, ctx) {
      const member = getMemberName(node)
      if (member === undefined) {
        return
      }

      if (member.length < 2 || !swizzlemap2.map.has(member)) {
        return
      }

      const parent = node.parent
      if (parent && parent.type === 'Assign' && node === parent[0]) {
        return
      }

      const code = swizzlemap2.codeget.get(member)
      if (code === undefined) {
        return
      }

      const n2 = parse(code, 'Call', [node[0]], node.line, node.lexpos) as ASTNode

      if (n2.type !== 'Call') {
        throw new Error('internal parse error')
      }

      const sizeName = swizzlesizes.get(member.length)
      if (sizeName !== undefined) {
        ctx.resolveType(sizeName)
      }

      if (parent) {
        parent.replace(node, n2)
      }
    },
  })
}

function getOp(node: ASTNode): string | undefined {
  if (node.type === 'BinOp' || node.type === 'Assign' || node.type === 'UnaryOp') {
    return node.op
  }
  return undefined
}

function getStringValue(node: ASTNode): string | undefined {
  const v = node.value
  return typeof v === 'string' ? v : undefined
}

export function transformOps(ast: ASTNode, ctx: ParseState): void {
  function safeTypeGet(n: ASTNode): VarType | undefined {
    if (n.ntype) {
      return n.ntype
    }

    if (n.type === 'Ident') {
      const name = getStringValue(n)
      if (name !== undefined) {
        n.ntype = ctx.resolveType(ctx.getScope(name))
      }
    } else if (n.type === 'IntConstant') {
      n.ntype = ctx.resolveType('int')
    } else if (n.type === 'FloatConstant') {
      n.ntype = ctx.resolveType('float')
    } else if (n.type === 'VarType') {
      n.ntype = ctx.resolveType(n.value)
    } else if (n.type === 'BoolConstant') {
      n.ntype = ctx.resolveType('bool')
    }

    return n.ntype
  }

  const types: Map<string, VarType | undefined> = new Map<string, VarType | undefined>([
    ['float', ctx.resolveType('float')],
    ['vec2', ctx.resolveType('vec2')],
    ['vec3', ctx.resolveType('vec3')],
    ['mat4', ctx.resolveType('mat4')],
    ['mat3', ctx.resolveType('mat3')],
    ['int', ctx.resolveType('int')],
    ['bool', ctx.resolveType('bool')],
  ])

  function processBinOp(node: ASTNode, ctx: ParseState): void {
    const isAssign = node.type === 'Assign'

    let p: ASTNode | undefined = node
    while (p) {
      if (p.type === 'Function') {
        const fn = getStringValue(p)
        if (fn && fn.startsWith('_$_$_')) {
          return
        }
      }
      p = p.parent
    }

    const t1 = safeTypeGet(node[0])
    const t2 = safeTypeGet(node[1])

    if (!t1 || !t2) {
      log('' + node)
      ctx.error(node, 'Type system could not resolve types')
      return
    }

    const intT = types.get('int')
    const floatT = types.get('float')
    const boolT = types.get('bool')

    const isint1 = intT ? ctx.typesEqual(t1, intT) : false
    const isint2 = intT ? ctx.typesEqual(t2, intT) : false

    if (Number(isint1) ^ Number(isint2)) {
      log('' + node)
      ctx.error(node, 'Cannot do mixed math on integer and floats')
    }

    const isbase1 = (floatT && ctx.typesEqual(t1, floatT)) || (boolT && ctx.typesEqual(t1, boolT))
    const isbase2 = (floatT && ctx.typesEqual(t2, floatT)) || (boolT && ctx.typesEqual(t1, boolT))

    if (isbase1 && isbase2) {
      return
    }

    const op = getOp(node)
    if (op === undefined) {
      return
    }

    let key = opnames.get(op)
    const key1 = t1.getTypeNameSafe()
    const key2 = t2.getTypeNameSafe()

    if (!key) {
      ctx.error(node, `Unsupported op ${op} for ${key1}/${key2}`)
      return
    }

    key = `_$_$_${key}__${key1}__${key1}${key2}`

    if (!ctx.poly_keymap.has(key)) {
      ctx.error(node, 'Unknown operator overload function ' + key)
    }

    const id = new IdentNode()
    id.value = key

    const call = new CallNode()
    call.ntype = t1.getComponents() > t2.getComponents() ? t1 : t2
    call.push(id)

    const args = new ExprListNode()
    args.push(node[0])
    args.push(node[1])

    call.push(args)

    if (isAssign && node.type === 'Assign') {
      node.op = '='
      node.replace(node[1], call)
    } else if (node.parent) {
      node.parent.replace(node, call)
    }
  }

  scopeWalk(
    ast,
    ctx,
    {
      Assign(node, ctx) {
        if (node.type === 'Assign' && node.op === '=') {
          return
        }
        processBinOp(node, ctx)
      },
      BinOp(node, ctx) {
        processBinOp(node, ctx)
      },
    },
    false,
    true
  )
}

interface Finders {
  findType: (n: ASTNode, ignoreCalls?: boolean, arrDepth?: number) => VarType | undefined
  findTypeUp: (n: ASTNode) => VarType | undefined
  Call: (node: ASTNode, ctx: ParseState, process?: boolean) => void
  guessPolyFunc: (p: ASTNode, idx: number) => VarType | undefined
  buildPolyCandidates: (p: ASTNode, idx?: number | VarType) => PolyFuncEntry[]
}

function getFinders(ctx: ParseState, typemap: Map<ASTNode, VarType>, argmap: Map<ASTNode, VarType[]>): Finders {
  function findType(n: ASTNode, ignoreCalls = false, arrDepth = 0): VarType | undefined {
    if (n.type === 'Ident') {
      const name = getStringValue(n)
      if (name === undefined) {
        return undefined
      }
      return ctx.resolveType(ctx.scope.get(name))
    } else if (n.type === 'BinOp') {
      let t1 = findType(n[0], ignoreCalls, arrDepth)
      let t2 = findType(n[1], ignoreCalls, arrDepth)

      if (!t1 || !t2) {
        return undefined
      }

      const r1 = ctx.resolveType(t1)
      const r2 = ctx.resolveType(t2)
      if (!r1 || !r2) {
        return undefined
      }
      t1 = r1
      t2 = r2

      const n1 = t1.getComponents()
      // t2 used below but only for return-shape comparison via components
      const _n2 = t2.getComponents()
      void _n2

      return n1 === 1 ? t2 : t1
    } else if (n.type === 'Assign') {
      if (n.ntype) {
        return n.ntype
      }
      return findType(n[0], ignoreCalls, arrDepth)
    } else if (n.type === 'VarDecl') {
      const c = n[0]
      if (c.type === 'VarType' && c.value instanceof VarType) {
        return c.value
      }
      return undefined
    } else if (n.type === 'ArrayLookup') {
      const type = findType(n[0], ignoreCalls, arrDepth - 1)

      if (!(type instanceof ArrayType) && !(type instanceof DynamicArrayType)) {
        log('type:', '' + type)
        ctx.error(n, 'Not an array')
        return undefined
      }

      if (arrDepth > 0) {
        return ctx.resolveType(type)
      } else {
        const inner = type.type
        if (inner instanceof VarType || typeof inner === 'string') {
          return ctx.resolveType(inner)
        }
        return undefined
      }
    } else if (n.type === 'Call') {
      if (typemap.has(n)) {
        return typemap.get(n)
      }
      if (ignoreCalls) {
        return undefined
      }

      Call(n, ctx, false)

      return typemap.get(n)
    } else if (n.type === 'FloatConstant') {
      return ctx.getType('float')
    } else if (n.type === 'IntConstant') {
      return ctx.getType('int')
    } else if (n.type === 'UnaryOp') {
      return findType(n[0], ignoreCalls, arrDepth)
    } else if (n.type === 'PostDec' || n.type === 'PreDec' || n.type === 'PostInc' || n.type === 'PreInc') {
      return findType(n[0], ignoreCalls, arrDepth)
    }
    return undefined
  }

  function Call(node: ASTNode, ctx: ParseState, _process = true): void {
    const nameNode = node[0]
    let type: VarType | undefined
    let name: string

    if (nameNode.type === 'VarType' && nameNode.value instanceof VarType) {
      type = nameNode.value
      name = nameNode.value.getTypeName()
      typemap.set(node, type)
    } else {
      const nm = nameNode.value
      name = typeof nm === 'string' ? nm : ''

      if (node.parent) {
        type = findTypeUp(node.parent)
      }

      if (!type) {
        ctx.error(node, 'Unknown type for function ' + name)
        return
      }
    }
    if (typeConv.has(name)) {
      name += '_cast'
    }

    const args: VarType[] = []

    let i = 0
    const argList = node[1]
    for (const arg of argList) {
      const ft = findType(arg)
      const type2 = ft ? ctx.resolveType(ft) : undefined
      if (!type2) {
        ctx.error(arg, 'Unknown type for argument ' + (i + 1))
        return
      }

      args.push(type2)
      i++
    }

    const resolved = ctx.resolveType(type)
    if (!resolved) {
      ctx.error(node, 'Unknown type for function ' + name)
      return
    }
    const key = ctx.buildPolyKey(name, resolved, args)

    if (!ctx.functions.has(key)) {
      console.log('' + node.parent?.parent)
      ctx.error(node, 'Unknown function ' + key)
    }

    argmap.set(node, args)
    typemap.set(node, resolved)
  }

  function buildPolyCandidates(p: ASTNode, _idx: number | VarType = 0): PolyFuncEntry[] {
    let type: VarType | undefined

    if (argmap.has(p)) {
      // Original code returned argmap entry at idx; preserve via cast
      const ftype = argmap.get(p)
      if (ftype && typeof _idx === 'number') {
        const entry = ftype[_idx]
        return entry ? [{name: '', args: [], type: entry, key: ''}] : []
      }
      return []
    }

    let candidates: PolyFuncEntry[] = []

    const nameNode = p[0]
    let name: string
    if (nameNode.type === 'VarType' && nameNode.value instanceof VarType) {
      name = nameNode.value.getTypeName()
    } else {
      const v = nameNode.value
      name = typeof v === 'string' ? v : ''
    }
    name = name.trim()

    if (typeConv.has(name)) {
      name += '_cast'
    }

    const fs = ctx.poly_namemap.get(name)
    if (fs && fs.size === 1) {
      for (const f of fs) {
        if (f.args.length !== p[1].length) {
          ctx.error(p, 'Wrong number of function parameters for ' + name)
        }

        p.ntype = f.type

        for (let i = 0; i < p[1].length; i++) {
          p[1].ntype = f.args[i]
        }

        return [f]
      }
    }

    const funcs = ctx.poly_namemap.get(name)
    if (!funcs) {
      console.log('' + p)
      ctx.error(p, 'Unknown function ' + name)
      return []
    }

    const args: Array<VarType | undefined> = []
    for (const arg of p[1]) {
      args.push(findType(arg, true))
    }

    if (p.ntype !== undefined) {
      type = p.ntype
    } else if (typemap.has(p)) {
      type = typemap.get(p)
    }

    if (type) {
      type = ctx.resolveType(type)
    } else {
      type = findType(p, true)
    }

    let totalMatchBest: PolyFuncEntry | undefined
    void totalMatchBest

    interface ScoredEntry extends PolyFuncEntry {
      totmatch: number
    }
    const scored: ScoredEntry[] = []

    for (const c of funcs) {
      if (type !== undefined && !ctx.typesEqual(type, c.type)) {
        continue
      }
      if (c.args.length !== args.length) {
        continue
      }

      let ok = true
      let totmatch = 0

      for (let i = 0; i < c.args.length; i++) {
        const a = args[i]
        if (a !== undefined && !ctx.typesEqual(a, c.args[i])) {
          ok = false
          break
        }

        if (a !== undefined) {
          totmatch++
        }
      }

      if (ok) {
        scored.push({...c, totmatch})
      }
    }

    candidates = scored.filter((f) => ctx.poly_keymap.has(f.key))

    return candidates
  }

  function guessPolyFunc(p: ASTNode, idx: number): VarType | undefined {
    const candidates = buildPolyCandidates(p, idx) as Array<PolyFuncEntry & {totmatch?: number}>

    if (idx < 0 || idx === undefined) {
      ctx.error(p, 'Internal parser error')
    }

    let count = 0
    for (const c of candidates) {
      if ((c.totmatch ?? 0) === c.args.length) {
        count++
      }
    }

    if (candidates.length === 0) {
      console.warn(p, 'No overloaded function found')
    }
    if (count > 0) {
      let msg = 'Ambiguous polymorphic function call; candidates are:\n'
      for (const c of candidates) {
        msg += '  ' + c.key + '\n'
      }
      ctx.error(p, msg)
    }

    let match: (PolyFuncEntry & {totmatch?: number}) | undefined

    if (count === 0) {
      candidates.sort((a, b) => (b.totmatch ?? 0) - (a.totmatch ?? 0))
      match = candidates[0]
    }

    if (!match) {
      console.log('' + p)
      ctx.error(p, 'Failed to resolve polymorphic function call')
      return undefined
    }

    return ctx.resolveType(match.args[idx])
  }

  function findTypeUp(n: ASTNode): VarType | undefined {
    let p: ASTNode | undefined = n
    let type: VarType | undefined
    let lastp: ASTNode = p
    let lastp2: ASTNode = p

    let arrDepth = 0

    while (p) {
      log(util.termColor(p.type, 'green'))

      if (p.type === 'Assign') {
        if (p.ntype !== undefined) {
          return p.ntype
        }
        type = findType(p, true, arrDepth)
        break
      } else if (p.type === 'Return') {
        type = ctx.getReturnType()
        break
      } else if (p.type === 'VarDecl') {
        const c = p[0]
        if (c.type === 'VarType' && c.value instanceof VarType) {
          type = c.value
        }
        break
      } else if (p.type === 'StatementList') {
        break
      } else if (p.type === 'ArrayLookup' && p[0] === lastp) {
        log(util.termColor('  left', 'green'))
        arrDepth++
      } else if (p.type === 'ArrayLookup' && p[0] !== lastp) {
        log(util.termColor('  right', 'green'))
        const type2 = findType(p[0], true)
        if (type2) {
          type = ctx.resolveType(type2)
        }

        if (type && arrDepth > 0) {
          return type
        }
      } else if (p.type === 'Call' && p !== n) {
        const idx = p[1].indexOf(lastp2)

        type = guessPolyFunc(p, idx)
        break
      }

      lastp2 = lastp
      lastp = p
      p = p.parent
    }

    return type
  }

  return {findType, findTypeUp, Call, guessPolyFunc, buildPolyCandidates}
}

const haskeySet: WeakSet<ASTNodeBase<unknown, string>> = new WeakSet()

export function transformPolymorphism(ast: ASTNode, ctx: ParseState): void {
  const typemap: Map<ASTNode, VarType> = new Map()
  const argmap: Map<ASTNode, VarType[]> = new Map()
  const doneset: WeakSet<ASTNodeBase<unknown, string>> = new WeakSet()

  const {buildPolyCandidates} = getFinders(ctx, typemap, argmap)

  scopeWalk(
    ast,
    ctx,
    {
      Call(node, ctx) {
        if (doneset.has(node)) {
          return
        }

        const args: Array<VarType | undefined> = []
        let type: VarType | undefined

        const nameNode = node[0]
        let name: string
        if (nameNode.type === 'VarType' && nameNode.value instanceof VarType) {
          type = ctx.resolveType(nameNode.value)
          name = nameNode.value.getTypeNameSafe()
        } else {
          const v = nameNode.value
          name = typeof v === 'string' ? v : ''
          type = node.ntype
        }
        if (typeConv.has(name)) {
          name += '_cast'
        }

        if (name.startsWith('_$_')) {
          doneset.add(node)
          return
        }

        let count = 0

        for (const arg of node[1]) {
          args.push(arg.ntype)
          if (arg.ntype) {
            count++
          }
        }

        let bad = count === 0
        let cs: PolyFuncEntry[] | undefined

        if ((!bad && count < args.length) || !type) {
          cs = buildPolyCandidates(node, type)

          if (type && cs.length > 1) {
            bad = true
          } else if (!type && cs.length > 1) {
            const scored: Array<PolyFuncEntry & {totmatch: number}> = cs.map((f) => ({...f, totmatch: 0}))

            for (const func of scored) {
              for (let i = 0; i < args.length; i++) {
                const a = args[i]
                if (a !== undefined && ctx.typesEqual(a, func.args[i])) {
                  func.totmatch++
                }
              }
            }

            cs = scored.filter((f) => f.totmatch > 0)
            if (cs.length > 1) {
              const cs2 = cs.map((f) => f.key).join('\n')
              ctx.error(node, 'Could not resolve polymorphic function; candidates were:' + cs2)
            }
          }
        }

        if (bad) {
          console.log('' + type)
          console.log(cs)
          console.log('' + node)
          ctx.error(node, 'Could not resolve polymorphic function call')
        }

        let func: PolyFuncEntry | undefined
        if (count === args.length && type) {
          const filtered: VarType[] = []
          for (const a of args) {
            if (a) {
              filtered.push(a)
            }
          }
          const key = ctx.buildPolyKey(name, type, filtered)
          func = ctx.poly_keymap.get(key)

          if (!func) {
            ctx.error(node, 'Unknown function ' + name + ' (' + key + ')')
            return
          }
          log(key, func, '' + node)
        } else if (cs && cs.length === 1) {
          func = cs[0]
        } else {
          log(type, '' + node, cs)
          buildPolyCandidates(node, type)
          ctx.error(node, 'internal parse error')
          return
        }

        const n2 = new IdentNode()
        n2.value = func.key

        node.ntype = ctx.resolveType(func.type)

        node.set(0, n2)
        haskeySet.add(node)

        doneset.add(node)
      },
    },
    false,
    true
  )
}

export function initFuncKeyes(ast: ASTNode, ctx: ParseState): void {
  scopeWalk(ast, ctx, {
    Function(node, ctx) {
      const typeNode = node[0]
      const type = typeNode.value
      if (!(type instanceof VarType) && typeof type !== 'string') {
        return
      }

      const args: Array<VarType | string> = []
      for (const arg of node[1]) {
        const av = arg[0].value
        if (av instanceof VarType) {
          args.push(av)
        } else if (typeof av === 'string') {
          args.push(av)
        }
      }

      const name = getStringValue(node)
      if (name === undefined) {
        return
      }

      if (name.startsWith('_$_')) {
        const resolved = ctx.resolveType(type)
        if (!resolved) {
          return
        }
        const resolvedArgs: VarType[] = []
        for (const a of args) {
          const r = ctx.resolveType(a)
          if (r) {
            resolvedArgs.push(r)
          }
        }
        ctx.addFunc(name, resolved, resolvedArgs)
      } else {
        const resolved = ctx.resolveType(type)
        if (!resolved) {
          return
        }
        const key = ctx.buildPolyKey(name, resolved, args)
        node.polyKey = key

        ctx.addPolyFunc(name, resolved, args)
      }
    },
  })
}

export function propagateTypes(ast: ASTNode, ctx: ParseState, _stage = 0): void {
  const typemap: Map<ASTNode, VarType> = new Map()
  const argmap: Map<ASTNode, VarType[]> = new Map()

  const {buildPolyCandidates} = getFinders(ctx, typemap, argmap)

  let found = false

  function update(node: ASTNode, type: VarType): void {
    if (!node.ntype || !ctx.typesEqual(type, node.ntype)) {
      log('Type update', '' + node.ntype, '' + type)
      found = true
    }

    node.ntype = ctx.resolveType(type)
  }

  function findTypeSimple(n: ASTNode | string): VarType | undefined {
    if (typeof n === 'string') {
      return ctx.resolveType(n)
    }

    if (n.ntype) {
      return n.ntype
    }

    if (n.type === 'Ident') {
      const name = getStringValue(n)
      if (name === undefined) {
        return undefined
      }
      return ctx.resolveType(ctx.scope.get(name))
    }

    if (n.type === 'VarType') {
      return ctx.resolveType(n.value)
    }

    if (n.type === 'IntConstant') {
      return ctx.getType('int')
    }

    if (n.type === 'FloatConstant') {
      return ctx.getType('float')
    }
    return undefined
  }

  scopeWalk(
    ast,
    ctx,
    {
      Assign(node, ctx) {
        const ft1 = findTypeSimple(node[0])
        const ft2 = findTypeSimple(node[1])
        const t1 = ft1 ? ctx.resolveType(ft1) : undefined
        const t2 = ft2 ? ctx.resolveType(ft2) : undefined

        if (t1) {
          update(node, t1)
          update(node[0], t1)

          if (!t2) {
            update(node[1], t1)
            node[1].ntype = t1
          }
        }
      },
      Call(node, ctx) {
        const args: Array<VarType | undefined> = []

        if (haskeySet.has(node)) {
          return
        }

        for (const arg of node[1]) {
          const type = findTypeSimple(arg)

          if (type) {
            update(arg, type)
          }
          args.push(type)
        }

        const nameNode = node[0]
        let name: string
        if (nameNode.type === 'VarType' && nameNode.value instanceof VarType) {
          const t1 = ctx.resolveType(nameNode.value)
          if (t1) {
            update(node, t1)
          }
          name = nameNode.value.getTypeName()
        } else {
          const v = nameNode.value
          name = typeof v === 'string' ? v : ''
        }

        let func: PolyFuncEntry | undefined

        if (name.startsWith('_$_')) {
          func = ctx.poly_keymap.get(name)
        } else {
          const cs = buildPolyCandidates(node)
          if (cs.length === 1) {
            func = cs[0]
          }
        }

        if (func) {
          for (let i = 0; i < node[1].length; i++) {
            node[1].ntype = ctx.resolveType(func.args[i])
          }

          const t = ctx.resolveType(func.type)

          if (t && (!node.ntype || !ctx.typesEqual(t, node.ntype))) {
            node.ntype = t
          }
        }
      },
      ArrayLookup(node, ctx) {
        const ft = findTypeSimple(node[0])
        const t1 = ft ? ctx.resolveType(ft) : undefined

        if (t1) {
          const inner = t1.type
          if (inner instanceof VarType) {
            update(node, inner)
          } else if (typeof inner === 'string') {
            const r = ctx.resolveType(inner)
            if (r) {
              update(node, r)
            }
          }
        }
      },
      BinOp(node, ctx) {
        const ft1 = findTypeSimple(node[0])
        const ft2 = findTypeSimple(node[1])

        if (ft1 && ft2) {
          const t1 = ctx.resolveType(ft1)
          const t2 = ctx.resolveType(ft2)

          if (t1 && t2) {
            const type = t1.getComponents() > t2.getComponents() ? t1 : t2
            update(node, type)
          }
        }
      },
      Return(node, ctx) {
        if (node.length === 0) {
          return
        }

        const type = ctx.getReturnType() ?? findTypeSimple(node[0])

        if (type) {
          update(node, type)
        }
      },
      UnaryOp(node, _ctx) {
        const type = findTypeSimple(node[0])
        if (type) {
          update(node, type)
        }
      },
      PostDec(node, ctx) {
        const type = findTypeSimple(node[0])
        if (type) {
          update(node, type)
        }
      },
      PreDec(node, ctx) {
        const type = findTypeSimple(node[0])
        if (type) {
          update(node, type)
        }
      },
      PostInc(node, ctx) {
        const type = findTypeSimple(node[0])
        if (type) {
          update(node, type)
        }
      },
      PreInc(node, ctx) {
        const type = findTypeSimple(node[0])
        if (type) {
          update(node, type)
        }
      },
    },
    false,
    true
  )

  void found
  void makeNode
}

export function transformAst(ast: ASTNode, ctx: ParseState): void {
  log('Processing AST tree. . .')

  transformSwizzleSimple(ast, ctx)
  transformSwizzleComplex(ast, ctx)

  initFuncKeyes(ast, ctx)

  for (let i = 0; i < 3; i++) {
    propagateTypes(ast, ctx)
  }

  transformPolymorphism(ast, ctx)

  propagateTypes(ast, ctx)
  propagateTypes(ast, ctx)
  transformPolymorphism(ast, ctx)
  propagateTypes(ast, ctx)
  propagateTypes(ast, ctx)

  transformOps(ast, ctx)
}
