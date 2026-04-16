import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';
import * as Draw from '../draw.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';

export default class WallTool extends Tool.Tool {

    public readonly repeat = false;
    public icon(): SVGElement {
        return Draw.draw(undefined, 'svg', {
            viewBox: `-${Measure.HALFCELL} 0 ${Measure.CELL} ${Measure.CELL}`,
            children: [
                new Data.WallTile(0, new Data.LineSpec(this.color, this.thickness, this.head, false)).draw(0, 1)
            ]
        });
    }

    constructor(
        private color: number,
        private thickness: number,
        private head: Data.Head,
        private locs: number
    ) {
        super();
    }

    private isDrawing: boolean | undefined = undefined;
    // these are virtual coordinates, for where we "think" we are
    private x = 0;
    private y = 0;
    // is the cursor actually in that cell?
    private arrived = true;
    // you can be this far outside a cell and not yet trigger a new line
    private static readonly OUTER_DIST = 2 - Math.tan(Math.PI/8);
    // once you get this close to the center of a cell you will trigger lines again
    private static readonly INNER_DIST = 0.9;

    public ondown(x: number, y: number) {
        [this.x, this.y] = Measure.atlocs(x, y, this.locs);
        this.arrived = false;
    }

    public onmove(x: number, y: number, g: Gratility.Backend) {
        const fx = x / Measure.HALFCELL;
        const fy = y / Measure.HALFCELL;
        const rx = Measure.round(fx, 2, this.x);
        const ry = Measure.round(fy, 2, this.y);

        if (rx === this.x && ry === this.y) {
            if (!this.arrived && Math.abs(rx - fx) < WallTool.INNER_DIST && Math.abs(rx - fx) < WallTool.INNER_DIST) this.arrived = true;
            return;
        }

        if (!this.arrived && Math.abs(this.x - fx) < WallTool.OUTER_DIST && Math.abs(this.y - fy) < WallTool.OUTER_DIST) return;

        const dx = x - this.x*Measure.HALFCELL;
        const dy = y - this.y*Measure.HALFCELL;
        const angle = Math.atan2(dy, dx) / (Math.PI/4);
        const a = 1 << ((4+Math.round(angle))%4);

        const n = Data.encode(this.x, this.y)
        const oldwall = g.data.halfcells.get(n)?.get(Data.Layer.WALL);
        const newwall = new Data.WallTile(a, new Data.LineSpec(this.color, this.thickness, this.head, false));

        this.x = this.x + 2*[-1, -1,  0,  1, 1, 1, 0, -1, -1][Math.round(angle)+4];
        this.y = this.y + 2*[ 0, -1, -1, -1, 0, 1, 1,  1,  0][Math.round(angle)+4];
        this.arrived = false;

        if (this.isDrawing === undefined) {
            this.isDrawing = oldwall === undefined || !oldwall.eq(newwall) || !(oldwall.angles & a);
        }

        if (this.isDrawing) {
            if (oldwall === undefined || !oldwall.eq(newwall)) {
                g.data.add(new Data.Change(n, oldwall, newwall));
            } else if (!(oldwall.angles & a)) {
                g.data.add(new Data.Change(n, oldwall, new Data.WallTile(oldwall.angles | a, oldwall.spec)));
            }
        } else {
            if (oldwall !== undefined) {
                if (oldwall.angles === a) {
                    g.data.add(new Data.Change(n, oldwall, undefined));
                } else if (oldwall.angles & a) {
                    g.data.add(new Data.Change(n, oldwall, new Data.WallTile(oldwall.angles & ~a, oldwall.spec)));
                }
            }
        }
    }

    public onup() { this.isDrawing = undefined; }

}
