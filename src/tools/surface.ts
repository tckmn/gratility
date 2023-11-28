import Tool from 'tool';
import * as Data from 'data';
import * as Draw from 'draw';
import * as Measure from 'measure';

export default class SurfaceTool implements Tool {

    public readonly repeat = false;
    public name(): string { return 'Surface'; }
    public icon(): SVGElement {
        return Draw.draw(undefined, 'svg', {
            viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
            children: [
                Data.objdraw(Data.Obj.SURFACE, 1, 1, this.color)
            ]
        });
    }

    constructor(private color: number) {}

    private isDrawing = false;

    public ondown(x: number, y: number) {
        x = Measure.cell(x);
        y = Measure.cell(y);
        const n = Data.encode(x*2+1, y*2+1);
        const surface = Data.halfcells.get(n)?.get(Data.Obj.SURFACE);
        if (surface === undefined) {
            Data.add(new Data.Change(n, Data.Obj.SURFACE, surface, this.color));
            this.isDrawing = true;
        } else {
            Data.add(new Data.Change(n, Data.Obj.SURFACE, surface, undefined));
            this.isDrawing = false;
        }
    }

    public onmove(x: number, y: number) {
        x = Measure.cell(x);
        y = Measure.cell(y);
        const n = Data.encode(x*2+1, y*2+1);
        const surface = Data.halfcells.get(n)?.get(Data.Obj.SURFACE);
        if (surface === undefined) {
            if (this.isDrawing) {
                Data.add(new Data.Change(n, Data.Obj.SURFACE, surface, this.color));
            }
        } else {
            if (!this.isDrawing) {
                Data.add(new Data.Change(n, Data.Obj.SURFACE, surface, undefined));
            }
        }
    }

    public onup() {}

}
