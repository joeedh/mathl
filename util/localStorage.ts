type FsModule = typeof import('fs')

const Cmds = {
  LOADJSON: 0,
  GETITEM : 1,
  SETITEM : 2,
  DELETE  : 3,
  SAVEJSON: 4,
} as const

type CmdLoad = readonly [typeof Cmds.LOADJSON]
type CmdGet = readonly [typeof Cmds.GETITEM, string, (val: unknown) => void, (err: unknown) => void]
type CmdSet = readonly [typeof Cmds.SETITEM, string, unknown, (val: unknown) => void, (err: unknown) => void]
type CmdDelete = readonly [typeof Cmds.DELETE, string, () => void, (err: unknown) => void]
type CmdSave = readonly [typeof Cmds.SAVEJSON]
type Cmd = CmdLoad | CmdGet | CmdSet | CmdDelete | CmdSave

let nodefs: FsModule | undefined

class LocalStorageNode {
  queue: Cmd[] = []
  filePath = './localStorage.json'
  json: Map<string, unknown> = new Map()
  #timer: ReturnType<typeof setTimeout> | undefined = undefined
  onFlush: [(v?: unknown) => void, (e: unknown) => void][] = []

  start(): void {
    this.pushCommand([Cmds.LOADJSON])
  }

  pushCommand(cmd: Cmd): void {
    this.queue.push(cmd)
    this.flushQueueLater()
  }

  get(key: string): Promise<unknown> {
    return new Promise<unknown>((accept, reject) => {
      this.queue.push([Cmds.GETITEM, key, accept, reject])
    })
  }

  set(key: string, value: unknown): Promise<unknown> {
    return new Promise<unknown>((accept, reject) => {
      this.queue.push([Cmds.SETITEM, key, value, accept, reject])
      this.flushQueueLater()
    })
  }

  #delete(key: string): void {
    this.json.delete(key)
    this.#saveJSON()
  }

  delete(key: string): Promise<void> {
    return new Promise<void>((accept, reject) => {
      this.queue.push([Cmds.DELETE, key, accept, reject])
    })
  }

  flushQueueLater(): Promise<void> {
    return new Promise<void>((accept, reject) => {
      if (this.#timer === undefined) {
        this.#timer = setTimeout(() => {
          this.#timer = undefined
          this.flushQueue()
        }, 50)
      }
      this.onFlush.push([accept as (v?: unknown) => void, reject])
    })
  }

  #loadJSON(): void {
    let buf: string

    try {
      buf = nodefs!.readFileSync(this.filePath, 'utf8')
    } catch (e) {
      console.log((e as Error).message, 'file will be auto-created')
      buf = '{}'
    }
    const parsed = JSON.parse(buf) as object
    this.json.clear()
    for (const [k, v] of Object.entries(parsed)) {
      this.json.set(k, v)
    }
  }

  #saveJSON(): void {
    nodefs!.writeFileSync(this.filePath, JSON.stringify(Object.fromEntries(this.json)))
  }

  flushQueue(): void {
    if (nodefs === undefined) {
      this.flushQueueLater()
      return
    }

    const queue = this.queue
    this.queue = []

    for (const cmd of queue) {
      switch (cmd[0]) {
        case Cmds.GETITEM: {
          const [, key, accept, reject] = cmd
          try {
            accept(this.json.get(key))
          } catch (e) {
            reject(e)
          }
          break
        }
        case Cmds.SETITEM: {
          const [, key, value, accept, reject] = cmd
          try {
            this.json.set(key, value)
            this.#saveJSON()
            accept(this.json.get(key))
          } catch (e) {
            reject(e)
          }
          break
        }
        case Cmds.SAVEJSON:
          this.#saveJSON()
          break
        case Cmds.LOADJSON:
          this.#loadJSON()
          break
        case Cmds.DELETE: {
          const [, key, accept, reject] = cmd
          try {
            this.#delete(key)
            accept()
          } catch (e) {
            reject(e)
          }
          break
        }
      }
    }
    const onFlush = this.onFlush
    this.onFlush = []
    for (const [accept, reject] of onFlush) {
      try {
        accept()
      } catch (e) {
        reject(e)
      }
    }
  }
}

export interface LocalStorage {
  getItem(key: string): unknown
  setItem(key: string, value: unknown): void
  removeItem(key: string): void
  has(key: string): boolean
}

class NodeLocalStorage implements LocalStorage {
  constructor(private impl: LocalStorageNode) {}

  getItem(key: string): unknown {
    return this.impl.json.get(key)
  }

  setItem(key: string, value: unknown): void {
    this.impl.json.set(key, value)
    this.impl.set(key, value)
  }

  removeItem(key: string): void {
    this.impl.json.delete(key)
    this.impl.delete(key)
  }

  has(key: string): boolean {
    return this.impl.json.has(key)
  }
}

class BrowserLocalStorage implements LocalStorage {
  getItem(key: string): unknown {
    return globalThis.localStorage.getItem(key)
  }

  setItem(key: string, value: unknown): void {
    const str = typeof value === 'string' ? value : JSON.stringify(value)
    globalThis.localStorage.setItem(key, str)
  }

  removeItem(key: string): void {
    globalThis.localStorage.removeItem(key)
  }

  has(key: string): boolean {
    return globalThis.localStorage.getItem(key) !== null
  }
}

let haveNodeLS = false
let LS: LocalStorageNode | undefined = undefined
let localStorage_: LocalStorage

if (globalThis.haveElectron) {
  // running inside electronjs - bypass bundler-aware require
  const rstr = 'require'
  const reqAny = (globalThis as unknown as {[k: string]: unknown})[rstr] as (mod: string) => unknown
  nodefs = reqAny('fs') as FsModule

  LS = new LocalStorageNode()
  LS.start()
  localStorage_ = new NodeLocalStorage(LS)
  haveNodeLS = true
} else if (!globalThis.haveNwjs && (globalThis.INSIDE_JEST || typeof globalThis.process !== 'undefined')) {
  import('fs').then((mod) => {
    nodefs = mod
  })
  LS = new LocalStorageNode()
  LS.start()
  localStorage_ = new NodeLocalStorage(LS)
  haveNodeLS = true
} else {
  localStorage_ = new BrowserLocalStorage()
}

// avoid bug in esbuild bundler overriding
// window.localStorage
export const mathlLocalStorage: LocalStorage = localStorage_

export async function onLSFlush(): Promise<void> {
  if (haveNodeLS && LS) {
    return LS.flushQueueLater()
  }
}

export async function onLSStart(): Promise<void> {
  if (haveNodeLS && LS) {
    return LS.flushQueueLater()
  }
}
