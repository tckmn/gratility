import * as Draw from 'draw';
import * as Layer from 'layer';
import * as Measure from 'measure';
import * as Color from 'color';
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
    TEXT,
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

export function sheq(a: ShapeSpec, b: ShapeSpec) {
    return a.shape === b.shape && a.size === b.size;
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

const drawfns: { [obj in Obj]: (x: number, y: number, data: never) => SVGElement } = {

    [Obj.SURFACE]: (x: number, y: number, data: number) => {
        return Draw.draw(undefined, 'rect', {
            width: Measure.CELL,
            height: Measure.CELL,
            x: Measure.HALFCELL*(x-1),
            y: Measure.HALFCELL*(y-1),
            fill: Color.colors[data]
        });
    },

    [Obj.LINE]: (x: number, y: number, data: number) => {
        const horiz = Measure.hctype(x, y) === Measure.HC.EVERT ? 1 : 0;
        return Draw.draw(undefined, 'line', {
            x1: (x - horiz) * Measure.HALFCELL,
            x2: (x + horiz) * Measure.HALFCELL,
            y1: (y - (1-horiz)) * Measure.HALFCELL,
            y2: (y + (1-horiz)) * Measure.HALFCELL,
            stroke: Color.colors[data],
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
            stroke: Color.colors[data],
            strokeWidth: Measure.EDGE,
            strokeLinecap: 'round'
        });
    },

    [Obj.SHAPE]: (x: number, y: number, data: ShapeSpec[]) => {
        const g = Draw.draw(undefined, 'g', {
            transform: `translate(${x * Measure.HALFCELL} ${y * Measure.HALFCELL})`
        });

        for (const spec of data) {
            const r = Measure.HALFCELL * (spec.size/6);
            const strokeWidth = Measure.HALFCELL * (0.05 + 0.1*(spec.size/12));
            const fill = spec.fill === undefined ? 'transparent' : Color.colors[spec.fill];
            const stroke = spec.outline === undefined ? 'transparent' : Color.colors[spec.outline];

            switch (spec.shape) {
            case Shape.CIRCLE:
                Draw.draw(g, 'circle', {
                    cx: 0, cy: 0, r: r,
                    strokeWidth, fill, stroke
                });
                break;
            case Shape.SQUARE:
                Draw.draw(g, 'rect', {
                    width: r*2, height: r*2, x: -r, y: -r,
                    strokeWidth, fill, stroke
                });
                break;
            case Shape.CROSS:
                // TODO
                break;
            case Shape.STAR:
                Draw.draw(g, 'path', {
                    d: 'M' + [0,1,2,3,4,5,6,7,8,9].map(n => (
                        r*(n%2===0?1:0.5)*Math.cos((n/5+0.5)*Math.PI) + ' ' +
                            -r*(n%2===0?1:0.5)*Math.sin((n/5+0.5)*Math.PI)
                    )).join('L') + 'Z',
                    strokeWidth, fill, stroke
                });
                break;
            }
        }

        return g;
    },

    [Obj.TEXT]: (x: number, y: number, data: string) => {
        return Draw.draw(undefined, 'text', {
            x: Measure.HALFCELL*x,
            y: Measure.HALFCELL*y,
            textAnchor: 'middle',
            dominantBaseline: 'central',
            fontSize: Measure.CELL*(
                data.length === 1 ? 0.75 :
                data.length === 2 ? 0.55 :
                data.length === 3 ? 0.4 :
                0.3
            ),
            textContent: data
        });
    },

};

export function objdraw(obj: Obj, x: number, y: number, data: any) {
    return drawfns[obj](x, y, data as never);
}

const N_BITS = 32;
const OBJ_BITS = 6;
const SHAPE_BITS = 6;
const COLOR_BITS = 6;
const SIZE_BITS = 3;
const VLQ_CHUNK = 4;

const serializefns: { [obj in Obj]: (bs: BitStream, data: never) => void } = {

    [Obj.SURFACE]: (bs: BitStream, data: number) => {
        bs.write(COLOR_BITS, data);
    },

    [Obj.LINE]: (bs: BitStream, data: number) => {
        bs.write(COLOR_BITS, data);
    },

    [Obj.EDGE]: (bs: BitStream, data: number) => {
        bs.write(COLOR_BITS, data);
    },

    [Obj.SHAPE]: (bs: BitStream, data: ShapeSpec[]) => {
        bs.writeVLQ(VLQ_CHUNK, data.length);
        for (const spec of data) {
            bs.write(SHAPE_BITS, spec.shape);
            if (spec.fill === undefined) bs.write(1, 0);
            else { bs.write(1, 1); bs.write(COLOR_BITS, spec.fill); }
            if (spec.outline === undefined) bs.write(1, 0);
            else { bs.write(1, 1); bs.write(COLOR_BITS, spec.outline); }
            bs.write(SIZE_BITS, spec.size);
        }
    },

    [Obj.TEXT]: (bs: BitStream, data: string) => {
        bs.writeString(data);
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
        // TODO don't allow maliciously constructed encodings lol
        const len = bs.readVLQ(VLQ_CHUNK);
        const arr = [];
        for (let i = 0; i < len; ++i) {
            const shape = bs.read(SHAPE_BITS) as Shape;
            const fill = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
            const outline = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
            const size = bs.read(SIZE_BITS);
            arr.push({ shape, fill, outline, size });
        }
        return arr;
    },

    [Obj.TEXT]: (bs: BitStream): any => {
        return bs.readString();
    },

};

export function serialize(stamp: Array<Item>): Uint8Array {
    const bs = BitStream.empty();
    bs.write(1, 0);

    for (const item of stamp) {
        bs.write(N_BITS, item.n);
        bs.write(OBJ_BITS, item.obj);
        serializefns[item.obj](bs, item.data as never);
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
