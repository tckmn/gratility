import Tool from 'tool';
import * as Data from 'data';
import * as Draw from 'draw';
import * as Layer from 'layer';
import * as Measure from 'measure';
import * as Stamp from 'stamp';

export default class CopyTool implements Tool {

    public readonly repeat = false;
    public name(): string { return 'Copy'; }
    public icon() {}

    private sx = 0;
    private sy = 0;
    private tx = 0;
    private ty = 0;
    private elt: SVGElement | undefined;

    public ondown(x: number, y: number) {
        this.sx = x;
        this.sy = y;
        this.tx = x;
        this.ty = y;
        this.elt = Draw.draw(Layer.copypaste, 'rect', {
            x: x,
            y: y,
            width: 0,
            height: 0,
            fill: 'rgba(0,0,0,0.25)',
            stroke: '#000'
        });
    }

    public onmove(x: number, y: number) {
        this.tx = x;
        this.ty = y;

        const sx = Measure.physhc(Math.min(this.sx, this.tx));
        const sy = Measure.physhc(Math.min(this.sy, this.ty));
        const tx = Measure.physhc(Math.max(this.sx, this.tx));
        const ty = Measure.physhc(Math.max(this.sy, this.ty));

        if (this.elt !== undefined) {
            this.elt.setAttribute('x', sx.toString());
            this.elt.setAttribute('y', sy.toString());
            this.elt.setAttribute('width', (tx-sx).toString());
            this.elt.setAttribute('height', (ty-sy).toString());
        }
    }

    public onup() {
        if (this.elt !== undefined) Layer.copypaste.removeChild(this.elt);

        const sx = Measure.hc(Math.min(this.sx, this.tx));
        const sy = Measure.hc(Math.min(this.sy, this.ty));
        const tx = Measure.hc(Math.max(this.sx, this.tx));
        const ty = Measure.hc(Math.max(this.sy, this.ty));

        if (sx === tx && sy === ty) {
            Stamp.deselect();
            return;
        }

        const xoff = Math.round(sx/2)*2;
        const yoff = Math.round(sy/2)*2;

        const stamp = new Array<Data.Item>();

        for (let x = sx; x <= tx; ++x) {
            for (let y = sy; y <= ty; ++y) {
                const n = Data.encode(x, y);
                const hc = Data.halfcells.get(n);
                if (hc !== undefined) {
                    stamp.push(...Array.from(hc.entries()).map(([k,v]) => {
                        return new Data.Item(n, k, v);
                    }));
                }
            }
        }

        Stamp.add(stamp);
    }

}
