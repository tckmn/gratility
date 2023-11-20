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
        Data.add(new Data.PasteAction(Array.from(stamp.cells.entries()).flatMap(([n, hc]) => {
            const [x, y] = Data.decode(n);
            const newn = Data.encode(x - stamp.xoff + xoff, y - stamp.yoff + yoff);
            return hc.map(item => {
                if (Data.halfcells.get(newn)?.get(item.obj) !== undefined) return undefined;
                const newitem = item.clone();
                newitem.n = newn;
                return newitem;
            });
        }), false));
    }

    public onmove(x: number, y: number) { }
    public onup() { }

}
