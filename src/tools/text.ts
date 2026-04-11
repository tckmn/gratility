import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';
import * as Draw from '../draw.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';
import * as Event from '../event.js';

export default class TextTool extends Tool.DragTool {

    public readonly repeat = false;

    constructor(private spec: Data.TextSpec, private locs: number) {
        super();
        this.tile = new Data.TextTile(this.spec);
    }

    private n = 0;
    private elt: SVGElement | undefined = undefined;
    protected readonly tile: Data.TextTile;

    public ondown(x: number, y: number, g: Gratility.Backend) {
        [x, y] = Measure.atlocs(x, y, this.locs);
        if (this.spec.val !== '') {
            this.drag(true, Data.encode(x, y), g);
        } else if (Event.keyeater.ref === undefined) {
            this.n = Data.encode(x, y);
            // TODO some of this goes somewhere else
            this.elt = Draw.draw(g.image.textInd, 'rect', {
                x: (x-1)*Measure.HALFCELL, y: (y-1)*Measure.HALFCELL, width: Measure.CELL, height: Measure.CELL,
                fill: '#ccc',
                stroke: '#f88',
                strokeWidth: Measure.HALFCELL/5
            });
            Event.keyeater.ref = this.onkey(g).bind(this);
        }
    }

    private onkey(g: Gratility.Backend) {
        return (e: KeyboardEvent) => {
            const pre = g.data.halfcells.get(this.n)?.get(Data.Layer.TEXT);
            const color = pre === undefined ? this.spec.color : pre.spec.color;
            const text = pre === undefined ? '' : pre.spec.val;
            if (e.key === 'Enter' || e.key === 'Escape') {
                this.deselect();
            } else if (e.key === 'Backspace') {
                g.data.add(new Data.Change(this.n, pre,
                                           text.length === 1 ? undefined : new Data.TextTile(new Data.TextSpec(color, text.slice(0, text.length-1)))));
            } else if (e.key.length === 1) {
                g.data.add(new Data.Change(this.n, pre,
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
        [x, y] = Measure.atlocs(x, y, this.locs);
        this.drag(false, Data.encode(x, y), g);
    }

}
