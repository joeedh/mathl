import {termPrint, termColor} from '../util/util.js'
import {VarType, ArrayType} from './types.js'
import {PUTLParseError} from '../util/parseutil.js'
import type {ASTNode} from './ast.js'
import {ASTNodeBase, VarDeclNode, VarTypeNode} from './ast.js'
import type {Parser} from '../parser/jscc_util.js'
import type {lexer as Lexer} from '../util/parseutil.js'

export const opnames: Map<string, string> = new Map<string, string>([
  ['*', 'mul'],
  ['/', 'div'],
  ['-', 'sub'],
  ['+', 'add'],
  ['%', 'mod'],
  ['!=', 'nequals'],
  ['==', 'equals'],
  ['>=', 'gequals'],
  ['<=', 'lequals'],
  ['>', 'greater'],
  ['<', 'less'],
  ['^', 'bxor'],
  ['&', 'band'],
  ['|', 'bor'],
  ['+=', 'assign_plus'],
  ['-=', 'assign_minus'],
  ['*=', 'assign_mul'],
  ['/=', 'assign_div'],
  ['&=', 'assign_band'],
  ['|=', 'assign_bor'],
  ['^=', 'assign_bxor'],
])

interface ProcessExitGlobal {
  exit?: (code: number) => void
}

interface JestGlobal {
  INSIDE_JEST?: boolean
}

interface BrowserGlobal {
  window?: {navigator?: unknown; document?: unknown}
  self?: unknown
}

function exit(msg: unknown): void {
  const g = globalThis as unknown as JestGlobal
  const proc = (globalThis as unknown as {process?: ProcessExitGlobal}).process
  if (!g.INSIDE_JEST && proc && typeof proc.exit === 'function') {
    proc.exit(-1)
  } else {
    throw new PUTLParseError('' + msg)
  }
}

export function formatLines(s: string, line = 0, _lexpos = -1, col = 0, count = 5): string {
  const lines = s.split('\n')
  let out = ''

  const maxline = Math.ceil(Math.log(lines.length) / Math.log(10))

  const start = Math.max(line - 2, 0)
  const end = Math.min(line + count, lines.length)

  for (let i = start; i < end; i++) {
    let l = lines[i]
    let si = '' + (i + 1)
    while (si.length < maxline) {
      si = ' ' + si
    }

    if (i === line) {
      let l2 = ''
      for (let j = 0; j < l.length; j++) {
        let c = l[j]

        if (j >= col - 2 && j <= col + 2) {
          c = termColor(c, 'red')
        }
        l2 += c
      }

      l = l2
    }

    l = termPrint(l)
    l = `  ${si}: ${l}`

    out += l + '\n'
  }

  return out
}

const castFuncs = new Set(['float', 'int', 'bool'])

function isBrowser(): boolean {
  const g = globalThis as unknown as BrowserGlobal
  if (typeof g.window !== 'undefined' && g.window) {
    return Boolean(g.window.navigator && g.window.document)
  } else if (typeof g.self !== 'undefined') {
    return true
  }

  return false
}

export interface PolyFuncEntry {
  name: string
  args: VarType[]
  type: VarType
  key: string
}

export interface FuncEntry {
  name: string
  args: VarType[]
  type: VarType
  key: string
}

export interface PopParseStateOptions {
  keepPolyFuncs?: boolean
  keepFuncs?: boolean
}

export type ScopeValue = VarType | ASTNode

export class ParseState {
  parser: Parser | undefined = undefined
  lexer: Lexer | undefined = undefined

  throwError: boolean
  temp_idgen = 0
  preprocessed: string

  poly_namemap: Map<string, Set<PolyFuncEntry>> = new Map()
  poly_keymap: Map<string, PolyFuncEntry> = new Map()

  scope: Map<string, ScopeValue> = new Map()
  localScope: Map<string, ScopeValue> = new Map()

  scopestack: Array<[Map<string, ScopeValue>, Map<string, ScopeValue>]> = []
  types: Map<string, VarType> = new Map()

  inputs: Map<string, ASTNode> = new Map()
  outputs: Map<string, ASTNode> = new Map()
  uniforms: Map<string, ASTNode> = new Map()

  functions: Map<string, FuncEntry> = new Map()
  constructors: Map<string, [string, VarType[]]> = new Map()
  builtinFuncs: Set<string> = new Set()

