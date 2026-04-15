import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';
import * as Draw from '../draw.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';
import * as Event from '../event.js';

export default class TextTool extends Tool.DragTool {

    public readonly repeat = false;

    constructor(private preset: string, private spec: Data.ObjectParam) {
        super();
        [this.posmask, this.tiles] = spec.unpack(spec => new Data.TextTile(preset, spec));
        this.tile = this.tiles.get(4) ?? this.tiles.values().next().value!; // TODO uh
    }

    private n = 0;
    private elt: SVGElement | undefined = undefined;

    private posmask: number;
    private tiles: Map<number, Data.TextTile>;
    protected tile: Data.TextTile;

    public ondown(x: number, y: number, g: Gratility.Backend) {
        const [cx, cy] = Measure.atlocs(x, y, this.spec.locs);
        const pos = Measure.atpos(x, y, cx, cy, this.posmask);
        this.tile = this.tiles.get(pos)!;
        if (this.preset !== '') {
            this.drag(true, Data.encode(cx, cy), g);
        } else if (Event.keyeater.ref === undefined) {
            this.n = Data.encode(cx, cy);
            // TODO some of this goes somewhere else
            // TODO this is wrong now also
            this.elt = Draw.draw(g.image.textInd, 'rect', {
                x: (cx-1)*Measure.HALFCELL, y: (cy-1)*Measure.HALFCELL, width: Measure.CELL, height: Measure.CELL,
                fill: '#ccc',
                stroke: '#f88',
                strokeWidth: Measure.HALFCELL/5
            });
            Event.keyeater.ref = this.onkey(g).bind(this);
        }
    }

    private onkey(g: Gratility.Backend) {
        return (e: KeyboardEvent) => {
            const pre = g.data.halfcells.get(this.n)?.get(this.tile.spec.layer(Data.Layer_TEXT_BASE) as Data.Layer_TEXT); // TODO a bit odd
            const spec = pre === undefined ? this.tile.spec : pre.spec;
            const text = pre === undefined ? '' : pre.val;
            if (e.key === 'Enter' || e.key === 'Escape') {
                this.deselect();
            } else if (e.key === 'Backspace') {
                g.data.add(new Data.Change(this.n, pre, text.length === 1 ? undefined : new Data.TextTile(text.slice(0, text.length-1), spec)));
            } else if (e.key.length === 1) {
                g.data.add(new Data.Change(this.n, pre, new Data.TextTile(text + e.key, spec)));
            }
        };
    }

    private deselect() {
        Event.keyeater.ref = undefined;
        if (this.elt !== undefined) this.elt.parentNode!.removeChild(this.elt);
    }

    public onmove(x: number, y: number, g: Gratility.Backend) {
        if (this.preset === '') return;
        [x, y] = Measure.atlocs(x, y, this.spec.locs);
        this.drag(false, Data.encode(x, y), g);
    }

}
