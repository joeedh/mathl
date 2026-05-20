import * as util from '../util/util.js'
import * as state from './state.js'
import {ArrayType, VarType, VarTypeJSON} from './types.js'

import * as nstructjs from '../util/nstructjs_es6.js'

let idgen = 0

export const strtable = new Map<string, number>()
export const hashtable = new Map<number, string>()

function strTableAdd(type: string): number {
  let hash = util.strhash(type)

  /* deal with collision in a deterministic way */
  let entry = hashtable.get(hash)
  while (entry !== undefined && entry !== type) {
    hash++
    entry = hashtable.get(hash)
  }

  hashtable.set(hash, type)
  strtable.set(type, hash)

  return hash
}

export const AstTypes: string[] = [
  'Function',
  'VarType',
  'ExprList',
  'VarDecl',
  'InitDeclaratorList',
  'StatementList',
  'Ident',
  'IntConstant',
  'ArrayLookup',
  'Call',
  'Assign',
  'Return',
  'Program',
  'BinOp',
  'Precision',
  'TypeQualifier',
  'FloatConstant',
  'BasicMemberLookup',
  'Trinary',
]

for (const key of AstTypes) {
  strTableAdd(key)
}

interface JsonCompressGlobal {
  jsonCompress: (json: string) => number[]
}

;(globalThis as unknown as JsonCompressGlobal).jsonCompress = function (json: string): number[] {
  const delim = '"\',.{}[]|: '
  const delimMap = new Map<string, number>()
  let dicti = 0

  for (let i = 0; i < delim.length; i++) {
    delimMap.set(delim[i], dicti++)
  }

  json = json.replace(/[ \t]+/g, ' ')

  const dict = new Map<string, number>()
  const ret: number[] = []

  let word = ''

  for (let i = 0; i < json.length; i++) {
    const c = json[i]

    if (delimMap.has(c)) {
      if (word.length > 0) {
        let j = dict.get(word)

        if (j === undefined) {
          j = dicti++
          dict.set(word, j)
        }

        ret.push(j)
      }

      word = ''
      ret.push(delimMap.get(c)!)
    } else {
      word += c
    }
  }

  if (word.length > 0) {
    let j = dict.get(word)

    if (j === undefined) {
      j = dicti++
      dict.set(word, j)
    }

    ret.push(j)
  }

  const s: number[] = []
  for (const k of dict.keys()) {
    s.push(k.length)
    for (let i = 0; i < k.length; i++) {
      s.push(k.charCodeAt(i))
    }
  }

  s.push(0)

  for (const i of ret) {
    let n = i
    let ok = true

    do {
      if (n > 127) {
        s.push((n & 127) | 128)
        n >>= 7
        ok = false
      } else {
        ok = true
      }
    } while (!ok)

    s.push(n)
  }

  return s
}

export interface ASTNodeJSON {
  arraytype?: unknown
  type: string
  id: number
  ntype?: unknown
  op?: string
  prec?: number
  line: number
  lexpos: number
  col: number
  polyKey?: string
  noScope?: boolean
  qualifier?: unknown
  value?: unknown
  length: number
  [n: number]: ASTNodeJSON
  Class?: string
}

export class ASTNodeBase<VALUE, TYPE extends string> extends Array<ASTNode> {
  id: number
  type: TYPE
  parent: ASTNode | undefined
  line: number
  lexpos: number
  col: number
  ntype?: VarType
  value?: VALUE
  polyKey?: string
  noScope?: boolean
  qualifier?: ASTNode

  static STRUCT: string

  constructor(type: TYPE) {
    super()

    this.id = idgen++

    this.type = type
    this.parent = undefined

    this._getTypeId()

    this.line = state.state.line
    this.lexpos = state.state.lexpos
    this.col = state.state.col
  }

  toJSON(): ASTNodeJSON {
    const ret = Object.assign({}, this) as unknown as ASTNodeJSON & {parent?: unknown}

    delete ret.parent
    ret.length = this.length

    for (let i = 0; i < this.length; i++) {
      ret[i] = this[i].toJSON()
    }

    return ret
  }

