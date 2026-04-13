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
        private shape: Data.Shape,
        private fill: number | undefined,
        private outline: number | undefined,
        posmask: number,
        private transform: number,
        private locs: number
    ) {
        super();
        [this.posmask, this.tiles] = Data.unpackPos(posmask, p => new Data.ShapeTile(shape, fill, outline, p, transform));
        this.tile = this.tiles.get(4) ?? this.tiles.values().next().value!; // TODO uh
    }

    private posmask: number;
    private tiles: Map<number, Data.ShapeTile>;
    protected tile: Data.ShapeTile;

    public ondown(x: number, y: number, g: Gratility.Backend) {
        const [cx, cy] = Measure.atlocs(x, y, this.locs);
        const pos = Measure.atpos(x, y, cx, cy, this.posmask);
        this.tile = this.tiles.get(pos)!;
        this.drag(true, Data.encode(cx, cy), g);
    }

    public onmove(x: number, y: number, g: Gratility.Backend) {
        [x, y] = Measure.atlocs(x, y, this.locs);
        this.drag(false, Data.encode(x, y), g);
    }

}
