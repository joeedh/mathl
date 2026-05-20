export interface VarTypeJSON {
  type: string | VarTypeJSON
  Class: string
  alias?: string
  size?: number
}

export interface ASTNodeLike {
  readonly type: string
  readonly id: number
}

function isASTNodeLike(v: unknown): v is ASTNodeLike {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as {type?: unknown}).type === 'string' &&
    typeof (v as {id?: unknown}).id === 'number'
  )
}

export const VarTypeClasses: (typeof VarType)[] = []

export class VarType {
  type: string | VarType | ASTNodeLike | undefined

  constructor(type?: string | VarType | ASTNodeLike) {
    this.type = type
  }

  static fromJSON(json: VarTypeJSON): VarType {
    for (let cls of VarTypeClasses) {
      if (cls.name === json.Class) {
        let ret = new cls()

        ret.loadJSON(json)

        return ret
      }
    }

    throw new Error('unknown vardecl class for ' + json)
  }

  static register(cls: typeof VarType): void {
    VarTypeClasses.push(cls)
  }

  toJSON(): VarTypeJSON {
    const t = this.type
    let outType: string | VarTypeJSON
    if (typeof t === 'string') {
      outType = t
    } else if (t === undefined) {
      outType = ''
    } else if (isASTNodeLike(t)) {
      outType = t.type
    } else {
      outType = t.toJSON()
    }

    return {
      type : outType,
      Class: this.constructor.name,
    }
  }

  loadJSON(json: VarTypeJSON): this {
    if (typeof json.type === 'object') {
      this.type = VarType.fromJSON(json.type)
    } else {
      this.type = json.type
    }

    return this
  }

  toString(): string {
    return `VarType(${this.type})`
  }

  makeZero(): unknown {
    return 0.0
  }

  getComponents(): number {
    return 1
  }

  getBaseName(): string {
    const t = this.type
    if (typeof t === 'string') {
      return t
    }
    if (isASTNodeLike(t)) {
      return t.type
    }
    return ''
  }

  getTypeName(): string {
    return '' + this.type
  }

  getTypeNameSafe(): string {
    const t = this.type
    if (t === undefined) {
      return ''
    }
    if (typeof t !== 'string') {
      if (isASTNodeLike(t)) {
        return t.type
      }
      return t.getTypeNameSafe()
    }

    let s = this.getTypeName()

    s = s.replace(/[\[\]\(\)]/g, '_')
    return s
  }
}

VarType.register(VarType)

export class ArrayType extends VarType {
  alias: string
  size: number

  constructor(type?: string | VarType | ASTNodeLike, size?: number, alias = '') {
    super()

    if (typeof type === 'string') {
      type = new VarType(type)
    }

    this.alias = alias
    this.type = type
    this.size = size as number
  }

  toJSON(): VarTypeJSON {
    return Object.assign(super.toJSON(), {
      alias: this.alias,
      size : this.size,
    })
  }

  loadJSON(json: VarTypeJSON): this {
    super.loadJSON(json)

    this.alias = json.alias ?? ''
    this.size = json.size ?? 0
    return this
  }

  getComponents(): number {
    return this.size
  }

  makeZero(): unknown {
    let ret: unknown[] = []

    for (let i = 0; i < this.size; i++) {
      const t = this.type
      if (t === undefined || typeof t === 'string' || isASTNodeLike(t)) {
        ret.push(0)
      } else {
        ret.push(t.makeZero())
      }
    }

    return ret
  }

  getTypeName(): string {
    if (this.alias.length > 0) {
      return this.alias
    }

    const t = this.type
    let inner: string
    if (t === undefined || typeof t === 'string') {
      inner = '' + t
    } else if (isASTNodeLike(t)) {
      inner = t.type
    } else {
      inner = t.getTypeName()
    }
    return `${inner}[${this.size}]`
  }

  getBaseName(): string {
    const t = this.type
    if (t === undefined) {
      return ''
    }
    if (typeof t === 'string') {
      return t
    }
    if (isASTNodeLike(t)) {
      return t.type
    }
    return t.getBaseName()
  }

  getTypeNameSafe(): string {
    if (this.alias) {
      return this.alias
    }

    const t = this.type
    let inner: string
    if (t === undefined || typeof t === 'string') {
      inner = '' + t
    } else if (isASTNodeLike(t)) {
      inner = t.type
    } else {
      inner = t.getTypeNameSafe()
    }
    return `${inner}_${this.size}_`
  }

  toString(): string {
    return `ArrayType(${this.type}, ${this.size}, ${this.alias})`
  }
}

export class DynamicArrayType extends ArrayType {
  constructor(type?: string | VarType | ASTNodeLike, alias = '') {
    super()

    this.alias = alias
    this.type = type
  }

  getComponents(): number {
    return 100000
  }

  makeZero(): unknown {
    return []
  }

  getTypeName(): string {
    if (this.alias.length > 0) {
      return this.alias
    }

    const t = this.type
    let inner: string
    if (t === undefined || typeof t === 'string') {
      inner = '' + t
    } else if (isASTNodeLike(t)) {
      inner = t.type
    } else {
      inner = t.getTypeName()
    }
    return `${inner}[]`
  }

  getBaseName(): string {
    const t = this.type
    if (t === undefined) {
      return ''
    }
    if (typeof t === 'string') {
      return t
    }
    if (isASTNodeLike(t)) {
      return t.type
    }
    return t.getBaseName()
  }

  toString(): string {
    return `ArrayType(${this.type}, ${this.alias})`
  }
}

VarType.register(ArrayType)
