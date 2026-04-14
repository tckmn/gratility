import * as Measure from './measure.js';
import * as Courier from './courier.js';
import BitStream from './bitstream.js';
import Image from './image.js';
import * as File from './file.js';
import * as Draw from './draw.js';
import * as Color from './color.js';

export function encode(x: number, y: number): number {
    return (x << 16) | (y & 0xffff);
}
export function decode(n: number): [number, number] {
    return [n >> 16, n << 16 >> 16];
}

export const enum Obj {
    SURFACE = 0,
    LINE,
    SHAPE,
    TEXT,
}

const Layer_SHAPE_BASE = 0x10;
const Layer_TEXT_BASE = 0x20;

// must be kept in sync with Position
export const enum Layer {
    SURFACE = 0x0,
    PATH,
    EDGE,

    SHAPE_XL = Layer_SHAPE_BASE,
    SHAPE_L,
    SHAPE_M,
    SHAPE_S,
    SHAPE_XSNW,
    SHAPE_XSN,
    SHAPE_XSNE,
    SHAPE_XSW,
    SHAPE_XS,
    SHAPE_XSE,
    SHAPE_XSSW,
    SHAPE_XSS,
    SHAPE_XSSE,

    TEXT_XL = Layer_TEXT_BASE,
    TEXT_L,
    TEXT_M,
    TEXT_S,
    TEXT_XSNW,
    TEXT_XSN,
    TEXT_XSNE,
    TEXT_XSW,
    TEXT_XS,
    TEXT_XSE,
    TEXT_XSSW,
    TEXT_XSS,
    TEXT_XSSE,
}

type Layer_LINE = Layer.PATH | Layer.EDGE;

type Layer_SHAPE =
    Layer.SHAPE_XL |
    Layer.SHAPE_L |
    Layer.SHAPE_M |
    Layer.SHAPE_S |
    Layer.SHAPE_XS |
    Layer.SHAPE_XSNW |
    Layer.SHAPE_XSN |
    Layer.SHAPE_XSNE |
    Layer.SHAPE_XSW |
    Layer.SHAPE_XSE |
    Layer.SHAPE_XSSW |
    Layer.SHAPE_XSS |
    Layer.SHAPE_XSSE;

type Layer_TEXT =
    Layer.TEXT_XL |
    Layer.TEXT_L |
    Layer.TEXT_M |
    Layer.TEXT_S |
    Layer.TEXT_XS |
    Layer.TEXT_XSNW |
    Layer.TEXT_XSN |
    Layer.TEXT_XSNE |
    Layer.TEXT_XSW |
    Layer.TEXT_XSE |
    Layer.TEXT_XSSW |
    Layer.TEXT_XSS |
    Layer.TEXT_XSSE;

export const enum Shape {
    CIRCLE = 0,
    SQUARE,
    FLAG,
    STAR,
}

export const enum Head {
    NONE = 0,
    ARROW,
}

// must be kept in sync with Layer
export const enum Position {
    XL = 0,
    L,
    M,
    S,
    XSNW,
    XSN,
    XSNE,
    XSW,
    XS,
    XSE,
    XSSW,
    XSS,
    XSSE,
}
export const POS_SIZE = [Position.XL, Position.L, Position.M, Position.S, Position.XS];
export const POS_LOC = [Position.XSNW, Position.XSN, Position.XSNE, Position.XSW, Position.XS, Position.XSE, Position.XSSW, Position.XSS, Position.XSSE];

// oh god this sucks
export function unpackPos<T>(posmask: number, mapfn: (p: Position) => T): [number, Map<number, T>] {
    const ctr = (posmask & 0xf) | ((posmask >> Position.XS) & 1) << 4;
    posmask = (posmask | (ctr ? 1<<Position.XS : 0)) >> Position.XSNW;
    const m = new Map();
    for (let i = 0; i < 9; ++i) {
        if ((posmask>>i) & 1) m.set(i, mapfn(i === 4 ? POS_SIZE[Math.log2(ctr)] : POS_LOC[i]));
    }
    return [posmask, m];
}

export const POS_OFFSET = {
    [Position.XL]: [0, 0],
    [Position.L]: [0, 0],
    [Position.M]: [0, 0],
    [Position.S]: [0, 0],
    [Position.XSNW]: [-Measure.HALFCELL/2, -Measure.HALFCELL/2],
    [Position.XSN]: [0, -Measure.HALFCELL/2],
    [Position.XSNE]: [Measure.HALFCELL/2, -Measure.HALFCELL/2],
    [Position.XSW]: [-Measure.HALFCELL/2, 0],
    [Position.XS]: [0, 0],
    [Position.XSE]: [Measure.HALFCELL/2, 0],
    [Position.XSSW]: [-Measure.HALFCELL/2, Measure.HALFCELL/2],
    [Position.XSS]: [0, Measure.HALFCELL/2],
    [Position.XSSE]: [Measure.HALFCELL/2, Measure.HALFCELL/2],
};

