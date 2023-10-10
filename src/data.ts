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

    public constructor(public readonly color: number, x: number, y: number) {
        this.elt = Draw.draw(Layer.surface, 'rect', {
            width: Measure.CELL,
            height: Measure.CELL,
            x: Measure.CELL*x,
            y: Measure.CELL*y,
            fill: 'red'
        });
    }

    public destroy() {
        Layer.surface.removeChild(this.elt);
    }
}

export const surfaces = new Map<number, Surface>();