  source: string
  filename: string

  constructor(source = '', filename = '(anonymous)', parser?: Parser, preprocessed = '', oldState?: ParseState) {
    const jestGlobal = globalThis as unknown as JestGlobal
    this.throwError = isBrowser() || Boolean(jestGlobal.INSIDE_JEST)

    this.preprocessed = preprocessed

    this.reset()

    this.source = source
    this.filename = filename

    this.builtinFuncs = new Set([
      'cos',
      'sin',
      'fract',
      'abs',
      'floor',
      'vec3',
      'vec2',
      'vec4',
      'mat4',
      'mat3',
      'float',
      'int',
      'sqrt',
      'log',
      'pow',
      'exp',
      'acos',
      'asin',
      'tan',
      'atan',
      'atan2',
      'normalize',
      'dot',
      'cross',
      'reflect',
      'step',
      'smoothstep',
      'int',
      'bool',
      'trunc',
    ])

    if (parser !== undefined) {
      this.parser = parser
    }

    if (oldState !== undefined) {
      this.loadOldState(oldState)
    }
  }

  loadOldState(state: ParseState): void {
    for (const [k, v] of state.poly_keymap) {
      if (!this.poly_keymap.has(k)) {
        this.poly_keymap.set(k, v)
      }
    }
    for (const [k, v] of state.poly_namemap) {
      if (!this.poly_namemap.has(k)) {
        this.poly_namemap.set(k, v)
      }
    }
    for (const [k, v] of state.functions) {
      if (!this.functions.has(k)) {
        this.functions.set(k, v)
      }
    }
    for (const [k, v] of state.inputs) {
      if (!this.inputs.has(k)) {
        this.inputs.set(k, v)
      }
    }
    for (const [k, v] of state.outputs) {
      if (!this.outputs.has(k)) {
        this.outputs.set(k, v)
      }
    }
  }

  get col(): number {
    return this.lexer ? this.lexer.lexpos - this.lexer.line_lexstart : -1
  }

  get lexpos(): number {
    return this.lexer ? this.lexer.lexpos : -1
  }

  get line(): number {
    return this.lexer ? this.lexer.linemap[this.lexer.lexpos] : -1
  }

  newTempId(): string {
    return `$tmp${this.temp_idgen++}`
  }

  placeVarDecl(n: ASTNode, type: VarType | string, name: string = this.newTempId()): VarDeclNode {
    const v = new VarDeclNode()
    v.value = name

    const resolved = this.resolveType(type)

    if (!resolved) {
      this.error(n, 'Unknown type ' + type)
    }

    const tn = new VarTypeNode()
    tn.value = resolved

    v.push(tn)

    if (n.type === 'StatementList') {
      n.prepend(v)
      return v
    }

    let p: ASTNode | undefined = n
    let lastp: ASTNode = p

    while (p) {
      if (p.type === 'StatementList') {
        p.insert(p.indexOf(lastp), v)
        return v
      }

      lastp = p
      p = p.parent
    }

    this.error(n, 'Failed to place variable declaration')
    return v
  }

  addLibraryFunc(node: ASTNode): void {
    const argList = node[1]
    const args: VarType[] = []
    for (const arg of argList) {
      const v = arg[0].value
      if (v instanceof VarType) {
        args.push(v)
      }
    }

    const retNode = node[0]
    const retType = retNode.value
    if (!(retType instanceof VarType)) {
      return
    }

    const fname = node.value
    if (typeof fname !== 'string') {
      return
    }

    if (this.isPolyKey(fname)) {
      this.addPolyFunc(this.getPolyKeyName(fname), retType, args)
    }
  }

