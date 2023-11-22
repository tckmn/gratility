import Tool from 'tool';
import * as Data from 'data';
import * as Stamp from 'stamp';
import * as Measure from 'measure';

export default class PasteTool implements Tool {

    public readonly name = 'Paste';
    public readonly repeat = false;

    public ondown(x: number, y: number) {
        const xoff = Math.round(x / Measure.CELL) * 2;
        const yoff = Math.round(y / Measure.CELL) * 2;

        const stamp = Stamp.stamps[Stamp.stamppos];
        for (let i = 0; i < stamp.cells.length; ++i) {
            const cell = stamp.cells[i];
            const [x, y] = Data.decode(cell.n);
            const newn = Data.encode(x - stamp.xoff + xoff, y - stamp.yoff + yoff);

            const pre = Data.halfcells.get(newn)?.get(cell.obj);
            if (pre !== cell.data) {
                Data.add(new Data.Change(newn, cell.obj, pre, cell.data, i !== stamp.cells.length-1));
            }
        }
    }

    public onmove(x: number, y: number) { }
    public onup() { }

}
