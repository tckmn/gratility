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

export const enum Layer {
    SURFACE = 0,
    PATH,
    EDGE,
    SHAPE,
    TEXT,
}

export const enum Shape {
    CIRCLE = 0,
    SQUARE,
    FLAG,
    STAR
}

export const enum Head {
    NONE = 0,
    ARROW
}

const N_BITS = 32;
const OBJ_BITS = 6;
const LAYER_BITS = 6;
const SHAPE_BITS = 6;
const COLOR_BITS = 6;
const SIZE_BITS = 3;
const VLQ_CHUNK = 4;
const HEAD_BITS = 3;
const THICKNESS_BITS = 3;


export abstract class Spec {
    // this isn't currently used anywhere but i guess i have implementations
    // for all instances
    // abstract eq(other: Spec): boolean;
}

export abstract class Tile {
    abstract readonly obj: Obj;
    // this is only ever used in DragTool to determine whether to draw or erase
    // (instance versions may be used ad hoc)
    abstract eq(other: Tile): boolean;
    abstract serialize(bs: BitStream): void;
    abstract draw(x: number, y: number): SVGElement;
}

export class SurfaceSpec extends Spec {
    constructor(
        public color: number
    ) { super(); }
    public eq(other: SurfaceSpec): boolean { return this.color === other.color; }
}
export class SurfaceTile extends Tile {
    public readonly obj = Obj.SURFACE;
    constructor(
        public spec: SurfaceSpec
    ) { super(); }
    public eq(other: SurfaceTile) { return this.spec.eq(other.spec); }
    public serialize(bs: BitStream) {
        bs.write(COLOR_BITS, this.spec.color);
    }
    public draw(x: number, y: number): SVGElement {
        return Draw.draw(undefined, 'rect', {
            width: Measure.CELL,
            height: Measure.CELL,
            x: Measure.HALFCELL*(x-1),
            y: Measure.HALFCELL*(y-1),
            fill: Color.colors[this.spec.color]
        });
    }
}

export class LineSpec extends Spec {
    constructor(
        public isEdge: boolean,
        public color: number,
        public thickness: number,
        public head: Head
    ) { super(); }
    public eq(other: LineSpec): boolean {
        return this.isEdge === other.isEdge && this.head === other.head
            && this.color === other.color && this.thickness === other.thickness;
    }
}
export class LineTile extends Tile {
    public readonly obj = Obj.LINE;
    constructor(
        public spec: LineSpec,
        public dir: boolean
    ) { super(); }
    public eq(other: LineTile): boolean {
        return this.spec.eq(other.spec) &&
            (this.spec.head === Head.NONE ? true : this.dir === other.dir);
    }
    public serialize(bs: BitStream) {
        bs.write(1, this.spec.isEdge ? 1 : 0);
        bs.write(COLOR_BITS, this.spec.color);
        bs.write(THICKNESS_BITS, this.spec.thickness);
        bs.write(HEAD_BITS, this.spec.head);
        bs.write(1, this.dir ? 1 : 0);
    }
    public draw(x: number, y: number): SVGElement {
        const g = Draw.draw(undefined, 'g', {
            transform: `
                rotate(${((y%2===0) == this.spec.isEdge ? 0 : 90) + (this.dir ? 180 : 0)} ${x*Measure.HALFCELL} ${y*Measure.HALFCELL})
                `
        });
        const stroke = Color.colors[this.spec.color];
        const strokeLinecap = 'round'
        const strokeWidth = Measure.LINE * this.spec.thickness;
        const adjust = (z : number, n : number) => (z*Measure.HALFCELL+n*Math.sqrt(this.spec.thickness));
        Draw.draw(g, 'line', {
            x1: adjust(x+1,0),
            x2: adjust(x-1,0),
            y1: adjust(y,0),
            y2: adjust(y,0),
            stroke, strokeLinecap, strokeWidth
        });
        if (this.spec.head === Head.ARROW) {
            Draw.draw(g, 'path', {
                d: `M ${adjust(x,3)} ${adjust(y,5)} L ${adjust(x,-2)} ${adjust(y,0)} L ${adjust(x,3)} ${adjust(y,-5)}`,
                fill: 'none',
                stroke, strokeLinecap, strokeWidth
            });
        }
        return g;
    }
}