  loadJSON(json: ASTNodeJSON): this {
    this.id = json.id
    this.line = json.line
    this.lexpos = json.lexpos
    this.col = json.col
    this.polyKey = json.polyKey
    this.noScope = json.noScope

    if (json.ntype !== undefined) {
      if (typeof json.ntype === 'object' && json.ntype !== null) {
        this.ntype = VarType.fromJSON(json.ntype as VarTypeJSON)
      } else {
        this.ntype = json.ntype as unknown as VarType
      }
    }

    if (json.qualifier !== undefined && json.qualifier !== null && typeof json.qualifier === 'object') {
      const q = json.qualifier as ASTNodeJSON
      const n = makeNode(q.type)
      n.loadJSON(q)
      this.qualifier = n
    }

    if (json.value !== undefined) {
      if (typeof json.value === 'object' && json.value !== null) {
        const v = json.value as ASTNodeJSON
        if (v.Class) {
          this.value = VarType.fromJSON(v as unknown as VarTypeJSON) as unknown as VALUE
        } else {
          const n = makeNode(v.type)
          n.loadJSON(v)
          this.value = n as unknown as VALUE
        }
      } else {
        this.value = json.value as VALUE
      }
    }

    for (let i = 0; i < json.length; i++) {
      const child = json[i]
      const n2 = makeNode(child.type)

      n2.loadJSON(child)
      n2.parent = this as unknown as ASTNode

      this.push(n2)
    }

    return this
  }

  _getTypeId(): number {
    const hash = strtable.get(this.type)

    if (hash !== undefined) {
      return hash
    }

    return strTableAdd('' + this.type)
  }

  // @ts-expect-error – overrides polyfill Array.prototype.set with an incompatible signature
  set(idx: number, n: ASTNode): this {
    this.length = Math.max(this.length, idx + 1)

    if (n.parent) {
      n.parent.remove(n)
    }

    this[idx] = n
    n.parent = this as unknown as ASTNode

    return this
  }

  copyPosTo(b: ASTNode): void {
    b.line = this.line
    b.col = this.col
    b.lexpos = this.lexpos
  }

  prepend(n: ASTNode): this {
    this.length++

    for (let i = this.length - 1; i > 0; i--) {
      this[i] = this[i - 1]
    }

    this[0] = n
    return this
  }

  copy() {
    const n = makeNode(this.type)
    this.copyTo(n as this)
    return n
  }

  copyTo(b: this): void {
    b.noScope = this.noScope
    b.qualifier = this.qualifier
    b.polyKey = this.polyKey

    b.line = this.line
    b.lexpos = this.lexpos
    b.col = this.col
    b.ntype = this.ntype

    b.value = this.value

    for (const n2 of this) {
      b.push(n2.copy())
    }
  }

  push(n: unknown): number {
    if (n === undefined) {
      throw new Error('ASTNode.push got undefined')
    }

    let node: ASTNode
    if (typeof n === 'number') {
      const isint = Math.abs(n - Math.floor(n)) < 0.00000001
      const n2 = isint ? new IntConstantNode() : new FloatConstantNode()
      n2.value = n
      node = n2
    } else if (typeof n === 'string') {
      const n2 = new IdentNode()
      n2.value = n
      node = n2
    } else if (n instanceof VarType) {
      const n2 = new VarTypeNode()
      n2.value = n
      node = n2
    } else {
      node = n as ASTNode
    }

    node.parent = this as unknown as ASTNode
    return super.push(node)
  }

  replace(a: ASTNode, b: ASTNode): this {
    const idx = this.indexOf(a)

    if (idx < 0) {
      throw new Error('child not in node')
    }

    if (b.parent) {
      b.parent.remove(b)
    }

    if (a.parent === (this as unknown as ASTNode)) {
      a.parent = undefined
    }

    this[idx] = b
    b.parent = this as unknown as ASTNode

    return this
  }

  remove(n: ASTNode): this {
    let i = this.indexOf(n)

    if (i < 0) {
      console.log(n)
      throw new Error('item not in array')
    }

    while (i < this.length) {
      this[i] = this[i + 1]
      i++
    }

    if (n.parent === (this as unknown as ASTNode)) {
      n.parent = undefined
    }

    this.length--

    return this
  }

  insert(starti: number, n: ASTNode): this {
    if (n.parent) {
      n.parent.remove(n)
    }

    this.length++

    let i = this.length - 1
    while (i > starti) {
      this[i] = this[i - 1]
      i--
    }

    n.parent = this as unknown as ASTNode
    this[starti] = n

    return this
  }

