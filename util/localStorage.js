let localStorage_
let nodefs

const Cmds = {
  LOADJSON: 0,
  GETITEM : 1,
  SETITEM : 2,
  DELETE  : 3,
  SAVEJSON: 4,
}

class LocalStorageNode {
  queue = []
  filePath = './localStorage.json'
  json = undefined
  #timer = undefined
  onFlush = []

  constructor() {
    //
  }

  start() {
    this.pushCommand([Cmds.LOADJSON])
  }

  pushCommand(cmd) {
    this.queue.push(cmd)
    this.flushQueueLater()
  }

  get(key) {
    return new Promise((accept, reject) => {
      this.queue.push([Cmds.GETITEM, key, accept, reject])
    })
  }

  set(key, value) {
    return new Promise((accept, reject) => {
      this.queue.push([Cmds.SETITEM, key, value, accept, reject])
    })
  }

  #delete(key) {
    delete this.json[key]
    this.#saveJSON()
  }

  delete(key) {
    return new Promise((accept, reject) => {
      this.queue.push([Cmds.DELETE, key, accept, reject])
    })
  }
  createProxy() {
    return new Proxy(
      {},
      {
        get: (target, key) => {
          return this.json[key]
        },
        set: (target, key, value) => {
          // set json immediately
          this.json[key] = value
          this.set(key, value)
          return true
        },
        has: (target, key) => {
          return key in this.json
        },
        deleteProperty: (target, key) => {
          delete this.json[key]
          this.delete(key)
          return true
        },
        ownKeys: (target) => {
          return Object.keys(this.json)
        },
      }
    )
  }
  flushQueueLater() {
    return new Promise((accept, reject) => {
      if (this.#timer === undefined) {
        this.#timer = setTimeout(() => {
          this.#timer = undefined
          this.flushQueue()
        }, 50)
      }
      this.onFlush.push([accept, reject])
    })
  }

  #loadJSON() {
    let buf

    try {
      buf = nodefs.readFileSync(this.filePath, 'utf8')
    } catch (e) {
      console.log(e.message)
      buf = '{}'
    }
    this.json = JSON.parse(buf)
  }

  #saveJSON() {
    nodefs.writeFileSync(this.filePath, JSON.stringify(this.json))
  }

  flushQueue() {
    if (nodefs === undefined) {
      this.flushQueueLater()
      return
    }

    const queue = this.queue
    this.queue = []

    for (const cmd of queue) {
      switch (cmd[0]) {
        case Cmds.GETITEM:
          try {
            cmd[2](this.json[cmd[1]])
          } catch (e) {
            cmd[3](e)
          }
          break
        case Cmds.SETITEM:
          try {
            this.json[cmd[1]] = cmd[2]
            this.#saveJSON()
            cmd[3](this.json[cmd[1]])
          } catch (e) {
            cmd[4](e)
          }
          break
        case Cmds.SAVEJSON:
          this.#saveJSON()
          break
        case Cmds.LOADJSON:
          this.#loadJSON()
          break
        case Cmds.DELETE:
          try {
            this.#delete(cmd[1])
            cmd[2]()
          } catch (e) {
            cmd[3](e)
          }
          break
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

let haveNodeLS = false
let LS = undefined

if (globalThis.haveElectron) {
  // we are running inside electronjs

  // hack to prevent bundlers from messing with require call
  const rstr = 'require'
  const reqAny = globalThis[rstr]
  const fs = reqAny('fs')

  LS = new LocalStorageNode()
  LS.start()
  localStorage_ = LS.createProxy()
  haveNodeLS = true
} else if (globalThis.INSIDE_JEST || typeof globalThis.process !== 'undefined') {
  import('fs').then((mod) => {
    nodefs = mod
  })
  LS = new LocalStorageNode()
  LS.start()
  localStorage_ = LS.createProxy()
  haveNodeLS = true
} else {
  localStorage_ = globalThis.localStorage
}

export const localStorage = localStorage_
export async function onLSFlush() {
  if (haveNodeLS) {
    return LS.flushQueueLater()
  }
}

export async function onLSStart() {
  if (haveNodeLS) {
    return LS.flushQueueLater()
  }
}
