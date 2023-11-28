import Tool from 'tool';
import * as Data from 'data';
import * as Draw from 'draw';
import * as Measure from 'measure';

const HC_WEIGHT = 0.35;

export default class EdgeTool implements Tool {

    public readonly repeat = false;
    public name(): string { return 'Edge'; }
    public icon(): SVGElement {
        return Draw.draw(undefined, 'svg', {
            viewBox: `-${Measure.HALFCELL} 0 ${Measure.CELL} ${Measure.CELL}`,
            children: [
                Data.objdraw(Data.Obj.EDGE, 0, 1, this.color)
            ]
        });
    }

    constructor(private color: number) {}

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

        const dx = Math.abs(this.x - x);
        const dy = Math.abs(this.y - y);
        const lx = Math.min(x, this.x);
        const ly = Math.min(y, this.y);
        this.x = x;
        this.y = y;
        if (!(dx === 0 && dy === 1 && lx % 2 === 0 || dx === 1 && dy === 0 && ly % 2 === 0)) return;

        const n = dx > 0 ? Data.encode(lx+(lx%2===0 ? 1 : 0), ly) : Data.encode(lx, ly+(ly%2===0 ? 1 : 0));
        const edge = Data.halfcells.get(n)?.get(Data.Obj.EDGE);

        if (this.isDrawing === undefined) {
            this.isDrawing = edge === undefined;
        }

        if (edge === undefined) {
            if (this.isDrawing) {
                Data.add(new Data.Change(n, Data.Obj.EDGE, edge, this.color));
            }
        } else {
            if (!this.isDrawing) {
                Data.add(new Data.Change(n, Data.Obj.EDGE, edge, undefined));
            }
        }
    }

    public onup() { this.isDrawing = undefined; }

}