  addPolyFunc(
    name: string | VarType | ASTNode,
    rtype: string | VarType,
    args: Array<string | VarType>,
    type2?: string | VarType
  ): void {
    if (type2 === '' || type2 === undefined) {
      type2 = this.getType('') as VarType
    } else if (typeof type2 === 'string') {
      type2 = this.getType(type2) as VarType
    }

    if (rtype === '') {
      rtype = type2
    }

    let resolvedName: string
    if (typeof name === 'string') {
      resolvedName = name
    } else if (name instanceof VarType) {
      resolvedName = name.getTypeNameSafe()
    } else if (name instanceof ASTNodeBase) {
      if (name.type === 'Ident') {
        resolvedName = name.value as string
      } else if (name.type === 'VarType') {
        const vt = name.value as VarType
        resolvedName = vt.getTypeNameSafe()
      } else {
        this.error(name, 'Bad name node')
        return
      }
    } else {
      resolvedName = (name as VarType).getTypeNameSafe()
    }

    const resolvedArgs: VarType[] = []
    for (const a of args) {
      if (a === '') {
        resolvedArgs.push(type2 as VarType)
      } else if (typeof a === 'string') {
        resolvedArgs.push(this.getType(a) as VarType)
      } else {
        resolvedArgs.push(a)
      }
    }

    const resolvedRtype = this.resolveType(rtype) as VarType

    const key = this.buildPolyKey(resolvedName, resolvedRtype, resolvedArgs, type2)

    const entry: PolyFuncEntry = {
      name: resolvedName,
      args: resolvedArgs,
      type: resolvedRtype,
      key,
    }

    this.poly_keymap.set(key, entry)

    let nameSet = this.poly_namemap.get(resolvedName)
    if (!nameSet) {
      nameSet = new Set<PolyFuncEntry>()
      this.poly_namemap.set(resolvedName, nameSet)
    }

    nameSet.add({
      type: resolvedRtype,
      args: resolvedArgs,
      key,
      name: resolvedName,
    })

    this.addFunc(resolvedName, resolvedRtype, resolvedArgs, key)
  }

  addFunc(name: string, rtype: VarType, args: VarType[], key: string = name): void {
    const filtered = args.filter((f) => f instanceof VarType)

    this.functions.set(key, {
      type: rtype,
      args: filtered,
      name,
      key,
    })
  }

  copy(): ParseState {
    const p = new ParseState(this.source, this.filename, undefined, this.preprocessed)

    p.parser = this.parser
    p.lexer = this.parser ? this.parser.lexer : undefined

    p.scope = new Map(this.scope)
    p.localScope = new Map(this.localScope)
    p.scopestack = this.scopestack.map(([s, ls]) => [new Map(s), new Map(ls)])
    p.types = new Map(this.types)
    p.inputs = new Map(this.inputs)
    p.outputs = new Map(this.outputs)
    p.uniforms = new Map(this.uniforms)

    p.filename = this.filename
    p.source = this.source

    return p
  }

  isPolyKey(name: string): boolean {
    return name.startsWith('_$_')
  }

  getPolyKeyName(name: string): string {
    name = name.slice(3)
    const i = name.search(/__/)

    if (i === -1) {
      throw new Error('invalid poly key')
    }

    return name.slice(0, i)
  }

  buildPolyKey(
    name: string | VarType | ASTNode,
    rtype: string | VarType,
    args: Array<string | VarType>,
    type2?: string | VarType
  ): string {
    let resolvedType2: VarType | undefined
    if (type2 && typeof type2 === 'string') {
      resolvedType2 = this.getType(type2)
    } else if (type2 instanceof VarType) {
      resolvedType2 = type2
    }

    let resolvedRtype: VarType
    if (typeof rtype === 'string') {
      const r = rtype === '' ? resolvedType2 : this.getType(rtype)
      if (!r) {
        throw new Error('unknown rtype ' + rtype)
      }
      resolvedRtype = r
    } else {
      resolvedRtype = rtype
    }

    let resolvedName: string
    if (typeof name === 'string') {
      resolvedName = name
    } else if (name instanceof VarType) {
      resolvedName = name.getTypeNameSafe()
    } else if (name instanceof ASTNodeBase) {
      if (name.type === 'VarType') {
        const vt = name.value as VarType
        resolvedName = vt.getTypeNameSafe()
      } else if (name.type === 'Ident') {
        resolvedName = name.value as string
      } else {
        this.error(name, 'Bad type node')
        return ''
      }
    } else {
      resolvedName = (name as VarType).getTypeNameSafe()
    }

    let key = `_$_${resolvedName}__${resolvedRtype.getTypeNameSafe()}__`

    const t = resolvedRtype.getTypeNameSafe()
    let nonfloat = !castFuncs.has(t)

    const resolvedArgs: VarType[] = []
    for (let i = 0; i < args.length; i++) {
      let a = args[i]
      if (typeof a === 'string') {
        if (a === '') {
          if (!resolvedType2) {
            throw new Error('missing type2 for empty arg')
          }
          a = resolvedType2
        } else {
          const gt = this.getType(a)
          if (!gt) {
            throw new Error('unknown arg type ' + a)
          }
          a = gt
        }
      }
      resolvedArgs.push(a)

      const tname = a.getTypeNameSafe()
      nonfloat = nonfloat || !castFuncs.has(tname)

      key += tname
    }

    // mutate caller's args array to keep prior side-effecting behavior
    for (let i = 0; i < resolvedArgs.length; i++) {
      args[i] = resolvedArgs[i]
    }

    if (!nonfloat && !this.hasType(resolvedName)) {
      //return name;
    }
    return key
  }