export const POS_SCALE = {
    [Position.XL]: 5,
    [Position.L]: 4,
    [Position.M]: 3,
    [Position.S]: 2,
    [Position.XSNW]: 1,
    [Position.XSN]: 1,
    [Position.XSNE]: 1,
    [Position.XSW]: 1,
    [Position.XS]: 1,
    [Position.XSE]: 1,
    [Position.XSSW]: 1,
    [Position.XSS]: 1,
    [Position.XSSE]: 1,
};

const CURRENT_VERSION = 2;
const VERSION_BITS = 7;
const N_BITS = 32;
const OBJ_BITS = 6;
const LAYER_BITS = 6;
const SHAPE_BITS = 6;
const COLOR_BITS = 6;
const SIZE_BITS = 3;
const POSITION_BITS = 4;
const VLQ_CHUNK = 4;
const HEAD_BITS = 3;
const THICKNESS_BITS = 3;
const TRANSFORM_BITS: {[key in Shape]: number} = {
    [Shape.CIRCLE]: 0,
    [Shape.SQUARE]: 1,
    [Shape.FLAG]: 2,
    [Shape.STAR]: 2
};


export abstract class Tile {
    abstract readonly obj: Obj;
    abstract readonly layer: Layer;
    // this is only ever used in DragTool to determine whether to draw or erase
    // (instance versions may be used ad hoc)
    abstract eq(other: Tile): boolean;
    abstract serialize(bs: BitStream): void;
    abstract draw(x: number, y: number): SVGElement;
}

export class SurfaceTile extends Tile {
    public readonly obj = Obj.SURFACE;
    public readonly layer = Layer.SURFACE;
    constructor(
        public color: number
    ) { super(); }
    public eq(other: SurfaceTile) { return this.color === other.color; }
    public serialize(bs: BitStream) {
        bs.write(COLOR_BITS, this.color);
    }
    public draw(x: number, y: number): SVGElement {
        return Draw.draw(undefined, 'rect', {
            width: Measure.CELL,
            height: Measure.CELL,
            x: Measure.HALFCELL*(x-1),
            y: Measure.HALFCELL*(y-1),
            fill: Color.colors[this.color]
        });
    }
}

export class LineTile extends Tile {
    public readonly obj = Obj.LINE;
    public readonly layer: Layer_LINE;
    constructor(
        public isEdge: boolean,
        public color: number,
        public thickness: number,
        public head: Head,
        public dir: boolean
    ) { super(); this.layer = isEdge ? Layer.EDGE : Layer.PATH; }
    public eq(other: LineTile): boolean {
        return this.isEdge === other.isEdge && this.head === other.head
            && this.color === other.color && this.thickness === other.thickness &&
            (this.head === Head.NONE ? true : this.dir === other.dir);
    }
    public serialize(bs: BitStream) {
        bs.write(1, this.isEdge ? 1 : 0);
        bs.write(COLOR_BITS, this.color);
        bs.write(THICKNESS_BITS, this.thickness);
        bs.write(HEAD_BITS, this.head);
        bs.write(1, this.dir ? 1 : 0);
    }
    public draw(x: number, y: number): SVGElement {
        const g = Draw.draw(undefined, 'g', {
            transform: `
                rotate(${((y%2===0) == this.isEdge ? 0 : 90) + (this.dir ? 180 : 0)} ${x*Measure.HALFCELL} ${y*Measure.HALFCELL})
                `
        });
        const stroke = Color.colors[this.color];
        const strokeLinecap = 'round'
        const strokeWidth = Measure.LINE * this.thickness;
        const adjust = (z : number, n : number) => (z*Measure.HALFCELL+n*Math.sqrt(this.thickness));
        Draw.draw(g, 'line', {
            x1: adjust(x+1,0),
            x2: adjust(x-1,0),
            y1: adjust(y,0),
            y2: adjust(y,0),
            stroke, strokeLinecap, strokeWidth
        });
        if (this.head === Head.ARROW) {
            Draw.draw(g, 'path', {
                d: `M ${adjust(x,3)} ${adjust(y,5)} L ${adjust(x,-2)} ${adjust(y,0)} L ${adjust(x,3)} ${adjust(y,-5)}`,
                fill: 'none',
                stroke, strokeLinecap, strokeWidth
            });
        }
        return g;
    }
}

