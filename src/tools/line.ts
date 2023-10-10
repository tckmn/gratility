import Tool from 'tool';
import * as Data from 'data';
import * as Measure from 'measure';

export default class LineTool implements Tool {

    public readonly name = 'Line';

    private isDrawing: boolean | undefined = undefined;
    private x = 0;
    private y = 0;

    public ondown(x: number, y: number) {
        this.x = Math.floor(x / Measure.CELL);
        this.y = Math.floor(y / Measure.CELL);
    }

    public onmove(x: number, y: number) {
        x = Math.floor(x / Measure.CELL);
        y = Math.floor(y / Measure.CELL);
        if (x === this.x && y === this.y) return;

        const dx = Math.abs(this.x - x);
        const dy = Math.abs(this.y - y);
        const lx = Math.min(x, this.x);
        const ly = Math.min(y, this.y);
        this.x = x;
        this.y = y;
        if (!(dx === 0 && dy === 1 || dx === 1 && dy === 0)) return;

        const n = Data.encode(lx, ly);
        const data = dx > 0 ? Data.hlines : Data.vlines;
        const line = data.get(n);

        if (this.isDrawing === undefined) {
            this.isDrawing = line === undefined;
        }

        if (line === undefined) {
            if (this.isDrawing) {
                data.set(n, new Data.Line(0, dx > 0, lx, ly));
            }
        } else {
            if (!this.isDrawing) {
                line.destroy();
                data.delete(n);
            }
        }
    }

    public onup() { this.isDrawing = undefined; }

}