  resetScopeStack(): this {
    this.scopestack.length = 0
    this.localScope = new Map()
    this.scope = new Map()

    const lists = [this.inputs, this.outputs, this.uniforms]
    for (const list of lists) {
      for (const [k, v] of list) {
        this.setScope(k, v)
      }
    }

    return this
  }

  reset(): this {
    this.scopestack = []
    this.poly_keymap = new Map()
    this.poly_namemap = new Map()
    this.functions = new Map()
    this.constructors = new Map()
    this.types = new Map()
    this.localScope = new Map()
    this.scope = new Map()

    this.inputs = new Map()
    this.outputs = new Map()
    this.uniforms = new Map()

    this.addType(new VarType('void'), 'void')

    const f = this.addType(new VarType('float'), 'float')
    this.addType(new VarType('int'), 'int')
    this.addType(new VarType('bool'), 'bool')
    const v2 = this.addType(new ArrayType(f, 2, 'vec2'), 'vec2')
    const v3 = this.addType(new ArrayType(f, 3, 'vec3'), 'vec3')
    const v4 = this.addType(new ArrayType(f, 4, 'vec4'), 'vec4')
    this.addType(new ArrayType(v3, 3, 'mat3'), 'mat3')
    this.addType(new ArrayType(v4, 4, 'mat4'), 'mat4')
    void v2

    const keys: string[] = ['', 'float', 'vec2', 'vec3', 'vec4']

    const sizes: Map<string, number> = new Map([
      ['float', 1],
      ['int', 1],
      ['bool', 1],
      ['vec2', 2],
      ['vec3', 3],
      ['vec4', 4],
    ])

    const out: string[][] = []
    const visited: Set<string> = new Set()

    const push = (list: string[]): void => {
      const listkey = JSON.stringify(list)
      if (!visited.has(listkey)) {
        visited.add(listkey)
        out.push(list)
      }
    }
    const getsize = (lst: string[]): number => {
      let size = 0
      for (const item of lst) {
        size += sizes.get(item) ?? 0
      }
      return size
    }

    const rec = (a: number, size = a, lst: string[] = [], depth = 0): string[] => {
      if (a <= 0 || a > size) {
        return []
      }

      if (depth > size) {
        return [keys[a]]
      }

      if (getsize(lst) === size) {
        push(lst)
      }

      for (let i = 1; i <= size; i++) {
        const lst2 = lst.concat([keys[i]])
        rec(i, size, lst2, depth + 1)
      }
      return []
    }

    const constructors: Map<string, [string, VarType[]]> = new Map()

    for (let i = 1; i <= 4; i++) {
      out.length = 0
      rec(i)

      const keyName = keys[i]
      const keyType = this.getType(keyName) as VarType

      for (const argsList of out) {
        const resolvedArgs: VarType[] = argsList.map((s) => this.getType(s) as VarType)
        const key2 = this.buildPolyKey(keyType, keyType, resolvedArgs, keyType)
        this.addPolyFunc(keyType, keyType, resolvedArgs, keyType)

        constructors.set(key2, [keys[i], resolvedArgs])
      }
    }

    this.constructors = constructors

    for (let i = 2; i <= 4; i++) {
      const key = 'vec' + i

      this.addPolyFunc('normalize', '', ['', ''], key)
      this.addPolyFunc('dot', 'float', ['', ''], key)
      this.addPolyFunc('cross', '', ['', ''], key)
    }

    this.addPolyFunc('atan2', 'float', ['float', 'float'], 'float')

    for (let i = 0; i < 2; i++) {
      const key = i ? 'mat4' : 'mat3'
      this.addPolyFunc('invert', '', [''], key)
      this.addPolyFunc('transpose', '', [''], key)
    }

    for (const key of keys) {
      if (key === '') {
        continue
      }

      this.addPolyFunc('exp', '', [''], key)
      this.addPolyFunc('abs', '', [''], key)
      this.addPolyFunc('min', '', ['', ''], key)
      this.addPolyFunc('max', '', ['', ''], key)
      this.addPolyFunc('fract', '', [''], key)
      this.addPolyFunc('step', '', ['', ''], key)
      this.addPolyFunc('pow', '', ['', ''], key)
      this.addPolyFunc('sin', '', [''], key)
      this.addPolyFunc('cos', '', [''], key)
      this.addPolyFunc('asin', '', [''], key)
      this.addPolyFunc('acos', '', [''], key)
      this.addPolyFunc('atan', '', [''], key)
      this.addPolyFunc('tan', '', [''], key)
      this.addPolyFunc('floor', '', [''], key)
      this.addPolyFunc('ceil', '', [''], key)
      this.addPolyFunc('mod', '', [''], key)
      this.addPolyFunc('sqrt', '', [''], key)
      this.addPolyFunc('pow', '', [''], key)
      this.addPolyFunc('log', '', [''], key)
    }

    this.addPolyFunc('trunc', 'int', ['int'], 'int')

    return this
  }

