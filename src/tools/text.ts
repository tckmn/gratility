import Tool from 'tool';
import * as Data from 'data';
import * as Measure from 'measure';
import * as Event from 'event';
import * as Layer from 'layer';
import * as Draw from 'draw';

export default class TextTool implements Tool {

    public readonly repeat = false;
    public name(): string { return 'Text'; }
    public icon() {}

    constructor() {}

    private n = 0;
    private elt: SVGElement | undefined = undefined;

    public ondown(x: number, y: number) {
        if (Event.keyeater.ref === undefined) {
            const cx = Measure.cell(x)*2, cy = Measure.cell(y)*2;
            this.n = Data.encode(cx+1, cy+1);
            // TODO some of this goes somewhere else
            this.elt = Draw.draw(Layer.textInd, 'rect', {
                x: cx*Measure.HALFCELL, y: cy*Measure.HALFCELL, width: Measure.CELL, height: Measure.CELL,
                fill: '#ccc',
                stroke: '#f88',
                strokeWidth: Measure.HALFCELL/5
            });
            Event.keyeater.ref = this.onkey.bind(this);
        }
    }

    private onkey(e: KeyboardEvent) {
        const text = Data.halfcells.get(this.n)?.get(Data.Obj.TEXT);
        if (e.key === 'Enter' || e.key === 'Escape') {
            this.deselect();
        } else if (e.key === 'Backspace') {
            Data.add(new Data.Change(this.n, Data.Obj.TEXT, text, (text ?? '').slice(0, (text ?? '').length-1)));
        } else if (e.key.length === 1) {
            Data.add(new Data.Change(this.n, Data.Obj.TEXT, text, (text ?? '') + e.key));
        }
    }

    private deselect() {
        Event.keyeater.ref = undefined;
        if (this.elt !== undefined) this.elt.parentNode!.removeChild(this.elt);
    }

    public onmove(x: number, y: number) {}
    public onup() {}

}
