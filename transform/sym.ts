import {Precedence, PrecedenceEntry} from '../parser/parser.js'

export const SymTypes = {
  BINOP  : 1,
  CALL   : 2,
  CONST  : 4,
  VAR    : 8,
  UNARYOP: 16,
} as const

export type SymTypeFlag = (typeof SymTypes)[keyof typeof SymTypes]

const Prec: Map<string, PrecedenceEntry> = new Map(Precedence)
const mulEntry = Precedence.get('*')
if (mulEntry) {
  Prec.set('**', {prec: mulEntry.prec - 1, assoc: 'left'})
}

type BuiltinDv = (name: string, x: Sym) => Sym

const negate = (f: Sym): Sym => binop(f, -1, '*')

const chain = (df: Sym, x: Sym, name: string): Sym => {
  return df.sub(name).mul(x.df(name))
}

export const builtin_dvs: Map<string, BuiltinDv> = new Map<string, BuiltinDv>([
  ['cos', (name, x) => chain(negate(call('sin', [name])), x, name)],
  ['sin', (name, x) => chain(call('cos', [name]), x, name)],
  ['fract', (name, x) => chain(sym(1.0), x, name)],
  ['floor', (_name, _x) => sym(0.0)],
  ['ceil', (_name, _x) => sym(0.0)],
  ['min', (_name, _x) => sym(0.0)],
  ['max', (_name, _x) => sym(0.0)],
  ['step', (_name, _x) => sym(0.0)],
  ['log', (name, x) => x.df(name).div(x)],
  ['sign', (_name, _x) => sym(0)],
  ['abs', (name, x) => chain(call('sign', [sym(name)]), x, name)],
])

export class Sym extends Array<Sym> {
  type: SymTypeFlag
  parent: Sym | undefined

  constructor(type: SymTypeFlag) {
    super()
    this.type = type
    this.parent = undefined
  }

  static isRootType(s: Sym | number | string): boolean {
    const x = checksym(s)
    return (x.type & (SymTypes.CONST | SymTypes.VAR)) !== 0
  }

  isZero(): boolean {
    const f = ('' + this).trim()
    return f === '0' || f === '0.0' || f === '-0.0' || f === '+0.0'
  }

  df(_name: string): Sym {
    throw new Error('Sym.prototype.df(): implement me!')
  }

  subst(name: string, b: Sym | number | string): void {
    const b2 = checksym(b)

    for (const c of this) {
      if (c instanceof VarSym && c.toString().trim() === name) {
        const copy = b2.copy()
        copy.parent = this
        this.replace(c, copy)
      } else {
        c.subst(name, b2)
      }
    }
  }

  replace(oldChild: Sym, newChild: Sym): void {
    const i = this.indexOf(oldChild)
    if (i >= 0) {
      this[i] = newChild
      newChild.parent = this
    }
  }

  add(b: Sym | number | string): Sym {
    return binop(this, b, '+')
  }

  sub(b: Sym | number | string): Sym {
    return binop(this, b, '-')
  }

  mul(b: Sym | number | string): Sym {
    return binop(this, b, '*')
  }

  div(b: Sym | number | string): Sym {
    return binop(this, b, '/')
  }

  call(name: string, args: Array<Sym | number | string>): Sym {
    return call(name, args)
  }

  exp(b: Sym | number | string): Sym {
    return binop(this, b, '**')
  }

  gthan(b: Sym | number | string): Sym {
    return binop(this, b, '>')
  }

  lthan(b: Sym | number | string): Sym {
    return binop(this, b, '<')
  }

  mod(b: Sym | number | string): Sym {
    return binop(this, b, '%')
  }

  equals(b: Sym | number | string): Sym {
    return binop(this, b, '==')
  }

  lequals(b: Sym | number | string): Sym {
    return binop(this, b, '<=')
  }

  gequals(b: Sym | number | string): Sym {
    return binop(this, b, '>=')
  }

  lor(b: Sym | number | string): Sym {
    return binop(this, b, '||')
  }

