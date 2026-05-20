/**
A PyPLY style wrapper around JSCC's parse tables.
Grammar productions are defined in small chunks with
an associated action function, instead of one big script.

See parser/parser.ts for an example of how this works.
*/

import * as util from '../util/util.js'
import {parsetable} from './parsetab.js'
import {ProgramNode} from '../core/ast.js'
import LZString from '../util/lzstring.js'
import '../util/jscc.js'
declare const jscc: {require(path: string): unknown}
import type {lexer, token} from '../util/parseutil.js'

const debug = 0

export interface ActionP<L extends lexer = lexer> extends Array<unknown> {
  lexer: L
}
export type ActionFn<L extends lexer = lexer> = (p: ActionP<L>) => void

export interface Production {
  lhs: number
  rhs: number[]
  code: string
  id: number
  level?: number
}

export interface PData {
  pop_tab: Array<[number, number]>
  act_tab: number[][]
  goto_tab: number[][]
  labelmap: Map<string, number>
  labels: string[]
  productions: Production[]
  error_symbol: number
  eof_symbol: number
  whitespace_token: number
  defact_tab: number[]
  actions: Map<number, ActionFn>
}

interface PDataJSON {
  pop_tab: Array<[number, number]>
  act_tab: number[][]
  goto_tab: number[][]
  labelmap: {[k: string]: number}
  labels: string[]
  productions: Production[]
  error_symbol: number
  eof_symbol: number
  whitespace_token: number
  defact_tab: number[]
  hash?: string
}

export interface ParseDefItem<L extends lexer = lexer> {
  grammar: string
  func: ActionFn<L> & {grammar?: string}
  id?: number
}

export type PrecRow = [string, ...string[]]

class ParseStack<T> {
  array: T[]
  length = 0
  itop: number
  ibottom: number

  constructor(size = 1024) {
    this.array = new Array<T>(size)
    this.itop = this.ibottom = size >> 1
  }

  get top(): T {
    return this.array[this.itop - 1]
  }

  get bottom(): T {
    return this.array[this.ibottom]
  }

  *[Symbol.iterator](): IterableIterator<T> {
    for (let i = this.ibottom; i < this.itop; i++) {
      yield this.array[i]
    }
  }

  get(i: number): T {
    return this.array[i + this.ibottom]
  }

  shiftN(n: number): this {
    this.ibottom += n
    this.length -= n

    return this
  }

  forEach(cb: (item: T, i: number) => void): this {
    for (let i = this.ibottom; i < this.itop; i++) {
      cb(this.array[i], i)
    }

    return this
  }

  shift(): T {
    this.length--
    return this.array[this.ibottom++]
  }

  unshift(item: T): void {
    this.length++
    this.array[--this.ibottom] = item
  }

  push(item: T): void {
    this.length++
    this.array[this.itop++] = item
  }

  pop(): T {
    this.length--
    return this.array[--this.itop]
  }
}

export type OnErrorFn = (p: PCB) => void

export class PCB {
  line = 1
  column = 1
  offset = 0
  error_step = 0
  src = ''
  att: unknown = ''
  la: number | null = null
  act: number | null = null
  token?: token
  errorLabels?: ParseStack<string[]>

  constructor(
    private pdata: PData,
    private lexer: lexer
  ) {}

  lex(): number | null {
    if (debug) {
      console.log('next token')
    }

    const ret = this.lexer.next()
    if (ret === undefined) {
      this.la = this.pdata.eof_symbol
      return this.pdata.eof_symbol
    }

    this.att = ret.value
    this.offset = ret.lexpos

    const la = this.pdata.labelmap.get(ret.type) ?? null
    this.la = la
    this.token = ret
    this.line = ret.lexer ? ret.lexer.lineno : 0

    return la
  }
}

export class Parser {
  pdata: PData | undefined
  lexer: lexer
  hash: string | undefined
  onerror: OnErrorFn | undefined = undefined

