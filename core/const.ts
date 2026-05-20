export default {
  VERSION: [0, 0, 1] as [number, number, number],
  getVersion(): number {
    let v = this.VERSION
    let dimen = 16

    return v[0] * dimen * dimen + v[1] * dimen + v[2]
  },
}
