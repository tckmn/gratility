import Tool from 'tool';
import * as Data from 'data';
import * as Draw from 'draw';
import * as Measure from 'measure';

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
    public icon() {} // TODO

    constructor(
        private spec: Data.ShapeSpec,
        private locs: number // bitmask: 0b center edge corner
    ) {console.log(spec)}

    private isDrawing = false;

    public ondown(x: number, y: number) {
        [x, y] = atlocs(x, y, this.locs);
        const n = Data.encode(x, y);
        const shape = Data.halfcells.get(n)?.get(Data.Obj.SHAPE) as Data.ShapeSpec[] | undefined;
        if (shape === undefined) {
            Data.add(new Data.Change(n, Data.Obj.SHAPE, shape, [this.spec]));
            this.isDrawing = true;
        } else if (!shape.some(sh => sh.shape === this.spec.shape && sh.size === this.spec.size)) {
            Data.add(new Data.Change(n, Data.Obj.SHAPE, shape, shape.concat(this.spec)));
            this.isDrawing = true;
        } else {
            Data.add(new Data.Change(n, Data.Obj.SHAPE, shape, undefined));
            this.isDrawing = false;
        }
    }

    public onmove(x: number, y: number) {
        [x, y] = atlocs(x, y, this.locs);
        const n = Data.encode(x, y);
        const shape = Data.halfcells.get(n)?.get(Data.Obj.SHAPE) as Data.ShapeSpec[] | undefined;
        if (shape === undefined) {
            if (this.isDrawing) {
                Data.add(new Data.Change(n, Data.Obj.SHAPE, shape, [this.spec]));
            }
        } else if (!shape.some(sh => sh.shape === this.spec.shape && sh.size === this.spec.size)) {
            if (this.isDrawing) {
                Data.add(new Data.Change(n, Data.Obj.SHAPE, shape, shape.concat(this.spec)));
            }
        } else {
            if (!this.isDrawing) {
                Data.add(new Data.Change(n, Data.Obj.SHAPE, shape, undefined));
            }
        }
    }

    public onup() {}

}
