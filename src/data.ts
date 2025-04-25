import * as Measure from './measure.js';
import * as Courier from './courier.js';
import BitStream from './bitstream.js';
import Image from './image.js';
import * as Draw from './draw.js';
import * as Stamp from './stamp.js';

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

export function headsymmetric(h: Head) {
    switch (h) {
    case Head.NONE: return true;
    case Head.ARROW: return false;
    }
}


export type ShapeSpec = {
    shape: Shape,
    fill: number | undefined,
    outline: number | undefined,
    size: number
}

export type LineSpec = {
    isEdge: boolean,
    color: number,
    thickness: number,
    head: Head
}

export function sheq(a: ShapeSpec, b: ShapeSpec) {
    return a.shape === b.shape && a.size === b.size;
}

export function linedateq(a: LineSpec, b: LineSpec) {
    return a.isEdge === b.isEdge && a.head === b.head
        && a.color === b.color && a.thickness === b.thickness;
}

export function lineeq([spec1, dir1]: [LineSpec, boolean], [spec2, dir2]: [LineSpec, boolean]) {
    if (!linedateq(spec1, spec2)) return false;
    switch (spec1.head) {
        case Head.NONE: return true;
        case Head.ARROW: return dir1 === dir2;
    }
}

export class Element {
    public constructor(
        public readonly obj: Obj,
        public readonly data: any,
    ) {}
}

export class Item {
    public constructor(
        public readonly n: number,
        public readonly layer: Layer,
        public readonly elt: Element
    ) {}
}

export class Change {
    public constructor(
        public readonly n: number,
        public readonly layer: Layer,
        public readonly pre: Element | undefined,
        public readonly post: Element | undefined,
        public linked: boolean = false,
    ) {}
    public rev() { return new Change(this.n, this.layer, this.post, this.pre, this.linked); }
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

const serializefns: { [obj in Obj]: (bs: BitStream, data: never) => void } = {

    [Obj.SURFACE]: (bs: BitStream, data: number) => {
        bs.write(COLOR_BITS, data);
    },

    [Obj.LINE]: (bs: BitStream, [spec, dir]: [LineSpec, boolean]) => {
            bs.write(1, spec.isEdge ? 1 : 0);
            if (spec.color === undefined) bs.write(1, 0);
            else { bs.write(1, 1); bs.write(COLOR_BITS, spec.color); }
            bs.write(THICKNESS_BITS, spec.thickness);
            bs.write(HEAD_BITS, spec.head);
            bs.write(1, dir ? 1 : 0);
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
        const isEdge = bs.read(1) === 1;
        const color = bs.read(1) === 0 ? undefined : bs.read(COLOR_BITS);
        const thickness = bs.read(THICKNESS_BITS);
        const head = bs.read(HEAD_BITS);
        const dir = bs.read(1) === 1;
        return [{isEdge, color, thickness, head}, dir];
    },

    [Obj.SHAPE]: (bs: BitStream): any => {
        // check to make sure this isn't unreasonably large
        // (maybe should do something if it is?)
        const len = Math.min(bs.readVLQ(VLQ_CHUNK), 16);
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

export function serializeStamp(stamp: Array<Item>): Uint8Array {
    const bs = BitStream.empty();
    bs.write(1, 0);

    for (const item of stamp) {
        bs.write(N_BITS, item.n);
        bs.write(OBJ_BITS, item.elt.obj);
        bs.write(LAYER_BITS, item.layer);
        serializefns[item.elt.obj](bs, item.elt.data as never);
    }

    return bs.cut();
}

export function deserializeStamp(arr: Uint8Array): Array<Item> {
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
        stamp.push(new Item(n, layer, new Element(obj, deserializefns[obj](bs))));
    }

    return stamp;
}

export function serializeChanges(changes: Array<Change>): Uint8Array {
    const bs = BitStream.empty();
    bs.write(1, 0);

    for (const ch of changes) {
        bs.write(N_BITS, ch.n);
        bs.write(LAYER_BITS, ch.layer);
        if (ch.pre === undefined) {
            bs.write(OBJ_BITS, (1<<OBJ_BITS)-1);
        } else {
            bs.write(OBJ_BITS, ch.pre.obj);
            serializefns[ch.pre.obj](bs, ch.pre.data as never);
        }
        if (ch.post === undefined) {
            bs.write(OBJ_BITS, (1<<OBJ_BITS)-1);
        } else {
            bs.write(OBJ_BITS, ch.post.obj);
            serializefns[ch.post.obj](bs, ch.post.data as never);
        }
    }

    return bs.cut();
}

export function deserializeChanges(arr: Uint8Array): Array<Change> {
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
        const pre = preobj === (1<<OBJ_BITS)-1 ? undefined : new Element(preobj, deserializefns[preobj as Obj](bs));
        const postobj = bs.read(OBJ_BITS);
        const post = postobj === (1<<OBJ_BITS)-1 ? undefined : new Element(postobj, deserializefns[postobj as Obj](bs));
        changes.push(new Change(n, layer, pre, post));
    }

    return changes;
}

export class DataManager {

