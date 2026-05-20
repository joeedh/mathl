import * as jscc_util from './jscc_util.js'
import type {ActionP, ParseDefItem, PrecRow} from './jscc_util.js'
import {token, tokdef, lexer, PUTLParseError} from '../util/parseutil.js'
import type {TokFunc} from '../util/parseutil.js'
import {VarType, ArrayType, DynamicArrayType} from '../core/types.js'
import type {ASTNode} from '../core/ast.js'
import {
  ArrayLookupNode,
  AssignNode,
  BasicMemberLookupNode,
  BinOpNode,
  BoolConstantNode,
  BreakNode,
  CallNode,
  CaseLabelNode,
  ConditionNode,
  ContinueNode,
  DefaultCaseNode,
  DiscardNode,
  DoWhileNode,
  ElseNode,
  ExprListNode,
  ExprNode,
  FloatConstantNode,
  ForLoopNode,
  FunctionNode,
  IdentNode,
  IfNode,
  InitDeclaratorListNode,
  IntConstantNode,
  LayoutQualifierIdNode,
  LayoutQualifierNode,
  PostDecNode,
  PostIncNode,
  PreDecNode,
  PreIncNode,
  PrecisionNode,
  ProgramNode,
  ReturnNode,
  StatementListNode,
  StructDeclNode,
  StructMemberListNode,
  StructMemberNode,
  SubroutineQualifierNode,
  SwitchNode,
  TrinaryNode,
  TypeNameNode,
  TypeQualifierNode,
  UintConstantNode,
  UnaryOpNode,
  VarDeclNode,
  VarTypeNode,
  WhileNode,
} from '../core/ast.js'

const tk = (n: string, r?: RegExp, f?: TokFunc): tokdef => new tokdef(n, r, f)

const precedence2: Map<string, number> = new Map<string, number>(
  Object.entries({
    '(' : 0,
    ')' : 0,
    '[' : 1,
    ']' : 1,
    '.' : 1,
    '++': 1,
    '--': 1,
    '*' : 2,
    '/' : 2,
    '%' : 2,
    '+' : 3,
    '-' : 3,
    '>=': 4,
    '<=': 4,
    '>' : 4,
    '<' : 4,
    '!=': 5,
    '==': 5,
    '&' : 6,
    '^' : 7,
    '|' : 8,
    '&&': 9,
    '^^': 10,
    '||': 11,
  })
)

const count = (str: string, match: string | RegExp): number => {
  let c = 0
  do {
    let i = str.search(match)
    if (i < 0) {
      break
    }

    c++

    str = str.slice(i + 1, str.length)
  } while (1)

  return c
}

let keywords = new Set([
  'CONST',
  'BOOL',
  'FLOAT',
  'DOUBLE',
  'INT',
  'UINT',
  'BREAK',
  'CONTINUE',
  'DO',
  'ELSE',
  'FOR',
  'IF',
  'DISCARD',
  'RETURN',
  'SWITCH',
  'CASE',
  'DEFAULT',
  'SUBROUTINE',
  'BVEC2',
  'BVEC3',
  'BVEC4',
  'IVEC2',
  'IVEC3',
  'IVEC4',
  'UVEC2',
  'UVEC3',
  'UVEC4',
  'VEC2',
  'VEC3',
  'VEC4',
  'MAT2',
  'MAT3',
  'MAT4',
  'CENTROID',
  'IN',
  'OUT',
  'INOUT',
  'UNIFORM',
  'PATCH',
  'SAMPLE',
  'BUFFER',
  'SHARED',
  'COHERENT',
  'VOLATILE',
  'RESTRICT',
  'READONLY',
  'WRITEONLY',
  'DVEC2',
  'DVEC3',
  'DVEC4',
  'DMAT2',
  'DMAT3',
  'DMAT4',
  'NOPERSPECTIVE',
  'FLAT',
  'SMOOTH',
  'LAYOUT',
  'MAT2X2',
  'MAT2X3',
  'MAT2X4',
  'MAT3X2',
  'MAT3X3',
  'MAT3X4',
  'MAT4X2',
  'MAT4X3',
  'MAT4X4',
  'DMAT2X2',
  'DMAT2X3',
  'DMAT2X4',
  'DMAT3X2',
  'DMAT3X3',
  'DMAT3X4',
  'DMAT4X2',
  'DMAT4X3',
  'DMAT4X4',
  'ATOMIC_UINT',
  'SAMPLER1D',
  'SAMPLER2D',
  'SAMPLER3D',
  'SAMPLERCUBE',
  'SAMPLER1DSHADOW',
  'SAMPLER2DSHADOW',
  'SAMPLERCUBESHADOW',
  'SAMPLER1DARRAY',
  'SAMPLER2DARRAY',
  'SAMPLER1DARRAYSHADOW',
  'SAMPLER2DARRAYSHADOW',
  'ISAMPLER1D',
  'ISAMPLER2D',
  'ISAMPLER3D',
  'ISAMPLERCUBE',
  'ISAMPLER1DARRAY',
  'ISAMPLER2DARRAY',
  'USAMPLER1D',
  'USAMPLER2D',
  'USAMPLER3D',
  'USAMPLERCUBE',
  'USAMPLER1DARRAY',
  'USAMPLER2DARRAY',
  'SAMPLER2DRECT',
  'SAMPLER2DRECTSHADOW',
  'ISAMPLER2DRECT',
  'USAMPLER2DRECT',
  'SAMPLERBUFFER',
  'ISAMPLERBUFFER',
  'USAMPLERBUFFER',
  'SAMPLERCUBEARRAY',
  'SAMPLERCUBEARRAYSHADOW',
  'ISAMPLERCUBEARRAY',
  'USAMPLERCUBEARRAY',
  'SAMPLER2DMS',
  'ISAMPLER2DMS',
  'USAMPLER2DMS',
  'SAMPLER2DMSARRAY',
  'ISAMPLER2DMSARRAY',
  'USAMPLER2DMSARRAY',
  'IMAGE1D',
  'IIMAGE1D',
  'UIMAGE1D',
  'IMAGE2D',
  'IIMAGE2D',
  'UIMAGE2D',
  'IMAGE3D',
  'IIMAGE3D',
  'UIMAGE3D',
  'IMAGE2DRECT',
  'IIMAGE2DRECT',
  'UIMAGE2DRECT',
  'IMAGECUBE',
  'IIMAGECUBE',
  'UIMAGECUBE',
  'IMAGEBUFFER',
  'IIMAGEBUFFER',
  'UIMAGEBUFFER',
  'IMAGE1DARRAY',
  'IIMAGE1DARRAY',
  'UIMAGE1DARRAY',
  'IMAGE2DARRAY',
  'IIMAGE2DARRAY',
  'UIMAGE2DARRAY',
  'IMAGECUBEARRAY',
  'IIMAGECUBEARRAY',
  'UIMAGECUBEARRAY',
  'IMAGE2DMS',
  'IIMAGE2DMS',
  'UIMAGE2DMS',
  'IMAGE2DMSARRAY',
  'IIMAGE2DMSARRAY',
  'UIMAGE2DMSARRAY',
  'STRUCT',
  'VOID',
  'WHILE',
  'INVARIANT',
  'PRECISE',
  'PRECISION',
])

/*
  "HIGH_PRECISION", "MEDIUM_PRECISION", "LOW_PRECISION", "PRECISION"
  "Ident", "TYPE_NAME",
  "FIELD_SELECTION",
  "LEFT_OP", "RIGHT_OP",
  "FLOATCONSTANT", "DOUBLECONSTANT", "INTCONSTANT", "UINTCONSTANT", "BOOLCONSTANT",
  "INC_OP", "DEC_OP", "LE_OP", "GE_OP", "EQ_OP", "NE_OP",
  "AND_OP", "OR_OP", "XOR_OP", "MUL_ASSIGN", "DIV_ASSIGN", "ADD_ASSIGN",
  "MOD_ASSIGN", "LEFT_ASSIGN", "RIGHT_ASSIGN", "AND_ASSIGN", "XOR_ASSIGN", "OR_ASSIGN",
  "SUB_ASSIGN",
  "LPAREN", "RPAREN", "LSBRACKET", "RSBRACKET", "LBRACE", "RBRACE", "DOT",
  "COMMA", "COLON", "EQUAL", "SEMI", "BANG", "DASH", "TILDE", "PLUS", "STAR", "SLASH", "PERCENT",
  "LEFT_ANGLE", "RIGHT_ANGLE", "VERTICAL_BAR", "CARET", "AMPERSAND", "QUESTION",
*/

