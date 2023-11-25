import * as Draw from 'draw';
import * as Layer from 'layer';
import * as Measure from 'measure';
import BitStream from 'bitstream';

export function encode(x: number, y: number): number {
    return (x << 16) | (y & 0xffff);
}
export function decode(n: number): [number, number] {
    return [n >> 16, n << 16 >> 16];
}

export const enum Obj {
    SURFACE = 0,
    LINE,
}

export class Item {
    public constructor(
        public readonly n: number,
        public readonly obj: Obj,
        public readonly data: any
    ) {}
}

export class Change {
    public constructor(
        public readonly n: number,
        public readonly obj: Obj,
        public readonly pre: any,
        public readonly post: any,
        public readonly linked: boolean = false
    ) {}
}

export const drawfns = {

    [Obj.SURFACE]: (x: number, y: number, data: any) => {
        return Draw.draw(undefined, 'rect', {
            width: Measure.CELL,
            height: Measure.CELL,
            x: Measure.HALFCELL*x,
            y: Measure.HALFCELL*y,
            fill: 'red'
        });
    },

    [Obj.LINE]: (x: number, y: number, data: any) => {
        const horiz = Measure.hctype(x, y) === Measure.HC.EVERT ? 1 : 0;
        return Draw.draw(undefined, 'line', {
            x1: (x - horiz) * Measure.HALFCELL,
            x2: (x + horiz) * Measure.HALFCELL,
            y1: (y - (1-horiz)) * Measure.HALFCELL,
            y2: (y + (1-horiz)) * Measure.HALFCELL,
            stroke: 'green',
            strokeWidth: Measure.LINE,
            strokeLinecap: 'round'
        });
    }

};

const serializefns = {

    [Obj.SURFACE]: (bs: BitStream, data: any) => {
    },

    [Obj.LINE]: (bs: BitStream, data: any) => {
    }

};

const deserializefns = {

    [Obj.SURFACE]: (bs: BitStream): any => {
        return 0;
    },

    [Obj.LINE]: (bs: BitStream): any => {
        return 0;
    }

};

export function serialize(stamp: Array<Item>): Uint8Array {
    const bs = BitStream.empty();

    for (const item of stamp) {
        bs.write(32, item.n);
        bs.write(6, item.obj);
        serializefns[item.obj](bs, item.data);
    }

    return bs.cut();
}

export function deserialize(arr: Uint8Array): Array<Item> {
    const stamp = new Array<Item>();
    const bs = BitStream.fromArr(arr);

    while (bs.inbounds()) {
        const n = bs.read(32);
        const obj = bs.read(6) as Obj;
        stamp.push(new Item(n, obj, deserializefns[obj](bs)));
    }

    return stamp;
}

export const halfcells = new Map<number, Map<Obj, any>>();
const drawn = new Map<number, Map<Obj, SVGElement>>();

const history = new Array<Change>();
let histpos = 0;

export function add(change: Change) {
    if (histpos < history.length) history.splice(histpos, history.length);
    history.push(change);
    undo(false);
}

export function undo(isUndo: boolean) {
    do {
        if (isUndo ? (histpos <= 0) : (histpos >= history.length)) return;

        const change = history[isUndo ? --histpos : histpos++];
        const pre = isUndo ? change.post : change.pre;
        const post = isUndo ? change.pre : change.post;

        if (pre !== undefined) {

            // TODO undefined cases here should never happen
            // delete the drawing
            const elt = drawn.get(change.n)?.get(change.obj);
            if (elt !== undefined) Layer.obj(change.obj).removeChild(elt);

            // delete item
            const hc = halfcells.get(change.n);
            hc?.delete(change.obj);
            if (hc?.size === 0) halfcells.delete(change.n);

        }

        if (post !== undefined) {

            // create item
            if (!halfcells.has(change.n)) halfcells.set(change.n, new Map());
            halfcells.get(change.n)!.set(change.obj, post);

            // draw it
            const [x, y] = decode(change.n);
            const elt = drawfns[change.obj](x, y, post);
            Layer.obj(change.obj).appendChild(elt);

            // save the element
            if (!drawn.has(change.n)) drawn.set(change.n, new Map());
            drawn.get(change.n)?.set(change.obj, elt);

        }
    } while (history[histpos-1]?.linked);
}