  lineStr(): string {
    return `${this.type}:${this.id} ${this.value as unknown as string}`
  }

  toString(t = 0): string {
    const tab = util.indent(t, '-')

    let typestr: string = this.type

    if (this.value !== undefined) {
      typestr += ' : ' + (this.value as unknown as string)
    } else if ((this as unknown as {op?: string}).op !== undefined) {
      typestr += ' (' + (this as unknown as {op: string}).op + ')'
    }

    if (this.ntype !== undefined) {
      typestr += ' <' + util.termPrint(this.ntype.getTypeNameSafe() + '>', 'red')
    }

    let s = tab + typestr + ' { line:' + (this.line + 1)

    if (this.length === 0) {
      s += '}\n'
    } else {
      s += '\n'
      for (const c of this) {
        s += c.toString(t + 1)
      }
      s += tab + '}\n'
    }

    if (t === 0) {
      s = util.termColor(s, 'cyan')
    }

    return s
  }
}
ASTNodeBase.STRUCT = `
ASTNode {
  type   : int | this._getTypeId();
}
`
//@ts-ignore
nstructjs.register(ASTNodeBase, 'ASTNode')

export function equalsVarRef(n: ASTNode, vref: ASTNode): boolean {
  let ok = false

  if (vref[0].value instanceof ArrayType && n.type === 'ArrayLookup') {
    ok = n[0].value === vref.value
    ok = ok && n[1].value === vref[1].value
  } else if (n.type === 'Ident' && !(vref[0].value instanceof ArrayType)) {
    ok = vref.value === n.value
  }

  return ok
}

export function makeVarRef(name: string, type: ASTNode | VarType, idx: number): VarRefNode {
  const n = new VarRefNode()
  n.value = name

  n.push(type as ASTNode)

  if (type instanceof ArrayType) {
    const n2 = new IntConstantNode()
    n2.value = idx

    n.push(n2)
  }

  return n
}

/* -------------------------------------------------------------------------- */
/* Subclasses                                                                  */
/* -------------------------------------------------------------------------- */

function registerSubclass(cls: {STRUCT: string; name: string}, parent: typeof ASTNodeBase, name: string): void {
  cls.STRUCT = nstructjs.inherit(cls, parent, name) + `\n}`
  //@ts-ignore
  nstructjs.register(cls, name)
}

export class BinOpNode extends ASTNodeBase<string, 'BinOp'> {
  op: string = ''
  prec: number = -1

  constructor(op = '', prec = -1) {
    super('BinOp')
    this.op = op
    this.prec = prec
  }

  toJSON(): ASTNodeJSON {
    return {...super.toJSON(), op: this.op, prec: this.prec}
  }

  loadJSON(json: ASTNodeJSON): this {
    super.loadJSON(json)
    this.op = json.op ?? ''
    this.prec = json.prec ?? -1
    return this
  }

  copyTo(b: this) {
    super.copyTo(b)
    b.value = this.value
    b.op = this.op
    b.prec = this.prec
  }
}
registerSubclass(BinOpNode, ASTNodeBase, 'BinOpNode')

export class ArrayLookupNode extends ASTNodeBase<unknown, 'ArrayLookup'> {
  arraytype?: VarType

  constructor(arraytype?: VarType) {
    super('ArrayLookup')
    this.arraytype = arraytype
  }

  toJSON(): ASTNodeJSON {
    return {
      ...super.toJSON(),
      arraytype: this.arraytype ? this.arraytype.toJSON() : undefined,
    }
  }

  loadJSON(json: ASTNodeJSON): this {
    super.loadJSON(json)
    if (json.arraytype) {
      this.arraytype = VarType.fromJSON(json.arraytype as VarTypeJSON)
    }
    return this
  }

  copyTo(n: this) {
    super.copyTo(n)
    n.value = this.value
    n.arraytype = this.arraytype
  }
}
registerSubclass(ArrayLookupNode, ASTNodeBase, 'ArrayLookupNode')

export class IdentNode extends ASTNodeBase<string, 'Ident'> {
  constructor() {
    super('Ident')
  }
}
registerSubclass(IdentNode, ASTNodeBase, 'IdentNode')

export class BoolConstantNode extends ASTNodeBase<string, 'BoolConstant'> {
  constructor() {
    super('BoolConstant')
  }
}
registerSubclass(BoolConstantNode, ASTNodeBase, 'BoolConstantNode')