const tokendef: tokdef[] = [
  tk('HIGH_PRECISION', /highp/),
  tk('MEDIUM_PRECISION', /mediump/),
  tk('LOW_PRECISION', /lowp/),
  tk('ID', /[a-zA-Z$_]+[a-zA-Z0-9$_]*/, (t) => {
    t.isKeyword = false

    const lex = t.lexer as GLSLLexer
    const val = t.value as string

    if (lex.structs.has(val)) {
      t.type = 'TYPE_NAME'
      return t
    }

    if (lex.prev && lex.prev.type === 'DOT') {
      t.type = 'FIELD_SELECTION'
      return t
    }

    if (keywords.has(val.toUpperCase())) {
      t.isKeyword = true
      t.type = val.toUpperCase()
      t.value = val.toLowerCase()
    }

    return t
  }),
  tk('FLOATCONSTANT', /[0-9]+\.([0-9]*)?/, (t) => {
    t.value = parseFloat(t.value as string)
    return t
  }),
  tk('INTCONSTANT', /[0-9]+/, (t) => {
    t.value = parseInt(t.value as string)
    return t
  }),
  tk('UINTCONSTANT', /[0-9]+u/, (t) => {
    t.value = parseInt(t.value as string)
    return t
  }),
  tk('BOOLCONSTANT', /(true|false)/),
  tk('DOUBLECONSTANT', /[0-9]+(\.[0-9]*)?d/, (t) => {
    const s = t.value as string
    t.value = parseFloat(s.slice(0, s.length - 1))
    return t
  }),
  tk('LPAREN', /\(/),
  tk('RPAREN', /\)/),
  tk('STRLIT', /".*(?<!\\)\"/, (t) => {
    const lex = t.lexer as GLSLLexer
    lex.lineno += count(t.value as string, '\n')
    return t
  }),
  tk('NL', /[\n\r]/, (t) => {
    if (t.value === '\n') {
      const lex = t.lexer as GLSLLexer
      lex.lineno++
      lex.line_lexstart = lex.lexpos
    }
    //drop token by not returning it
  }),
  tk('WS', /[ \t]/, (_t) => {
    //drop token by not returning it
  }),
  tk('COMMA', /\,/),
  tk('COLON', /:/),
  tk('QUESTION', /\?/),
  tk('LSBRACKET', /\[/),
  tk('RSBRACKET', /\]/),
  tk('LBRACE', /\{/),
  tk('RBRACE', /\}/),
  tk('DOT', /\./),
  tk('PLUS', /\+/),
  tk('NOT', /\!/),
  tk('MINUS', /\-/),
  tk('TIMES', /\*/),
  tk('DIV', /\//),
  tk('EXP', /\*\*/),
  tk('LAND', /\&\&/),
  tk('BITAND', /\&/),
  tk('LOR', /\|\|/),
  tk('BITOR', /\|/),
  tk('EQUALS', /==/),
  tk('NEQUALS', /\!=/),
  tk('ASSIGN', /=/),
  tk('LEQUALS', /\<\=/),
  tk('GEQUALS', /\>\=/),
  tk('LTHAN', /\</),
  tk('LSHIFT', /\<\</),
  tk('RSHIFT', /\>\>/),
  tk('GTHAN', /\>/),
  tk('MOD', /\%/),
  tk('XOR', /\^/),
  tk('LXOR', /\^\^/),
  tk('BITINV', /\~/),
  tk('INC', /\+\+/),
  tk('DEC', /\-\-/),
  tk('MUL_ASSIGN', /\*\=/),
  tk('DIV_ASSIGN', /\/\=/),
  tk('PLUS_ASSIGN', /\+\=/),
  tk('MINUS_ASSIGN', /\-\=/),
  tk('COMMENT', /\/\/[^\n]*\n/, (t) => {
    const lex = t.lexer as GLSLLexer
    lex.lineno += count(t.value as string, '\n')
    //drop token by not returning it
  }),
  tk('MOD_ASSIGN', /\%\=/),
  tk('LEFT_ASSIGN', /\<\<\=/),
  tk('RIGHT_ASSIGN', /\>\>\=/),
  tk('AND_ASSIGN', /\&\=/),
  tk('OR_ASSIGN', /\|\=/),
  tk('XOR_ASSIGN', /\^\=/),
  tk('SEMI', /;/),
]

export class GLSLLexer extends lexer {
  scope: Map<string, ASTNode> = new Map()
  structs: Map<string, ASTNode> = new Map()
  scopestack: Map<string, ASTNode>[] = []

  constructor() {
    super(tokendef, (_t) => {
      console.log('Token error')
      return true
    })

    this.linemap = []
  }

  pushScope(): void {
    this.scopestack.push(this.scope)
    this.scope = new Map(this.scope)
  }

  popScope(): void {
    const popped = this.scopestack.pop()
    if (popped) {
      this.scope = popped
    }
  }

  input(data: string): void {
    super.input(data)

    this.linemap = new Array(data.length)

    let li = 0
    for (let i = 0; i < data.length; i++) {
      this.linemap[i] = li

      if (data[i] === '\n') {
        li++
      }
    }

    this.scope = new Map()
    this.structs = new Map()
  }
}

let lex = new GLSLLexer()

let binops = new Set([
  '.',
  '/',
  '*',
  '**',
  '^',
  '%',
  '&',
  '+',
  '-',
  '&&',
  '||',
  '&',
  '|',
  '<',
  '>',
  '==',
  '=',
  '<=',
  '>=', //, "(", ")"
])

let precedence: PrecRow[] = [
  ['nonassoc', 'LPAREN', 'RPAREN'],
  ['left', 'LSBRACKET', 'RSBRACKET', 'DOT', 'INC', 'DEC', 'FIELD_SELECTOR'],
  ['right', 'UNARY'],
  ['left', 'TIMES', 'DIV', 'MOD'],
  ['left', 'PLUS', 'MINUS'],
  ['left', 'LSHIFT', 'RSHIFT'],
  ['left', 'GEQUALS', 'LEQUALS', 'GTHAN', 'LTHAN'],
  ['left', 'NEQUALS', 'EQUALS'],
  ['left', 'BITAND'],
  ['left', 'XOR'],
  ['left', 'BITOR'],
  ['left', 'LAND'],
  ['left', 'LXOR'],
  ['left', 'LOR'],
  ['right', 'QUESTION', 'COLON'],
  [
    'right',
    'ASSIGN',
    'MUL_ASSIGN',
    'DIV_ASSIGN',
    'PLUS_ASSIGN',
    'MINUS_ASSIGN',
    'MOD_ASSIGN',
    'OR_ASSIGN',
    'XOR_ASSIGN',
    'RIGHT_ASSIGN',
    'LEFT_ASSIGN',
    'AND_ASSIGN',
  ],
  ['left', 'COMMA'],
]

