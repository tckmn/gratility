import * as Draw from 'draw';
import * as Layer from 'layer';
import * as Measure from 'measure';
import MenuManager from 'menu';
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
    EDGE,
    SHAPE,
}

export const enum Shape {
    CIRCLE = 0,
    SQUARE,
    CROSS,
    STAR
}

export type ShapeSpec = {
    shape: Shape,
    fill: number | undefined,
    outline: number | undefined,
    size: number
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

const colors = [
    '#000000',
    '#008000',
    '#ffffff'
]

const drawfns: { [obj in Obj]: (x: number, y: number, data: never) => SVGElement } = {

    [Obj.SURFACE]: (x: number, y: number, data: number) => {
        return Draw.draw(undefined, 'rect', {
            width: Measure.CELL,
            height: Measure.CELL,
            x: Measure.HALFCELL*(x-1),
            y: Measure.HALFCELL*(y-1),
            fill: colors[data]
        });
    },

    [Obj.LINE]: (x: number, y: number, data: number) => {
        const horiz = Measure.hctype(x, y) === Measure.HC.EVERT ? 1 : 0;
        return Draw.draw(undefined, 'line', {
            x1: (x - horiz) * Measure.HALFCELL,
            x2: (x + horiz) * Measure.HALFCELL,
            y1: (y - (1-horiz)) * Measure.HALFCELL,
            y2: (y + (1-horiz)) * Measure.HALFCELL,
            stroke: colors[data],
            strokeWidth: Measure.LINE,
            strokeLinecap: 'round'
        });
    },

    [Obj.EDGE]: (x: number, y: number, data: number) => {
        const horiz = Measure.hctype(x, y) === Measure.HC.EVERT ? 0 : 1;
        return Draw.draw(undefined, 'line', {
            x1: (x - horiz) * Measure.HALFCELL,
            x2: (x + horiz) * Measure.HALFCELL,
            y1: (y - (1-horiz)) * Measure.HALFCELL,
            y2: (y + (1-horiz)) * Measure.HALFCELL,
            stroke: colors[data],
            strokeWidth: Measure.EDGE,
            strokeLinecap: 'round'
        });
    },

    [Obj.SHAPE]: (x: number, y: number, data: ShapeSpec[]) => {
        const g = Draw.draw(undefined, 'g', {
            transform: `translate(${x * Measure.HALFCELL} ${y * Measure.HALFCELL})`
        });
        for (const spec of data) {
            switch (spec.shape) {
            case Shape.CIRCLE:
                Draw.draw(g, 'circle', {
                    cx: 0,
                    cy: 0,
                    r: 5,
                    strokeWidth: 2,
                    fill: spec.fill === undefined ? 'transparent' : colors[spec.fill],
                    stroke: spec.outline === undefined ? 'transparent' : colors[spec.outline]
                });
                break;
            default:
                // TODO
                break;
            }
        }
        return g;
    },

};

export function objdraw(obj: Obj, x: number, y: number, data: any) {
    return drawfns[obj](x, y, data as never);
}

const N_BITS = 32;
const OBJ_BITS = 6;
const COLOR_BITS = 6;

const serializefns = {

    [Obj.SURFACE]: (bs: BitStream, data: any) => {
        bs.write(COLOR_BITS, data as number);
    },

    [Obj.LINE]: (bs: BitStream, data: any) => {
        bs.write(COLOR_BITS, data as number);
    },

    [Obj.EDGE]: (bs: BitStream, data: any) => {
        bs.write(COLOR_BITS, data as number);
    },

    [Obj.SHAPE]: (bs: BitStream, data: any) => {
        // TODO
    },

};

const deserializefns = {

    [Obj.SURFACE]: (bs: BitStream): any => {
        return bs.read(COLOR_BITS);
    },

    [Obj.LINE]: (bs: BitStream): any => {
        return bs.read(COLOR_BITS);
    },

    [Obj.EDGE]: (bs: BitStream): any => {
        return bs.read(COLOR_BITS);
    },

    [Obj.SHAPE]: (bs: BitStream): any => {
        // TODO
    },

};

export function serialize(stamp: Array<Item>): Uint8Array {
    const bs = BitStream.empty();
    bs.write(1, 0);

    for (const item of stamp) {
        bs.write(N_BITS, item.n);
        bs.write(OBJ_BITS, item.obj);
        serializefns[item.obj](bs, item.data);
    }

    return bs.cut();
}

export function deserialize(arr: Uint8Array): Array<Item> {
    const stamp = new Array<Item>();
    const bs = BitStream.fromArr(arr);

    const version = bs.read(1);
    if (version !== 0) {
        MenuManager.alert('deserialize: invalid version number');
        return [];
    }

    while (1) {
        const n = bs.read(N_BITS);
        if (!bs.inbounds()) break;
        const obj = bs.read(OBJ_BITS) as Obj;
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
            const elt = objdraw(change.obj, x, y, post);
            Layer.obj(change.obj).appendChild(elt);

            // save the element
            if (!drawn.has(change.n)) drawn.set(change.n, new Map());
            drawn.get(change.n)?.set(change.obj, elt);

        }
    } while (history[histpos-1]?.linked);
}