export class IntConstantNode extends ASTNodeBase<number, 'IntConstant'> {
  constructor() {
    super('IntConstant')
  }
}
registerSubclass(IntConstantNode, ASTNodeBase, 'IntConstantNode')

export class UintConstantNode extends ASTNodeBase<number, 'UintConstant'> {
  constructor() {
    super('UintConstant')
  }
}
registerSubclass(UintConstantNode, ASTNodeBase, 'UintConstantNode')

export class FloatConstantNode extends ASTNodeBase<number, 'FloatConstant'> {
  constructor() {
    super('FloatConstant')
  }
}
registerSubclass(FloatConstantNode, ASTNodeBase, 'FloatConstantNode')

export class VarTypeNode extends ASTNodeBase<VarType, 'VarType'> {
  constructor() {
    super('VarType')
  }
}
registerSubclass(VarTypeNode, ASTNodeBase, 'VarTypeNode')

export class VarRefNode extends ASTNodeBase<unknown, 'VarRef'> {
  constructor() {
    super('VarRef')
  }
}
registerSubclass(VarRefNode, ASTNodeBase, 'VarRefNode')

export class AssignNode extends ASTNodeBase<unknown, 'Assign'> {
  op: string = ''

  constructor(op = '') {
    super('Assign')
    this.op = op
  }

  toJSON(): ASTNodeJSON {
    return {...super.toJSON(), op: this.op}
  }

  loadJSON(json: ASTNodeJSON): this {
    super.loadJSON(json)
    this.op = json.op ?? ''
    return this
  }

  copyTo(n: this) {
    super.copyTo(n)
    n.op = this.op
    n.value = this.value
  }
}
registerSubclass(AssignNode, ASTNodeBase, 'AssignNode')

export class UnaryOpNode extends ASTNodeBase<unknown, 'UnaryOp'> {
  op: string = ''

  constructor(op = '') {
    super('UnaryOp')
    this.op = op
  }

  toJSON(): ASTNodeJSON {
    return {...super.toJSON(), op: this.op}
  }

  loadJSON(json: ASTNodeJSON): this {
    super.loadJSON(json)
    this.op = json.op ?? ''
    return this
  }

  copyTo(n: this) {
    super.copyTo(n)
    n.op = this.op
    return n
  }
}
registerSubclass(UnaryOpNode, ASTNodeBase, 'UnaryOpNode')

export class PreIncNode extends ASTNodeBase<unknown, 'PreInc'> {
  op: string = '++'

  constructor() {
    super('PreInc')
  }
}
registerSubclass(PreIncNode, ASTNodeBase, 'PreIncNode')

export class PreDecNode extends ASTNodeBase<unknown, 'PreDec'> {
  op: string = '--'

  constructor() {
    super('PreDec')
  }
}
registerSubclass(PreDecNode, ASTNodeBase, 'PreDecNode')

export class PostIncNode extends ASTNodeBase<unknown, 'PostInc'> {
  constructor() {
    super('PostInc')
  }
}
registerSubclass(PostIncNode, ASTNodeBase, 'PostIncNode')

export class PostDecNode extends ASTNodeBase<unknown, 'PostDec'> {
  constructor() {
    super('PostDec')
  }
}
registerSubclass(PostDecNode, ASTNodeBase, 'PostDecNode')

export class ExprListNode extends ASTNodeBase<unknown, 'ExprList'> {
  constructor() {
    super('ExprList')
  }
}
registerSubclass(ExprListNode, ASTNodeBase, 'ExprListNode')

export class StatementListNode extends ASTNodeBase<unknown, 'StatementList'> {
  constructor() {
    super('StatementList')
  }
}
registerSubclass(StatementListNode, ASTNodeBase, 'StatementListNode')

export class InitDeclaratorListNode extends ASTNodeBase<unknown, 'InitDeclaratorList'> {
  constructor() {
    super('InitDeclaratorList')
  }
}
registerSubclass(InitDeclaratorListNode, ASTNodeBase, 'InitDeclaratorListNode')

export class StructMemberListNode extends ASTNodeBase<unknown, 'StructMemberList'> {
  constructor() {
    super('StructMemberList')
  }
}
registerSubclass(StructMemberListNode, ASTNodeBase, 'StructMemberListNode')