  constructor(lexer: lexer, pdata?: PData, hash?: string) {
    this.lexer = lexer
    this.pdata = pdata
    this.hash = hash
  }

  save(zipTool: (s: string) => string = LZString.compressToBase64): string {
    return zipTool(JSON.stringify(this))
  }

  load(
    data: string,
    actions: Map<string, ActionFn>,
    unzipTool: (s: string) => string = LZString.decompressFromBase64
  ): void {
    const text = unzipTool(data)
    const obj = JSON.parse(text) as PDataJSON
    this.loadJSON(obj, actions)
  }

  toJSON(): unknown {
    const pdata = this.pdata
    if (!pdata) {
      return {hash: this.hash}
    }

    const labelmap: {[k: string]: number} = {}
    for (const [k, v] of pdata.labelmap) {
      labelmap[k] = v
    }

    return {
      pop_tab         : pdata.pop_tab,
      act_tab         : pdata.act_tab,
      goto_tab        : pdata.goto_tab,
      labelmap        : labelmap,
      labels          : pdata.labels,
      error_symbol    : pdata.error_symbol,
      eof_symbol      : pdata.eof_symbol,
      whitespace_token: pdata.whitespace_token,
      defact_tab      : pdata.defact_tab,
      productions     : pdata.productions,
      hash            : this.hash,
    }
  }

  loadJSON(obj: PDataJSON, actions: Map<string, ActionFn>): void {
    const actions2 = new Map<number, ActionFn>()

    actions2.set(0, (p) => {
      p[0] = p[1]
    })

    for (const p of obj.productions) {
      const code = p.code.trim()
      if (code.startsWith('_')) {
        const key = code.slice(1, code.length)
        const fn = actions.get(key)
        if (fn) {
          actions2.set(p.id, fn)
        }
      }
    }

    const labelmap = new Map<string, number>()
    for (const k in obj.labelmap) {
      labelmap.set(k, obj.labelmap[k])
    }

    this.pdata = {
      pop_tab         : obj.pop_tab,
      act_tab         : obj.act_tab,
      goto_tab        : obj.goto_tab,
      labelmap        : labelmap,
      labels          : obj.labels,
      productions     : obj.productions,
      error_symbol    : obj.error_symbol,
      eof_symbol      : obj.eof_symbol,
      whitespace_token: obj.whitespace_token,
      defact_tab      : obj.defact_tab,
      actions         : actions2,
    }
    this.hash = obj.hash
  }

  printTokens(buf: string): void {
    this.lexer.input(buf)
    while (!this.lexer.at_end()) {
      const t = this.lexer.next()
      console.log('' + t)
    }
  }