  land(b: Sym | number | string): Sym {
    return binop(this, b, '&&')
  }

  lnot(): Sym {
    return unaryop(this, '-')
  }

  nequals(b: Sym | number | string): Sym {
    return binop(this, b, '!=')
  }

  push(...items: Sym[]): number {
    for (const item of items) {
      let b = item
      if (b.parent !== undefined) {
        b = b.copy()
      }
      super.push(b)
      b.parent = this
    }
    return this.length
  }

  copy(): Sym {
    throw new Error('implement me!')
  }

  _copyChildren(b: Sym): this {
    for (const c of b) {
      this.push(c.copy())
    }
    return this
  }
}

export class ValueSym extends Sym {
  value: number

  constructor(val: number) {
    super(SymTypes.CONST)
    this.value = val
  }

  df(_name: string): Sym {
    return sym(0.0)
  }

  copy(): ValueSym {
    return new ValueSym(this.value)
  }

  toString(): string {
    let f = '' + this.value
    if (f.search(/\./) < 0) {
      f += '.0'
    }
    return f
  }
}

export class VarSym extends Sym {
  value: string

  constructor(varname: string) {
    super(SymTypes.VAR)
    this.value = varname
  }

  df(name: string): Sym {
    if (this.toString().trim() === name) {
      return sym(1.0)
    }
    return sym(0.0)
  }

  copy(): VarSym {
    return new VarSym(this.value)
  }

  toString(): string {
    return '' + this.value
  }
}

export class UnarySym extends VarSym {
  op: string

  constructor(a: Sym | undefined, op: string) {
    super('')
    this.type = SymTypes.UNARYOP
    this.op = op

    if (a) {
      this.push(a)
    }
  }

  copy(): UnarySym {
    return new UnarySym(this[0], this.op)
  }

  toString(): string {
    const child = this[0]
    if (child.length > 0) {
      return `${this.op}(${child})`
    }
    const b = ('' + child).trim()
    if (b.startsWith('-') && this.op === '-') {
      return b
    }
    return `${this.op}${b}`
  }
}

export class ArrayVarSym extends VarSym {
  idx: number | string

  constructor(varname: string = '', idx: number | string = 0) {
    super(varname)
    this.idx = idx
  }

  copy(): ArrayVarSym {
    const ret = new ArrayVarSym()
    ret.value = this.value
    ret.idx = this.idx
    return ret
  }

  toString(): string {
    return `${this.value}[${this.idx}]`
  }
}

export class BinOpSym extends Sym {
  op: string
  parens: boolean

  constructor(a: Sym | undefined, b: Sym | undefined, op: string) {
    super(SymTypes.BINOP)

    if (a && b) {
      this.push(a)
      this.push(b)
    }
    this.op = op
    this.parens = false
  }

  df(name: string): Sym {
    const a = this[0]
    const b = this[1]
    const op = this.op

    const na = a.toString().trim()
    const nb = b.toString().trim()
    if (Sym.isRootType(a) && Sym.isRootType(b)) {
      if (na !== name && nb !== name) {
        return sym(0)
      }
    }

    let r1: Sym
    let r2: Sym

    switch (op) {
      case '**':
        r1 = a.exp(b)
        r2 = a.mul(b.df(name)).mul(call('log', [a]))
        r2.add(b.mul(a.df(name)))
        return r1.mul(r2).div(a)
      case '*':
        r1 = a.mul(b.df(name))
        r2 = b.mul(a.df(name))
        return r1.add(r2)
      case '+':
        return a.df(name).add(b.df(name))
      case '-':
        return a.df(name).sub(b.df(name))
      case '%':
        return sym(1.0)
      case '>':
      case '<':
      case '>=':
      case '<=':
      case '==':
      case '||':
      case '&&':
      case '^^':
        return sym(0.0)
    }

    throw new Error('invalid operator ' + op)
  }

  copy(): BinOpSym {
    const ret = new BinOpSym(this[0].copy(), this[1].copy(), this.op)
    ret.parens = this.parens
    return ret
  }

