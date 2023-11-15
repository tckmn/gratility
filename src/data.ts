import * as Draw from 'draw';
import * as Layer from 'layer';
import * as Measure from 'measure';

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

export class Action {
    public constructor(
        public obj: Obj,
        public n: number,
        public data: number
    ) {}
}

export class Item {
    protected elt: SVGElement | undefined;
    public constructor(protected n: number) {}
    public init() {}
    public deinit() {}
}

export class Surface extends Item {
    public init() {
        const [x, y] = decode(this.n);
        this.elt = Draw.draw(Layer.surface, 'rect', {
            width: Measure.CELL,
            height: Measure.CELL,
            x: Measure.HALFCELL*x,
            y: Measure.HALFCELL*y,
            fill: 'red'
        });
    }

    public deinit() {
        if (this.elt !== undefined) Layer.surface.removeChild(this.elt);
    }
}

export class Line extends Item {
    public init() {
        const [x, y] = decode(this.n);
        const horiz = Measure.hctype(x, y) === Measure.HC.EVERT ? 1 : 0;
        this.elt = Draw.draw(Layer.line, 'line', {
            x1: (x - horiz) * Measure.HALFCELL,
            x2: (x + horiz) * Measure.HALFCELL,
            y1: (y - (1-horiz)) * Measure.HALFCELL,
            y2: (y + (1-horiz)) * Measure.HALFCELL,
            stroke: 'green'
        });
    }

    public deinit() {
        if (this.elt !== undefined) Layer.line.removeChild(this.elt);
    }
}

export class Halfcell {
    public surface: Surface | undefined;
    public line: Surface | undefined;

    public constructor(
        public n: number
    ) {}

    public get(obj: Obj): Item | undefined {
        switch (obj) {
        case Obj.SURFACE: return this.surface;
        case Obj.LINE:    return this.line;
        }
    }

    public set(obj: Obj, data: number): Item {
        switch (obj) {
        case Obj.SURFACE: this.surface = new Surface(this.n); return this.surface;
        case Obj.LINE:    this.line    = new Line(this.n);    return this.line
        }
    }

    // should return whether the halfcell is gone now for optimization purposes
    // doesn't do that yet
    public delete(obj: Obj): boolean {
        switch (obj) {
        case Obj.SURFACE: this.surface = undefined;
        case Obj.LINE:    this.line    = undefined;
        }
        return false;
    }
}

export const halfcells = new Map<number, Halfcell>();

const history = new Array<Action>();
let histpos = 0;

export function add(action: Action) {
    if (histpos < history.length) history.splice(histpos, history.length);
    history.push(action);
    undo(true);
}

export function undo(isActuallyRedo: boolean) {
    if (isActuallyRedo ? (histpos >= history.length) : (histpos <= 0)) return;

    const action = history[isActuallyRedo ? histpos++ : --histpos];

    if ((action.data & 1) ^ (isActuallyRedo ? 1 : 0)) {
        // delete item
        halfcells.get(action.n)?.get(action.obj)?.deinit();
        if (halfcells.get(action.n)?.delete(action.obj)) {
            halfcells.delete(action.n);
        }
    } else {
        // create item
        if (!halfcells.has(action.n)) {
            halfcells.set(action.n, new Halfcell(action.n));
        }
        halfcells.get(action.n)?.set(action.obj, action.data).init();
    }
}