const opmap: Map<string, string> = new Map<string, string>(
  Object.entries({
    TIMES       : '*',
    DIV         : '/',
    MOD         : '%',
    PLUS        : '+',
    MINUS       : '-',
    GTHAN       : '>',
    LTHAN       : '<',
    GEQUALS     : '>=',
    LEQUALTS    : '<=',
    NEQUALS     : '!=',
    EQUALS      : '==',
    ASSIGN      : '=',
    MUL_ASSIGN  : '*=',
    DIV_ASSIGN  : '/=',
    PLUS_ASSIGN : '+=',
    MOD_ASSIGN  : '%=',
    OR_ASSIGN   : '|=',
    AND_ASSIGN  : '&=',
    LEFT_ASSIGN : '<<=',
    RIGHT_ASSIGN: '>>=',
    XOR_ASSIGN  : '^=',
    MINUS_ASSIGN: '-=',
    XOR         : '^',
    BITOR       : '|',
    LAND        : '&&',
    LOR         : '||',
    LXOR        : '^^',
    BITAND      : '&',
    BITINV      : '~',
    LSHIFT      : '<<',
    RSHIFT      : '>>',
    INC         : '++',
    DEC         : '--',
    DOT         : '.',
  })
)

export interface PrecedenceEntry {
  prec: number
  assoc: string
}

export const Precedence: Map<string, PrecedenceEntry> = new Map()
let pi = 0
for (const row of precedence) {
  for (const key of row.slice(1, row.length)) {
    const opChar = opmap.get(key)
    if (opChar !== undefined) {
      Precedence.set(opChar, {prec: pi, assoc: row[0]})
    }
  }
  pi++
}

function indent(n: number, chr = '  '): string {
  let s = ''
  for (let i = 0; i < n; i++) {
    s += chr
  }

  return s
}

type P<ARGS extends readonly unknown[] = unknown[]> = ARGS & {
  lexer: GLSLLexer
  length: number
}

type BinOpP = P<[ASTNode, ASTNode] | [BinOpNode, ASTNode, string, ASTNode]>
type ConstantNode = IntConstantNode | FloatConstantNode | UintConstantNode | BoolConstantNode | IdentNode

let BinOpHandler = (p: BinOpP) => {
  if (p.length === 2) {
    p[0] = p[1]
  } else {
    const op = p[2]
    const prec = precedence2.get(op) ?? 0
    const n = new BinOpNode(op, prec)
    n.push(p[1])
    n.push(p[3])
    p[0] = n
  }
}

