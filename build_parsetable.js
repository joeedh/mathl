import fs from 'fs'
import * as esbuild from 'esbuild'
import {pathToFileURL} from 'url'
import path from 'path'

const outFile = path.resolve('./.tmp_build_parsetable.mjs')

await esbuild.build({
  entryPoints: [path.resolve('./parser/parser.ts')],
  outfile: outFile,
  bundle: true,
  format: 'esm',
  platform: 'node',
  sourcemap: false,
  logLevel: 'warning',
  external: ['fs'],
  keepNames: true,
})

const mod = await import(pathToFileURL(outFile).href)
const parser = mod.rebuildParser()
const data = parser.save()

const tsOut = `/* WARNING: auto-generated file! */
export const parsetable =
  '${data}'
`

fs.writeFileSync('parser/parsetab.ts', tsOut)
fs.unlinkSync(outFile)

console.log('Wrote parser/parsetab.ts (' + (tsOut.length / 1024).toFixed(2) + 'KB)')
