import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';
import * as Draw from '../draw.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';
import * as Event from '../event.js';

export default class TextTool extends Tool.Tool {

    public readonly repeat = false;
    public readonly tid = 'text';
    public name(): string { return 'Text'; }
    public save() { return this.spec.val; }
    public static load(s: string) { return new TextTool(new Data.TextSpec(0, s)); } // TODO

    constructor(private spec: Data.TextSpec) {
        super();
        this.tile = new Data.TextTile(this.spec);
    }

    private n = 0;
    private elt: SVGElement | undefined = undefined;
    private isDrawing: boolean = false;
    private tile : Data.TextTile;

    public ondown(x: number, y: number, g: Gratility.Backend) {
        if (this.spec.val !== '') {
            const n = Data.encode(Measure.cell(x)*2+1, Measure.cell(y)*2+1);
            const pre = g.data.halfcells.get(n)?.[Data.Layer.TEXT];
            if (pre && pre.spec.val === this.spec.val) {
                g.data.add(new Data.Change(n, Data.Layer.TEXT, pre, undefined));
                this.isDrawing = false;
            } else {
                g.data.add(new Data.Change(n, Data.Layer.TEXT, pre, this.tile));
                this.isDrawing = true;
            }
        } else if (Event.keyeater.ref === undefined) {
            const cx = Measure.cell(x)*2, cy = Measure.cell(y)*2;
            this.n = Data.encode(cx+1, cy+1);
            // TODO some of this goes somewhere else
            this.elt = Draw.draw(g.image.textInd, 'rect', {
                x: cx*Measure.HALFCELL, y: cy*Measure.HALFCELL, width: Measure.CELL, height: Measure.CELL,
                fill: '#ccc',
                stroke: '#f88',
                strokeWidth: Measure.HALFCELL/5
            });
            Event.keyeater.ref = this.onkey(g).bind(this);
        }
    }

    private onkey(g: Gratility.Backend) {
        return (e: KeyboardEvent) => {
            const pre = g.data.halfcells.get(this.n)?.[Data.Layer.TEXT];
            const color = pre === undefined ? this.spec.color : pre.spec.color;
            const text = pre === undefined ? '' : pre.spec.val;
            if (e.key === 'Enter' || e.key === 'Escape') {
                this.deselect();
            } else if (e.key === 'Backspace') {
                // TODO delete if no more text
                g.data.add(new Data.Change(this.n, Data.Layer.TEXT, pre,
                                           new Data.TextTile(new Data.TextSpec(color, text.slice(0, text.length-1)))));
            } else if (e.key.length === 1) {
                g.data.add(new Data.Change(this.n, Data.Layer.TEXT, pre,
                                           new Data.TextTile(new Data.TextSpec(color, text + e.key))));
            }
        };
    }

    private deselect() {
        Event.keyeater.ref = undefined;
        if (this.elt !== undefined) this.elt.parentNode!.removeChild(this.elt);
    }

    public onmove(x: number, y: number, g: Gratility.Backend) {
        if (this.spec.val === '') return;
        const n = Data.encode(Measure.cell(x)*2+1, Measure.cell(y)*2+1);
        const pre = g.data.halfcells.get(n)?.[Data.Layer.TEXT];
        if (pre && pre.spec.val === this.spec.val) {
            if (!this.isDrawing) {
                g.data.add(new Data.Change(n, Data.Layer.TEXT, pre, undefined));
            }
        } else {
            if (this.isDrawing) {
                g.data.add(new Data.Change(n, Data.Layer.TEXT, pre, this.tile));
            }
        }
    }

}