  parse(buf: string, onerror?: OnErrorFn): unknown {
    if (buf.trim().length === 0) {
      return new ProgramNode()
    }

    const pdata = this.pdata
    if (!pdata) {
      throw new Error('Parser has no pdata')
    }

    this.lexer.input(buf)
    this.onerror = onerror

    const linemap = new Array<number>(buf.length)
    const colmap = new Array<number>(buf.length)

    let linei = 0
    let coli = 0

    for (let i = 0; i < buf.length; i++) {
      linemap[i] = linei
      colmap[i] = coli++

      if (buf[i] === '\n') {
        linei++
        coli = 0
      }
    }

    const lexer = this.lexer
    const pop_tab = pdata.pop_tab
    const act_tab = pdata.act_tab
    const goto_tab = pdata.goto_tab

    const error_token = pdata.error_symbol
    const eof = pdata.eof_symbol

    const get_act = (top: number, la: number | null): number | null => {
      if (la === null) {
        return null
      }
      const row = act_tab[top]
      for (let i = 0; i < row.length; i += 2) {
        if (row[i] === la) {
          return row[i + 1]
        }
      }

      return null
    }

    const get_goto = (top: number, pop: number): number | null => {
      const row = goto_tab[top]
      for (let i = 0; i < row.length; i += 2) {
        if (row[i] === pop) {
          return row[i + 1]
        }
      }
      return null
    }

    const sstack = new ParseStack<number>()
    const vstack = new ParseStack<unknown>()

    sstack.push(0)
    vstack.push(0)

    const defact_tab = pdata.defact_tab
    const labels = pdata.labels
    let err_cnt = 0
    let rval: unknown
    let act: number
    let i = 0
    const PCBobj = new PCB(pdata, lexer)

    const doerror = (p: PCB): void => {
      if (this.onerror) {
        this.onerror(p)
      }

      let line = -1
      let col = -1
      if (p) {
        line = p.line
        line = linemap[p.offset]
        col = colmap[p.offset]

        console.log(p)
      }

      console.log(p)
      const linesArr = buf.split('\n')
      let s = ''

      for (let j = line - 15; j < line + 25; j++) {
        if (j < 0) {
          continue
        }
        if (j >= linesArr.length) {
          break
        }

        let si = '' + j
        while (si.length < 3) {
          si = ' ' + si
        }

        s += si + ': ' + linesArr[j] + '\n'
      }

      console.log(s)
      let message = ''

      message += `${line}:${col}: Syntax Error\n`
      const l = linesArr[line]
      message += '  ' + l + '\n'

      for (let j = 0; j < col + 2; j++) {
        message += ' '
      }
      message += '^\n'

      console.warn(message)

      throw new Error(message)
    }

    const err_off = new ParseStack<number>()
    const err_la = new ParseStack<string[]>()

    PCBobj.lex()
    while (1) {
      PCBobj.act = get_act(sstack.bottom, PCBobj.la)
      if (debug) {
        console.log(PCBobj.act, PCBobj.la)
      }

      if (PCBobj.act === null && defact_tab[sstack.bottom] >= 0) {
        PCBobj.act = -defact_tab[sstack.bottom]
      }
      if (PCBobj.act === null) {
        if (PCBobj.error_step === 0) {
          err_cnt++
          const attLen = typeof PCBobj.att === 'string' ? PCBobj.att.length : 0
          err_off.unshift(PCBobj.offset - attLen)
          err_la.unshift([])

          for (i = 0; i < act_tab[sstack.bottom].length; i += 2) {
            err_la.get(0).push(labels[act_tab[sstack.bottom][i]])
          }

          PCBobj.errorLabels = err_la
          doerror(PCBobj)
        }

        while (sstack.length > 1 && PCBobj.act === null) {
          sstack.shift()
          vstack.shift()
          PCBobj.act = get_act(sstack.bottom, PCBobj.la)
          if (PCBobj.act === error_token) {
            sstack.unshift(PCBobj.act)
            vstack.unshift('')
          }
        }

        if (sstack.length > 1 && PCBobj.act !== null) {
          while (PCBobj.la !== eof) {
            PCBobj.act = act_tab[sstack.bottom][i + 1]
            if (PCBobj.act != null) {
              break
            }
            while (PCBobj.lex() != null) {
              PCBobj.offset++
            }
          }
        }
        if (PCBobj.act === null || PCBobj.la === eof) {
          break
        }

        PCBobj.error_step = 3
      }

      if (PCBobj.act > 0) {
        sstack.unshift(PCBobj.act)
        vstack.unshift(PCBobj.att)
        PCBobj.lex()

        if (PCBobj.error_step > 0) {
          PCBobj.error_step--
        }
      } else {
        act = -PCBobj.act
        const prod = pdata.productions[act].rhs
        const p = [null] as unknown as ActionP
        p.lexer = lexer

        for (let j = 0; j < prod.length; j++) {
          p.push(vstack.get(prod.length - j - 1))
        }

        if (debug) {
          console.log('P', p)
        }

        const actfunc = pdata.actions.get(act)
        if (!actfunc) {
          p[0] = p[1]
        } else {
          actfunc(p)
        }

        rval = p[0]

        sstack.shiftN(pop_tab[act][1])
        vstack.shiftN(pop_tab[act][1])

        const gotoAct = get_goto(sstack.bottom, pop_tab[act][0])
        PCBobj.act = gotoAct
        if (act === 0) {
          break
        }

        if (gotoAct === null) {
          throw new Error('parser: missing goto for production ' + act)
        }
        sstack.unshift(gotoAct)
        vstack.unshift(rval)
      }
    }

    return rval
  }
}