export class LayoutQualifierNode extends ASTNodeBase<unknown, 'LayoutQualifier'> {
  constructor() {
    super('LayoutQualifier')
  }
}
registerSubclass(LayoutQualifierNode, ASTNodeBase, 'LayoutQualifierNode')

export class LayoutQualifierIdNode extends ASTNodeBase<string, 'LayoutQualifierId'> {
  constructor() {
    super('LayoutQualifierId')
  }
}
registerSubclass(LayoutQualifierIdNode, ASTNodeBase, 'LayoutQualifierIdNode')

export class SubroutineQualifierNode extends ASTNodeBase<unknown, 'SubroutineQualifier'> {
  constructor() {
    super('SubroutineQualifier')
  }
}
registerSubclass(SubroutineQualifierNode, ASTNodeBase, 'SubroutineQualifierNode')

export class TypeQualifierNode extends ASTNodeBase<string, 'TypeQualifier'> {
  constructor() {
    super('TypeQualifier')
  }
}
registerSubclass(TypeQualifierNode, ASTNodeBase, 'TypeQualifierNode')

export class TypeNameNode extends ASTNodeBase<string, 'TypeName'> {
  constructor() {
    super('TypeName')
  }
}
registerSubclass(TypeNameNode, ASTNodeBase, 'TypeNameNode')

export class StructDeclNode extends ASTNodeBase<string, 'StructDecl'> {
  constructor() {
    super('StructDecl')
  }
}
registerSubclass(StructDeclNode, ASTNodeBase, 'StructDeclNode')

export class StructMemberNode extends ASTNodeBase<string, 'StructMember'> {
  arraytype?: ArrayType

  constructor() {
    super('StructMember')
  }

  toJSON(): ASTNodeJSON {
    return {
      ...super.toJSON(),
      arraytype: this.arraytype ? this.arraytype.toJSON() : undefined,
    }
  }

  loadJSON(json: ASTNodeJSON): this {
    super.loadJSON(json)
    if (json.arraytype) {
      this.arraytype = ArrayType.fromJSON(json.arraytype as VarTypeJSON) as ArrayType
    }
    return this
  }

  copyTo(n: this) {
    super.copyTo(n)
    n.arraytype = this.arraytype
    n.value = this.value
    return n
  }
}
registerSubclass(StructMemberNode, ASTNodeBase, 'StructMemberNode')

export class FunctionNode extends ASTNodeBase<string, 'Function'> {
  constructor() {
    super('Function')
  }
}
registerSubclass(FunctionNode, ASTNodeBase, 'FunctionNode')

export class VarDeclNode extends ASTNodeBase<string, 'VarDecl'> {
  arraytype?: VarType | ArrayType

  constructor() {
    super('VarDecl')
  }

  toJSON(): ASTNodeJSON {
    return {
      ...super.toJSON(),
      arraytype: this.arraytype ? this.arraytype.toJSON() : undefined,
    }
  }

  loadJSON(json: ASTNodeJSON): this {
    super.loadJSON(json)
    if (json.arraytype) {
      this.arraytype = VarType.fromJSON(json.arraytype as VarTypeJSON)
    }
    return this
  }

  copyTo(n: this) {
    super.copyTo(n)
    n.arraytype = this.arraytype
    n.value = this.value
    n.noScope = this.noScope
  }
}
registerSubclass(VarDeclNode, ASTNodeBase, 'VarDeclNode')

export class CallNode extends ASTNodeBase<unknown, 'Call'> {
  constructor() {
    super('Call')
  }
}
registerSubclass(CallNode, ASTNodeBase, 'CallNode')

export class ProgramNode extends ASTNodeBase<unknown, 'Program'> {
  constructor() {
    super('Program')
  }
}
registerSubclass(ProgramNode, ASTNodeBase, 'ProgramNode')

export class ReturnNode extends ASTNodeBase<unknown, 'Return'> {
  constructor() {
    super('Return')
  }
}
registerSubclass(ReturnNode, ASTNodeBase, 'ReturnNode')

export class BreakNode extends ASTNodeBase<unknown, 'Break'> {
  constructor() {
    super('Break')
  }
}
registerSubclass(BreakNode, ASTNodeBase, 'BreakNode')

export class ContinueNode extends ASTNodeBase<unknown, 'Continue'> {
  constructor() {
    super('Continue')
  }
}
registerSubclass(ContinueNode, ASTNodeBase, 'ContinueNode')