  error(node: ASTNode | undefined, msg: string): void {
    if (!node) {
      console.error(`\nError: ${msg}`)
    } else {
      console.warn(this)
      console.warn(formatLines(this.source, node.line, node.lexpos, node.col, 45))

      const s = `\nError: ${this.filename}:${node.line + 1}: ${msg}`
      console.error(s + '\n')
    }

    if (this.throwError) {
      throw new Error('Error: ' + msg)
    } else {
      exit(-1)
    }
  }

  getType(name: string): VarType | undefined {
    return this.types.get(name)
  }

  setReturnType(t: VarType | ASTNode): void {
    this.setScope('$__return__$', t)
  }

  getReturnType(): VarType | undefined {
    return this.getScope('$__return__$')
  }

  setScope(k: string, v: ScopeValue): void {
    this.localScope.set(k, v)
    this.scope.set(k, v)
  }

  resolveType(t: VarType | ASTNode | string | undefined): VarType | undefined {
    let cur: VarType | ASTNode | string | undefined = t

    if (typeof cur === 'string') {
      cur = this.getType(cur)
    }

    if (!(cur instanceof VarType)) {
      if (cur instanceof ASTNodeBase && cur.type === 'VarType') {
        cur = cur.value as VarType
      } else if (cur instanceof ASTNodeBase && cur.type === 'Ident') {
        const ident = cur.value
        if (typeof ident === 'string') {
          cur = this.getType(ident)
        }
      }
    }

    if (cur instanceof VarType) {
      const name = cur.getTypeName()
      if (!this.types.has(name)) {
        this.error(t instanceof ASTNodeBase ? t : undefined, 'Unknown type ' + name)
      }

      const t2 = this.types.get(name)
      if (t2 instanceof ArrayType && !(cur instanceof ArrayType)) {
        return t2
      }

      return cur
    }

    if (cur instanceof ASTNodeBase && cur.type === 'VarRef') {
      const vref = cur
      if (vref[0] instanceof ArrayType) {
        return this.resolveType(vref[0].type as VarType | string | undefined)
      } else {
        return this.resolveType(vref[0])
      }
    }

    return undefined
  }

  typesEqual(a: VarType | ASTNode | string | undefined, b: VarType | ASTNode | string | undefined): boolean {
    if (a === undefined || b === undefined) {
      console.log('A:' + a, 'B:' + b)
      throw new Error('undefined arguments to typesEqual')
    }

    const ra = this.resolveType(a)
    const rb = this.resolveType(b)

    if (!ra) {
      console.log('' + a)
      this.error(undefined, 'bad type ' + a)
    }

    if (!rb) {
      console.log('' + b)
      this.error(undefined, 'bad type ' + b)
    }

    if (!ra || !rb) {
      return false
    }
    return ra.getTypeName() === rb.getTypeName()
  }

  getScope(k: string): VarType | undefined {
    return this.resolveType(this.scope.get(k))
  }

  hasType(name: string): boolean {
    return this.types.has(name)
  }

