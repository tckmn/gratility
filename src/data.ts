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

export class Surface {
    private elt: SVGElement | undefined;

    public constructor(private n: number) {
    }

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

export class Line {
    private elt: SVGElement | undefined;

    public constructor(private n: number) {
    }

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

export const surfaces = new Map<number, Surface>();
export const lines = new Map<number, Line>();

const history = new Array<Action>();
let histpos = 0;

export function add(action: Action) {
    history.push(action);
    redo();
}

export function undo() {
    if (histpos <= 0) return;

    const action = history[--histpos];
    switch (action.obj) {

    case Obj.SURFACE:
        if (action.data === 1) {
            surfaces.get(action.n)?.deinit();
            surfaces.delete(action.n);
        } else {
            const surface = new Surface(action.n);
            surface.init();
            surfaces.set(action.n, surface);
        }
        break;

    case Obj.LINE:
        if (action.data === 1) {
            lines.get(action.n)?.deinit();
            lines.delete(action.n);
        } else {
            const line = new Line(action.n);
            line.init();
            lines.set(action.n, line);
        }
        break;

    }
}

export function redo() {
    if (histpos >= history.length) return;

    const action = history[histpos++];
    switch (action.obj) {

    case Obj.SURFACE:
        if (action.data === 0) {
            surfaces.get(action.n)?.deinit();
            surfaces.delete(action.n);
        } else {
            const surface = new Surface(action.n);
            surface.init();
            surfaces.set(action.n, surface);
        }
        break;

    case Obj.LINE:
        if (action.data === 0) {
            lines.get(action.n)?.deinit();
            lines.delete(action.n);
        } else {
            const line = new Line(action.n);
            line.init();
            lines.set(action.n, line);
        }
        break;

    }
}
