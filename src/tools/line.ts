import Tool from 'tool';
import * as Data from 'data';
import * as Draw from 'draw';
import * as Measure from 'measure';

export default class LineTool implements Tool {

    public readonly repeat = false;
    public name(): string { return 'Line'; }
    public icon(): SVGElement {
        return Draw.draw(undefined, 'svg', {
            viewBox: `-${Measure.HALFCELL} 0 ${Measure.CELL} ${Measure.CELL}`,
            children: [
                Data.objdraw(Data.Obj.LINE, 0, 1, this.color)
            ]
        });
    }

    constructor(private color: number) {}

    private isDrawing: boolean | undefined = undefined;
    private x = 0;
    private y = 0;

    public ondown(x: number, y: number) {
        this.x = Measure.cell(x);
        this.y = Measure.cell(y);
    }

    public onmove(x: number, y: number) {
        x = Measure.cell(x);
        y = Measure.cell(y);
        if (x === this.x && y === this.y) return;

        const dx = Math.abs(this.x - x);
        const dy = Math.abs(this.y - y);
        const lx = Math.min(x, this.x);
        const ly = Math.min(y, this.y);
        this.x = x;
        this.y = y;
        if (!(dx === 0 && dy === 1 || dx === 1 && dy === 0)) return;

        const n = dx > 0 ? Data.encode(lx*2+2, ly*2+1) : Data.encode(lx*2+1, ly*2+2);
        const line = Data.halfcells.get(n)?.get(Data.Obj.LINE);

        if (this.isDrawing === undefined) {
            this.isDrawing = line === undefined;
        }

        if (line === undefined) {
            if (this.isDrawing) {
                Data.add(new Data.Change(n, Data.Obj.LINE, line, this.color));
            }
        } else {
            if (!this.isDrawing) {
                Data.add(new Data.Change(n, Data.Obj.LINE, line, undefined));
            }
        }
    }

    public onup() { this.isDrawing = undefined; }

}
