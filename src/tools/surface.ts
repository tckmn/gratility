import Tool from 'tool';
import * as Data from 'data';
import * as Measure from 'measure';

export default class SurfaceTool implements Tool {

    public readonly name = 'Surface';

    private isDrawing = false;

    public ondown(x: number, y: number) {
        x = Math.floor(x / Measure.CELL);
        y = Math.floor(y / Measure.CELL);
        const n = Data.encode(x, y);
        const surface = Data.surfaces.get(n);
        if (surface === undefined) {
            Data.surfaces.set(n, new Data.Surface(0, x, y));
            this.isDrawing = true;
        } else {
            surface.destroy();
            Data.surfaces.delete(n);
            this.isDrawing = false;
        }
    }

    public onmove(x: number, y: number) {
        x = Math.floor(x / Measure.CELL);
        y = Math.floor(y / Measure.CELL);
        const n = Data.encode(x, y);
        const surface = Data.surfaces.get(n);
        if (surface === undefined) {
            if (this.isDrawing) {
                Data.surfaces.set(n, new Data.Surface(0, x, y));
            }
        } else {
            if (!this.isDrawing) {
                surface.destroy();
                Data.surfaces.delete(n);
            }
        }
    }

    public onup() {}

}
