declare const LZString: {
  compressToBase64(input: string): string
  decompressFromBase64(input: string): string
  compress(input: string): string
  decompress(input: string): string
  compressToUTF16(input: string): string
  decompressFromUTF16(input: string): string
  compressToUint8Array(input: string): Uint8Array
  decompressFromUint8Array(input: Uint8Array): string
  compressToEncodedURIComponent(input: string): string
  decompressFromEncodedURIComponent(input: string): string
}

export default LZString
