import * as Data from 'data';
import * as Event from 'event';
import * as Layer from 'layer';
import * as Measure from 'measure';

class Stamp {
    public constructor(
        public cells: Array<Data.Item>,
        public xoff: number,
        public yoff: number
    ) {}
}

export const stamps = new Array<Stamp>();
let stamppos = -1;

export function add(cells: Array<Data.Item>) {
    if (cells.length === 0) return;

    const [xtmp, ytmp] = Data.decode(cells[0].n);
    let xmin = xtmp, xmax = xtmp, ymin = ytmp, ymax = ytmp;
    for (const cell of cells) {
        const [x, y] = Data.decode(cell.n);
        if (x < xmin) xmin = x;
        if (x > xmax) xmax = x;
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
    }

    const xoff = Measure.round((xmin + xmax) / 2, 2);
    const yoff = Measure.round((ymin + ymax) / 2, 2);

    const stamp = new Stamp(cells, xoff, yoff);
    stamps.push(stamp);
    stamppos = stamps.length-1;

    Layer.stamps.replaceChildren(...cells.map(cell => {
        const [x, y] = Data.decode(cell.n);
        return Data.drawfns[cell.obj](x - xoff, y - yoff, cell.data);
    }));
}

export function current(): Stamp | undefined {
    return stamppos >= 0 && stamppos < stamps.length ? stamps[stamppos] : undefined;
}

export function initialize() {
    Event.onmove.push((x, y) => {
        // if (stamppos === -1) return;
        Layer.stamps.setAttribute('transform', `translate(${Measure.round(x, Measure.CELL)} ${Measure.round(y, Measure.CELL)})`);
    });
}
