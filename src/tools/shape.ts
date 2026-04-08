import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';
import * as Draw from '../draw.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';

// lmao surely there is a better way
function atlocs(x: number, y: number, locs: number): [number, number] {
    const dx = x / Measure.HALFCELL, dy = y / Measure.HALFCELL;
    const fx = Math.floor(dx), fy = Math.floor(dy);
    let best = Measure.HALFCELL*Measure.HALFCELL*999, bx = fx, by = fy;

    for (let xp = 0; xp <= 1; ++xp) {
        for (let yp = 0; yp <= 1; ++yp) {
            if ((locs & (1 << (xp+yp))) === 0) continue;
            const tryx = fx + (fx % 2 === 0 ? xp : 1-xp), tryy = fy + (fy % 2 === 0 ? yp : 1-yp);
            const dist = (dx-tryx)*(dx-tryx) + (dy-tryy)*(dy-tryy);
            if (dist < best) {
                best = dist;
                bx = tryx;
                by = tryy;
            }
        }
    }

    return [bx, by];
}

export default class ShapeTool extends Tool.DragTool {

    public readonly repeat = false;
    public readonly tid = 'shape';
    public name(): string { return 'Shape'; }
    public icon() {
        return Draw.draw(undefined, 'svg', {
            viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
            children: [
                new Data.ShapeTile([this.spec]).draw(1, 1)
            ]
        });
    }
    public save() { return [
        this.spec.shape.toString(),
        this.spec.fill === undefined ? '-' : this.spec.fill.toString(),
        this.spec.outline === undefined ? '-' : this.spec.outline.toString(),
        this.spec.size.toString(),
        this.locs.toString()
    ].join(' '); }
    public static load(s: string) {
        const ss = s.split(' '), ns = ss.map(x => parseInt(x, 10));
        return new ShapeTool(new Data.ShapeSpec(
            ns[0],
            ss[1] === '-' ? undefined : ns[1],
            ss[2] === '-' ? undefined : ns[2],
            ns[3]
        ), ns[4]);
    }

    constructor(
        private spec: Data.ShapeSpec,
        private locs: number // bitmask: 0b center edge corner
    ) { super(); this.tile = new Data.ShapeTile([this.spec]); }

    protected readonly layer: Data.Layer = Data.Layer.SHAPE;
    protected readonly tile: Data.ShapeTile;

    public ondown(x: number, y: number, g: Gratility.Backend) {
        [x, y] = atlocs(x, y, this.locs);
        this.drag(true, Data.encode(x, y), g);
    }

    public onmove(x: number, y: number, g: Gratility.Backend) {
        [x, y] = atlocs(x, y, this.locs);
        this.drag(false, Data.encode(x, y), g);
    }

    protected draw(cell: Data.ShapeTile | undefined): Data.ShapeTile {
        return cell === undefined ? this.tile : new Data.ShapeTile(cell.shapes.concat(this.spec));
    }

    protected erase(cell: Data.ShapeTile): Data.ShapeTile | undefined {
        const remaining = cell.shapes.filter(sh => !sh.eq(this.spec));
        return remaining.length === 0 ? undefined : new Data.ShapeTile(remaining);
    }

}
