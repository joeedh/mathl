declare global {
  interface SymbolConstructor {
    keystr: symbol
  }

  interface Set<T> {
    map<U>(func: (item: T, i: number, set: this) => U, thisArg?: unknown): Set<U>
    filter(func: (item: T, i: number, set: this) => boolean, thisArg?: unknown): Set<T>
    reduce<U>(func: (accum: U, item: T, i: number, set: this) => U, initialVal: U): U
  }

  interface Array<T> {
    set<U extends ArrayLike<T>>(array: U, src?: number, dst?: number, count?: number): this
    pop_i(idx: number): void
    remove(item: T, suppress_error?: boolean): void
    reject(func: (item: T) => boolean): T[]
    [Symbol.keystr](): string
  }

  interface String {
    contains(substr: string): boolean
    [Symbol.keystr](): string
  }

  interface Number {
    [Symbol.keystr](): string
  }

  interface Boolean {
    [Symbol.keystr](): string
  }

  interface Math {
    fract(f: number): number
    tent(f: number): number
  }

  function list<T>(iter: Iterable<T> | ArrayLike<T> | string): T[]

  var INSIDE_JEST: boolean | undefined

  var haveElectron: boolean | undefined

  var termColor: (s: unknown, c: string | number) => string

  var _parseGlsl: unknown

  var _compileJS: unknown
}

export {}
