import './polyfill.js'

let silencelog = 0
export function silence() {
  silencelog++
}
export function unsilence() {
  silencelog = Math.max(silencelog - 1, 0)
}

export function strong(...args: unknown[]): string {
  let s = ''

  for (let i = 0; i < args.length; i++) {
    s += args[i] + ' '
  }

  return termColor(s, 'red')
}

export function stronglog(...args: unknown[]) {
  let s = ''

  for (let i = 0; i < args.length; i++) {
    if (i > 0) {
      s += ' '
    }

    s += args[i]
  }

  if (!silencelog) {
    console.log(termPrint(strong(s)))
  }
}

export function log(...args: unknown[]) {
  let s = ''

  for (let i = 0; i < args.length; i++) {
    if (i > 0) {
      s += ' '
    }
    s += args[i]
  }

  if (!silencelog) {
    console.log(termPrint(s))
  }
}

export function indent(n: number, chr = '  ', color?: string | number | undefined) {
  let s = ''
  for (let i = 0; i < n; i++) {
    s += chr
  }

  if (color !== undefined) {
    return termColor(s, color)
  } else {
    return s
  }
}

const colormap = {
  black   : 30,
  red     : 31,
  green   : 32,
  yellow  : 33,
  blue    : 34,
  magenta : 35,
  cyan    : 36,
  white   : 37,
  reset   : 0,
  grey    : 2,
  orange  : 202,
  pink    : 198,
  brown   : 314,
  lightred: 91,
  peach   : 210,
} as const

export type ColorName = keyof typeof colormap

export const termColorMap: Map<string | number, string | number> = new Map()
for (const k in colormap) {
  const name = k as ColorName
  const code = colormap[name]
  termColorMap.set(name, code)
  termColorMap.set(code, name)
}

export function termColor(input: unknown, c: string | number): string {
  let s: string
  if (typeof input === 'symbol') {
    s = input.toString()
  } else {
    s = '' + input
  }

  if (typeof c === 'string' && c in colormap) {
    c = colormap[c as ColorName]
  }

  if (typeof c === 'number' && c > 107) {
    const s2 = '[38;5;' + c + 'm'
    return s2 + s + '[0m'
  }

  return '[' + c + 'm' + s + '[0m'
}

type TermTok = {type: 'start' | 'end' | 'chunk'; value: string}

export function termPrint(...args: unknown[]): string {
  let s = ''
  for (let i = 0; i < args.length; i++) {
    if (i > 0) {
      s += ' '
    }
    s += args[i]
  }

  const re1a = /\[[1-9][0-9]?m/
  const re1b = /\[[1-9][0-9];[0-9][0-9]?;[0-9]+m/
  const re2 = /\[0m/

  const endtag = '[0m'

  function tok(s: string, type: TermTok['type']): TermTok {
    return {type, value: s}
  }

  const tokdef: [RegExp, TermTok['type']][] = [
    [re1a, 'start'],
    [re1b, 'start'],
    [re2, 'end'],
  ]

  let s2 = s

  const tokens: TermTok[] = []

  while (s2.length > 0) {
    let ok = false

    let mini: number | undefined = undefined
    let minslice: string | undefined = undefined
    let mintype: TermTok['type'] | undefined = undefined

    for (const tk of tokdef) {
      const i = s2.search(tk[0])

      if (i >= 0 && (mini === undefined || i < mini)) {
        minslice = s2.slice(i, s2.length).match(tk[0])![0]
        mini = i
        mintype = tk[1]
        ok = true
      }
    }

    if (!ok) {
      break
    }

    if (mini! > 0) {
      const chunk = s2.slice(0, mini)
      tokens.push(tok(chunk, 'chunk'))
    }

    s2 = s2.slice(mini! + minslice!.length, s2.length)
    const t = tok(minslice!, mintype!)

    tokens.push(t)
  }

  if (s2.length > 0) {
    tokens.push(tok(s2, 'chunk'))
  }

  const stack: (string | undefined)[] = []
  let cur: string | undefined

  let out = ''

  for (const t of tokens) {
    if (t.type === 'chunk') {
      out += t.value
    } else if (t.type === 'start') {
      stack.push(cur)
      cur = t.value

      out += t.value
    } else if (t.type === 'end') {
      cur = stack.pop()
      if (cur) {
        out += cur
      } else {
        out += endtag
      }
    }
  }

  return out
}

export function strhash(str: string): number {
  let hash = 0

  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i)

    hash = hash < 0 ? -hash : hash

    hash ^= (ch * 524287 + 4323543) & ((1 << 19) - 1)
  }

  return hash
}

/** NOT CRYPTOGRAPHIC */
export class HashDigest {
  i = 0
  hash = 0

  reset(): this {
    this.i = 0
    this.hash = 0

    return this
  }

  get(): number {
    return this.hash
  }

  add(v: number): void {
    if (v >= -5 && v <= 5) {
      v *= 32
    }

    this.i = ((this.i + ~~v) * 1103515245 + 12345) & ((1 << 29) - 1)

    const v2 = (v * 1024 * 1024) & ((1 << 29) - 1)
    v = v | v2

    v = ~~v

    this.hash ^= v ^ this.i
  }

  addString(s: string): void {
    for (let i = 0; i < s.length; i++) {
      this.add(s.charCodeAt(i))
    }
  }
}
