import * as Data from 'data';
import * as Event from 'event';
import * as Layer from 'layer';
import * as Measure from 'measure';

class Stamp {
    public constructor(
        public cells: Map<number, Data.Halfcell>,
        public xoff: number,
        public yoff: number
    ) {}
}

export const stamps = new Array<Stamp>();
export let stamppos = -1;

export function add(cells: Map<number, Data.Halfcell>, xmin: number, xmax: number, ymin: number, ymax: number) {
    const xoff = Measure.round((xmin + xmax) / 2, 2);
    const yoff = Measure.round((ymin + ymax) / 2, 2);

    const stamp = new Stamp(cells, xoff, yoff);
    stamps.push(stamp);
    stamppos = stamps.length-1;

    Layer.stamps.replaceChildren(...Array.from(cells.entries()).flatMap(([n, hc]) => {
        const [x, y] = Data.decode(n);
        return hc.map(item => item.draw(x - xoff, y - yoff));
    }));
}

export function initialize() {
    Event.onmove.push((x, y) => {
        if (stamppos === -1) return;
        Layer.stamps.setAttribute('transform', `translate(${Measure.round(x, Measure.CELL)} ${Measure.round(y, Measure.CELL)})`);
    });
}
