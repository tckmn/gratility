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

    public toSVG(svg: SVGElement, bgcolor: string | undefined = '#fff', imgpad: number = 1, gridpad: number = 0) {
        const image = new Image(svg);
        const data = new Data.DataManager(image);
        this.apply(data, 0, 0);

        const xmin = Math.floor(this.xmin/2)*2;
        const ymin = Math.floor(this.ymin/2)*2;
        const xmax = Math.ceil(this.xmax/2)*2;
        const ymax = Math.ceil(this.ymax/2)*2;
        image.grid(xmin-gridpad, xmax+gridpad, ymin-gridpad, ymax+gridpad);
        const vx = Measure.HALFCELL*(xmin-imgpad);
        const vy = Measure.HALFCELL*(ymin-imgpad);
        const vw = Measure.HALFCELL*(xmax-xmin+2*imgpad);
        const vh = Measure.HALFCELL*(ymax-ymin+2*imgpad);

        image.text.setAttribute('transform', 'translate(0 2.5)');
        svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
        svg.setAttribute('version', '1.1');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

        if (bgcolor !== undefined) {
            image.root.prepend(Draw.draw(undefined, 'rect', { fill: bgcolor, x: vx, y: vy, w: vw, h: vh }));
        }
    }
}

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

    public add(cells: Array<Data.Item>) {
        if (cells.length === 0) return;

        const stamp = render(cells);
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
