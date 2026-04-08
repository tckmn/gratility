import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';
import * as Draw from '../draw.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';

export default class SurfaceTool extends Tool.Tool {

    public readonly repeat = false;
    public readonly tid = 'surface';
    public name(): string { return 'Surface'; }
    public icon(): SVGElement {
        return Draw.draw(undefined, 'svg', {
            viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
            children: [
                this.tile.draw(1, 1)
            ]
        });
    }
    public save() { return this.spec.color.toString(); }
    public static load(s: string) { return new SurfaceTool(new Data.SurfaceSpec(parseInt(s, 10))); }

    constructor(private spec: Data.SurfaceSpec) {
        super();
        this.tile = new Data.SurfaceTile(this.spec);
    }

    private isDrawing = false;
    private tile : Data.SurfaceTile;

    public ondown(x: number, y: number, g: Gratility.Backend) {
        x = Measure.cell(x);
        y = Measure.cell(y);
        const n = Data.encode(x*2+1, y*2+1);
        const surface = g.data.halfcells.get(n)?.get(Data.Layer.SURFACE);
        if (surface === undefined) {
            g.data.add(new Data.Change(n, Data.Layer.SURFACE, surface, this.tile));
            this.isDrawing = true;
        } else {
            g.data.add(new Data.Change(n, Data.Layer.SURFACE, surface, undefined));
            this.isDrawing = false;
        }
    }

    public onmove(x: number, y: number, g: Gratility.Backend) {
        x = Measure.cell(x);
        y = Measure.cell(y);
        const n = Data.encode(x*2+1, y*2+1);
        const surface = g.data.halfcells.get(n)?.get(Data.Layer.SURFACE);
        if (surface === undefined) {
            if (this.isDrawing) {
                g.data.add(new Data.Change(n, Data.Layer.SURFACE, surface, this.tile));
            }
        } else {
            if (!this.isDrawing) {
                g.data.add(new Data.Change(n, Data.Layer.SURFACE, surface, undefined));
            }
        }
    }

}