  addType(type: VarType, name: string): VarType {
    this.types.set(name, type)
    return type
  }

  pushScope(): void {
    this.scopestack.push([this.scope, this.localScope])
    this.localScope = new Map()
    this.scope = new Map(this.scope)
  }

  popScope(): void {
    const popped = this.scopestack.pop()
    if (popped) {
      this.scope = popped[0]
      this.localScope = popped[1]
    }
  }
}

const statestack: ParseState[] = []

export let state: ParseState = new ParseState()

export function pushParseState(
  source: string = state.source,
  filename: string = state.filename,
  parser?: Parser,
  preprocessed = ''
): ParseState {
  statestack.push(state)
  state = new ParseState(source, filename, parser, preprocessed, state)
  return state
}

export function popParseState(options: PopParseStateOptions = {keepPolyFuncs: false, keepFuncs: false}): void {
  const old = state
  const popped = statestack.pop()
  if (!popped) {
    throw new Error('popParseState called with empty stack')
  }
  state = popped
  if (options.keepPolyFuncs) {
    for (const [k, v] of old.poly_keymap) {
      state.poly_keymap.set(k, v)
    }
    for (const [k, v] of old.poly_namemap) {
      state.poly_namemap.set(k, v)
    }
    for (const [k, v] of old.functions) {
      if (options.keepFuncs || (state.isPolyKey(k) && options.keepPolyFuncs)) {
        state.functions.set(k, v)
      }
    }
  }
}

