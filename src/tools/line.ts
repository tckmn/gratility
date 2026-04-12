import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';
import * as Draw from '../draw.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';

export default class LineTool extends Tool.Tool {

    public readonly repeat = false;
    public icon(): SVGElement {
        return Draw.draw(undefined, 'svg', {
            viewBox: `-${Measure.HALFCELL} 0 ${Measure.CELL} ${Measure.CELL}`,
            children: [
                new Data.LineTile(this.isEdge, this.color, this.thickness, this.head, false).draw(0, 1)
            ]
        });
    }

    constructor(
        private isEdge: boolean,
        private color: number,
        private thickness: number,
        private head: Data.Head
    ) {
        super();
        this.HC_WEIGHT = isEdge ? 0.35 : 0;
    }

    private isDrawing: boolean | undefined = undefined;
    private x = 0;
    private y = 0;
    private HC_WEIGHT: number;

    public ondown(x: number, y: number) {
        this.x = Measure.hc(x, this.HC_WEIGHT);
        this.y = Measure.hc(y, this.HC_WEIGHT);
    }

    public onmove(x: number, y: number, g: Gratility.Backend) {
        x = Measure.hc(x, this.HC_WEIGHT);
        y = Measure.hc(y, this.HC_WEIGHT);
        if (x === this.x && y === this.y) return;

        let dx = this.x - x;
        let dy = this.y - y;
        const lx = Math.min(x, this.x);
        const ly = Math.min(y, this.y);
        this.x = x;
        this.y = y;
        let cx, cy, dir;

        if (!this.isEdge) {
            dx = dx/2;
            dy = dy/2;
        }

        dir = dx + dy;

        if (dx**2 + dy**2 !== 1) return;

        if (this.isEdge) {
            if (dx === 0) {
                if (x%2 !== 0) return;
                cx = x;
                cy = y%2 ? y : y+dy;
            } else {
                if (y%2 !== 0) return;
                cy = y;
                cx = x%2 ? x : x+dx;
            }
        } else {
            cx = x + dx;
            cy = y + dy;
        }

        const n = Data.encode(cx, cy)

        // TODO need to make sure this is good
        // oh, only two lines should ever be created at least
        const newline = new Data.LineTile(this.isEdge, this.color, this.thickness, this.head, dir === -1);
        const oldline = g.data.halfcells.get(n)?.get(newline.layer);

        if (this.isDrawing === undefined) {
            this.isDrawing = oldline === undefined || !oldline.eq(newline);
        }

        if (this.isDrawing) {
            if (oldline === undefined || !oldline.eq(newline)) {
                g.data.add(new Data.Change(n, oldline, newline));
            }
        } else {
            if (oldline !== undefined) {
                g.data.add(new Data.Change(n, oldline, undefined));
            }
        }
    }

    public onup() { this.isDrawing = undefined; }

}