    public readonly halfcells = new Map<number, Map<Layer, Element>>();
    private readonly drawn = new Map<number, Map<Layer, SVGElement>>();

    private readonly history = new Array<Change>();
    private histpos = 0;

    private ws: WebSocket | undefined = undefined;
    private hasReceivedDocument = false;
    private db: IDBDatabase | undefined = undefined;
    private dburl: string | undefined = undefined;
    private dbto: ReturnType<typeof setTimeout> | undefined = undefined;

    public constructor(private image: Image | undefined = undefined) {}

    public connectWS(url: string, initmsg: any, onopen?: (() => void), onclose?: (() => void)) {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';
        this.ws.addEventListener('open', () => {
            Courier.alert('connected to server');
            if (initmsg !== undefined) this.ws?.send(JSON.stringify(initmsg));
            if (onopen !== undefined) onopen();
        });
        this.ws.addEventListener('error', () => {
            Courier.alert('server connection failed');
            this.ws = undefined;
            if (onclose !== undefined) onclose();
        });
        this.ws.addEventListener('close', () => {
            Courier.alert('server connection lost');
            this.ws = undefined;
            if (onclose !== undefined) onclose();
        });
        this.ws.addEventListener('message', this.message.bind(this));
    }

    public connectDB(url: string, onopen?: (() => void), onclose?: (() => void)) {
        this.dburl = url;
        const req = window.indexedDB.open('gratility', 1);
        req.onsuccess = (ev) => {
            this.db = (ev.target as IDBRequest).result;
            this.db!.transaction(['docs'], 'readonly').objectStore('docs').get(url).onsuccess = (ev: Event) => {
                // TODO kinda bad
                new Stamp.Stamp(deserializeStamp((ev.target as IDBRequest).result), 0, 0, 0, 0, 0, 0).apply(this, 0, 0);
                this.hasReceivedDocument = true;
            };
            if (onopen !== undefined) onopen();
        };
        req.onerror = () => {
            Courier.alert('local database connection failed');
            this.db = undefined;
            if (onclose !== undefined) onclose();
        };
        req.onupgradeneeded = (ev: IDBVersionChangeEvent) => {
            this.db = (ev.target as IDBRequest).result;
            this.db!.createObjectStore('docs');
        };
    }

    private message(msg: MessageEvent<any>) {
        if (!(msg.data instanceof ArrayBuffer)) {
            const json = JSON.parse(msg.data);
            if (json.alert !== undefined) Courier.alert(json.alert);
            if (json.token !== undefined) localStorage.token = json.token;
        } else if (this.hasReceivedDocument) {
            for (const ch of deserializeChanges(new Uint8Array(msg.data))) {
                this.perform(ch);
            }
        } else {
            // TODO kinda bad
            new Stamp.Stamp(deserializeStamp(new Uint8Array(msg.data)), 0, 0, 0, 0, 0, 0).apply(this, 0, 0);
            this.hasReceivedDocument = true;
        }
    }

    public add(change: Change) {
        if (this.histpos < this.history.length) this.history.splice(this.histpos, this.history.length);
        this.history.push(change);
        this.undo(false);
    }

    public breakLink() {
        this.history[this.histpos-1].linked = false;
    }

    public undo(isUndo: boolean) {
        do {
            if (isUndo ? (this.histpos <= 0) : (this.histpos >= this.history.length)) return;
            const change = this.history[isUndo ? --this.histpos : this.histpos++];
            const real = isUndo ? change.rev() : change;
            this.perform(real);
            if (this.hasReceivedDocument) {
                if (this.ws !== undefined) {
                    this.ws.send(serializeChanges([real]));
                } else if (this.db !== undefined) {
                    console.log('hi');
                    if (this.dbto === undefined) this.dbto = setTimeout(() => {
                        const tr = this.db!.transaction(['docs'], 'readwrite');
                        tr.oncomplete = () => { this.dbto = undefined; };
                        const os = tr.objectStore('docs');
                        os.put(serializeStamp(this.listcells()), this.dburl);
                    }, 3000);
                }
            }
        } while (this.history[this.histpos-1]?.linked);
    }

    public perform(change: Change) {
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
            if (hc?.size === 0) this.halfcells.delete(change.n);

        }

        if (change.post !== undefined) {

            // create item
            if (!this.halfcells.has(change.n)) this.halfcells.set(change.n, new Map());
            this.halfcells.get(change.n)!.set(change.layer, change.post);

            if (this.image !== undefined) {
                // draw it
                const [x, y] = decode(change.n);
                const elt = Draw.objdraw(change.post, x, y);
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
            cells.push(...Array.from(hc.entries()).map(([k,v]) => {
                return new Item(n, k, v);
            }));
        }
        return cells;
    }

    public pending(): boolean {
        return this.ws === undefined && this.dbto !== undefined;
    }

}
