import {localStorage} from '../util/localStorage.js'
import * as util from '../util/util.js'
import {makeNode, ProgramNode, walk} from './ast.js'
import type {ASTNode} from './ast.js'
import '../generators/all.js'
import {transformAst} from '../transform/process_ast.js'
import {getParser} from '../parser/parser.js'

export {preprocess} from '../parser/preprocessor.js'
import {preprocess} from '../parser/preprocessor.js'

import {CodeGenerator} from '../generators/generator_base.js'

import * as state from './state.js'
import {libraryCode} from './state.js'
import { CompiledJS } from '../generators/javascript_types.js';

interface JSZipModule {
  deflate(s: string): Uint8Array | number[]
  inflate(buf: string): Uint8Array | number[]
}

interface MathlGlobal {
  JSZip?: JSZipModule
  _parseGlsl?: (src: string, filename?: string) => state.ParseState
  _compileJS?: (code: string, filename?: string) => CompiledJS
}

interface CompiledASTRoot extends ProgramNode {
  version?: number
}

export interface CompiledJSTypeInfo {
  type: string
  index: number
}
interface ParsedState extends state.ParseState {
  ast?: ASTNode
}

export function findSlots(ctx: state.ParseState, ast: ASTNode): void {
  walk(ast, {
    VarDecl(n: ASTNode): void {
      if (n.length === 0) {
        return
      }

      let head: unknown = n[0]

      if (head && typeof head === 'object' && 'value' in head) {
        head = (head as {value: unknown}).value
      }

      if (head && typeof head === 'object' && 'qualifier' in head) {
        head = (head as {qualifier: unknown}).qualifier
      }

      if (
        head &&
        typeof head === 'object' &&
        'type' in head &&
        (head as {type: unknown}).type === 'TypeQualifier'
      ) {
        head = (head as unknown as {value: unknown}).value
      }

      let typeStr: string | undefined
      if (typeof head === 'string') {
        typeStr = head.trim()
      }

      const name = n.value
      if (typeof name !== 'string') {
        return
      }

      if (typeStr === 'uniform') {
        ctx.uniforms.set(name, n)
      } else if (typeStr === 'in') {
        ctx.inputs.set(name, n)
      } else if (typeStr === 'out') {
        ctx.outputs.set(name, n)
      }
    },
  })
}

let compiledLibraryCode: CompiledASTRoot | undefined = undefined

const lskey = '_mathl_library_code'
const libraryCodeVersion = 9

function saveLibraryCode(): void {
  let s = JSON.stringify(compiledLibraryCode)
  const g = globalThis as unknown as MathlGlobal
  if (typeof g.JSZip !== 'undefined' && g.JSZip) {
    let s2 = ''

    for (const b of g.JSZip.deflate(s)) {
      s2 += String.fromCharCode(b)
    }

    s = btoa(s2)
  }

  localStorage.setItem(lskey, s)
}

function loadLibraryCode(): void {
  const raw = localStorage.getItem(lskey)
  if (typeof raw !== 'string') {
    throw new Error('No saved library code')
  }
  let buf: string = raw

  const g = globalThis as unknown as MathlGlobal
  if (typeof g.JSZip !== 'undefined' && g.JSZip) {
    const decoded = atob(buf)
    const inflated = g.JSZip.inflate(decoded)

    let s = ''
    for (const b of inflated) {
      s += String.fromCharCode(b)
    }

    buf = s
  }

  const json = JSON.parse(buf) as {type: string; version?: number}

  if (json.version !== libraryCodeVersion) {
    throw new Error('Bad stdlib version; will have to recompile. . .')
  }

  const node = makeNode(json.type)

  node.loadJSON(json as Parameters<typeof node.loadJSON>[0])
  compiledLibraryCode = node as CompiledASTRoot
}

function getLibraryCode(): CompiledASTRoot {
  function processLibraryAST(ast: ASTNode): void {
    for (const node of ast) {
      if (node.type === 'Function') {
        state.state.addLibraryFunc(node)
      }
    }
  }

  const lskeyHash = '_mathl_library_hash'

  const hashRaw = localStorage.getItem(lskeyHash)
  const hash = parseFloat(typeof hashRaw === 'string' ? hashRaw : '-1')
  const digest = new util.HashDigest()
  digest.addString(libraryCode)
  const codeHash = digest.get()

  if (localStorage.has(lskey) && hash === codeHash) {
    try {
      loadLibraryCode()
      if (compiledLibraryCode) {
        processLibraryAST(compiledLibraryCode)
        return compiledLibraryCode
      }
    } catch (error) {
      const e = error as Error
      console.error(e.stack)
      console.error(e.message)
      console.error('error loading saved builtin library nodes')
    }
  }

  const parser = getParser()
  state.pushParseState(libraryCode, 'library', parser, libraryCode)

  state.state.parser = parser
  parser.lexer.line_lexstart = 0
  state.state.lexer = parser.lexer

  const parsed = parser.parse(libraryCode) as CompiledASTRoot
  parsed.version = libraryCodeVersion
  compiledLibraryCode = parsed

  processLibraryAST(compiledLibraryCode)

  state.popParseState({keepPolyFuncs: true})
  saveLibraryCode()
  localStorage.setItem(lskeyHash, '' + codeHash)

  return compiledLibraryCode
}

export function parse(src: string, filename?: string): ParsedState {
  const src2 = preprocess(src)
  const parser = getParser()

  if (!compiledLibraryCode) {
    compiledLibraryCode = getLibraryCode()
  }

  state.pushParseState(src, filename, parser, src2)

  let ret: ParsedState
  try {
    state.state.parser = parser
    parser.lexer.line_lexstart = 0
    state.state.lexer = parser.lexer

    const parsed = parser.parse(src2) as ASTNode
    const ast2 = new ProgramNode()
    for (const node of compiledLibraryCode) {
      ast2.push(node.copy())
    }

    for (const node of parsed) {
      ast2.push(node)
    }

    const ast: ASTNode = ast2

    findSlots(state.state, ast)

    ret = state.state as ParsedState
    ret.ast = ast

    transformAst(ret.ast, ret)
  } finally {
    state.popParseState()
  }

  return ret
}

export function genCode(ctx: state.ParseState, type: string, args: unknown = {}): string {
  const cls = CodeGenerator.getGenerator(type)
  const gen = new cls(ctx, args)

  return gen.genCode()
}

export function genJS(ctx: state.ParseState, args: unknown = {}): string {
  return genCode(ctx, 'js', args)
}

export {silence, unsilence} from '../util/util.js'

;(globalThis as unknown as MathlGlobal)._parseGlsl = parse

export function compileJS(code: string, filename?: string): CompiledJS {
  const ctx = parse(code, filename)
  const code2 = genJS(ctx)

  let program: (() => CompiledJS) | undefined

  try {
    // eslint-disable-next-line no-eval
    eval(code2)
  } catch (error) {
    const e = error as Error
    console.log(code2)

    console.error(e.stack)
    console.error(e.message, e)
    throw error
  }

  if (!program) {
    throw new Error('compileJS: generated code did not define program()')
  }
  const ret = program()

  ret.sourceState = ctx
  ret.sourceCode = code2

  return ret
}
;(globalThis as unknown as MathlGlobal)._compileJS = compileJS