export class ShapeSpec extends Spec {
    constructor(
        public shape: Shape,
        public fill: number | undefined,
        public outline: number | undefined,
        public size: number
    ) { super(); }
    public eq(other: ShapeSpec): boolean { return this.shape === other.shape && this.size === other.size; }
}
export class ShapeTile extends Tile {
    public readonly obj = Obj.SHAPE;
    constructor(
        public shapes: ShapeSpec[]
    ) { super(); }
    public eq(other: ShapeTile) { return other.shapes.some(sh => sh.eq(this.shapes[0])); }
    public serialize(bs: BitStream) {
        bs.writeVLQ(VLQ_CHUNK, this.shapes.length);
        for (const spec of this.shapes) {
            bs.write(SHAPE_BITS, spec.shape);
            if (spec.fill === undefined) bs.write(1, 0);
            else { bs.write(1, 1); bs.write(COLOR_BITS, spec.fill); }
            if (spec.outline === undefined) bs.write(1, 0);
            else { bs.write(1, 1); bs.write(COLOR_BITS, spec.outline); }
            bs.write(SIZE_BITS, spec.size);
        }
    }
    public draw(x: number, y: number): SVGElement {
        const g = Draw.draw(undefined, 'g', {
            transform: `translate(${x * Measure.HALFCELL} ${y * Measure.HALFCELL})`
        });

        for (const spec of this.shapes) {
            const r = Measure.HALFCELL * (spec.size/6);
            const strokeWidth = Measure.HALFCELL * (0.05 + 0.1*(spec.size/12));
            const fill = spec.fill === undefined ? 'none' : Color.colors[spec.fill];
            const stroke = spec.outline === undefined ? 'none' : Color.colors[spec.outline];

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
        }

        return g;
    }
}

export class TextSpec extends Spec {
    constructor(
        public color: number,
        public val: string
    ) { super(); }
    public eq(other: TextSpec): boolean { return this.color === other.color && this.val === other.val; }
}
export class TextTile extends Tile {
    public readonly obj = Obj.TEXT;
    constructor(
        public spec: TextSpec
    ) { super(); }
    public eq(other: TextTile): boolean { return this.spec === other.spec; }
    public serialize(bs: BitStream) {
        bs.write(COLOR_BITS, this.spec.color);
        bs.writeString(this.spec.val);
    }
    public draw(x: number, y: number): SVGElement {
        return Draw.draw(undefined, 'text', {
            x: Measure.HALFCELL*x,
            y: Measure.HALFCELL*y,
            textAnchor: 'middle',
            dominantBaseline: 'central',
            fontSize: Measure.CELL*(
                this.spec.val.length === 1 ? 0.75 :
                this.spec.val.length === 2 ? 0.55 :
                this.spec.val.length === 3 ? 0.4 :
                0.3
            ),
            textContent: this.spec.val
        });
    }
}


export class Item {
    public constructor(
        public readonly n: number,
        public readonly layer: Layer,
        public readonly tile: Tile
    ) {}
}

export class Change {
    public constructor(
        public readonly n: number,
        public readonly layer: Layer,
        public readonly pre: Tile | undefined,
        public readonly post: Tile | undefined,
        public linked: boolean = false,
    ) {}
    public rev() { return new Change(this.n, this.layer, this.post, this.pre, this.linked); }
}

const deserializefns = {

    [Obj.SURFACE]: (bs: BitStream): Tile => {
        return new SurfaceTile(new SurfaceSpec(bs.read(COLOR_BITS)));
    },

    [Obj.LINE]: (bs: BitStream): Tile => {
        const isEdge = bs.read(1) === 1;
        const color = bs.read(COLOR_BITS);
        const thickness = bs.read(THICKNESS_BITS);
        const head = bs.read(HEAD_BITS);
        const dir = bs.read(1) === 1;
        return new LineTile(new LineSpec(isEdge, color, thickness, head), dir);
    },

    [Obj.SHAPE]: (bs: BitStream): Tile => {
        // check to make sure this isn't unreasonably large
        // (maybe should do something if it is?)
        const len = Math.min(bs.readVLQ(VLQ_CHUNK), 16);
        const arr = [];
        for (let i = 0; i < len; ++i) {
            const shape = bs.read(SHAPE_BITS) as Shape;
            const fill = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
            const outline = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
            const size = bs.read(SIZE_BITS);
            arr.push(new ShapeSpec(shape, fill, outline, size));
        }
        return new ShapeTile(arr);
    },

    [Obj.TEXT]: (bs: BitStream): Tile => {
        return new TextTile(new TextSpec(bs.read(COLOR_BITS), bs.readString()));
    },

};