export class ShapeTile extends Tile {
    public readonly obj = Obj.SHAPE;
    public readonly layer: Layer_SHAPE;
    constructor(
        public shape: Shape,
        public fill: number | undefined,
        public outline: number | undefined,
        public position: Position,
        public transform: number
    ) { super(); this.layer = Layer_SHAPE_BASE + position; }
    // not needed to check position here because different position is always different layer
    public eq(other: ShapeTile) { return this.shape === other.shape && this.fill === other.fill && this.outline === other.outline && this.transform === other.transform; }
    public serialize(bs: BitStream) {
        bs.write(SHAPE_BITS, this.shape);
        if (this.fill === undefined) bs.write(1, 0);
        else { bs.write(1, 1); bs.write(COLOR_BITS, this.fill); }
        if (this.outline === undefined) bs.write(1, 0);
        else { bs.write(1, 1); bs.write(COLOR_BITS, this.outline); }
        bs.write(POSITION_BITS, this.position);
        bs.write(TRANSFORM_BITS[this.shape], this.transform);
    }
    public draw(x: number, y: number): SVGElement {
        const [ox, oy] = POS_OFFSET[this.position];
        const g = Draw.draw(undefined, 'g', {
            transform: `translate(${x * Measure.HALFCELL + ox} ${y * Measure.HALFCELL + oy})`
        });

        const size = POS_SCALE[this.position];
        const r = Measure.HALFCELL * (size/6);
        const strokeWidth = Measure.HALFCELL * (0.05 + 0.1*(size/12));
        const fill = this.fill === undefined ? 'none' : Color.colors[this.fill];
        const stroke = this.outline === undefined ? 'none' : Color.colors[this.outline];

        switch (this.shape) {
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
        case Shape.FLAG:
            Draw.draw(g, 'path', {
                d: 'M -0.8 1 L -0.8 -1 L -0.6 -1 L 0.8 -0.5 L -0.6 0 L -0.6 1 Z',
                transform: `scale(${r*0.9})`,
                strokeWidth: strokeWidth/(r*0.9), fill, stroke
            });
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

        return g;
    }
}

export class TextTile extends Tile {
    public readonly obj = Obj.TEXT;
    public readonly layer = Layer.TEXT_M;
    constructor(
        public color: number,
        public val: string
    ) { super(); }
    public eq(other: TextTile): boolean { return this.color === other.color && this.val === other.val; }
    public serialize(bs: BitStream) {
        bs.write(COLOR_BITS, this.color);
        bs.writeString(this.val);
    }
    public draw(x: number, y: number): SVGElement {
        return Draw.draw(undefined, 'text', {
            x: Measure.HALFCELL*x,
            y: Measure.HALFCELL*y,
            textAnchor: 'middle',
            dominantBaseline: 'central',
            fontSize: Measure.CELL*(
                this.val.length === 1 ? 0.75 :
                this.val.length === 2 ? 0.55 :
                this.val.length === 3 ? 0.4 :
                0.3
            ),
            textContent: this.val,
            fill: Color.colors[this.color]
        });
    }
}


export class Item {
    public constructor(
        public readonly n: number,
        public readonly tile: Tile
    ) {}
}

export class Change {
    public constructor(
        public readonly n: number,
        public readonly pre: Tile | undefined,
        public readonly post: Tile | undefined,
        public linked: boolean = false,
    ) {}
    public rev() { return new Change(this.n, this.post, this.pre, this.linked); }
}

const deserializefns: {[key in number]: {[key in Obj]: (bs: BitStream) => Tile}} = ((x: {[key in number]: {[key in Obj]?: (bs: BitStream) => Tile}}) => {
    for (let i = CURRENT_VERSION-1; i >= 0; --i) {
        if (x[i][Obj.SURFACE] === undefined) x[i][Obj.SURFACE] = x[i+1][Obj.SURFACE];
        if (x[i][Obj.LINE] === undefined) x[i][Obj.LINE] = x[i+1][Obj.LINE];
        if (x[i][Obj.SHAPE] === undefined) x[i][Obj.SHAPE] = x[i+1][Obj.SHAPE];
        if (x[i][Obj.TEXT] === undefined) x[i][Obj.TEXT] = x[i+1][Obj.TEXT];
    }
    return x as never;
})({ 0: {

    [Obj.LINE]: (bs: BitStream): Tile => {
        const isEdge = bs.read(1) === 1;
        const color = bs.read(1) === 0 ? 0 : bs.read(COLOR_BITS);
        const thickness = bs.read(THICKNESS_BITS);
        const head = bs.read(HEAD_BITS);
        const dir = bs.read(1) === 1;
        return new LineTile(isEdge, color, thickness, head, dir);
    },

    [Obj.TEXT]: (bs: BitStream): Tile => {
        return new TextTile(0, bs.readString());
    }

}, 1: {

    [Obj.SHAPE]: (bs: BitStream): Tile => {
        const len = Math.min(bs.readVLQ(VLQ_CHUNK), 16);
        const arr = [];
        for (let i = 0; i < len; ++i) {
            const shape = bs.read(SHAPE_BITS) as Shape;
            const fill = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
            const outline = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
            const size = bs.read(SIZE_BITS);
            arr.push(new ShapeTile(shape, fill, outline, size===1 ? Position.XS : 5-size, 0));
        }
        // if (arr.length !== 1) console.error(`WARNING: ${arr.length} shapes`);
        return arr as unknown as Tile; // uh oh
    },

}, 2: {

    [Obj.SURFACE]: (bs: BitStream): Tile => {
        return new SurfaceTile(bs.read(COLOR_BITS));
    },

    [Obj.LINE]: (bs: BitStream): Tile => {
        const isEdge = bs.read(1) === 1;
        const color = bs.read(COLOR_BITS);
        const thickness = bs.read(THICKNESS_BITS);
        const head = bs.read(HEAD_BITS);
        const dir = bs.read(1) === 1;
        return new LineTile(isEdge, color, thickness, head, dir);
    },

    [Obj.SHAPE]: (bs: BitStream): Tile => {
        const shape = bs.read(SHAPE_BITS) as Shape;
        const fill = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
        const outline = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
        const position = bs.read(POSITION_BITS);
        const transform = bs.read(TRANSFORM_BITS[shape]);
        return new ShapeTile(shape, fill, outline, position, transform);
    },

    [Obj.TEXT]: (bs: BitStream): Tile => {
        return new TextTile(bs.read(COLOR_BITS), bs.readString());
    }

}});

function readVersion(bs: BitStream): number | undefined {
    let ret;
    const bit = bs.read(1);
    if (bit === 0) ret = 0;
    else ret = bs.read(VERSION_BITS);
    if (ret > CURRENT_VERSION) {
        Courier.alert(`deserialize: invalid version number ${ret}`);
        return undefined;
    }
    if (ret !== CURRENT_VERSION) {
        Courier.alert(`deserialize: old version number ${ret}; converting automatically`);
    }
    return ret;
}

export function serializeStamp(stamp: Array<Item>): Uint8Array<ArrayBuffer> {
    const bs = BitStream.empty();
    bs.write(1, 1);
    bs.write(VERSION_BITS, CURRENT_VERSION);

    for (const item of stamp) {
        bs.write(N_BITS, item.n);
        bs.write(OBJ_BITS, item.tile.obj);
        item.tile.serialize(bs);
    }

    return bs.cut();
}

export function deserializeStamp(arr: Uint8Array<ArrayBuffer>): Array<Item> {
    const stamp = new Array<Item>();
    const bs = BitStream.fromArr(arr);

    const version = readVersion(bs);
    if (version === undefined) return [];

    // TODO this is pretty awful
    // i don't think deserializeChanges should have anything similar
    if (version >= 2) {
        while (1) {
            const n = bs.read(N_BITS);
            if (!bs.inbounds()) break;
            const obj = bs.read(OBJ_BITS) as Obj;
            if (version <= 1) bs.read(LAYER_BITS);
            stamp.push(new Item(n, deserializefns[version][obj](bs)));
        }
    } else {
        while (1) {
            const n = bs.read(N_BITS);
            if (!bs.inbounds()) break;
            const obj = bs.read(OBJ_BITS) as Obj;
            if (version <= 1) bs.read(LAYER_BITS);
            const ret = deserializefns[version][obj](bs);
            if (ret.constructor === Array) { for (const x of (ret as Array<Tile>)) stamp.push(new Item(n, x)); }
            else stamp.push(new Item(n, ret));
        }
    }

    return stamp;
}

export function serializeChanges(changes: Array<Change>): Uint8Array<ArrayBuffer> {
    const bs = BitStream.empty();
    bs.write(1, 1);
    bs.write(VERSION_BITS, CURRENT_VERSION);

    for (const ch of changes) {
        bs.write(N_BITS, ch.n);
        if (ch.pre === undefined) {
            bs.write(OBJ_BITS, (1<<OBJ_BITS)-1);
        } else {
            bs.write(OBJ_BITS, ch.pre.obj);
            ch.pre.serialize(bs);
        }
        if (ch.post === undefined) {
            bs.write(OBJ_BITS, (1<<OBJ_BITS)-1);
        } else {
            bs.write(OBJ_BITS, ch.post.obj);
            ch.post.serialize(bs);
        }
    }

    return bs.cut();
}

export function deserializeChanges(arr: Uint8Array<ArrayBuffer>): Array<Change> {
    const changes = [];
    const bs = BitStream.fromArr(arr);

    const version = readVersion(bs);
    if (version === undefined) return [];

    while (1) {
        const n = bs.read(N_BITS);
        if (!bs.inbounds()) break;
        if (version <= 1) bs.read(LAYER_BITS);
        const preobj = bs.read(OBJ_BITS);
        const pre = preobj === (1<<OBJ_BITS)-1 ? undefined : deserializefns[version][preobj as Obj](bs);
        const postobj = bs.read(OBJ_BITS);
        const post = postobj === (1<<OBJ_BITS)-1 ? undefined : deserializefns[version][postobj as Obj](bs);
        changes.push(new Change(n, pre, post));
    }

    return changes;
}


// this is some insane type hackery nonsense
type Halfcell = Omit<Map<Layer, Tile>, 'get'> & { get: <T extends Layer>(layer: T) => (
    T extends Layer.SURFACE ? SurfaceTile | undefined :
    T extends Layer_LINE    ? LineTile    | undefined :
    T extends Layer_SHAPE   ? ShapeTile   | undefined :
    T extends Layer_TEXT    ? TextTile    | undefined :
    Tile | undefined
) };

export class DataManager {

