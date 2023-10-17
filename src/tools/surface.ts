import Tool from 'tool';
import * as Data from 'data';
import * as Measure from 'measure';

export default class SurfaceTool implements Tool {

    public readonly name = 'Surface';
    public readonly repeat = false;

    private isDrawing = false;

    public ondown(x: number, y: number) {
        x = Measure.cell(x);
        y = Measure.cell(y);
        const n = Data.encode(x*2, y*2);
        const surface = Data.surfaces.get(n);
        if (surface === undefined) {
            Data.add(new Data.Action(Data.Obj.SURFACE, n, 1));
            this.isDrawing = true;
        } else {
            Data.add(new Data.Action(Data.Obj.SURFACE, n, 0));
            this.isDrawing = false;
        }
    }

    public onmove(x: number, y: number) {
        x = Measure.cell(x);
        y = Measure.cell(y);
        const n = Data.encode(x*2, y*2);
        const surface = Data.surfaces.get(n);
        if (surface === undefined) {
            if (this.isDrawing) {
                Data.add(new Data.Action(Data.Obj.SURFACE, n, 1));
            }
        } else {
            if (!this.isDrawing) {
                Data.add(new Data.Action(Data.Obj.SURFACE, n, 0));
            }
        }
    }

    public onup() {}

}
