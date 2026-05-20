# mathl

GLSL/shader-like language compiler. Currently being ported from JavaScript to TypeScript.

## Build

- `pnpm build` - transpile with esbuild
- `pnpm typecheck` - typecheck (tsgo --noEmit)
- `pnpm format` - format

## Port constraints

- **No `any`, `Record<K,V>`, or mapped types.** Stop and ask before introducing any of these.
- Use `Map<K,V>` for dynamic-keyed dictionaries (not plain objects, not `Record`).
- Tighten public types where possible — replace `{[k:string]: ValueType}` with concrete shapes.
- Single quotes, no semicolons, no single-line control blocks.
- Use `git mv` for file renames (per AGENTS.md).
- Typecheck with `npx tsgo --noEmit`, not `tsc`.

## Files that stay JavaScript

- `util/nstructjs_es6.js` — leave as-is per user directive.
- `util/polyfill.js` — JS source, has `polyfill.d.ts` ambient declarations alongside.
- `util/lzstring.js`, `util/jscc.js` — vendor code; have `.d.ts` shims.

## New util/ APIs after the port

- `util/localStorage.ts` no longer supports `localStorage[key] = value` indexer access.
  Use the explicit interface: `getItem(key)`, `setItem(key, value)`, `removeItem(key)`,
  `has(key)`. Callers in `core/mathl.js` and `tests/localStorageEmu.test.ts` need
  updating.
- `util/util.ts` was slimmed — removed `MovingAvg`, `MersenneRandom`, `random`, `seed`,
  `cachering`, `SetIter`, `set`, `map`, `MapIter`, `IDMap`, `getClassParent`,
  `getAllKeys`, `btoa`, `atob`, `time_ms`, `color2css`, `print_stack`. If something
  needs one of these, restore it deliberately rather than reaching for a copy.
- `HashDigest.add(v)` takes a number. For strings, use `HashDigest.addString(s)`.
  (`core/mathl.js` currently calls `digest.add(libraryCode)` with a string — fix to
  `addString` when porting that file.)

## Port progress

- [x] util/ — done
- [ ] parser/
- [ ] core/
- [ ] transform/
- [ ] generators/