let parsedef = [
  {
    grammar: `var_expr: ID`,
    func: (p: P<[IdentNode, string]>) => {
      p[0] = new IdentNode()
      p[0].value = p[1]
    },
  },
  {
    grammar: `intconstant: INTCONSTANT`,
    func: (p: P<[IntConstantNode, number]>) => {
      p[0] = new IntConstantNode()
      p[0].value = p[1]
    },
  },
  {
    grammar: `floatconstant: FLOATCONSTANT`,
    func: (p: P<[FloatConstantNode, number]>) => {
      p[0] = new FloatConstantNode()
      p[0].value = p[1]
    },
  },
  {
    grammar: `boolconstant: BOOLCONSTANT`,
    func: (p: P<[BoolConstantNode, string]>) => {
      p[0] = new BoolConstantNode()
      p[0].value = p[1]
    },
  },
  {
    grammar: `uintconstant: UINTCONSTANT`,
    func: (p: P<[UintConstantNode, number]>) => {
      p[0] = new UintConstantNode()
      p[0].value = p[1]
    },
  },

  {
    grammar: `expression: INTCONSTANT`,
    func: (p: P<[IntConstantNode, number]>) => {
      p[0] = new IntConstantNode()
      p[0].value = p[1]
    },
  },

  {
    grammar: `intconstant : INTCONSTANT`,
    func: (p: P<[IntConstantNode, number]>) => {
      p[0] = new IntConstantNode()
      p[0].value = p[1]
    },
  },
  {
    grammar: `uintconstant : UINTCONSTANT`,
    func: (p: P<[UintConstantNode, number]>) => {
      p[0] = new UintConstantNode()
      p[0].value = p[1]
    },
  },
  {
    grammar: `floatconstant : FLOATCONSTANT`,
    func: (p: P<[FloatConstantNode, number]>) => {
      p[0] = new FloatConstantNode()
      p[0].value = p[1]
    },
  },
  {
    grammar: `boolconstant : BOOLCONSTANT`,
    func: (p: P<[BoolConstantNode, string]>) => {
      p[0] = new BoolConstantNode()
      p[0].value = p[1]
    },
  },
  {
    grammar: `primary_expression:  var_expr
                                  | intconstant
                                  | uintconstant
                                  | floatconstant
                                  | boolconstant
                                  | LPAREN expression RPAREN`,
    func: (p: P<[ConstantNode, ConstantNode] | [ASTNode, string, ASTNode, string]>) => {
      if (p.length === 2) {
        p[0] = p[1]
      } else if (p.length === 4) {
        p[0] = p[2]
      }
    },
  },
  {
    grammar: `field_selection : FIELD_SELECTION`,
    func: (p: P<[IdentNode, string]>) => {
      p[0] = new IdentNode()
      p[0].value = p[1]
    },
  },
  {
    grammar: `postfix_expression : primary_expression
                                 | postfix_expression LSBRACKET integer_expression RSBRACKET
                                 | function_call
                                 | postfix_expression DOT field_selection
                                 | postfix_expression INC
                                 | postfix_expression DEC
               `,
    func: (
      p: P<
        | [ASTNode, ASTNode]
        | [ArrayLookupNode, ASTNode, string, ASTNode, string]
        | [BasicMemberLookupNode, ASTNode, string, ASTNode | string]
        | [PostIncNode | PostDecNode, ASTNode, string]
      >
    ) => {
      if (p.length === 2) {
        p[0] = p[1]
      } else if (p.length === 5) {
        p[0] = new ArrayLookupNode()
        p[0].push(p[1])
        p[0].push(p[3])
      } else if (p.length === 4) {
        p[0] = new BasicMemberLookupNode()
        let n = p[3]
        if (typeof n === 'string') {
          const id = new IdentNode()
          id.value = n
          n = id
        }

        p[0].push(p[1])
        p[0].push(n)
      } else if (p.length === 3) {
        p[0] = p[2] === '++' ? new PostIncNode() : new PostDecNode()
        p[0].push(p[1])
      }
    },
  },

  {
    grammar: `integer_expression: expression`,
    func: (p: P<[ASTNode, ASTNode]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `function_call: function_call_or_method`,
    func: (p: P<[ASTNode, ASTNode]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `function_call_or_method: function_call_generic`,
    func: (p: P<[ASTNode, ASTNode]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `function_call_generic: function_call_header_with_parameters RPAREN
                                    | function_call_header_no_parameters RPAREN
            `,
    func: (p: P<[ASTNode, ASTNode, string]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `function_call_header_no_parameters: function_call_header VOID
                                                 | function_call_header`,
    func: (p: P<[CallNode, CallNode] | [CallNode, CallNode, string]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `function_call_header_with_parameters: function_call_header assignment_expression
                                                   | function_call_header_with_parameters COMMA assignment_expression`,
    func: (p: P<[CallNode, CallNode, ASTNode] | [CallNode, CallNode, string, ASTNode]>) => {
      if (p.length === 3) {
        p[0] = p[1]
        ;(p[0][1] as ExprListNode).push(p[2])
      } else {
        p[0] = p[1]
        ;(p[0][1] as ExprListNode).push(p[3])
      }
    },
  },
  {
    grammar: `function_call_header: function_id LPAREN`,
    func: (p: P<[CallNode, ASTNode, string]>) => {
      p[0] = new CallNode()
      p[0].push(p[1])
      p[0].push(new ExprListNode())
    },
  },
  {
    grammar: `function_id: type_specifier
                          | postfix_expression`,
    func: (p: P<[ASTNode, ASTNode]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `unary_expression: postfix_expression
                               | INC unary_expression &UNARY
                               | DEC unary_expression &UNARY
                               | unary_operator unary_expression &UNARY`,
    func: (p: P<[ASTNode, ASTNode] | [PreIncNode | PreDecNode | UnaryOpNode, string, ASTNode, string]>) => {
      if (p.length === 2) {
        p[0] = p[1]
      } else if (p.length === 4 && p[1] === '++') {
        p[0] = new PreIncNode()
        p[0].push(p[2])
      } else if (p.length === 4 && p[1] === '--') {
        p[0] = new PreDecNode()
        p[0].push(p[2])
      } else {
        const n = new UnaryOpNode()
        n.push(p[2])
        n.op = p[1]
        p[0] = n
      }
    },
  },
  {
    grammar: `unary_operator : PLUS
                              | MINUS
                              | BITINV
                              | NOT`,
    func: (p: P<[string, string]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `multiplicative_expression : unary_expression
                                         | multiplicative_expression TIMES unary_expression
                                         | multiplicative_expression DIV unary_expression
                                         | multiplicative_expression MOD unary_expression`,
    func   : BinOpHandler,
  },
  {
    grammar: `additive_expression: multiplicative_expression
                                  | additive_expression PLUS multiplicative_expression
                                  | additive_expression MINUS multiplicative_expression

                                  `,
    func   : BinOpHandler,
  },
  {
    grammar: `shift_expression: additive_expression
                               | shift_expression RSHIFT additive_expression
                               | shift_expression LSHIFT additive_expression
                               `,
    func   : BinOpHandler,
  },
  {
    grammar: `rel_expression: shift_expression
                             | rel_expression  LTHAN   shift_expression
                             | rel_expression  GTHAN   shift_expression
                             | rel_expression  LEQUALS shift_expression
                             | rel_expression  GEQUALS shift_expression
                               `,
    func   : BinOpHandler,
  },
  {
    grammar: `equality_expression: rel_expression
                                  | equality_expression  EQUALS   rel_expression
                                  | equality_expression  NEQUALS  rel_expression
                               `,
    func   : BinOpHandler,
  },
  {
    grammar: `and_expression: equality_expression
                             | and_expression  BITAND  equality_expression
                               `,
    func   : BinOpHandler,
  },
  {
    grammar: `exclusive_or_expression: and_expression
                                      | exclusive_or_expression  XOR  and_expression
                               `,
    func   : BinOpHandler,
  },
  {
    grammar: `inclusive_or_expression: exclusive_or_expression
                                      | inclusive_or_expression  BITOR exclusive_or_expression
                               `,
    func   : BinOpHandler,
  },
  {
    grammar: `logical_and_expression: inclusive_or_expression
                                     | logical_and_expression LAND inclusive_or_expression
                               `,
    func   : BinOpHandler,
  },
  {
    grammar: `logical_xor_expression: logical_and_expression
                                     | logical_xor_expression LXOR logical_and_expression
                               `,
    func   : BinOpHandler,
  },
  {
    grammar: `logical_or_expression: logical_xor_expression
                                     | logical_or_expression LOR logical_xor_expression
                               `,
    func   : BinOpHandler,
  },
  {
    grammar: `conditional_expression: logical_or_expression
                                     | logical_or_expression QUESTION expression COLON assignment_expression
                               `,
    func: (p: P<[ASTNode, ASTNode] | [TrinaryNode, ASTNode, string, ASTNode, string, ASTNode]>) => {
      if (p.length === 2) {
        p[0] = p[1]
      } else {
        const n = new TrinaryNode()
        n.push(p[1])
        n.push(p[3])
        n.push(p[5])
        p[0] = n
      }
    },
  },
  {
    grammar: `assignment_expression: conditional_expression
                                    | unary_expression assignment_operator assignment_expression
                               `,
    func: (p: P<[ASTNode, ASTNode] | [AssignNode, ASTNode, string, ASTNode]>) => {
      if (p.length === 2) {
        p[0] = p[1]
      } else {
        const n = new AssignNode()
        n.push(p[1])
        n.push(p[3])
        n.op = p[2]
        p[0] = n
      }
    },
  },

  {
    grammar: `assignment_operator: ASSIGN
                                  | MUL_ASSIGN
                                  | DIV_ASSIGN
                                  | PLUS_ASSIGN
                                  | MINUS_ASSIGN
                                  | MOD_ASSIGN
                                  | OR_ASSIGN
                                  | XOR_ASSIGN
                                  | RIGHT_ASSIGN
                                  | LEFT_ASSIGN
                                  | AND_ASSIGN

                                  `,
    func: (p: P<[string, string]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `expression : assignment_expression
                          | expression COMMA assignment_expression`,
    func: (p: P<[ASTNode, ASTNode] | [ASTNode | ExprListNode, ASTNode, string, ASTNode]>) => {
      if (p.length === 2) {
        p[0] = p[1]
      } else {
        const left = p[1]
        let list: ExprListNode
        if (left.type !== 'ExprList') {
          list = new ExprListNode()
          list.push(left)
        } else {
          list = left as ExprListNode
        }

        list.push(p[3])
        p[0] = list
      }
    },
  },
  {
    grammar: `constant_expression: conditional_expression`,
    func: (p: P<[ASTNode, ASTNode]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `type_specifier: type_specifier_nonarray
                              | type_specifier_nonarray array_specifier`,
    func: (p: P<[VarType, VarType] | [ArrayType, VarType, ArrayType]>) => {
      if (p.length === 2) {
        p[0] = p[1]
      } else {
        const arr = p[2]
        arr.type = p[1]
        p[0] = arr
      }
    },
  },
  {
    grammar: `array_specifier: LSBRACKET RSBRACKET
                              | LSBRACKET constant_expression RSBRACKET
                              | array_specifier LSBRACKET RSBRACKET
                              | array_specifier LSBRACKET constant_expression RSBRACKET

 `,

    func: (
      p: P<
        | [DynamicArrayType, string, string]
        | [ArrayType, string, ASTNode, string]
        | [DynamicArrayType, ArrayType, string, string]
        | [ArrayType, ArrayType, string, ASTNode, string]
      >
    ) => {
      if (p.length === 3) {
        p[0] = new DynamicArrayType()
      } else if (p.length === 4 && p[1] === '[') {
        const sizeNode = p[2] as IntConstantNode
        p[0] = new ArrayType(undefined, sizeNode.value)
      } else if (p.length === 4) {
        p[0] = new DynamicArrayType(p[1] as ArrayType)
      } else if (p.length === 5) {
        const inner = p[1] as ArrayType
        const sizeNode = p[3] as IntConstantNode
        p[0] = new ArrayType(inner, sizeNode.value)
      } else {
        throw new Error('array_specifier: unexpected p shape')
      }
    },
  },
  {
    grammar: `type_name : TYPE_NAME`,
    func: (p: P<[ASTNode, string]>) => {
      p[0] = new TypeNameNode()
      p[0].value = p[1]
    },
  },
  {
    grammar: `type_specifier_nonarray: VOID
                                      | FLOAT
                                      | DOUBLE
                                      | INT
                                      | UINT
                                      | BOOL
                                      | VEC2
                                      | VEC3
                                      | VEC4
                                      | DVEC2
                                      | DVEC3
                                      | DVEC4
                                      | BVEC2
                                      | BVEC3
                                      | BVEC4
                                      | IVEC2
                                      | IVEC3
                                      | IVEC4
                                      | UVEC2
                                      | UVEC3
                                      | UVEC4
                                      | MAT2
                                      | MAT3
                                      | MAT4
                                      | MAT2X2
                                      | MAT2X3
                                      | MAT2X4
                                      | MAT3X2
                                      | MAT3X3
                                      | MAT3X4
                                      | MAT4X2
                                      | MAT4X3
                                      | MAT4X4
                                      | DMAT2
                                      | DMAT3
                                      | DMAT4
                                      | DMAT2X2
                                      | DMAT2X3
                                      | DMAT2X4
                                      | DMAT3X2
                                      | DMAT3X3 
                                      | DMAT3X4
                                      | DMAT4X2
                                      | DMAT4X3
                                      | DMAT4X4
                                      | ATOMIC_UINT
                                      | SAMPLER1D
                                      | SAMPLER2D
                                      | SAMPLER3D
                                      | SAMPLERCUBE
                                      | SAMPLER1DSHADOW
                                      | SAMPLER2DSHADOW
                                      | SAMPLERCUBESHADOW
                                      | SAMPLER1DARRAY
                                      | SAMPLER2DARRAY
                                      | SAMPLER1DARRAYSHADOW
                                      | SAMPLER2DARRAYSHADOW
                                      | SAMPLERCUBEARRAY
                                      | SAMPLERCUBEARRAYSHADOW
                                      | ISAMPLER1D
                                      | ISAMPLER2D
                                      | ISAMPLER3D
                                      | ISAMPLERCUBE
                                      | ISAMPLER1DARRAY
                                      | ISAMPLER2DARRAY
                                      | ISAMPLERCUBEARRAY
                                      | USAMPLER1D
                                      | USAMPLER2D
                                      | USAMPLER3D
                                      | USAMPLERCUBE
                                      | USAMPLER1DARRAY
                                      | USAMPLER2DARRAY
                                      | USAMPLERCUBEARRAY
                                      | SAMPLER2DRECT
                                      | SAMPLER2DRECTSHADOW
                                      | ISAMPLER2DRECT
                                      | USAMPLER2DRECT
                                      | SAMPLERBUFFER
                                      | ISAMPLERBUFFER 
                                      | USAMPLERBUFFER
                                      | SAMPLER2DMS
                                      | ISAMPLER2DMS
                                      | USAMPLER2DMS
                                      | SAMPLER2DMSARRAY
                                      | ISAMPLER2DMSARRAY
                                      | USAMPLER2DMSARRAY
                                      | IMAGE1D
                                      | IIMAGE1D
                                      | UIMAGE1D
                                      | IMAGE2D
                                      | IIMAGE2D
                                      | UIMAGE2D
                                      | IMAGE3D
                                      | IIMAGE3D
                                      | UIMAGE3D
                                      | IMAGE2DRECT
                                      | IIMAGE2DRECT
                                      | UIMAGE2DRECT
                                      | IMAGECUBE
                                      | IIMAGECUBE
                                      | UIMAGECUBE
                                      | IMAGEBUFFER
                                      | IIMAGEBUFFER
                                      | UIMAGEBUFFER
                                      | IMAGE1DARRAY
                                      | IIMAGE1DARRAY
                                      | UIMAGE1DARRAY
                                      | IMAGE2DARRAY
                                      | IIMAGE2DARRAY
                                      | UIMAGE2DARRAY
                                      | IMAGECUBEARRAY
                                      | IIMAGECUBEARRAY
                                      | UIMAGECUBEARRAY
                                      | IMAGE2DMS
                                      | IIMAGE2DMS
                                      | UIMAGE2DMS
                                      | IMAGE2DMSARRAY
                                      | IIMAGE2DMSARRAY 
                                      | UIMAGE2DMSARRAY
                                      | struct_specifier
                                      | type_name

    `,
    func: (p: P<[VarType, string | ASTNode]>) => {
      p[0] = new VarType(p[1])
    },
  },
  {
    grammar: `struct_declaration_list : struct_declaration
                                       | struct_declaration_list struct_declaration`,
    func: (p: P<[ExprListNode, ASTNode] | [ExprListNode, ExprListNode, ASTNode]>) => {
      if (p.length === 2) {
        p[0] = new ExprListNode()
        p[0].push(p[1])
      } else {
        p[0] = p[1]
        p[0].push(p[2])
      }
    },
  },
  {
    grammar: `struct_declaration: type_specifier struct_declarator_list SEMI
                                 | type_qualifier type_specifier struct_declarator_list SEMI`,
    func: (
      p: P<
        | [StructMemberListNode, ASTNode, ASTNode, string]
        | [StructMemberListNode, ASTNode, ASTNode, ASTNode, string]
      >
    ) => {
      p[0] = new StructMemberListNode()

      if (p.length === 4) {
        p[0].push(p[1])
        p[0].push(p[2])
      } else {
        p[0].push(p[2])
        p[0].push(p[3])
        p[2].qualifier = p[1]
      }

      for (let c of p[0][0]) {
        //c.ntype = p[0].ntype;
        if (c.length < 1 || c[0].type !== 'VarType') {
          c.insert(0, p[0][0])
        }
      }
    },
  },
  {
    grammar: `struct_declarator_list: struct_declarator
                                     | struct_declarator_list COMMA struct_declarator`,
    func: (p: P<[ExprListNode, ASTNode] | [ExprListNode, ExprListNode, string, ASTNode]>) => {
      if (p.length === 2) {
        p[0] = new ExprListNode()
        p[0].push(p[1])
      } else {
        p[0] = p[1]
        p[0].push(p[3])
      }
    },
  },
  {
    grammar: `struct_declarator: ID
                                | ID array_specifier`,
    func: (p: P<[StructMemberNode, string] | [StructMemberNode, string, ArrayType]>) => {
      p[0] = new StructMemberNode()
      p[0].value = p[1]

      if (p.length === 3) {
        p[0].arraytype = p[2]
      }
    },
  },
  {
    grammar: `struct_specifier: STRUCT ID LBRACE struct_declaration_list RBRACE
                               | STRUCT LBRACE struct_declaration_list RBRACE

 `,
    func: (
      p: P<
        | [StructDeclNode, string, string, string, ASTNode, string]
        | [StructDeclNode, string, string, ASTNode, string]
      >
    ) => {
      p[0] = new StructDeclNode()

      if (p.length > 5) {
        p[0].value = p[2]
        p[0].push(p[4])
      } else {
        p[0].value = '(anonymous)'
        p[0].push(p[3])
      }

      p.lexer.structs.set(p[0].value, p[0])
    },
  },
  {
    grammar: 'function_prototype_pop_scope: function_prototype',
    func: (p: P<[ASTNode, ASTNode]>) => {
      p[0] = p[1]
      p.lexer.popScope()
    },
  },
  {
    grammar: `declaration: function_prototype_pop_scope SEMI
                          | init_declarator_list SEMI
                          | PRECISION precision_qualifier type_specifier SEMI
                          | type_qualifier ID LBRACE struct_declaration_list RBRACE SEMI
                          | type_qualifier ID LBRACE struct_declaration_list RBRACE ID SEMI
                          | type_qualifier ID LBRACE struct_declaration_list RBRACE ID array_specifier SEMI
                          | type_qualifier SEMI
                          | type_qualifier ID SEMI
                          | type_qualifier ID id_list SEMI

    `,
    func: (
      p: P<
        | [ASTNode, ASTNode, string]
        | [ASTNode, ASTNode, string, string]
        | [ASTNode, string, ASTNode, ASTNode, string]
        | [ASTNode, ASTNode, string, ExprListNode, string]
        | [ASTNode, ASTNode, string, string, ASTNode, string, string]
        | [ASTNode, ASTNode, string, string, ASTNode, string, string, string]
        | [ASTNode, ASTNode, string, string, ASTNode, string, string, ArrayType, string]
      >
    ) => {
      if (p.length === 3) {
        const p1 = p[1]
        if (p1 instanceof InitDeclaratorListNode) {
          const list = new StatementListNode()
          list.noScope = true

          const type = p1[0][0]
          while (p1.length > 0) {
            const child = p1[0]
            p1.remove(child)
            list.push(child)
          }

          for (const n of list) {
            n[0].value = type.value
            n[0].qualifier = type.qualifier
          }

          p[0] = list
        } else {
          p[0] = p1
        }
      } else if (p.length === 5) {
        if (p[1] === 'precision') {
          // Precision declarations are discarded by the JS generator,
          // so we don't need to attach the qualifier/type children.
          p[0] = new PrecisionNode()
        } else {
          const p1 = p[1]
          const p2 = p[2]
          const p3 = p[3]
          if (typeof p1 === 'string' || typeof p2 !== 'string' || typeof p3 === 'string') {
            throw new Error('declaration id_list: unexpected shape')
          }
          const n = new VarDeclNode()
          n.value = p2
          n.push(p1)

          p.lexer.scope.set(n.value, n)

          const list = new StatementListNode()
          list.noScope = true
          list.push(n)
          p[0] = list

          for (const c of p3) {
            const n2 = new VarDeclNode()
            n2.push(n[0])
            n2.value = c.value as string
            p.lexer.scope.set(n2.value, n2)
            list.push(n2)
          }
        }
      } else if (p.length === 7) {
        const n = new StructDeclNode()
        n.value = p[2]
        n.push(p[4])

        p.lexer.structs.set(n.value, n)
        n.qualifier = p[1]
        p[0] = n
      } else if (p.length === 8 || p.length === 9) {
        const n = new StructDeclNode()
        n.value = p[2]
        n.push(p[4])

        p.lexer.structs.set(n.value, n)
        n.qualifier = p[1]

        const n2 = new VarDeclNode()
        n2.push(n)
        n2.value = p[6]

        p.lexer.scope.set(n2.value, n2)

        if (p.length === 9) {
          const arr = p[7]
          arr.type = n[0].type
          const n3 = new VarTypeNode()
          n3.value = arr
          n.replace(n[0], n3)
        }
        p[0] = n2
      } else if (p.length === 4) {
        const decl = new VarDeclNode()
        decl.value = p[2]
        decl.push(p[1])

        p.lexer.scope.set(decl.value, decl)
        p[0] = decl
      } else {
        console.log(p)
        throw new Error('bad p length')
      }
    },
  },
  {
    grammar: `id_list: COMMA ID
                      | id_list COMMA ID`,
    func: (p: P<[ExprListNode, string, string] | [ExprListNode, ExprListNode, string, string]>) => {
      const makeIdent = (name: string): IdentNode => {
        const id = new IdentNode()
        id.value = name
        return id
      }

      if (p.length === 3) {
        p[0] = new ExprListNode()
        p[0].push(makeIdent(p[2]))
      } else {
        p[0] = p[1]
        p[0].push(makeIdent(p[3]))
      }
    },
  },
  {
    grammar: `function_prototype: function_declarator RPAREN`,
    func: (p: P<[FunctionNode, FunctionNode, string]>) => {
      p.lexer.pushScope()

      for (const c of p[1][0]) {
        p.lexer.scope.set(c.value as string, c)
      }

      p[0] = p[1]
    },
  },
  {
    grammar: `function_declarator : function_header
                                   | function_header_with_parameters`,
    func: (p: P<[FunctionNode, FunctionNode]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `function_header_with_parameters : function_header parameter_declaration
                                               | function_header_with_parameters COMMA parameter_declaration`,
    func: (p: P<[FunctionNode, FunctionNode, ASTNode] | [FunctionNode, FunctionNode, string, ASTNode]>) => {
      p[0] = p[1]

      if (p.length === 3) {
        p[0][1].push(p[2])
      } else {
        p[0][1].push(p[3])
      }
    },
  },
  {
    grammar: `function_header: fully_specified_type ID LPAREN`,
    func: (p: P<[FunctionNode, VarType, string, string]>) => {
      p[0] = new FunctionNode()

      const n = new VarTypeNode()
      n.value = p[1]

      p[0].push(n)
      p[0].push(new ExprListNode())
      p[0].value = p[2]
    },
  },
  {
    grammar: `parameter_declarator : type_specifier ID
                                    | type_specifier ID array_specifier`,
    func: (p: P<[VarDeclNode, ASTNode, string] | [VarDeclNode, ASTNode, string, ASTNode]>) => {
      p[0] = new VarDeclNode()
      p[0].push(p[1])
      p[0].value = p[2]

      if (p.length === 4) {
        p[0].push(p[1])
      }
    },
  },
  {
    grammar: `parameter_declaration: type_qualifier parameter_declarator
                                    | parameter_declarator
                                    | type_qualifier parameter_type_specifier
                                    | parameter_type_specifier
 `,
    func: (p: P<[ASTNode, ASTNode] | [ASTNode, ASTNode, ASTNode]>) => {
      if (p.length === 2) {
        p[0] = p[1]
      } else {
        p[0] = p[2]
        p[0].qualifier = p[1]
      }
    },
  },
  {
    grammar: `parameter_type_specifier : type_specifier`,
    func: (p: P<[ASTNode, ASTNode]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `init_declarator_list : single_declaration
                                    | init_declarator_list COMMA ID
                                    | init_declarator_list COMMA ID array_specifier
                                    | init_declarator_list COMMA ID array_specifier ASSIGN initializer
                                    | init_declarator_list COMMA ID ASSIGN initializer

`,
    func: (
      p: P<
        | [InitDeclaratorListNode, ASTNode]
        | [InitDeclaratorListNode, InitDeclaratorListNode, string, string]
        | [InitDeclaratorListNode, InitDeclaratorListNode, string, string, ArrayType]
        | [InitDeclaratorListNode, InitDeclaratorListNode, string, string, string, ASTNode]
        | [InitDeclaratorListNode, InitDeclaratorListNode, string, string, ArrayType, string, ASTNode]
      >
    ) => {
      if (p.length === 2) {
        p[0] = new InitDeclaratorListNode() //parent production will turn this into a StatementList
        p[0].push(p[1])
        p[0].noScope = true
      } else if (p.length === 4) {
        const n = new VarDeclNode()
        n.push(new VarTypeNode()) //will be initialized later
        n.value = p[3]

        p[0] = p[1]
        p[0].push(n)
      } else if (p.length === 5) {
        p[0] = p[1]
        const n = new VarDeclNode()
        n.push(p[4])
        n.value = p[3]
        p[0].push(n)
      } else if (p.length === 6) {
        p[0] = p[1]
        const n = new VarDeclNode()
        n.push(new VarTypeNode()) //will be initialized later
        n.value = p[3]
        n.push(p[5])
        p[0].push(n)
      } else if (p.length === 7) {
        p[0] = p[1]
        const n = new VarDeclNode()
        n.push(p[4])
        n.value = p[3]
        n.push(p[5])
        p[0].push(n)
      }
    },
  },
  {
    grammar: `single_declaration : fully_specified_type
                                  | fully_specified_type ID
                                  | fully_specified_type ID array_specifier ASSIGN initializer
                                  | fully_specified_type ID array_specifier
                                  | fully_specified_type ID ASSIGN initializer 

 `,
    func: (
      p: P<
        | [ASTNode, ASTNode]
        | [VarDeclNode, ASTNode, string]
        | [VarDeclNode, ASTNode, string, ArrayType]
        | [VarDeclNode, ASTNode, string, string, ASTNode]
        | [VarDeclNode, ASTNode, string, ArrayType, string, ASTNode]
      >
    ) => {
      if (p.length === 2) {
        p[0] = p[1]
        return
      }

      const decl = new VarDeclNode()
      decl.value = p[2]

      const type = p[1]
      if (type instanceof IdentNode) {
        const n = new VarTypeNode()
        n.value = new VarType(type.value)
        decl.push(n)
      } else {
        decl.push(type)
      }

      if (p.length === 4) {
        decl.arraytype = p[3]
      } else if (p.length === 5) {
        decl.push(p[4])
      } else if (p.length === 6) {
        decl.arraytype = p[3]
        decl.push(p[5])
      }
      p[0] = decl
    },
  },
  {
    grammar: `fully_specified_type : type_specifier
                                    | type_qualifier type_specifier`,
    func: (p: P<[ASTNode, ASTNode] | [ASTNode, ASTNode, ASTNode]>) => {
      if (p.length === 2) {
        p[0] = p[1]
      } else {
        p[0] = p[2]
        p[0].qualifier = p[1]
      }
    },
  },
  {
    grammar: `invariant_qualifier : INVARIANT`,
    func: (p: P<[string, string]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `interpolation_qualifier : SMOOTH
                                       | FLAT
                                       | NOPERSPECTIVE
                                       `,
    func: (p: P<[string, string]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `layout_qualifier : LAYOUT LPAREN layout_qualifier_id_list RPAREN`,
    func: (p: P<[ASTNode, string, string, ASTNode, string]>) => {
      p[0] = new LayoutQualifierNode()
      p[0].push(p[3])
    },
  },
  {
    grammar: `layout_qualifier_id_list : layout_qualifier_id
                                        | layout_qualifier_id_list COMMA layout_qualifier_id
                                        `,
    func: (p: P<[ExprListNode, ASTNode] | [ExprListNode, ExprListNode, string, ASTNode]>) => {
      if (p.length === 2) {
        p[0] = new ExprListNode()
        p[0].push(p[1])
      } else {
        p[0] = p[1]
        p[0].push(p[3])
      }
    },
  },
  {
    grammar: `layout_qualifier_id : ID
                                   | ID ASSIGN constant_expression
                                   | SHARED`,
    func: (p: P<[LayoutQualifierIdNode, string] | [LayoutQualifierIdNode, string, string, ASTNode]>) => {
      p[0] = new LayoutQualifierIdNode()

      if (p.length === 2) {
        p[0].value = p[1]
      } else {
        p[0].value = p[1]
        p[0].push(p[3])
      }
    },
  },
  {
    grammar: `precise_qualifier : PRECISE`,
    func: (p: P<[string, string]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `type_qualifier : single_type_qualifier
                              | type_qualifier single_type_qualifier`,
    func: (
      p: P<
        | [ASTNode, ASTNode | string]
        | [ASTNode, ASTNode, ASTNode | string]
      >
    ) => {
      if (p.length === 2) {
        const v = p[1]
        if (typeof v === 'string') {
          const n = new TypeQualifierNode()
          n.value = v
          p[0] = n
        } else {
          p[0] = v
        }
      } else {
        const v = p[2]
        let n2: ASTNode
        if (typeof v === 'string') {
          n2 = new TypeQualifierNode()
          n2.value = v
        } else {
          n2 = v
        }
        n2.qualifier = p[1]
        p[0] = n2
      }
    },
  },
  {
    grammar: `single_type_qualifier: storage_qualifier
                                    | storage_qualifier
                                    | layout_qualifier
                                    | precision_qualifier
                                    | interpolation_qualifier
                                    | invariant_qualifier
                                    | precise_qualifier
                                     `,
    func: (p: P<[ASTNode | string, ASTNode | string]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `storage_qualifier: CONST
                                | INOUT
                                | IN
                                | OUT
                                | CENTROID
                                | PATCH
                                | SAMPLE
                                | UNIFORM
                                | BUFFER
                                | SHARED
                                | COHERENT
                                | VOLATILE
                                | RESTRICT
                                | READONLY
                                | WRITEONLY
                                | SUBROUTINE
                                | SUBROUTINE LPAREN type_name_list RPAREN
    `,
    func: (
      p: P<[ASTNode | string, string] | [SubroutineQualifierNode, string, string, ASTNode, string]>
    ) => {
      if (p.length === 5) {
        const n = new SubroutineQualifierNode()
        n.push(p[3])
        p[0] = n
      } else {
        p[0] = p[1]
      }
    },
  },
  {
    grammar: `type_name_list: type_name
                             | type_name_list COMMA type_name
                             `,
    func: (p: P<[ExprListNode, string] | [ExprListNode, ExprListNode, string, string]>) => {
      if (p.length === 2) {
        const list = new ExprListNode()
        const n = new IdentNode()
        n.value = p[1]
        list.push(n)
        p[0] = list
      } else {
        p[0] = p[1]
        const n = new IdentNode()
        n.value = p[3]
        p[0].push(n)
      }
    },
  },
  {
    grammar: `precision_qualifier: HIGH_PRECISION
                                  | MEDIUM_PRECISION
                                  | LOW_PRECISION
    `,
    func: (p: P<[string, string]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `initializer: assignment_expression
                          | LBRACE initializer_list RBRACE
                          | LBRACE initializer_list COMMA RBRACE

 `,
    func: (
      p: P<
        | [ExprListNode, ASTNode]
        | [ASTNode, string, ASTNode, string]
        | [ASTNode, string, ASTNode, string, string]
      >
    ) => {
      if (p.length === 2) {
        const list = new ExprListNode()
        list.push(p[1])
        p[0] = list
      } else {
        p[0] = p[2]
      }
    },
  },
  {
    grammar: `initializer_list: initializer
                               | initializer_list COMMA initializer`,
    func: (p: P<[ExprListNode, ASTNode] | [ExprListNode, ExprListNode, string, ASTNode]>) => {
      if (p.length === 2) {
        const list = new ExprListNode()
        list.push(p[1])
        p[0] = list
      } else {
        p[0] = p[1]
        p[0].push(p[3])
      }
    },
  },
  {
    grammar: `declaration_statement: declaration`,
    func: (p: P<[ASTNode, ASTNode]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `statement: compound_statement
                        | simple_statement
              `,
    func: (p: P<[ASTNode, ASTNode]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `simple_statement: declaration_statement
                               | expression_statement
                               | selection_statement
                               | switch_statement
                               | case_label
                               | iteration_statement
                               | jump_statement
`,

    func: (p: P<[ASTNode, ASTNode]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `compound_statement: LBRACE RBRACE
                                 | LBRACE statement_list RBRACE `,
    func: (p: P<[ASTNode, string, string] | [ASTNode, string, ASTNode, string]>) => {
      if (p.length === 3) {
        p[0] = new ExprNode()
      } else {
        p[0] = p[2]
      }
    },
  },
  {
    grammar: `statement_no_new_scope: compound_statement_no_new_scope
                                     | simple_statement
    `,
    func: (p: P<[ASTNode, ASTNode]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `compound_statement_no_new_scope: LBRACE RBRACE
                                              | LBRACE statement_list RBRACE`,
    func: (p: P<[ASTNode, string, string] | [ASTNode, string, ASTNode, string]>) => {
      if (p.length === 3) {
        p[0] = new ExprListNode()
      } else {
        const list = p[2]
        list.noScope = true
        p[0] = list
      }
    },
  },
  {
    grammar: `statement_list: statement
                             | statement_list statement
              `,
    func: (p: P<[StatementListNode, ASTNode] | [StatementListNode, StatementListNode, ASTNode]>) => {
      if (p.length === 2) {
        const list = new StatementListNode()
        if (p[1]) {
          list.push(p[1])
        }
        p[0] = list
      } else {
        p[0] = p[1]
        if (p[2]) {
          p[0].push(p[2])
        }
      }
    },
  },
  {
    grammar: `expression_statement: SEMI
                                   | expression SEMI`,
    func: (p: P<[ASTNode, string] | [ASTNode, ASTNode, string]>) => {
      if (p.length === 2) {
        p[0] = new ExprNode()
      } else {
        p[0] = p[1]
      }
    },
  },
  {
    grammar: `selection_statement: IF LPAREN expression RPAREN selection_rest_statement `,
    func: (p: P<[IfNode, string, string, ASTNode, string, ASTNode]>) => {
      const n = new IfNode()
      n.push(p[3])
      n.push(p[5])
      p[0] = n
    },
  },
  {
    grammar: `selection_rest_statement: statement ELSE statement
                                       | statement `,
    func: (p: P<[ASTNode, ASTNode] | [ElseNode, ASTNode, string, ASTNode]>) => {
      if (p.length === 2) {
        p[0] = p[1]
      } else {
        const n = new ElseNode()
        n.push(p[1])
        n.push(p[3])
        p[0] = n
      }
    },
  },
  {
    grammar: `condition: expression
                        | fully_specified_type ID ASSIGN initializer `,
    func: (p: P<[ASTNode, ASTNode] | [ConditionNode, ASTNode, string, string, ASTNode]>) => {
      if (p.length === 2) {
        p[0] = p[1]
      } else {
        const n = new ConditionNode()
        n.push(p[1])
        n.value = p[2]
        n.push(p[4])
        p[0] = n
      }
    },
  },
  {
    grammar: `switch_statement: SWITCH LPAREN expression RPAREN LBRACE switch_statement_list RBRACE`,
    func: (p: P<[SwitchNode, string, string, ASTNode, string, string, ASTNode, string]>) => {
      const n = new SwitchNode()
      n.push(p[3])
      n.push(p[6])
      p[0] = n
    },
  },
  {
    grammar: `switch_statement_list:
                                    | statement_list`,
    func: (p: P<[ASTNode] | [ASTNode, ASTNode]>) => {
      if (p.length === 2) {
        p[0] = p[1]
      } else if (p.length === 1) {
        p[0] = new StatementListNode()
      }
    },
  },
  {
    grammar: `case_label: CASE expression COLON
                         | DEFAULT COLON`,
    func: (p: P<[DefaultCaseNode, string, string] | [CaseLabelNode, string, ASTNode, string]>) => {
      if (p.length === 3) {
        p[0] = new DefaultCaseNode()
      } else {
        const n = new CaseLabelNode()
        n.push(p[2])
        p[0] = n
      }
    },
  },
  {
    grammar: `iteration_statement: WHILE LPAREN condition RPAREN statement_no_new_scope
                                  | DO statement WHILE LPAREN expression RPAREN SEMI
                                  | FOR LPAREN for_init_statement for_rest_statement RPAREN statement_no_new_scope`,
    func: (
      p: P<
        | [WhileNode, string, string, ASTNode, string, ASTNode]
        | [DoWhileNode, string, ASTNode, string, string, ASTNode, string, string]
        | [ForLoopNode, string, string, ASTNode, ASTNode, string, ASTNode]
      >
    ) => {
      if (p.length === 6) {
        const n = new WhileNode()
        n.push(p[3])
        n.push(p[5])
        p[0] = n
      } else if (p.length === 8) {
        const n = new DoWhileNode()
        n.push(p[2])
        n.push(p[5])
        p[0] = n
      } else {
        const n = new ForLoopNode()
        n.push(p[3])
        n.push(p[4])
        n.push(p[6])
        p[0] = n
      }
    },
  },
  {
    grammar: `for_init_statement: expression_statement
                                 | declaration_statement
              `,
    func: (p: P<[ASTNode, ASTNode]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `conditionopt : condition
                            |
              `,
    func: (p: P<[ASTNode] | [ASTNode, ASTNode]>) => {
      if (p.length === 2) {
        p[0] = p[1]
      } else {
        p[0] = new ExprNode()
      }
    },
  },
  {
    grammar: `for_rest_statement: conditionopt SEMI
                                 | conditionopt SEMI expression
              `,
    func: (p: P<[ExprListNode, ASTNode, string] | [ExprListNode, ASTNode, string, ASTNode]>) => {
      const list = new ExprListNode()

      if (p.length === 3) {
        list.push(p[1])
        list.push(new ExprNode())
      } else {
        list.push(p[1])
        list.push(p[3])
      }
      p[0] = list
    },
  },
  {
    grammar: `jump_statement: CONTINUE SEMI
                             | BREAK SEMI
                             | RETURN SEMI
                             | RETURN expression SEMI
                             | DISCARD SEMI /~ Fragment shader only ~/
                             `,
    func: (p: P<[ASTNode, string, string] | [ASTNode, string, ASTNode, string]>) => {
      if (p.length === 4) {
        const n = new ReturnNode()
        n.push(p[2])
        p[0] = n
      } else if (p[1] === 'continue') {
        p[0] = new ContinueNode()
      } else if (p[1] === 'break') {
        p[0] = new BreakNode()
      } else if (p[1] === 'return') {
        p[0] = new ReturnNode()
      } else if (p[1] === 'discard') {
        p[0] = new DiscardNode()
      }
    },
  },
  {
    grammar: `external_declaration: function_definition
                                   | declaration
              `,
    func: (p: P<[ASTNode, ASTNode]>) => {
      p[0] = p[1]
    },
  },
  {
    grammar: `function_definition: function_prototype compound_statement_no_new_scope`,
    func: (p: P<[ASTNode, ASTNode, ASTNode]>) => {
      p[0] = p[1]

      p.lexer.popScope()
      p[0].push(p[2])
    },
  },
  {
    grammar: `translation_unit: external_declaration
                               | translation_unit external_declaration
`,
    func: (p: P<[ProgramNode, ASTNode] | [ProgramNode, ProgramNode, ASTNode]>) => {
      if (p.length === 2) {
        const prog = new ProgramNode()
        if (p[1]) {
          prog.push(p[1])
        }
        p[0] = prog
      } else {
        p[0] = p[1]
        if (p[2]) {
          p[0].push(p[2])
        }
      }
    },
  },
]

let tokens = new Set(['FIELD_SELECTION', 'TYPE_NAME'])
for (let key of keywords) {
  tokens.add(key)
}
for (let tk of tokendef) {
  tokens.add(tk.name)
}

const tokensArr: string[] = []
for (let token of tokens) {
  tokensArr.push(token)
}

//export let parser = jscc_util.getParser(lex, parsedef, tokens, precedence, "glsl");
let parser: ReturnType<typeof jscc_util.getParser<GLSLLexer>> | undefined
export {parser}

export function getParser(): ReturnType<typeof jscc_util.getParser<GLSLLexer>> {
  if (!parser) {
    parser = jscc_util.getParser(lex, parsedef as unknown as ParseDefItem<GLSLLexer>[], tokensArr, precedence, 'glsl')
  }

  return parser
}

export function initParser(): void {
  getParser()
}

export function rebuildParser(): ReturnType<typeof jscc_util.getParser<GLSLLexer>> {
  return jscc_util.getParser(lex, parsedef as unknown as ParseDefItem<GLSLLexer>[], tokensArr, precedence, 'glsl', true)
}

type VisitCallback = (n: ASTNode) => void
type VisitHandler = (n: ASTNode) => void
type VisitHandlers = Map<string, VisitHandler>
type ControlledHandler = (
  n: ASTNode,
  state: unknown,
  descend: (n: ASTNode, state: unknown, do_n?: boolean) => void
) => void
type ControlledHandlers = Map<string, ControlledHandler>

export function fullVisit(ast: ASTNode, cb: VisitCallback): void {
  function visit(n: ASTNode): void {
    cb(n)

    for (const c of n) {
      visit(c)
    }
  }

  visit(ast)
}

export function visit(ast: ASTNode, handlers: VisitHandlers | VisitCallback): void {
  if (typeof handlers === 'function') {
    fullVisit(ast, handlers)
    return
  }

  const hs: VisitHandlers = handlers

  function visitInner(n: ASTNode | string): void {
    let node: ASTNode
    if (typeof n === 'string') {
      const n2 = new IdentNode()
      n2.value = n
      node = n2
    } else {
      node = n
    }

    const type = node.type
    const handler = hs.get(type)
    if (handler) {
      handler(node)
    } else {
      const def = hs.get('Default')
      if (def) {
        def(node)
      }
    }

    for (const c of node) {
      visitInner(c)
    }
  }

  visitInner(ast)
}

export function controlledVisit(ast: ASTNode, handlers: ControlledHandlers, state: unknown): void {
  function descend(n: ASTNode, state: unknown, do_n = false): void {
    if (state === undefined) {
      throw new Error('state cannot be undefined; use null if intentional')
    }

    if (do_n) {
      visitInner(n, state)
      return
    }

    for (const c of n) {
      visitInner(c, state)
    }
  }

  function visitInner(n: ASTNode | string, state: unknown): void {
    let node: ASTNode
    if (typeof n === 'string') {
      const n2 = new IdentNode()
      n2.value = n
      node = n2
    } else {
      node = n
    }

    const handler = handlers.get(node.type)
    if (handler) {
      handler(node, state, descend)
    } else {
      const def = handlers.get('Default')
      if (def) {
        def(node, state, descend)
      }
    }
  }

  visitInner(ast, state)
}
