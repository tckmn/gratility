import * as Data from 'data';
import * as Event from 'event';
import * as Layer from 'layer';
import * as Measure from 'measure';

class Stamp {
    public constructor(
        public cells: Map<number, Data.Halfcell>,
        public xmin: number,
        public xmax: number,
        public ymin: number,
        public ymax: number
    ) {}
}

export const stamps = new Array<Stamp>();
export let stamppos = -1;

function round(x: number, r: number) { return Math.round(x/r)*r; }

export function add(cells: Map<number, Data.Halfcell>, xmin: number, xmax: number, ymin: number, ymax: number) {
    const stamp = new Stamp(cells, xmin, xmax, ymin, ymax);
    stamps.push(stamp);
    stamppos = stamps.length-1;

    const xoff = round((xmin + xmax) / 2, 2);
    const yoff = round((ymin + ymax) / 2, 2);
    Layer.stamps.replaceChildren(...Array.from(cells.entries()).flatMap(([n, hc]) => {
        const [x, y] = Data.decode(n);
        return hc.map(item => item.draw(x - xoff, y - yoff));
    }));
}

export function initialize() {
    Event.onmove.push((x, y) => {
        if (stamppos === -1) return;
        Layer.stamps.setAttribute('transform', `translate(${round(x, Measure.CELL)} ${round(y, Measure.CELL)})`);
    });
}
