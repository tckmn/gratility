import Tool from './tool.js';
import Image from '../image.js';
import * as Data from '../data.js';
import * as Stamp from '../stamp.js';
import * as Measure from '../measure.js';

export default class PasteTool implements Tool {

    public readonly repeat = false;
    public name(): string { return 'Paste'; }
    public icon(image: Image) {}

    public ondown(x: number, y: number) {
        const xoff = Math.round(x / Measure.CELL) * 2;
        const yoff = Math.round(y / Measure.CELL) * 2;

        const stamp = Stamp.current();
        if (stamp === undefined) return;
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