export function genLibraryCode(): string {
  let s = ''

  const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k']

  const builtins: Map<string, number> = new Map([
    ['cos', 1],
    ['sin', 1],
    ['sqrt', 1],
    ['exp', 1],
    ['log', 1],
    ['floor', 1],
    ['ceil', 1],
    ['abs', 1],
    ['min', 2],
    ['max', 2],
    ['acos', 1],
    ['asin', 1],
    ['atan', 1],
    ['fract', 1],
  ])
  const ctx = new ParseState()

  const keys = ['float', 'vec2', 'vec3', 'vec4', 'int', 'bool']
  const sizemap: Map<string, number> = new Map([
    ['int', 1],
    ['bool', 1],
    ['float', 1],
    ['vec2', 2],
    ['vec3', 3],
    ['vec4', 4],
  ])

  function genMathFunc(name: string, args: Array<string | VarType>, type: string): void {
    const size = sizemap.get(type) ?? 0

    const ntype = ctx.resolveType(type) as VarType
    const argList: Array<VarType> = []

    for (const a of args) {
      if (a === '') {
        argList.push(ntype)
      } else if (typeof a === 'string') {
        argList.push(ctx.resolveType(a) as VarType)
      } else {
        argList.push(ctx.resolveType(a) as VarType)
      }
    }

    const key = ctx.buildPolyKey(name, ntype, argList, ntype)
    s += `${ntype.getTypeNameSafe()} ${key}(`

    const tname = ntype.getTypeNameSafe()

    let ai = 0
    for (const arg of argList) {
      if (ai > 0) {
        s += ', '
      }

      s += `${arg.getTypeNameSafe()} ${names[ai]}`
      ai++
    }
    s += ') {\n'

    s += `  ${tname} r;\n`

    for (let j = 0; j < size; j++) {
      s += `  r[${j}] = `

      let s2 = `${name}(`
      for (let i = 0; i < argList.length; i++) {
        if (i > 0) {
          s2 += ', '
        }
        s2 += names[i]
        if (ctx.typesEqual(argList[i], ntype)) {
          s2 += `[${j}]`
        }
      }
      s2 += `);\n`

      s += s2
    }

    s += `  return r;\n`
    s += '}\n'
  }

  for (const [k, v] of builtins) {
    const args: string[] = []
    for (let i = 0; i < v; i++) {
      args.push('')
    }

    for (const key of keys) {
      if (key === 'float' || key === 'int' || key === 'bool') {
        continue
      }
      genMathFunc(k, args, key)
    }
  }

  for (const key of keys) {
    if (key === 'float' || key === 'int' || key === 'bool') {
      continue
    }

    genMathFunc('pow', ['', ''], key)
    genMathFunc('pow', ['float', ''], key)
    genMathFunc('pow', ['', 'float'], key)
    genMathFunc('step', ['', ''], key)
    genMathFunc('step', ['float', ''], key)
    genMathFunc('step', ['', 'float'], key)
  }

  const transformAssignOp = (op: string): string => {
    if (op.length === 2 && op.endsWith('=') && op !== '==' && op !== '!=' && op !== '>=' && op !== '<=') {
      op = op[0]
    }
    return op
  }

  for (const [origOp, name] of opnames) {
    const op = transformAssignOp(origOp)

    s += `
  int _$_$_${name}__int__intint(int a, int b) {
    return trunc(a ${op} b);
  }

  `
  }

  for (const key of keys) {
    if (key === 'float' || key === 'int' || key === 'bool') {
      continue
    }

    for (const [origOp, name] of opnames) {
      if (origOp === '**' || origOp === '%') {
        continue
      }

      const op = transformAssignOp(origOp)

      s += `${key} _$_$_${name}__${key}__${key}(${key} a, ${key} b) {\n`
      s += `  ${key} r;\n`

      const size = sizemap.get(key) ?? 0

      for (let i = 0; i < size; i++) {
        s += `  r[${i}] = a[${i}] ${op} b[${i}];\n`
      }
      s += `\n  return r;\n`
      s += `}\n`
    }

    for (const [origOp, name] of opnames) {
      if (origOp === '**' || origOp === '%') {
        continue
      }

      const op = transformAssignOp(origOp)

      for (let step = 0; step < 2; step++) {
        if (step) {
          s += `${key} _$_$_${name}__${key}__float${key}(float a, ${key} b) {\n`
        } else {
          s += `${key} _$_$_${name}__${key}__${key}float(${key} a, float b) {\n`
        }
        s += `  ${key} r;\n`
        const sz = sizemap.get(key) ?? 0
        for (let i = 0; i < sz; i++) {
          if (step) {
            s += `  r[${i}] = a ${op} b[${i}];\n`
          } else {
            s += `  r[${i}] = a[${i}] ${op} b;\n`
          }
        }
        s += `  return r;\n`
        s += '}\n'
      }
    }
  }

  for (const [, [type, ctorArgs]] of ctx.constructors) {
    const argNames = ctorArgs.map((f) => f.getTypeNameSafe())

    const k = ctx.buildPolyKey(type, ctx.resolveType(type) as VarType, ctorArgs, ctx.resolveType(type) as VarType)

    s += `${type} ${k}(`

    for (let i = 0; i < argNames.length; i++) {
      if (i > 0) {
        s += ', '
      }

      s += `${argNames[i]} ${names[i]}`
    }

    s += `) {\n  ${type} r;\n`

    const size = sizemap.get(type) ?? 0
    let ai = 0
    let aj = 0
    let arg = argNames[ai]

    for (let i = 0; i < size; i++) {
      if (arg === 'float' || arg === 'int' || arg === 'bool') {
        s += `  r[${i}] = ${names[ai]};\n`
        aj++
      } else {
        s += `  r[${i}] = ${names[ai]}[${aj++}];\n`
      }

      if (aj >= (sizemap.get(arg) ?? 0)) {
        ai++
        aj = 0
        arg = argNames[ai]
      }
    }

    s += '  return r;\n'
    s += '}\n'
  }

  s += `

int int_cast(float f) {
  return f;
}

int int_cast(int f) {
  return f;
}

float float_cast(float f) {
  return f;
}

float float_cast(int f) {
  return f;
}

float float_cast(bool b) {
  return b ? 1.0 : 0.0;
}

bool bool_cast(float f) {
  return f != 0.0;
}

bool bool_cast(bool b) {
  return b;
}

bool bool_cast(int i) {
  return i != 0;
}

vec4 _$_$_mul__mat4__vec4(mat4 m, vec4 v) {
  vec4 r;

  r[0] = m[0][0]*v[0] + m[1][0]*v[1] + m[2][0]*v[2] + m[3][0]*v[3];
  r[1] = m[0][1]*v[0] + m[1][1]*v[1] + m[2][1]*v[2] + m[3][1]*v[3];
  r[2] = m[0][2]*v[0] + m[1][2]*v[1] + m[2][2]*v[2] + m[3][2]*v[3];
  r[3] = m[0][3]*v[0] + m[1][3]*v[1] + m[2][3]*v[2] + m[3][3]*v[3];

  return r;
}

`

  return s
}

export const libraryCode: string = genLibraryCode()
