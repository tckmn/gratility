import Tool from './tool.js';
import Image from '../image.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';

const HC_WEIGHT = 0.35;

export default class EdgeTool implements Tool {

    public readonly repeat = false;
    public name(): string { return 'Edge'; }
    public icon(image: Image): SVGElement {
        return image.draw(undefined, 'svg', {
            viewBox: `-${Measure.HALFCELL} 0 ${Measure.CELL} ${Measure.CELL}`,
            children: [
                image.objdraw(Data.Obj.EDGE, 0, 1, [this.spec, false])
            ]
        });
    }

    constructor(private spec: Data.EdgeSpec) {}

    private isDrawing: boolean | undefined = undefined;
    private x = 0;
    private y = 0;

    public ondown(x: number, y: number) {
        this.x = Measure.hc(x, HC_WEIGHT);
        this.y = Measure.hc(y, HC_WEIGHT);
    }

    public onmove(x: number, y: number) {
        x = Measure.hc(x, HC_WEIGHT);
        y = Measure.hc(y, HC_WEIGHT);
        if (x === this.x && y === this.y) return;

        const dx = this.x - x;
        const dy = this.y - y;
        const lx = Math.min(x, this.x);
        const ly = Math.min(y, this.y);
        this.x = x;
        this.y = y;

        let cx, cy, dir;
        if (dx**2 + dy**2 !== 1) return;
        if (dx === 0) {
            if (x%2 !== 0) return;
            cx = x;
            cy = y%2 ? y : y+dy;
            dir = dy;
        } else {
            if (y%2 !== 0) return;
            cy = y;
            cx = x%2 ? x : x+dx;
            dir = dx;
        }

        const n = Data.encode(cx, cy)

        const edge = Data.halfcells.get(n)?.get(Data.Obj.EDGE);
        const newedge : [Data.EdgeSpec, boolean] = [this.spec, dir === -1]

        if (this.isDrawing === undefined) {
            this.isDrawing = edge === undefined || !Data.edgeeq(edge, newedge);
            console.log(this.isDrawing);
        }

        if (this.isDrawing) {
            if (edge === undefined || !Data.edgeeq(edge, newedge)) {
                Data.add(new Data.Change(n, Data.Obj.EDGE, edge, newedge));
            }
        } else {
            if (edge !== undefined) {
                Data.add(new Data.Change(n, Data.Obj.EDGE, edge, undefined));
            }
        }
    }

    public onup() { this.isDrawing = undefined; }

}