export class DiscardNode extends ASTNodeBase<unknown, 'Discard'> {
  constructor() {
    super('Discard')
  }
}
registerSubclass(DiscardNode, ASTNodeBase, 'DiscardNode')

export class IfNode extends ASTNodeBase<unknown, 'If'> {
  constructor() {
    super('If')
  }
}
registerSubclass(IfNode, ASTNodeBase, 'IfNode')

export class ElseNode extends ASTNodeBase<unknown, 'Else'> {
  constructor() {
    super('Else')
  }
}
registerSubclass(ElseNode, ASTNodeBase, 'ElseNode')

export class ConditionNode extends ASTNodeBase<unknown, 'Condition'> {
  constructor() {
    super('Condition')
  }
}
registerSubclass(ConditionNode, ASTNodeBase, 'ConditionNode')

export class SwitchNode extends ASTNodeBase<unknown, 'Switch'> {
  constructor() {
    super('Switch')
  }
}
registerSubclass(SwitchNode, ASTNodeBase, 'SwitchNode')

export class CaseLabelNode extends ASTNodeBase<unknown, 'CaseNode'> {
  constructor() {
    super('CaseNode')
  }
}
registerSubclass(CaseLabelNode, ASTNodeBase, 'CaseLabelNode')

export class DefaultCaseNode extends ASTNodeBase<unknown, 'DefaultCase'> {
  constructor() {
    super('DefaultCase')
  }
}
registerSubclass(DefaultCaseNode, ASTNodeBase, 'DefaultCaseNode')

export class WhileNode extends ASTNodeBase<unknown, 'While'> {
  constructor() {
    super('While')
  }
}
registerSubclass(WhileNode, ASTNodeBase, 'WhileNode')

export class DoWhileNode extends ASTNodeBase<unknown, 'DoWhile'> {
  constructor() {
    super('DoWhile')
  }
}
registerSubclass(DoWhileNode, ASTNodeBase, 'DoWhileNode')

export class ForLoopNode extends ASTNodeBase<unknown, 'ForLoop'> {
  constructor() {
    super('ForLoop')
  }
}
registerSubclass(ForLoopNode, ASTNodeBase, 'ForLoopNode')

export class TrinaryNode extends ASTNodeBase<unknown, 'Trinary'> {
  constructor() {
    super('Trinary')
  }
}
registerSubclass(TrinaryNode, ASTNodeBase, 'TrinaryNode')

export class ExprNode extends ASTNodeBase<unknown, 'Expr'> {
  constructor() {
    super('Expr')
  }
}
registerSubclass(ExprNode, ASTNodeBase, 'ExprNode')

export class BasicMemberLookupNode extends ASTNodeBase<unknown, 'BasicMemberLookup'> {
  constructor() {
    super('BasicMemberLookup')
  }
}
registerSubclass(BasicMemberLookupNode, ASTNodeBase, 'BasicMemberLookupNode')

export class PrecisionNode extends ASTNodeBase<unknown, 'Precision'> {
  constructor() {
    super('Precision')
  }
}
registerSubclass(PrecisionNode, ASTNodeBase, 'PrecisionNode')

/* -------------------------------------------------------------------------- */
/* Union type + dispatcher                                                     */
/* -------------------------------------------------------------------------- */

export type ASTNode =
  | BinOpNode
  | ArrayLookupNode
  | IdentNode
  | BoolConstantNode
  | IntConstantNode
  | UintConstantNode
  | FloatConstantNode
  | VarTypeNode
  | VarRefNode
  | AssignNode
  | UnaryOpNode
  | PreIncNode
  | PreDecNode
  | PostIncNode
  | PostDecNode
  | ExprListNode
  | StatementListNode
  | InitDeclaratorListNode
  | StructMemberListNode
  | LayoutQualifierNode
  | LayoutQualifierIdNode
  | SubroutineQualifierNode
  | TypeQualifierNode
  | TypeNameNode
  | StructDeclNode
  | StructMemberNode
  | FunctionNode
  | VarDeclNode
  | CallNode
  | ProgramNode
  | ReturnNode
  | BreakNode
  | ContinueNode
  | DiscardNode
  | IfNode
  | ElseNode
  | ConditionNode
  | SwitchNode
  | CaseLabelNode
  | DefaultCaseNode
  | WhileNode
  | DoWhileNode
  | ForLoopNode
  | TrinaryNode
  | ExprNode
  | BasicMemberLookupNode
  | PrecisionNode

