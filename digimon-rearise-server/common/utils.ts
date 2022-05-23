import stream from "stream";

export class XorStream extends stream.Transform {
    #offset: number
    // key0: number
    // key1: number
    // key2: number
    // key3: number
    // key4: number
    // key5: number
    // key6: number
    // key7: number
    constructor(readonly key: Buffer) {
        super()
        // if (key.length !== 32)
        // 	throw new Error('XorStream requires a key exactly 32 bytes long')
        this.#offset = 0
        // this.key0 = key.readInt32BE(0)
        // this.key1 = key.readInt32BE(4)
        // this.key2 = key.readInt32BE(8)
        // this.key3 = key.readInt32BE(12)
        // this.key4 = key.readInt32BE(16)
        // this.key5 = key.readInt32BE(20)
        // this.key6 = key.readInt32BE(24)
        // this.key7 = key.readInt32BE(28)
    }
    override _transform(chunk: any, encoding: BufferEncoding, callback: stream.TransformCallback): void {
        // const leadingBytes = this.#offset ? Math.min(32 - this.#offset, chunk.length) : 0
        // for (let i = 0; i < leadingBytes; i++)
        for (let i = 0, n = chunk.length; i < n; i++, this.#offset++)
            chunk.writeUInt8(chunk.readUInt8(i) ^ this.key.readUInt8(this.#offset %= this.key.length), i)
        // switch ((chunk.length - leadingBytes) / 4 | 0)
        // for (let i = 0, n = chunk.length - 3; i < n; i += 4) {
        // 	chunk.writeInt32BE(chunk.readInt32BE(i) ^ key.readInt32BE())
        // }
        callback(null, chunk)
    }
}

export function formatDate(date: Date | number = Date.now()) {
    if (date instanceof Date)
        date = date.getTime()
    const jstDateAsFakeUtc = new Date(date + 32400000)
    return jstDateAsFakeUtc.toISOString().replace(/\..*/, '+09:00')
}

export function shuffleInPlace<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.random() * (i + 1) | 0
        ;[array[i], array[j]] = [array[j]!, array[i]!]
    }
    return array
}