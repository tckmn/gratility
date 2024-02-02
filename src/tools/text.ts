import Tool from './tool.js';
import Image from '../image.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';
import * as Event from '../event.js';

export default class TextTool implements Tool {

    public readonly repeat = false;
    public readonly tid = 'text';
    public name(): string { return 'Text'; }
    public icon(image: Image) {}
    public save() { return this.preset; }
    public static load(s: string) { return new TextTool(s); }

    constructor(private preset: string) {}

    private n = 0;
    private elt: SVGElement | undefined = undefined;
    private isDrawing: boolean = false;

    public ondown(x: number, y: number, image: Image) {
        if (this.preset !== '') {
            const n = Data.encode(Measure.cell(x)*2+1, Measure.cell(y)*2+1);
            const text = Data.halfcells.get(n)?.get(Data.Layer.TEXT);
            if (text && text.data === this.preset) {
                Data.add(new Data.Change(n, Data.Layer.TEXT, text, undefined));
                this.isDrawing = false;
            } else {
                Data.add(new Data.Change(n, Data.Layer.TEXT, text,
                                         new Data.Element(Data.Obj.TEXT, this.preset)));
                this.isDrawing = true;
            }
        } else if (Event.keyeater.ref === undefined) {
            const cx = Measure.cell(x)*2, cy = Measure.cell(y)*2;
            this.n = Data.encode(cx+1, cy+1);
            // TODO some of this goes somewhere else
            this.elt = image.draw(image.textInd, 'rect', {
                x: cx*Measure.HALFCELL, y: cy*Measure.HALFCELL, width: Measure.CELL, height: Measure.CELL,
                fill: '#ccc',
                stroke: '#f88',
                strokeWidth: Measure.HALFCELL/5
            });
            Event.keyeater.ref = this.onkey.bind(this);
        }
    }

    private onkey(e: KeyboardEvent) {
        const text = Data.halfcells.get(this.n)?.get(Data.Layer.TEXT);
        if (e.key === 'Enter' || e.key === 'Escape') {
            this.deselect();
        } else if (e.key === 'Backspace') {
            Data.add(new Data.Change(this.n, Data.Layer.TEXT, text,
                                     new Data.Element(Data.Obj.TEXT, (text?.data ?? '').slice(0, (text?.data ?? '').length-1))));
        } else if (e.key.length === 1) {
            Data.add(new Data.Change(this.n, Data.Layer.TEXT, text,
                                     new Data.Element(Data.Obj.TEXT, (text?.data ?? '') + e.key)));
        }
    }

    private deselect() {
        Event.keyeater.ref = undefined;
        if (this.elt !== undefined) this.elt.parentNode!.removeChild(this.elt);
    }

    public onmove(x: number, y: number) {
        if (this.preset === '') return;
        const n = Data.encode(Measure.cell(x)*2+1, Measure.cell(y)*2+1);
        const text = Data.halfcells.get(n)?.get(Data.Layer.TEXT);
        if (text && text.data === this.preset) {
            if (!this.isDrawing) {
                Data.add(new Data.Change(n, Data.Layer.TEXT, text, undefined));
            }
        } else {
            if (this.isDrawing) {
                Data.add(new Data.Change(n, Data.Layer.TEXT, text,
                                         new Data.Element(Data.Obj.TEXT, this.preset)));
            }
        }
    }

    public onup() {}

}