type NodeCtor = () => ASTNode

const nodeCtors: Map<string, NodeCtor> = new Map<string, NodeCtor>([
  ['BinOp', () => new BinOpNode()],
  ['ArrayLookup', () => new ArrayLookupNode()],
  ['Ident', () => new IdentNode()],
  ['BoolConstant', () => new BoolConstantNode()],
  ['IntConstant', () => new IntConstantNode()],
  ['UintConstant', () => new UintConstantNode()],
  ['UIntConstant', () => new UintConstantNode()],
  ['FloatConstant', () => new FloatConstantNode()],
  ['VarType', () => new VarTypeNode()],
  ['VarRef', () => new VarRefNode()],
  ['Assign', () => new AssignNode()],
  ['UnaryOp', () => new UnaryOpNode()],
  ['PreInc', () => new PreIncNode()],
  ['PreDec', () => new PreDecNode()],
  ['PostInc', () => new PostIncNode()],
  ['PostDec', () => new PostDecNode()],
  ['ExprList', () => new ExprListNode()],
  ['StatementList', () => new StatementListNode()],
  ['InitDeclaratorList', () => new InitDeclaratorListNode()],
  ['StructMemberList', () => new StructMemberListNode()],
  ['LayoutQualifier', () => new LayoutQualifierNode()],
  ['LayoutQualifierId', () => new LayoutQualifierIdNode()],
  ['SubroutineQualifier', () => new SubroutineQualifierNode()],
  ['TypeQualifier', () => new TypeQualifierNode()],
  ['TypeName', () => new TypeNameNode()],
  ['StructDecl', () => new StructDeclNode()],
  ['StructMember', () => new StructMemberNode()],
  ['Function', () => new FunctionNode()],
  ['VarDecl', () => new VarDeclNode()],
  ['Call', () => new CallNode()],
  ['Program', () => new ProgramNode()],
  ['Return', () => new ReturnNode()],
  ['Break', () => new BreakNode()],
  ['Continue', () => new ContinueNode()],
  ['Discard', () => new DiscardNode()],
  ['If', () => new IfNode()],
  ['Else', () => new ElseNode()],
  ['Condition', () => new ConditionNode()],
  ['Switch', () => new SwitchNode()],
  ['CaseNode', () => new CaseLabelNode()],
  ['DefaultCase', () => new DefaultCaseNode()],
  ['While', () => new WhileNode()],
  ['DoWhile', () => new DoWhileNode()],
  ['ForLoop', () => new ForLoopNode()],
  ['Trinary', () => new TrinaryNode()],
  ['Expr', () => new ExprNode()],
  ['BasicMemberLookup', () => new BasicMemberLookupNode()],
  ['Precision', () => new PrecisionNode()],
])

export function makeNode(type: string): ASTNode {
  const f = nodeCtors.get(type)
  if (!f) {
    throw new Error('unknown AST node type ' + type)
  }
  return f()
}

// Legacy compat for JS callers. New TS code should use makeNode() or the
// subclasses directly. `new ASTNodeCtor('TypeStr')` constructs a base instance
// with `.type` set to 'TypeStr' (no subclass methods/fields) — fine for
// instanceof checks and serialization (nstructjs will rehydrate via the
// registered subclass), but it skips literal-type narrowing.
type ASTNodeCtorType = new (type: string) => ASTNode
export const ASTNodeCtor: ASTNodeCtorType = ASTNodeBase as unknown as ASTNodeCtorType

/* -------------------------------------------------------------------------- */
/* Traversal helpers                                                           */
/* -------------------------------------------------------------------------- */

type VisitHandler = (n: ASTNode) => void

export function visit(root: ASTNode, nodetype: string, handler: VisitHandler): void {
  const rec = (n: ASTNode): void => {
    if (n.type === nodetype) {
      handler(n)
    }

    for (const n2 of n) {
      rec(n2)
    }
  }

  rec(root)
}

export type DescendFn<S> = (state: S, nb: ASTNode) => void
export type TraverseHandler<S> = (n: ASTNode, state: S, descend: DescendFn<S>) => void

export interface TraverseHandlers<S> {
  [key: string]: TraverseHandler<S> | undefined
  Default?: TraverseHandler<S>
}