export function serializeStamp(stamp: Array<Item>): Uint8Array<ArrayBuffer> {
    const bs = BitStream.empty();
    bs.write(1, 0);

    for (const item of stamp) {
        bs.write(N_BITS, item.n);
        bs.write(OBJ_BITS, item.tile.obj);
        bs.write(LAYER_BITS, item.layer);
        item.tile.serialize(bs);
    }

    return bs.cut();
}

export function deserializeStamp(arr: Uint8Array<ArrayBuffer>): Array<Item> {
    const stamp = new Array<Item>();
    const bs = BitStream.fromArr(arr);

    const version = bs.read(1);
    if (version !== 0) {
        Courier.alert('deserialize: invalid version number');
        return [];
    }

    while (1) {
        const n = bs.read(N_BITS);
        if (!bs.inbounds()) break;
        const obj = bs.read(OBJ_BITS) as Obj;
        const layer = bs.read(LAYER_BITS) as Layer;
        stamp.push(new Item(n, layer, deserializefns[obj](bs)));
    }

    return stamp;
}

export function serializeChanges(changes: Array<Change>): Uint8Array<ArrayBuffer> {
    const bs = BitStream.empty();
    bs.write(1, 0);

    for (const ch of changes) {
        bs.write(N_BITS, ch.n);
        bs.write(LAYER_BITS, ch.layer);
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

    const version = bs.read(1);
    if (version !== 0) {
        Courier.alert('deserialize: invalid version number');
        return [];
    }

    while (1) {
        const n = bs.read(N_BITS);
        if (!bs.inbounds()) break;
        const layer = bs.read(LAYER_BITS) as Layer;
        const preobj = bs.read(OBJ_BITS);
        const pre = preobj === (1<<OBJ_BITS)-1 ? undefined : deserializefns[preobj as Obj](bs);
        const postobj = bs.read(OBJ_BITS);
        const post = postobj === (1<<OBJ_BITS)-1 ? undefined : deserializefns[postobj as Obj](bs);
        changes.push(new Change(n, layer, pre, post));
    }

    return changes;
}


// TODO a lot of this class is very hacky
class Halfcell {
    public [Layer.SURFACE]: SurfaceTile | undefined;
    public [Layer.PATH]: LineTile | undefined;
    public [Layer.EDGE]: LineTile | undefined;
    public [Layer.SHAPE]: ShapeTile | undefined;
    public [Layer.TEXT]: TextTile | undefined;

    public empty(): boolean {
        return this[Layer.SURFACE] === undefined &&
            this[Layer.PATH] === undefined &&
            this[Layer.EDGE] === undefined &&
            this[Layer.SHAPE] === undefined &&
            this[Layer.TEXT] === undefined;
    }

    public delete(l: Layer) { this[l] = undefined; }
    public set(l: Layer, t: Tile) { this[l] = t as any; }

    public map<T>(f: (l: Layer, t :Tile) => T): T[] {
        const arr = [];
        if (this[Layer.SURFACE] !== undefined) arr.push(f(Layer.SURFACE, this[Layer.SURFACE]));
        if (this[Layer.PATH] !== undefined) arr.push(f(Layer.PATH, this[Layer.PATH]));
        if (this[Layer.EDGE] !== undefined) arr.push(f(Layer.EDGE, this[Layer.EDGE]));
        if (this[Layer.SHAPE] !== undefined) arr.push(f(Layer.SHAPE, this[Layer.SHAPE]));
        if (this[Layer.TEXT] !== undefined) arr.push(f(Layer.TEXT, this[Layer.TEXT]));
        return arr;
    }
}

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
                const elt = this.drawn.get(change.n)?.get(change.layer);
                if (elt !== undefined) this.image.obj(change.layer).removeChild(elt);
            }

            // delete item
            const hc = this.halfcells.get(change.n);
            hc?.delete(change.layer);
            if (hc?.empty()) this.halfcells.delete(change.n);

        }

        if (change.post !== undefined) {

            // create item
            if (!this.halfcells.has(change.n)) this.halfcells.set(change.n, new Halfcell());
            this.halfcells.get(change.n)!.set(change.layer, change.post);

            if (this.image !== undefined) {
                // draw it
                const [x, y] = decode(change.n);
                const elt = change.post.draw(x, y);
                this.image.obj(change.layer).appendChild(elt);

                // save the element
                if (!this.drawn.has(change.n)) this.drawn.set(change.n, new Map());
                this.drawn.get(change.n)?.set(change.layer, elt);
            }

        }
    }

    public listcells(): Array<Item> {
        const cells = new Array<Item>();
        for (const [n, hc] of this.halfcells) {
            cells.push(...hc.map((k,v) => {
                return new Item(n, k, v);
            }));
        }
        return cells;
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
