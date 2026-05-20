type StripState = 'main' | 'linecomment' | 'comment'

export function stripComments(code: string): string {
  let out = ''

  const next = (i: number): string | undefined => {
    return i < code.length - 1 ? code[i + 1] : undefined
  }

  let state: StripState = 'main'

  const step = (i: number): number => {
    if (state === 'main') {
      if (code[i] === '/' && next(i) === '/') {
        state = 'linecomment'
        out += ' '
        return i + 1
      } else if (code[i] === '/' && next(i) === '*') {
        state = 'comment'
        out += '  '
        return i + 2
      } else {
        out += code[i]
      }

      return i + 1
    } else if (state === 'linecomment') {
      if (code[i] === '\n') {
        state = 'main'
        out += '\n'
      } else {
        out += ' '
      }

      return i + 1
    } else {
      if (code[i] === '*' && next(i) === '/') {
        state = 'main'
        out += '  '
        return i + 2
      }

      if (code[i] === '\n') {
        out += '\n'
      } else {
        out += ' '
      }

      return i + 1
    }
  }

  let i = 0
  while (i < code.length) {
    const start = i

    i = step(i)

    if (i === start) {
      i++
    }
  }

  return out
}

const boundary_re = `[ \n\r\t()\\-=\[\]{}\\<\\>\\?\.,\\/\\&*%@!~|;]|\\^`

const isws = (s: string): boolean => {
  return s === ' ' || s === '\t' || s === '\r' || s === '\n'
}

class Preprocessor {
  res = new Map<string, RegExp>()
  res2 = new Map<string, RegExp>()
  sortedmacros: string[] = []
  sorteddefs: string[] = []
  macros = new Map<string, [string[], string]>()
  defs = new Map<string, string>()
  ifstack: Array<[boolean, number]> = []
  last_keyword = ''
  enabled = true
  pop_depth = 1
  lines: string[]
  lines2: string[] = []

  constructor(lines: string[]) {
    this.lines = lines
  }

  push(msg: string): void {
    this.ifstack.push([this.enabled, this.pop_depth])
    console.log('push', msg, this.ifstack, this.enabled)
  }

  pop(msg: string): boolean {
    const item = this.ifstack.pop()
    if (item) {
      this.enabled = item[0]
      this.pop_depth = item[1]
    }
    console.log('pop', msg, this.ifstack, this.enabled, this.pop_depth)
    return this.enabled
  }

  sortmacros(): void {
    const macroList = Array.from(this.macros.keys())
    macroList.sort((a, b) => b.length - a.length)
    this.sortedmacros = macroList

    const defList = Array.from(this.defs.keys())
    defList.sort((a, b) => b.length - a.length)
    this.sorteddefs = defList
  }

  error(linenr: number, msg: string): never {
    const full = 'Error at line ' + (linenr + 1) + ': ' + msg + '\n\n' + this.lines[linenr] + '\n'
    console.error(full)
    throw new Error(full)
  }

  collectargs(arg: string): [string[], number] {
    const args2: string[] = ['']
    let depth = 0
    let j = 0

    for (; j < arg.length; j++) {
      if (j > 500) {
        this.error(-1, `Bad macro call: ${arg.slice(0, 50)}.....`)
      }

      if (arg[j] === ')' && depth === 1) {
        j++
        break
      } else if (arg[j] === '(' || arg[j] === '[' || arg[j] === '}') {
        depth++
      } else if (arg[j] === ')' || arg[j] === ']' || arg[j] === '}') {
        depth--
      } else if (arg[j] === ',') {
        args2.push('')
      } else {
        args2[args2.length - 1] += arg[j]
      }
    }

    return [args2, j]
  }

  subst(s: string): string {
    let found = true
    let _i = 0

    while (found) {
      found = false

      for (const def of this.sorteddefs) {
        let re = this.res.get(def)
        if (!re) {
          const b = boundary_re
          re = new RegExp(`(${b}?)(${def})(${b}?)`, 'g')
          this.res.set(def, re)
        }

        if (s.search(re) >= 0) {
          found = true
        }

        const replacement = this.defs.get(def) ?? ''
        s = s.replace(re, `$1${replacement}$3`)
      }

      for (const k of this.sortedmacros) {
        let re = this.res.get(k)
        if (!re) {
          const b = boundary_re
          re = new RegExp(`(${b}?)(${k})(${b}?)`, 'g')
          this.res.set(k, re)
        }

        const macro = this.macros.get(k)
        if (!macro) {
          continue
        }
        const [args, body] = macro
        const i = s.search(re)

        if (i < 0) {
          continue
        }

        const arg = s.slice(i + k.length, s.length).trim()

        if (!arg.startsWith('(')) {
          continue
        }

        const collected = this.collectargs(arg)
        let args2 = collected[0]
        const end = collected[1]

        const send = s.slice(i + k.length + end, s.length)

        s = s.slice(0, i)

        args2 = args2.map((f) => f.trim())

        let buf = body
        for (let j = 0; j < args.length; j++) {
          if (args[j] === '') {
            continue
          }
          const replacementArg = j >= args2.length ? '' : args2[j]

          if (!this.res2.has(replacementArg)) {
            const b = boundary_re
            const re3 = new RegExp(`(${b}?)(${args[j]})(${args[j]}?)`, 'g')
            this.res2.set(k, re3)
          }

          const re2 = this.res2.get(replacementArg)
          if (re2) {
            buf = buf.replace(re2, replacementArg)
          }
        }

        if (_i++ > 1000) {
          this.error(-1, 'Macro recursion detected')
        }

        s += buf
        s += send

        found = true
      }
    }

    while (s.endsWith('\n') || s.endsWith('\r')) {
      s = s.slice(0, s.length - 1)
    }

    return s
  }

