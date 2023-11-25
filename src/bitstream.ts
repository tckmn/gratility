export default class BitStream {

    private bytepos: number = 0;
    private bitsleft: number = 8;

    private constructor(private arr: Uint8Array) {}

    public static fromArr(arr: Uint8Array) { return new BitStream(arr); }
    public static fromLen(len: number) { return new BitStream(new Uint8Array(len)); }
    public static empty() { return new BitStream(new Uint8Array(1024)); }

    public read(len: number): number {
        let val = 0;

        // read chunks of bits that advance the byte pointer
        while (len >= this.bitsleft) {
            val |= (this.arr[this.bytepos++] & ((1 << this.bitsleft) - 1)) << (len -= this.bitsleft);
            this.bitsleft = 8;
        }

        // read the last chunk
        val |= (this.arr[this.bytepos] >>> (this.bitsleft -= len)) & ((1 << len) - 1);
        return val >>> 0;
    }

    public write(len: number, data: number) {
        // reallocate if out of space
        const needs = this.bytepos + Math.ceil(len/8);
        if (needs >= this.arr.length) {
            const newArr = new Uint8Array(needs*2);
            newArr.set(this.arr);
            this.arr = newArr;
        }

        // write chunks of bits that advance the byte pointer
        while (len >= this.bitsleft) {
            // safe to bitmask with 0xff here, since if bitsleft != 8 we're at the start of data
            this.arr[this.bytepos++] |= (data >>> (len -= this.bitsleft)) & 0xff;
            this.bitsleft = 8;
        }

        // write the last chunk
        this.arr[this.bytepos] |= (data & ((1 << len) - 1)) << (this.bitsleft -= len);
    }

    public readVLQ(chunklen: number): number {
        let val = 0, pos = 0;
        while (this.read(1)) {
            val |= this.read(chunklen) << pos;
            pos += chunklen;
        }
        val |= this.read(chunklen) << pos;
        return val >>> 0;
    }

    public writeVLQ(chunklen: number, n: number) {
        if (!n) {
            this.write(chunklen+1, 0);
        }
        while (n) {
            const chunk = n & ((1 << chunklen) - 1);
            n >>>= chunklen;
            this.write(1, n !== 0 ? 1 : 0);
            this.write(chunklen, chunk);
        }
    }

    public readSignedVLQ(chunklen: number): number {
        const sign = this.read(1) ? -1 : 1;
        return sign * this.readVLQ(chunklen);
    }

    public writeSignedVLQ(chunklen: number, n: number) {
        this.write(1, n < 0 ? 1 : 0);
        this.writeVLQ(chunklen, Math.abs(n));
    }

    public writeString(str: string) {
        const encoded = new TextEncoder().encode(str);
        this.writeVLQ(3, encoded.length);
        encoded.forEach(b => this.write(8, b));
    }

    public readString(): string {
        const len = this.readVLQ(3),
        encoded = new Uint8Array(len);
        for (let i = 0; i < len; ++i) {
            encoded[i] = this.read(8);
        }
        return new TextDecoder().decode(encoded);
    }

    // WARNING: does not resize the buffer if seeking past the end
    // (should not matter, because buffer will autoresize on write)
    public seek(bytepos: number, bitsleft: number) {
        this.bytepos = bytepos || 0;
        this.bitsleft = bitsleft || 8;
    }

    public cut(): Uint8Array {
        return this.arr.subarray(0, this.bytepos+1);
    }

    public inbounds(): boolean {
        return this.bytepos < this.arr.length;
    }

}
