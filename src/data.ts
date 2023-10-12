import * as Draw from 'draw';
import * as Layer from 'layer';
import * as Measure from 'measure';

export function encode(x: number, y: number): number {
    return (x << 16) | (y & 0xffff);
}
export function decode(n: number): [number, number] {
    return [n >> 16, n << 16 >> 16];
}

export class Surface {
    private elt: SVGElement;

    public constructor(public readonly color: number, n: number) {
        const [x, y] = decode(n);
        this.elt = Draw.draw(Layer.surface, 'rect', {
            width: Measure.CELL,
            height: Measure.CELL,
            x: Measure.HALFCELL*x,
            y: Measure.HALFCELL*y,
            fill: 'red'
        });
    }

    public destroy() {
        Layer.surface.removeChild(this.elt);
    }
}

export const surfaces = new Map<number, Surface>();

export class Line {
    private elt: SVGElement;

    public constructor(public readonly color: number, n: number) {
        const [x, y] = decode(n);
        const horiz = Measure.hctype(x, y) === Measure.HC.EVERT ? 1 : 0;
        this.elt = Draw.draw(Layer.line, 'line', {
            x1: (x - horiz) * Measure.HALFCELL,
            x2: (x + horiz) * Measure.HALFCELL,
            y1: (y - (1-horiz)) * Measure.HALFCELL,
            y2: (y + (1-horiz)) * Measure.HALFCELL,
            stroke: 'green'
        });
    }

    public destroy() {
        Layer.line.removeChild(this.elt);
    }
}

export const lines = new Map<number, Line>();
