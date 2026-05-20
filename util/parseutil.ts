export class token {
  type: string
  value: unknown
  lexpos: number
  lexlen: number
  lineno: number
  lexer: lexer | undefined
  parser: parser | undefined
  isKeyword?: boolean

  constructor(
    type: string,
    val: unknown,
    lexpos: number,
    lexlen: number,
    lineno: number,
    lexer: lexer | undefined,
    parser: parser | undefined
  ) {
    this.type = type
    this.value = val
    this.lexpos = lexpos
    this.lexlen = lexlen
    this.lineno = lineno
    this.lexer = lexer
    this.parser = parser
  }

  toString() {
    if (this.value !== undefined) {
      return 'token(type=' + this.type + ", value='" + this.value + "')"
    } else {
      return 'token(type=' + this.type + ')'
    }
  }
}

export type TokFunc = (t: token) => token | undefined | void

export class tokdef {
  name: string
  re: RegExp | undefined
  func: TokFunc | undefined

  constructor(name: string, regexpr?: RegExp, func?: TokFunc) {
    this.name = name
    this.re = regexpr
    this.func = func
  }
}

export class PUTLParseError extends Error {}

export type LexerErrFunc = (l: lexer) => boolean

interface LexerState {
  tokdef: tokdef[]
  errfunc: LexerErrFunc | undefined
}

export class lexer {
  tokdef: tokdef[]
  tokens: token[]
  lexpos: number
  lexdata: string
  lineno: number
  errfunc: LexerErrFunc | undefined
  tokints: Map<string, number>
  prev: token | undefined
  statestack: [string, unknown][]
  states: Map<string, LexerState>
  statedata: unknown
  peeked_tokens: token[] = []
  line_lexstart = 0
  linemap: number[] = []

  constructor(tokdef: tokdef[], errfunc?: LexerErrFunc) {
    this.tokdef = tokdef
    this.tokens = []
    this.lexpos = 0
    this.lexdata = ''
    this.lineno = 0
    this.errfunc = errfunc
    this.tokints = new Map()
    this.prev = undefined

    for (let i = 0; i < tokdef.length; i++) {
      this.tokints.set(tokdef[i].name, i)
    }

    this.statestack = [['__main__', 0]]
    this.states = new Map()
    this.states.set('__main__', {tokdef, errfunc})
    this.statedata = 0
  }

  copy(): lexer {
    const ret = new lexer(this.tokdef, this.errfunc)

    for (const [k, state] of this.states) {
      ret.states.set(k, {tokdef: state.tokdef, errfunc: state.errfunc})
    }

    ret.statedata = this.statedata

    return ret
  }

  add_state(name: string, tokdef: tokdef[], errfunc?: LexerErrFunc) {
    if (errfunc === undefined) {
      errfunc = function () {
        return true
      }
    }

    this.states.set(name, {tokdef, errfunc})
  }

  tok_int(_name: string) {}

  push_state(state: string, statedata?: unknown) {
    this.statestack.push([state, statedata])

    const s = this.states.get(state)
    if (!s) {
      throw new PUTLParseError('Unknown lexer state ' + state)
    }
    this.statedata = statedata

    this.tokdef = s.tokdef
    this.errfunc = s.errfunc
  }

  pop_state() {
    const item = this.statestack[this.statestack.length - 1]
    const state = this.states.get(item[0])
    if (!state) {
      throw new PUTLParseError('Unknown lexer state ' + item[0])
    }

    this.tokdef = state.tokdef
    this.errfunc = state.errfunc
    this.statedata = item[1]
  }

  input(str: string) {
    while (this.statestack.length > 1) {
      this.pop_state()
    }

    this.prev = undefined

    this.lexdata = str
    this.lexpos = 0
    this.lineno = 0
    this.tokens = []

    this.peeked_tokens = []
  }

  error() {
    if (this.errfunc !== undefined && !this.errfunc(this)) {
      return
    }

    console.log('Syntax error near line ' + this.lineno)
    const next = Math.min(this.lexpos + 8, this.lexdata.length)
    console.log('  ' + this.lexdata.slice(this.lexpos, next))

    throw new PUTLParseError('Parse error')
  }

  peek(): token | undefined {
    const tok = this.next(123)

    if (tok === undefined) {
      return undefined
    }

    this.peeked_tokens.push(tok)
    return tok
  }

  peek_i(i: number): token | undefined {
    while (this.peeked_tokens.length <= i) {
      const t = this.peek()
      if (t === undefined) {
        return undefined
      }
    }

    return this.peeked_tokens[i]
  }

  at_end() {
    return this.lexpos >= this.lexdata.length && this.peeked_tokens.length === 0
  }

