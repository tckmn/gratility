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
    POLY,
    WALL,
}

export const Layer_SHAPE_BASE = 0x10;
export const Layer_TEXT_BASE = 0x20;

// must be kept in sync with Position
export const enum Layer {
    SURFACE = 0x0,
    PATH,
    EDGE,
    WALL,

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

export type Layer_LINE = Layer.PATH | Layer.EDGE;

export type Layer_SHAPE =
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

export type Layer_TEXT =
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
    CROSS,
    FLAG,
    ARROW,
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

export const POS_OFFSET: {[key in Position]: [number, number]} = {
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

export class Paradigm {
    public static readonly NONE = new Paradigm(0, 0, 0, () => Draw.draw(undefined, 'circle', { cx: 0, cy: 0, r: 1 }));
    public static readonly POLY = Array.from({length: 19}, (_,i) => new Paradigm(i%4 ? 90 : 180/i, 0, i%2 ? 2 : 1, () => Draw.poly(undefined, i, false)));
    public static readonly ALL = new Paradigm(45, 0x8, 4, () => Draw.poly(undefined, 3, false));
    public static readonly ROT8 = new Paradigm(45, 0, 3, () => Draw.poly(undefined, 3, false));
    public constructor(
        public readonly rotAmt: number,
        public readonly flipBit: number,
        public readonly serBits: number,
        public readonly exShape: () => SVGElement
    ) {}
}

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
const SIDE_BITS = 4;
const ANGLE_BITS = 4;


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

export class LineSpec {
    constructor(
        public readonly color: number,
        public readonly thickness: number,
        public readonly head: Head,
        public readonly dir: boolean
    ) {}

    public eq(other: LineSpec) { return this.color === other.color && this.thickness === other.thickness &&
        this.head === other.head && (this.head === Head.NONE ? true : this.dir === other.dir); }
    public serialize(bs: BitStream) {
        bs.write(COLOR_BITS, this.color);
        bs.write(THICKNESS_BITS, this.thickness);
        bs.write(HEAD_BITS, this.head);
        bs.write(1, this.dir ? 1 : 0);
    }

    public draw(x: number, y: number, rot: number, len: number = 1) {
        const g = Draw.draw(undefined, 'g', {
            transform: `translate(${x*Measure.HALFCELL} ${y*Measure.HALFCELL}) rotate(${rot + (this.dir ? 180 : 0)})`
        });
        const stroke = Color.colors[this.color];
        const strokeLinecap = 'round'
        const strokeWidth = Measure.LINE * this.thickness;
        Draw.draw(g, 'line', {
            x1: Measure.HALFCELL*len, x2: -Measure.HALFCELL*len, y1: 0, y2: 0,
            stroke, strokeLinecap, strokeWidth
        });
        if (this.head === Head.ARROW) {
            const mul = Math.sqrt(this.thickness);
            Draw.draw(g, 'path', {
                d: `M ${3*mul} ${5*mul} L ${-2*mul} 0 L ${3*mul} ${-5*mul}`,
                fill: 'none', stroke, strokeLinecap, strokeWidth
            });
        }
        return g;
    }
}

export class LineTile extends Tile {
    public readonly obj = Obj.LINE;
    public readonly layer: Layer_LINE;
    constructor(
        public readonly isEdge: boolean,
        public readonly spec: LineSpec
    ) { super(); this.layer = isEdge ? Layer.EDGE : Layer.PATH; }
    public eq(other: LineTile): boolean { return this.isEdge === other.isEdge && this.spec.eq(other.spec); }
    public serialize(bs: BitStream) {
        bs.write(1, this.isEdge ? 1 : 0);
        this.spec.serialize(bs);
    }
    public draw(x: number, y: number): SVGElement {
        return this.spec.draw(x, y, (y%2===0) === this.isEdge ? 0 : 90);
    }
}

export class WallTile extends Tile {
    public readonly obj = Obj.WALL;
    public readonly layer = Layer.WALL;
    constructor(
        public angles: number,
        public spec: LineSpec
    ) { super(); }
    public eq(other: WallTile): boolean { return this.spec.eq(other.spec); }
    public serialize(bs: BitStream) {
        bs.write(ANGLE_BITS, this.angles);
        this.spec.serialize(bs);
    }
    public draw(x: number, y: number): SVGElement {
        const g = Draw.draw(undefined, 'g');
        if (this.angles & 0x1) g.appendChild(this.spec.draw(x, y, 0));
        if (this.angles & 0x2) g.appendChild(this.spec.draw(x, y, 45, Math.sqrt(2)));
        if (this.angles & 0x4) g.appendChild(this.spec.draw(x, y, 90));
        if (this.angles & 0x8) g.appendChild(this.spec.draw(x, y, 135, Math.sqrt(2)));
        return g;
    }
}

export class ObjectSpec {
    constructor(
        public readonly color: number | undefined,
        public readonly outline: number | undefined,
        public readonly position: Position,
        public readonly transform: number
    ) {}

    // TODO temporary hack
    public setColor(color: number | undefined): ObjectSpec { return new ObjectSpec(color, this.outline, this.position, this.transform); }

    // not needed to check position here because different position is always different layer
    public eq(other: ObjectSpec) { return this.color === other.color && this.outline === other.outline && this.transform === other.transform; }
    public layer(base: number) { return base + this.position; }
    public serialize(bs: BitStream, paradigm: Paradigm) {
        if (this.color === undefined) bs.write(1, 0);
        else { bs.write(1, 1); bs.write(COLOR_BITS, this.color); }
        if (this.outline === undefined) bs.write(1, 0);
        else { bs.write(1, 1); bs.write(COLOR_BITS, this.outline); }
        bs.write(POSITION_BITS, this.position);
        bs.write(paradigm.serBits, this.transform);
    }

    public offset(): [number, number] { return POS_OFFSET[this.position]; }
    public size(): number { return POS_SCALE[this.position]; }
    public scale(): number { return Measure.HALFCELL * this.size()/6; }
    public strokeWidth(): number { return (0.05 + 0.1*(this.size()/12)) / (this.size()/6); }
    public fill(): string { return this.color === undefined ? 'none' : Color.colors[this.color]; }
    public stroke(): string { return this.outline === undefined ? 'none' : Color.colors[this.outline]; }

    public gTransform(x: number, y: number): string { const [ox, oy] = this.offset(); return `translate(${x*Measure.HALFCELL + ox} ${y*Measure.HALFCELL + oy})`; }
    public gRotate(p: Paradigm): string { return ` rotate(${p.rotAmt*(this.transform & ~p.flipBit)})` + (this.transform & p.flipBit ? ' scale(-1,1)' : ''); }
    public gScale(s: number | undefined): string { return ` scale(${s ?? this.scale()})`; }
    public g(x: number, y: number, p: Paradigm, s: number | undefined = undefined): SVGElement { return Draw.draw(undefined, 'g', {
        transform: this.gTransform(x,y) + this.gRotate(p) + this.gScale(s)
    }); }
}

export class ObjectParam {
    constructor(
        public readonly fill: number | undefined,
        public readonly outline: number | undefined,
        public readonly posmask: number,
        public readonly transform: number,
        public readonly locs: number
    ) {}
    public unpack<T>(f: (s: ObjectSpec) => T): [number, Map<number, T>] {
        return unpackPos(this.posmask, p => f(new ObjectSpec(this.fill, this.outline, p, this.transform)));
    }
}

export class ShapeTile extends Tile {
    public readonly obj = Obj.SHAPE;
    public readonly layer: Layer_SHAPE;
    public static readonly paradigm: {[key in Shape]: Paradigm} = {
        [Shape.CIRCLE]: Paradigm.NONE,
        [Shape.CROSS]: Paradigm.POLY[4],
        [Shape.FLAG]: Paradigm.ALL,
        [Shape.ARROW]: Paradigm.ROT8,
    };
    constructor(
        public shape: Shape,
        public spec: ObjectSpec
    ) { super(); this.layer = spec.layer(Layer_SHAPE_BASE); }
    // must test obj because shapetile and polytile share layer... feels dubious
    public eq(other: ShapeTile) { return this.obj === other.obj && this.shape === other.shape && this.spec.eq(other.spec); }
    public serialize(bs: BitStream) {
        bs.write(SHAPE_BITS, this.shape);
        this.spec.serialize(bs, ShapeTile.paradigm[this.shape]);
    }
    public draw(x: number, y: number): SVGElement {
        const g = this.spec.g(x, y, ShapeTile.paradigm[this.shape]);
        const strokeWidth = this.spec.strokeWidth();
        const fill = this.spec.fill();
        const stroke = this.spec.stroke();

        switch (this.shape) {
        case Shape.CIRCLE:
            Draw.draw(g, 'circle', {
                cx: 0, cy: 0, r: 1,
                strokeWidth, fill, stroke
            });
            break;
        case Shape.CROSS:
            Draw.draw(g, 'path', {
                d: 'M 0 1 L 4 5 L 5 4 L 1 0 L 5 -4 L 4 -5 L 0 -1 L -4 -5 L -5 -4 L -1 0 L -5 4 L -4 5 Z',
                transform: 'scale(0.2)',
                strokeWidth, fill, stroke
            });
            break;
        case Shape.FLAG:
            Draw.draw(g, 'path', {
                d: 'M -0.8 1 L -0.8 -1 L -0.6 -1 L 0.8 -0.5 L -0.6 0 L -0.6 1 Z',
                transform: 'scale(0.9)',
                strokeWidth: strokeWidth/0.9, fill, stroke
            });
            break;
        case Shape.ARROW:
            Draw.draw(g, 'path', {
                d: 'M -1 0 L 0 -1 L 1 0 L 0.4 0 L 0.4 1 L -0.4 1 L -0.4 0 Z',
                strokeWidth, fill, stroke
            });
            break;
        }

        return g;
    }
}

export class PolyTile extends Tile {
    public readonly obj = Obj.POLY;
    public readonly layer: Layer_SHAPE;
    public static readonly paradigm = Paradigm.POLY;
    constructor(
        public sides: number,
        public star: boolean,
        public spec: ObjectSpec
    ) { super(); this.layer = spec.layer(Layer_SHAPE_BASE); }
    public eq(other: PolyTile) { return this.obj === other.obj && this.sides === other.sides && this.star === other.star && this.spec.eq(other.spec); }
    public serialize(bs: BitStream) {
        bs.write(SIDE_BITS, this.sides-3);
        bs.write(1, +this.star);
        this.spec.serialize(bs, PolyTile.paradigm[this.sides]);
    }
    public draw(x: number, y: number): SVGElement {
        // TODO this square special case is extremely suspicious
        const g = this.spec.g(x, y, PolyTile.paradigm[this.sides],
                             this.sides === 4 && this.spec.transform === (this.star ? 1 : 0) ? Math.sqrt(2)*this.spec.scale() : undefined);
        const strokeWidth = this.spec.strokeWidth();
        const fill = this.spec.fill();
        const stroke = this.spec.stroke();
        Draw.poly(g, this.sides, this.star, { strokeWidth, fill, stroke });
        return g;
    }
}

export class TextTile extends Tile {
    public readonly obj = Obj.TEXT;
    public readonly layer: Layer_TEXT;
    public static readonly paradigm = Paradigm.ALL;
    constructor(
        public val: string,
        public spec: ObjectSpec
    ) { super(); this.layer = spec.layer(Layer_TEXT_BASE); }
    public eq(other: TextTile): boolean { return this.val === other.val && this.spec.eq(other.spec); }
    public serialize(bs: BitStream) {
        bs.writeString(this.val);
        this.spec.serialize(bs, TextTile.paradigm);
    }
    public draw(x: number, y: number): SVGElement {
        const [ox, oy] = this.spec.offset();
        const strokeWidth = this.spec.strokeWidth();
        const fill = this.spec.fill();
        const stroke = this.spec.stroke();
        const size = this.spec.size();

        return Draw.draw(undefined, 'text', {
            x: Measure.HALFCELL*x + ox,
            y: Measure.HALFCELL*y + oy,
            textAnchor: 'middle',
            dominantBaseline: 'central',
            fontSize: Measure.CELL*(
                this.val.length === 1 ? 0.75 :
                this.val.length === 2 ? 0.55 :
                this.val.length === 3 ? 0.4 :
                0.3
            )*(size === 1 ? 1/2 : size/3),
            textContent: this.val,
            strokeWidth, fill, stroke
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

function dos(bs: BitStream, paradigm: Paradigm): ObjectSpec {
    const fill = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
    const outline = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
    const position = bs.read(POSITION_BITS);
    const transform = bs.read(paradigm.serBits);
    return new ObjectSpec(fill, outline, position, transform);
}

const deserializefns: {[key in number]: {[key in Obj]: (bs: BitStream) => Tile}} = ((x: {[key in number]: {[key in Obj]?: (bs: BitStream) => Tile}}) => {
    for (let i = CURRENT_VERSION-1; i >= 0; --i) {
        if (x[i][Obj.SURFACE] === undefined) x[i][Obj.SURFACE] = x[i+1][Obj.SURFACE];
        if (x[i][Obj.LINE] === undefined) x[i][Obj.LINE] = x[i+1][Obj.LINE];
        if (x[i][Obj.SHAPE] === undefined) x[i][Obj.SHAPE] = x[i+1][Obj.SHAPE];
        if (x[i][Obj.TEXT] === undefined) x[i][Obj.TEXT] = x[i+1][Obj.TEXT];
        if (x[i][Obj.POLY] === undefined) x[i][Obj.POLY] = x[i+1][Obj.POLY];
        if (x[i][Obj.WALL] === undefined) x[i][Obj.WALL] = x[i+1][Obj.WALL];
    }
    return x as never;
})({ 0: {

    [Obj.LINE]: (bs: BitStream): Tile => {
        const isEdge = bs.read(1) === 1;
        const color = bs.read(1) === 0 ? 0 : bs.read(COLOR_BITS);
        const thickness = bs.read(THICKNESS_BITS);
        const head = bs.read(HEAD_BITS);
        const dir = bs.read(1) === 1;
        return new LineTile(isEdge, new LineSpec(color, thickness, head, dir));
    },

    [Obj.TEXT]: (bs: BitStream): Tile => {
        return new TextTile(bs.readString(), new ObjectSpec(0, undefined, Position.M, 0));
    }

}, 1: {

    [Obj.SHAPE]: (bs: BitStream): Tile => {
        const len = Math.min(bs.readVLQ(VLQ_CHUNK), 16);
        const arr = [];
        for (let i = 0; i < len; ++i) {
            const shape = bs.read(SHAPE_BITS);
            const fill = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
            const outline = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
            const size = POS_SIZE[5-bs.read(SIZE_BITS)];
            if (shape === 1) arr.push(new PolyTile(4, false, new ObjectSpec(fill, outline, size, 0)));
            else if (shape === 3) arr.push(new PolyTile(5, true, new ObjectSpec(fill, outline, size, 0)));
            else arr.push(new ShapeTile(shape as Shape, new ObjectSpec(fill, outline, size, 0)));
        }
        // if (arr.length !== 1) console.error(`WARNING: ${arr.length} shapes`);
        return arr as unknown as Tile; // uh oh
    },

    [Obj.TEXT]: (bs: BitStream): Tile => {
        const color = bs.read(COLOR_BITS);
        return new TextTile(bs.readString(), new ObjectSpec(color, undefined, Position.M, 0));
    }

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
        return new LineTile(isEdge, new LineSpec(color, thickness, head, dir));
    },

    [Obj.SHAPE]: (bs: BitStream): Tile => {
        const shape = bs.read(SHAPE_BITS) as Shape;
        const spec = dos(bs, ShapeTile.paradigm[shape]);
        return new ShapeTile(shape, spec);
    },

    [Obj.TEXT]: (bs: BitStream): Tile => {
        return new TextTile(bs.readString(), dos(bs, TextTile.paradigm));
    },

    [Obj.POLY]: (bs: BitStream): Tile => {
        const sides = bs.read(SIDE_BITS)+3;
        return new PolyTile(sides, !!bs.read(1), dos(bs, PolyTile.paradigm[sides]));
    },

    [Obj.WALL]: (bs: BitStream): Tile => {
        const angles = bs.read(ANGLE_BITS);
        const color = bs.read(COLOR_BITS);
        const thickness = bs.read(THICKNESS_BITS);
        const head = bs.read(HEAD_BITS);
        const dir = bs.read(1) === 1;
        return new WallTile(angles, new LineSpec(color, thickness, head, dir));
    },

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
    T extends Layer.WALL    ? WallTile    | undefined :
    T extends Layer_LINE    ? LineTile    | undefined :
    T extends Layer_SHAPE   ? ShapeTile | PolyTile | undefined :
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
