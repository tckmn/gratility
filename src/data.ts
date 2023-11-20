import * as Draw from 'draw';
import * as Layer from 'layer';
import * as Measure from 'measure';

export function encode(x: number, y: number): number {
    return (x << 16) | (y & 0xffff);
}
export function decode(n: number): [number, number] {
    return [n >> 16, n << 16 >> 16];
}

function itemadd(item: Item) {
    // create item
    if (!halfcells.has(item.n)) halfcells.set(item.n, new Halfcell(item.n));
    halfcells.get(item.n)!.set(item.obj, item);

    // draw it
    const [x, y] = decode(item.n);
    const elt = item.draw(x, y);
    Layer.obj(item.obj).appendChild(elt);

    // save the element
    if (!drawn.has(item.n)) drawn.set(item.n, new Map());
    drawn.get(item.n)?.set(item.obj, elt);
}

function itemdel(item: Item) {
    // delete the drawing TODO the undefined case should never happen
    const elt = drawn.get(item.n)?.get(item.obj);
    if (elt !== undefined) Layer.obj(item.obj).removeChild(elt);

    // delete item
    if (halfcells.get(item.n)?.delete(item.obj)) {
        halfcells.delete(item.n);
    }
}

export const enum Obj {
    SURFACE = 0,
    LINE,
}

export abstract class Action {
    public constructor(public isUndo: boolean) {}

    public abstract perform(): void;
    public abstract unperform(): void;
}

export class ItemAction extends Action {
    public constructor(
        public item: Item,
        public isUndo: boolean
    ) { super(isUndo); }

    public perform() {
        itemadd(this.item);
    }

    public unperform() {
        itemdel(this.item);
    }
}

export class PasteAction extends Action {
    public constructor(
        public items: Array<Item>,
        public isUndo: boolean
    ) { super(isUndo); }

    public perform() {
        for (const item of this.items) itemadd(item);
    }

    public unperform() {
        for (const item of this.items) itemdel(item);
    }
}

export abstract class Item {
    public abstract obj: Obj;
    public constructor(public n: number, public data: any) {}
    public abstract clone(): Item;
    public abstract draw(x: number, y: number): SVGElement;
}

export class Surface extends Item {
    public obj = Obj.SURFACE;
    public clone() { return new Surface(this.n, this.data); }
    public draw(x: number, y: number) {
        return Draw.draw(undefined, 'rect', {
            width: Measure.CELL,
            height: Measure.CELL,
            x: Measure.HALFCELL*x,
            y: Measure.HALFCELL*y,
            fill: 'red'
        });
    }
}

export class Line extends Item {
    public obj = Obj.LINE;
    public clone() { return new Line(this.n, this.data); }
    public draw(x: number, y: number) {
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
}

export class Halfcell {
    public surface: Surface | undefined;
    public line: Line | undefined;

    private howmany: number = 0;

    public constructor(
        public n: number
    ) {}

    public get(obj: Obj): Item | undefined {
        switch (obj) {
        case Obj.SURFACE: return this.surface;
        case Obj.LINE:    return this.line;
        }
    }

    public set(obj: Obj, data: any): Item {
        switch (obj) {
        case Obj.SURFACE: if (this.surface === undefined) ++this.howmany; this.surface = new Surface(this.n, data); return this.surface;
        case Obj.LINE:    if (this.line === undefined)    ++this.howmany; this.line    = new Line(this.n, data);    return this.line
        }
    }

    // returns whether the halfcell is gone now for optimization purposes
    public delete(obj: Obj): boolean {
        switch (obj) {
        case Obj.SURFACE: if (this.surface !== undefined) --this.howmany; this.surface = undefined;
        case Obj.LINE:    if (this.line !== undefined)    --this.howmany; this.line    = undefined;
        }
        return this.howmany === 0;
    }

    public map<T>(fn: (i: Item) => T | undefined): Array<T> {
        return [this.surface, this.line].map(x => x === undefined ? undefined : fn(x)).filter(x => x !== undefined) as Array<T>;
    }
}

export const halfcells = new Map<number, Halfcell>();
const drawn = new Map<number, Map<Obj, SVGElement>>();

const history = new Array<Action>();
let histpos = 0;

export function add(action: Action) {
    if (histpos < history.length) history.splice(histpos, history.length);
    history.push(action);
    undo(false);
}

export function undo(isUndo: boolean) {
    if (isUndo ? (histpos <= 0) : (histpos >= history.length)) return;

    const action = history[isUndo ? --histpos : histpos++];

    if (action.isUndo === isUndo) {
        action.perform();
    } else {
        action.unperform();
    }
}
