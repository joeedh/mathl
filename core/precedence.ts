type Assoc = 'left' | 'right' | 'nonassoc'

const precedence: [Assoc, ...string[]][] = [
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

const opmap = new Map<string, string>([
  ['TIMES', '*'],
  ['DIV', '/'],
  ['MOD', '%'],
  ['PLUS', '+'],
  ['MINUS', '-'],
  ['GTHAN', '>'],
  ['LTHAN', '<'],
  ['GEQUALS', '>='],
  ['LEQUALTS', '<='],
  ['NEQUALS', '!='],
  ['EQUALS', '=='],
  ['ASSIGN', '='],
  ['MUL_ASSIGN', '*='],
  ['DIV_ASSIGN', '/='],
  ['PLUS_ASSIGN', '+='],
  ['MOD_ASSIGN', '%='],
  ['OR_ASSIGN', '|='],
  ['AND_ASSIGN', '&='],
  ['LEFT_ASSIGN', '<<='],
  ['RIGHT_ASSIGN', '>>='],
  ['XOR_ASSIGN', '^='],
  ['MINUS_ASSIGN', '-='],
  ['XOR', '^'],
  ['BITOR', '|'],
  ['LAND', '&&'],
  ['LOR', '||'],
  ['LXOR', '^^'],
  ['BITAND', '&'],
  ['BITINV', '~'],
  ['LSHIFT', '<<'],
  ['RSHIFT', '>>'],
  ['INC', '++'],
  ['DEC', '--'],
  ['DOT', '.'],
])

export interface PrecEntry {
  prec: number
  assoc: Assoc
}

export const Precedence = new Map<string, PrecEntry>()
let pi = 0
for (let row of precedence) {
  for (let key of row.slice(1)) {
    const op = opmap.get(key as string)
    if (op !== undefined) {
      Precedence.set(op, {prec: pi, assoc: row[0]})
    }
  }
  pi++
}
