import Tool from './tool.js';
import Gratility from '../gratility.js';
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

export default class ShapeTool implements Tool {

    public readonly repeat = false;
    public readonly tid = 'shape';
    public name(): string { return 'Shape'; }
    public icon() {
        return Draw.draw(undefined, 'svg', {
            viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
            children: [
                Draw.objdraw(new Data.Element(Data.Obj.SHAPE, [this.spec]), 1, 1)
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
        return new ShapeTool({
            shape: ns[0],
            fill: ss[1] === '-' ? undefined : ns[1],
            outline: ss[2] === '-' ? undefined : ns[2],
            size: ns[3]
        }, ns[4]);
    }

    constructor(
        private spec: Data.ShapeSpec,
        private locs: number // bitmask: 0b center edge corner
    ) {}

    private isDrawing = false;

    public ondown(x: number, y: number, g: Gratility) {
        [x, y] = atlocs(x, y, this.locs);
        const n = Data.encode(x, y);
        const shape = g.data.halfcells.get(n)?.get(Data.Layer.SHAPE);
        const shapelst = shape?.data as Data.ShapeSpec[] | undefined;
        if (shapelst === undefined) {
            g.data.add(new Data.Change(n, Data.Layer.SHAPE, shape,
                                       new Data.Element(Data.Obj.SHAPE, [this.spec])));
            this.isDrawing = true;
        } else if (!shapelst.some(sh => Data.sheq(sh, this.spec))) {
            g.data.add(new Data.Change(n, Data.Layer.SHAPE, shape,
                                       new Data.Element(Data.Obj.SHAPE, shapelst.concat(this.spec))));
            this.isDrawing = true;
        } else {
            const remaining = shapelst.filter(sh => !Data.sheq(sh, this.spec));
            g.data.add(new Data.Change(n, Data.Layer.SHAPE, shape, remaining.length === 0 ? undefined
                                       : new Data.Element(Data.Obj.SHAPE, remaining)));
            this.isDrawing = false;
        }
    }

    public onmove(x: number, y: number, g: Gratility) {
        [x, y] = atlocs(x, y, this.locs);
        const n = Data.encode(x, y);
        const shape = g.data.halfcells.get(n)?.get(Data.Layer.SHAPE);
        const shapelst = shape?.data as Data.ShapeSpec[] | undefined;
        if (shapelst === undefined) {
            if (this.isDrawing) {
                g.data.add(new Data.Change(n, Data.Layer.SHAPE, shape,
                                           new Data.Element(Data.Obj.SHAPE, [this.spec])));
            }
        } else if (!shapelst.some(sh => Data.sheq(sh, this.spec))) {
            if (this.isDrawing) {
                g.data.add(new Data.Change(n, Data.Layer.SHAPE, shape,
                                           new Data.Element(Data.Obj.SHAPE, shapelst.concat(this.spec))));
            }
        } else {
            if (!this.isDrawing) {
                const remaining = shapelst.filter(sh => !Data.sheq(sh, this.spec));
                g.data.add(new Data.Change(n, Data.Layer.SHAPE, shape, remaining.length === 0 ? undefined :
                                           new Data.Element(Data.Obj.SHAPE, remaining)));
            }
        }
    }

    public onup() {}

}
