import Tool from './tool.js';
import Image from '../image.js';
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
    public name(): string { return 'Shape'; }
    public icon(image: Image) {
        return image.draw(undefined, 'svg', {
            viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
            children: [
                image.objdraw(new Data.Element(Data.Obj.SHAPE, [this.spec]), 1, 1)
            ]
        });
    }

    constructor(
        private spec: Data.ShapeSpec,
        private locs: number // bitmask: 0b center edge corner
    ) {}

    private isDrawing = false;

    public ondown(x: number, y: number) {
        [x, y] = atlocs(x, y, this.locs);
        const n = Data.encode(x, y);
        const shape = Data.halfcells.get(n)?.get(Data.Layer.SHAPE);
        const shapelst = shape?.data as Data.ShapeSpec[] | undefined;
        if (shapelst === undefined) {
            Data.add(new Data.Change(n, Data.Layer.SHAPE, shape,
                                     new Data.Element(Data.Obj.SHAPE, [this.spec])));
            this.isDrawing = true;
        } else if (!shapelst.some(sh => Data.sheq(sh, this.spec))) {
            Data.add(new Data.Change(n, Data.Layer.SHAPE, shape,
                                     new Data.Element(Data.Obj.SHAPE, shapelst.concat(this.spec))));
            this.isDrawing = true;
        } else {
            const remaining = shapelst.filter(sh => !Data.sheq(sh, this.spec));
            Data.add(new Data.Change(n, Data.Layer.SHAPE, shape, remaining.length === 0 ? undefined
                                     : new Data.Element(Data.Obj.SHAPE, remaining)));
            this.isDrawing = false;
        }
    }

    public onmove(x: number, y: number) {
        [x, y] = atlocs(x, y, this.locs);
        const n = Data.encode(x, y);
        const shape = Data.halfcells.get(n)?.get(Data.Layer.SHAPE);
        const shapelst = shape?.data as Data.ShapeSpec[] | undefined;
        if (shapelst === undefined) {
            if (this.isDrawing) {
                Data.add(new Data.Change(n, Data.Layer.SHAPE, shape,
                                         new Data.Element(Data.Obj.SHAPE, [this.spec])));
            }
        } else if (!shapelst.some(sh => Data.sheq(sh, this.spec))) {
            if (this.isDrawing) {
                Data.add(new Data.Change(n, Data.Layer.SHAPE, shape,
                                         new Data.Element(Data.Obj.SHAPE, shapelst.concat(this.spec))));
            }
        } else {
            if (!this.isDrawing) {
                const remaining = shapelst.filter(sh => !Data.sheq(sh, this.spec));
                Data.add(new Data.Change(n, Data.Layer.SHAPE, shape, remaining.length === 0 ? undefined :
                                         new Data.Element(Data.Obj.SHAPE, remaining)));
            }
        }
    }

    public onup() {}

}
