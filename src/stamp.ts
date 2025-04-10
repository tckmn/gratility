import * as Draw from './draw.js';
import * as Data from './data.js';
import * as Event from './event.js';
import * as Measure from './measure.js';
import Image from './image.js';

class Stamp {
    public constructor(
        public cells: Array<Data.Item>,
        public xoff: number,
        public yoff: number,
        public xmin: number,
        public xmax: number,
        public ymin: number,
        public ymax: number
    ) {}

    public apply(xoff: number, yoff: number) {
        for (let i = 0; i < this.cells.length; ++i) {
            const cell = this.cells[i];
            const [x, y] = Data.decode(cell.n);
            const newn = Data.encode(x - this.xoff + xoff, y - this.yoff + yoff);

            const pre = Data.halfcells.get(newn)?.get(cell.layer);
            if (pre !== cell.elt.data) {
                Data.add(new Data.Change(newn, cell.layer, pre, cell.elt, i !== this.cells.length-1));
            }
        }
    }
}

// TODO this is absolutely an extremely temporary bandaid lol
let img: Image;
export const stamps = new Array<Stamp>();
let stamppos = 0;

export function render(cells: Array<Data.Item>): Stamp {
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

    const stamp = new Stamp(cells, xoff, yoff, xmin-xoff, xmax-xoff, ymin-yoff, ymax-yoff);
    return stamp;
}

export function add(cells: Array<Data.Item>) {
    if (cells.length === 0) return;

    const stamp = render(cells);
    stamps.push(stamp);
    stamppos = stamps.length-1;

    img.stamps.replaceChildren(...cells.map(cell => {
        const [x, y] = Data.decode(cell.n);
        return Draw.objdraw(cell.elt, x - stamp.xoff, y - stamp.yoff);
    }));
}

export function current(): Stamp | undefined {
    return stamppos >= 0 && stamppos < stamps.length ? stamps[stamppos] : undefined;
}

export function deselect() {
    stamppos = stamps.length;
    img.stamps.replaceChildren();
}

export function initialize(image: Image) {
    img = image;
    Event.onmove.push((x, y) => {
        // if (stamppos === -1) return;
        img.stamps.setAttribute('transform', `translate(${Measure.round(x, Measure.CELL)} ${Measure.round(y, Measure.CELL)})`);
    });
}