    public readonly halfcells = new Map<number, Halfcell>();
    private readonly drawn = new Map<number, Map<Layer, SVGElement>>();

    private readonly history = new Array<Change>();
    private histpos = 0;

    public frozen = false;

    public file: File.FileManager | undefined = undefined;
    public constructor(private image: Image | undefined = undefined) {}
    public connect(fileCont: HTMLElement, serverCont: HTMLElement) {
        this.file = new File.FileManager(fileCont, serverCont, this);
    }

    public add(change: Change) {
        if (this.frozen) return;
        if (this.histpos < this.history.length) this.history.splice(this.histpos, this.history.length);
        this.history.push(change);
        this.undo(false);
    }

    public breakLink() {
        if (this.frozen) return;
        this.history[this.histpos-1].linked = false;
    }

    public undo(isUndo: boolean) {
        if (this.frozen) return;
        do {
            if (isUndo ? (this.histpos <= 0) : (this.histpos >= this.history.length)) return;
            const change = this.history[isUndo ? --this.histpos : this.histpos++];
            const real = isUndo ? change.rev() : change;
            this.perform(real);
            this.file?.recv(real);
        } while (this.history[this.histpos-1]?.linked);
    }

    public perform(change: Change) {
        if (this.frozen) return;
        if (change.pre !== undefined) {

            // TODO undefined cases here should never happen
            if (this.image !== undefined) {
                // delete the drawing
                const elt = this.drawn.get(change.n)?.get(change.pre.layer);
                if (elt !== undefined) this.image.layer(change.pre.layer).removeChild(elt);
            }

            // delete item
            const hc = this.halfcells.get(change.n);
            hc?.delete(change.pre.layer);
            if (hc?.size === 0) this.halfcells.delete(change.n);

        }

        if (change.post !== undefined) {

            // create item
            if (!this.halfcells.has(change.n)) this.halfcells.set(change.n, new Map() as Halfcell);
            this.halfcells.get(change.n)!.set(change.post.layer, change.post);

            if (this.image !== undefined) {
                // draw it
                const [x, y] = decode(change.n);
                const elt = change.post.draw(x, y);
                this.image.layer(change.post.layer).appendChild(elt);

                // save the element
                if (!this.drawn.has(change.n)) this.drawn.set(change.n, new Map());
                this.drawn.get(change.n)?.set(change.post.layer, elt);
            }

        }
    }

    public listcells(): Array<Item> {
        return this.halfcells.entries().flatMap(([n, hc]) => hc.values().map(t => new Item(n, t))).toArray();
    }

    public clear() {
        this.halfcells.clear();
        for (const [_, layers] of this.drawn) {
            for (const [_, elt] of layers) {
                elt.remove();
            }
        }
        this.drawn.clear();
        this.history.length = 0;
        this.histpos = 0;
    }

}
