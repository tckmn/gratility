import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';
import * as Draw from '../draw.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';

export default class ShapeTool extends Tool.DragTool {

    public readonly repeat = false;
    public icon() {
        return Draw.draw(undefined, 'svg', {
            viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
            children: [this.tile.draw(1, 1)]
        });
    }

    constructor(
        private spec: Data.ShapeSpec,
        private locs: number
    ) { super(); this.tile = new Data.ShapeTile(this.spec); }

    protected readonly tile: Data.ShapeTile;

    public ondown(x: number, y: number, g: Gratility.Backend) {
        [x, y] = Measure.atlocs(x, y, this.locs);
        this.drag(true, Data.encode(x, y), g);
    }

    public onmove(x: number, y: number, g: Gratility.Backend) {
        [x, y] = Measure.atlocs(x, y, this.locs);
        this.drag(false, Data.encode(x, y), g);
    }

}
