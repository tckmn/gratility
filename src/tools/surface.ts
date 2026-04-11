import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';
import * as Draw from '../draw.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';

export default class SurfaceTool extends Tool.DragTool {

    public readonly repeat = false;
    public icon(): SVGElement {
        return Draw.draw(undefined, 'svg', {
            viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
            children: [
                this.tile.draw(1, 1)
            ]
        });
    }

    constructor(private spec: Data.SurfaceSpec) {
        super();
        this.tile = new Data.SurfaceTile(this.spec);
    }

    protected readonly tile: Data.SurfaceTile;

    public ondown(x: number, y: number, g: Gratility.Backend) {
        this.drag(true, Data.encode(Measure.cell(x)*2+1, Measure.cell(y)*2+1), g);
    }

    public onmove(x: number, y: number, g: Gratility.Backend) {
        this.drag(false, Data.encode(Measure.cell(x)*2+1, Measure.cell(y)*2+1), g);
    }

}