  checkElseEnabled(_msg: string): boolean {
    let enabled = true

    for (const item of this.ifstack) {
      if (!item[0]) {
        enabled = false
      }
    }

    return enabled && !this.enabled
  }

  main(i: number): number {
    let l = this.lines[i]

    if (!l.trim().startsWith('#')) {
      if (this.enabled) {
        l = this.subst(l)
        this.lines2.push(l)
      } else {
        this.lines2.push('')
      }
      return i + 1
    }

    l = l.trim()

    while (i < this.lines.length - 1 && l.trim().endsWith('\\')) {
      i++
      this.lines2.push('')

      l = l.slice(0, l.length - 1) + ' ' + this.lines[i].trim()
    }
    i++

    l = l.trim().replace(/\t/g, ' ')

    const parts = l.split(' ')
    let keyword = parts[0]
    keyword = keyword.slice(1, keyword.length).trim()

    let was_elif = false
    const was_elif_enabled = false

    this.last_keyword = keyword

    if (keyword === 'define') {
      if (parts.length === 1) {
        this.error(i, 'Expected macro name')
      }

      let name = ''

      let buf = parts.slice(1, parts.length).join(' ')

      for (let j = 0; j < buf.length; j++) {
        if (j >= buf.length || isws(buf[j]) || buf[j] === '(') {
          name = buf.slice(0, j).trim()
          buf = buf.slice(j, buf.length).trim()
          break
        }
      }

      if (buf.startsWith('(')) {
        const collected = this.collectargs(buf)
        const args = collected[0].map((f) => f.trim())
        const end = collected[1]

        buf = buf.slice(end, buf.length).trim()
        this.macros.set(name, [args, buf])
        this.sortmacros()
      } else {
        this.defs.set(name, buf.trim())
        this.sortmacros()
      }

      this.lines2.push('')
      return i
    } else if (keyword === 'extension') {
      this.lines2.push('')
      return i
    } else if (keyword === 'elif') {
      const enabled = this.checkElseEnabled('elif')

      this.enabled = enabled
      this.push('elif')

      this.pop_depth++

      if (enabled) {
        was_elif = true
        keyword = 'if'
      } else {
        this.enabled = false

        this.lines2.push('')
        return i
      }
    }

    if (keyword === 'ifdef') {
      this.push('ifdef')
      const name = parts[1].trim()

      this.enabled = this.macros.has(name) || this.defs.has(name)
      this.lines2.push('')
      return i
    } else if (keyword === 'ifndef') {
      this.push('ifndef')
      const name = parts[1].trim()

      this.enabled = !(this.macros.has(name) || this.defs.has(name))
      this.lines2.push('')
      return i
    } else if (keyword === 'else') {
      this.enabled = this.checkElseEnabled('else')

      this.lines2.push('')
      return i
    } else if (keyword === 'endif') {
      const count = this.pop_depth

      for (let j = 0; j < count; j++) {
        this.pop('endif')
      }

      this.lines2.push('')
      return i
    } else if (keyword === 'if') {
      let code = parts.slice(1, parts.length).join(' ')

      code = code.replace(/defined\((.*)\)/g, "defined('$1')")

      const macros = this.macros
      const defs = this.defs
      const defined = (name: string): boolean => {
        return macros.has(name) || defs.has(name)
      }
      void defined

      let val = !!eval(code)

      this.push('if')

      if (was_elif) {
        val = val !== was_elif_enabled
        this.pop_depth++
      }

      this.enabled = val

      this.lines2.push('')
      return i
    } else if (keyword === 'undef') {
      const name = parts[1]

      this.macros.delete(name)
      this.defs.delete(name)
      this.res.delete(name)

      this.sortmacros()

      this.lines2.push('')
      return i
    }

    this.lines2.push(this.subst(l))
    return i
  }
}

export function preprocess(inCode: string): string {
  const code = stripComments(inCode)
  const lines = code.split('\n')
  const pp = new Preprocessor(lines)

  let i = 0
  while (i < lines.length) {
    const start = i

    i = pp.main(i)

    if (i === start) {
      i++
    }
  }

  return pp.lines2.join('\n')
}