export function traverse<S>(
  root: ASTNode,
  state: S,
  handlers: TraverseHandlers<S>,
  log = false,
  _bottomUp = false
): void {
  const visitset = new Set<ASTNode>()

  const rec = (n: ASTNode, state: S, depth = 0): void => {
    if (visitset.has(n)) {
      return
    }

    visitset.add(n)

    const visitFn: DescendFn<S> = (state, nb) => {
      if (visitset.has(nb)) {
        visitset.delete(nb)

        for (const n2 of nb) {
          rec(n2, state, depth + 1)
        }
      } else {
        rec(nb, state, depth + 1)
      }
    }

    const key = n.type

    if (log) {
      const tab = util.indent(depth, ' ')
      const line = util.termColor(tab + key, 'red')
      console.log(util.termPrint(line))
    }

    const handler = handlers[key] as TraverseHandler<S> | undefined
    if (handler) {
      visitset.add(n)
      handler(n, state, visitFn)
      visitset.delete(n)
    } else if (handlers.Default) {
      visitset.add(n)
      handlers.Default(n, state, visitFn)
      visitset.delete(n)
    } else {
      visitFn(state, n)
    }
  }

  rec(root, state)
}

type WalkHandler = (n: ASTNode) => void

interface WalkHandlers {
  [key: string]: WalkHandler | undefined
  Default?: WalkHandler
}

export function walk(root: ASTNode, handlers: WalkHandlers): void {
  const rec = (n: ASTNode): void => {
    const key = n.type

    const handler = handlers[key]
    if (handler) {
      handler(n)
    } else if (handlers.Default) {
      handlers.Default(n)
    }

    for (const n2 of n) {
      rec(n2)
    }
  }

  rec(root)
}

import type {ParseState} from './state.js'
export type ScopeContext = ParseState

type ScopeHandler = (node: ASTNode, ctx: ScopeContext) => void

export interface ScopeHandlers {
  [key: string]: ScopeHandler | undefined
}

export function scopeWalk(
  root: ASTNode,
  ctx: ScopeContext,
  handlers: ScopeHandlers,
  log = false,
  bottomUp = false
): void {
  ctx.pushScope()

  function visit(n: ASTNode): void {
    const h = handlers[n.type]
    if (h) {
      h(n, ctx)
    }
  }

  function dodescend(descend: DescendFn<ScopeContext>, ctx: ScopeContext, node: ASTNode): void {
    if (bottomUp) {
      descend(ctx, node)
      visit(node)
    } else {
      visit(node)
      descend(ctx, node)
    }
  }

  const VarDeclHandler: TraverseHandler<ScopeContext> = (node, ctx, descend) => {
    const name = node.value as string
    const type = node[0].value

    if (type instanceof VarType || type instanceof ASTNodeBase) {
      ctx.setScope(name, type)
    }

    dodescend(descend, ctx, node)
  }

  const BinOpHandler: TraverseHandler<ScopeContext> = (node, ctx, descend) => {
    let pop = false

    if (node.type === 'BinOp' && node.op === '.') {
      pop = true
      ctx.pushScope()
      let name: string

      if (node[0].type === 'Ident') {
        name = node[0].value as string
      } else {
        name = ''
      }

      if (!ctx.scope.has(name)) {
        ctx.error(node, name + ' is not defined')
      }

      const v = ctx.getScope(name)
      if (v !== undefined) {
        ctx.setScope('this', v)
      }
    }

    dodescend(descend, ctx, node)

    if (pop) {
      ctx.popScope()
    }
  }

  const FunctionHandler: TraverseHandler<ScopeContext> = (node, ctx, descend) => {
    const rtype = node[0].value
    ctx.pushScope()
    if (rtype instanceof VarType) {
      ctx.setReturnType(rtype)
    }

    dodescend(descend, ctx, node)

    ctx.popScope()
  }

  const DefaultHandler: TraverseHandler<ScopeContext> = (node, ctx, descend) => {
    dodescend(descend, ctx, node)
  }

  const handlers2: TraverseHandlers<ScopeContext> = {
    VarDecl : VarDeclHandler,
    BinOp   : BinOpHandler,
    Function: FunctionHandler,
    Default : DefaultHandler,
  }

  traverse(root, ctx, handlers2, log, bottomUp)

  ctx.popScope()
}
