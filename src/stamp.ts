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

    public apply(data: Data.DataManager, xoff: number, yoff: number) {
        for (let i = 0; i < this.cells.length; ++i) {
            const cell = this.cells[i];
            const [x, y] = Data.decode(cell.n);
            const newn = Data.encode(x - this.xoff + xoff, y - this.yoff + yoff);

            const pre = data.halfcells.get(newn)?.get(cell.layer);
            if (pre !== cell.elt.data) {
                data.add(new Data.Change(newn, cell.layer, pre, cell.elt, i !== this.cells.length-1));
            }
        }
    }
}

export class StampManager {

    public readonly stamps = new Array<Stamp>();
    private stamppos: number = 0;

    public constructor(private image: Image) {
        // TODO this definitely belongs somewhere else
        Event.onmove.push((x, y) => {
            // if (stamppos === -1) return;
            this.image.stamps.setAttribute('transform', `translate(${Measure.round(x, Measure.CELL)} ${Measure.round(y, Measure.CELL)})`);
        });
    }

    // TODO does not need to be method
    public render(cells: Array<Data.Item>): Stamp {
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

    public add(cells: Array<Data.Item>) {
        if (cells.length === 0) return;

        const stamp = this.render(cells);
        this.stamps.push(stamp);
        this.stamppos = this.stamps.length-1;

        this.image.stamps.replaceChildren(...cells.map(cell => {
            const [x, y] = Data.decode(cell.n);
            return Draw.objdraw(cell.elt, x - stamp.xoff, y - stamp.yoff);
        }));
    }

    public current(): Stamp | undefined {
        return this.stamppos >= 0 && this.stamppos < this.stamps.length ? this.stamps[this.stamppos] : undefined;
    }

    public deselect() {
        this.stamppos = this.stamps.length;
        this.image.stamps.replaceChildren();
    }

}
