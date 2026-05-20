interface JsccModule {
  require(path: string): unknown
}

declare global {
  var jscc: JsccModule
}

declare const _default: JsccModule
export default _default