  toString(): string {
    let parens = this.parens

    if (!parens && this.parent && this.parent instanceof BinOpSym) {
      const p1 = Prec.get(this.op)
      const p2 = Prec.get(this.parent.op)
      if (p1 && p2) {
        parens = p1.prec > p2.prec
      }
    }

    let s = ''
    if (parens) {
      s += '('
    }
    s += `${this[0]} ${this.op} ${this[1]}`
    if (parens) {
      s += ')'
    }
    return s
  }
}

export class CallSym extends Sym {
  value: string

  constructor(name: string, args?: Sym[]) {
    super(SymTypes.CALL)
    this.value = name

    if (args !== undefined) {
      for (const arg of args) {
        this.push(arg)
      }
    }
  }

  df(name: string): Sym {
    const func = builtin_dvs.get(this.value)
    if (!func) {
      throw new Error('unknown builtin function ' + this.value)
    }
    return func(name, this[0])
  }

  copy(): CallSym {
    return new CallSym(
      this.value,
      Array.from(this).map((f) => f.copy())
    )
  }

  toString(): string {
    let s = `${this.value}(`
    for (let i = 0; i < this.length; i++) {
      if (i > 0) {
        s += ', '
      }
      s += this[i]
    }
    return s + ')'
  }
}

export function sym(val: Sym | number | string): Sym {
  if (typeof val === 'number') {
    return new ValueSym(val)
  } else if (typeof val === 'string') {
    return new VarSym(val)
  } else if (val instanceof Sym) {
    return val
  }
  return val
}

export function checksym(s: Sym | number | string): Sym {
  if (s instanceof Sym) {
    return s
  }
  return sym(s)
}

export function call(name: string, args: Array<Sym | number | string>): Sym {
  const resolved: Sym[] = args.map((arg) => {
    if (arg instanceof Sym) {
      return arg
    }
    return sym(arg)
  })
  return new CallSym(name, resolved)
}

export function avar(name: string, idx: number | string): Sym {
  return new ArrayVarSym(name, idx)
}

const evals: Map<string, (a: number, b: number) => number | boolean> = new Map<
  string,
  (a: number, b: number) => number | boolean
>([
  ['+', (a, b) => a + b],
  ['-', (a, b) => a - b],
  ['*', (a, b) => a * b],
  ['/', (a, b) => a / b],
  ['**', (a, b) => a ** b],
  ['&&', (a, b) => Boolean(a && b)],
  ['||', (a, b) => Boolean(a || b)],
  ['==', (a, b) => a === b],
  ['>=', (a, b) => a >= b],
  ['<=', (a, b) => a <= b],
  ['>', (a, b) => a > b],
  ['<', (a, b) => a < b],
])

export function binop(a: Sym | number | string, b: Sym | number | string, op: string): Sym {
  const sa = checksym(a)
  const sb = checksym(b)

  const evalFn = evals.get(op)
  if (evalFn && sa instanceof ValueSym && sb instanceof ValueSym) {
    const result = evalFn(sa.value, sb.value)
    return sym(typeof result === 'boolean' ? (result ? 1 : 0) : result)
  }

  if (op === '+' && sa.toString() === sb.toString()) {
    return binop(2.0, sa, '*')
  }

  if (op === '*' && sa.toString() === sb.toString()) {
    return new BinOpSym(sa, sym(2), '**')
  }

  return new BinOpSym(sa, sb, op)
}

export function unaryop(a: Sym | number | string, op: string): Sym {
  const sa = checksym(a)

  if (sa instanceof ValueSym && op === '-') {
    sa.value = -sa.value
    return sa
  }

  return new UnarySym(sa, op)
}

function makeBinOp(op: string): (a: Sym, b: Sym) => Sym {
  return (a: Sym, b: Sym) => new BinOpSym(a, b, op)
}

const _binops = ['+', '-', '/', '*', '!=', '=', '==', '>=', '<=', '||', '&&', '^']

export const binops: Map<string, (a: Sym, b: Sym) => Sym> = new Map()
for (const k of _binops) {
  binops.set(k, makeBinOp(k))
}