  next(ignore_peek?: number): token | undefined {
    if (ignore_peek !== 123 && this.peeked_tokens.length > 0) {
      const tok = this.peeked_tokens[0]
      this.peeked_tokens.shift()

      return tok
    }

    if (this.lexpos >= this.lexdata.length) {
      return undefined
    }

    const ts = this.tokdef
    const tlen = ts.length

    const lexdata = this.lexdata.slice(this.lexpos, this.lexdata.length)

    const results: [tokdef, RegExpExecArray][] = []

    for (let i = 0; i < tlen; i++) {
      const t = ts[i]

      if (t.re === undefined) {
        continue
      }

      const res = t.re.exec(lexdata)

      if (res?.index === 0) {
        results.push([t, res])
      }
    }

    let max_res = 0
    let theres: [tokdef, RegExpExecArray] | undefined = undefined
    for (let i = 0; i < results.length; i++) {
      const res = results[i]

      if (res[1][0].length > max_res) {
        theres = res
        max_res = res[1][0].length
      }
    }

    if (theres === undefined) {
      this.error()
      return
    }

    const def = theres[0]

    const lexlen = max_res
    let tok: token | undefined = new token(def.name, theres[1][0], this.lexpos, lexlen, this.lineno, this, undefined)
    this.lexpos += max_res

    if (def.func) {
      const result = def.func(tok)
      tok = result === undefined ? undefined : result

      if (tok === undefined) {
        return this.next(ignore_peek)
      }
    }

    this.prev = tok

    return tok
  }
}

export type ParserErrFunc = (t: token | undefined) => boolean
export type ParseStartFn = (p: parser) => unknown

export class parser {
  lexer: lexer
  errfunc: ParserErrFunc | undefined
  start: ParseStartFn | undefined

  constructor(lexer: lexer, errfunc?: ParserErrFunc) {
    this.lexer = lexer
    this.errfunc = errfunc
    this.start = undefined
  }

  copy(): parser {
    const ret = new parser(this.lexer.copy(), this.errfunc)
    ret.start = this.start

    return ret
  }

  parse(data?: string, err_on_unconsumed?: boolean) {
    if (err_on_unconsumed === undefined) {
      err_on_unconsumed = true
    }

    if (data !== undefined) {
      this.lexer.input(data)
    }

    if (!this.start) {
      throw new PUTLParseError('parser.start not set')
    }
    const ret = this.start(this)
    if (err_on_unconsumed && !this.lexer.at_end() && this.lexer.next() !== undefined) {
      this.error(undefined, 'parser did not consume entire input')
    }

    return ret
  }

  input(data: string) {
    this.lexer.input(data)
  }

  error(tok: token | undefined, msg?: string) {
    if (msg == undefined) {
      msg = ''
    }

    let estr: string
    if (tok == undefined) {
      estr = 'Parse error at end of input: ' + msg
    } else {
      estr = 'Parse error at line ' + (tok.lineno + 1) + ': ' + msg
    }

    let buf = '1| '
    const ld = this.lexer.lexdata
    let l = 1
    for (let i = 0; i < ld.length; i++) {
      const c = ld[i]
      if (c == '\n') {
        l++
        buf += '\n' + l + '| '
      } else {
        buf += c
      }
    }

    console.log('------------------')
    console.log(buf)
    console.log('==================')
    console.log(estr)

    if (this.errfunc && !this.errfunc(tok)) {
      return
    }

    throw new PUTLParseError(estr)
  }

  peek(): token | undefined {
    const tok = this.lexer.peek()
    if (tok != undefined) {
      tok.parser = this
    }

    return tok
  }

  peek_i(i: number): token | undefined {
    const tok = this.lexer.peek_i(i)
    if (tok !== undefined) {
      tok.parser = this
    }

    return tok
  }

  peeknext(): token | undefined {
    return this.peek_i(0)
  }

  next(): token | undefined {
    const tok = this.lexer.next()
    if (tok !== undefined) {
      tok.parser = this
    }

    return tok
  }

  optional(type: string): boolean {
    const tok = this.peek_i(0)

    if (tok?.type === type) {
      this.next()

      return true
    }

    return false
  }

  at_end() {
    return this.lexer.at_end()
  }

  expect(type: string, msg?: string): unknown {
    const tok = this.next()

    if (msg === undefined) {
      msg = type
    }

    if (tok !== undefined && tok.type !== type) {
      this.error(tok, 'Expected ' + msg + ', not ' + tok.type)
    } else if (tok === undefined) {
      this.error(tok, 'Expected ' + msg)
    }

    return tok!.value
  }
}