interface JsccGlobal {
  productions: Array<{
    lhs: number
    rhs: {length: number}
    code: string
    id: number
  }>
  states: Array<{
    actionrow: Array<{symbol: number; action: number}>
    gotorow: Array<{symbol: number; action: number}>
    def_act: number
  }>
  symbols: Array<{label: string; special: number}>
  nfa_states: {value: unknown}
  dfa_states: unknown
  DEFAULT_DRIVER: string
}

interface JsccIntegrity {
  undef(): void
  unreachable(): void
  check_empty_states(): void
}

interface JsccFirst {
  first(): void
}

interface JsccTabgen {
  lalr1_parse_table(verbose: boolean): void
}

interface JsccLexdfa {
  create_subset(states: unknown): unknown
  minimize_dfa(states: unknown): unknown
}

interface JsccPrinttab {
  get_whitespace_symbol_id(): number
}

interface JsccSpecial {
  EOF: number
  ERROR: number
}

type ParseGrammarFn = (grammar: string, label: string) => unknown

export function getParser<L extends lexer>(
  lexer: L,
  parsedef: ParseDefItem<L>[],
  tokenlist: string[],
  prec: PrecRow[],
  parserName: string | undefined,
  force = false
): Parser {
  if (parserName === undefined) {
    throw new Error('parserName cannot be undefined')
  }

  let grammar = '/~ We use our own lexical scannar ~/\n'

  const visit = new Set<string>()
  let _i = 0

  for (const list of prec) {
    let precChar = list[0]
    if (precChar === 'left') {
      precChar = '<'
    } else if (precChar === 'right') {
      precChar = '>'
    } else {
      precChar = ''
    }

    grammar += precChar + ' '
    for (let i = 1; i < list.length; i++) {
      if (i > 1) {
        grammar += '  '
      }
      grammar += ` '${_i++}' ${list[i]}\n`

      visit.add(list[i])
    }
    grammar += ';\n'
  }

  for (const t of tokenlist) {
    if (visit.has(t)) {
      continue
    }

    grammar += `'${_i++}'  ${t} \n`
  }
  grammar += ';\n\n##\n\n'

  parsedef.reverse()

  let idgen = 0
  for (const p of parsedef) {
    p.id = idgen++
  }

  for (const p of parsedef) {
    const lines = p.grammar.split('\n')
    let li = 0

    for (let l of lines) {
      if (li === 0) {
        l = '               ' + l
      }

      if (l.trim().length === 0) {
        li++
        continue
      }

      grammar += l + ` [*_${p.id}*]\n`
      li++
    }

    grammar += '\n;\n'
  }

  const actions = new Map<string, ActionFn>()
  for (const p of parsedef) {
    actions.set('' + p.id, p.func as ActionFn)
    p.func.grammar = p.grammar
  }

  let parser: Parser | undefined
  const hash = '' + util.strhash(grammar)
  const storageKey = 'parseTable_' + parserName

  if (!force && parsetable) {
    parser = new Parser(lexer)
    parser.load(parsetable, actions)
  }

  if (parser && parser.hash === hash) {
    return parser
  } else if (!force) {
    throw new Error('parser is out of date; run build_parsetable.js')
  }

  console.log(`Building parse tables (will be cached in localStorage[${storageKey}]. . .`)

  const parse_grammar = jscc.require('lib/jscc/parse') as ParseGrammarFn
  const integrity = jscc.require('lib/jscc/integrity') as JsccIntegrity
  const first = jscc.require('lib/jscc/first') as JsccFirst
  const tabgen = jscc.require('lib/jscc/tabgen') as JsccTabgen
  const lexdfa = jscc.require('lib/jscc/lexdfa') as JsccLexdfa
  const globalMod = jscc.require('lib/jscc/global') as JsccGlobal
  const printtab = jscc.require('lib/jscc/printtab') as JsccPrinttab
  const SPECIAL = jscc.require('lib/jscc/enums/SPECIAL') as JsccSpecial

  const ret = parse_grammar(grammar, 'grammar')

  let pdata: PData | undefined

  if (!ret) {
    integrity.undef()
    integrity.unreachable()
    first.first()
    tabgen.lalr1_parse_table(false)
    integrity.check_empty_states()
    globalMod.dfa_states = lexdfa.create_subset(globalMod.nfa_states.value)
    globalMod.dfa_states = lexdfa.minimize_dfa(globalMod.dfa_states)

    const pop_tab_json: Array<[number, number]> = []
    for (let i = 0; i < globalMod.productions.length; i++) {
      pop_tab_json.push([globalMod.productions[i].lhs, globalMod.productions[i].rhs.length])
    }

    const act_tab_json: number[][] = []
    for (let i = 0; i < globalMod.states.length; i++) {
      const act_tab_json_item: number[] = []

      for (let j = 0; j < globalMod.states[i].actionrow.length; j++) {
        act_tab_json_item.push(globalMod.states[i].actionrow[j].symbol, globalMod.states[i].actionrow[j].action)
      }
      act_tab_json.push(act_tab_json_item)
    }

    const goto_tab_json: number[][] = []
    for (let i = 0; i < globalMod.states.length; i++) {
      const goto_tab_json_item: number[] = []

      for (let j = 0; j < globalMod.states[i].gotorow.length; j++) {
        goto_tab_json_item.push(globalMod.states[i].gotorow[j].symbol, globalMod.states[i].gotorow[j].action)
      }
      goto_tab_json.push(goto_tab_json_item)
    }

    const defact_tab_json: number[] = []
    for (let i = 0; i < globalMod.states.length; i++) {
      defact_tab_json.push(globalMod.states[i].def_act)
    }

    const labelsArr: string[] = []
    for (let i = 0; i < globalMod.symbols.length; i++) {
      labelsArr.push(globalMod.symbols[i].label)
    }

    let eof_id = -1
    for (let i = 0; i < globalMod.symbols.length; i++) {
      if (globalMod.symbols[i].special === SPECIAL.EOF) {
        eof_id = i
        break
      }
    }

    let error_id = -1
    for (let i = 0; i < globalMod.symbols.length; i++) {
      if (globalMod.symbols[i].special === SPECIAL.ERROR) {
        error_id = i
        break
      }
    }

    const labelmap = new Map<string, number>()
    for (let i = 0; i < labelsArr.length; i++) {
      labelmap.set(labelsArr[i], i)
    }

    const productions: Production[] = globalMod.productions.map((p) => ({
      lhs : p.lhs,
      rhs : Array.from({length: p.rhs.length}, (_, k) => (p.rhs as unknown as number[])[k]),
      code: p.code,
      id  : p.id,
    }))

    const actions2 = new Map<number, ActionFn>()
    actions2.set(0, (p) => {
      p[0] = p[1]
    })

    for (const p of productions) {
      const code = p.code.trim()
      if (code.startsWith('_')) {
        const key = code.slice(1, code.length)
        const fn = actions.get(key)
        if (fn) {
          actions2.set(p.id, fn)
        }
      }
    }

    pdata = {
      pop_tab         : pop_tab_json,
      act_tab         : act_tab_json,
      goto_tab        : goto_tab_json,
      labelmap        : labelmap,
      labels          : labelsArr,
      productions     : productions,
      error_symbol    : error_id,
      eof_symbol      : eof_id,
      whitespace_token: printtab.get_whitespace_symbol_id(),
      defact_tab      : defact_tab_json,
      actions         : actions2,
    }
  }

  parser = new Parser(lexer, pdata, hash)

  return parser
}

