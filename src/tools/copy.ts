import Tool from 'tool';
import * as Data from 'data';
import * as Draw from 'draw';
import * as Layer from 'layer';
import * as Measure from 'measure';
import * as Stamp from 'stamp';

export default class CopyTool implements Tool {

    public readonly name = 'Copy';
    public readonly repeat = false;

    private sx = 0;
    private sy = 0;
    private tx = 0;
    private ty = 0;
    private elt: SVGElement | undefined;

    public ondown(x: number, y: number) {
        this.sx = x;
        this.sy = y;
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
        if (this.elt !== undefined) {
            this.elt.setAttribute('x', Math.min(this.sx, this.tx).toString());
            this.elt.setAttribute('y', Math.min(this.sy, this.ty).toString());
            this.elt.setAttribute('width', Math.abs(this.sx - this.tx).toString());
            this.elt.setAttribute('height', Math.abs(this.sy - this.ty).toString());
        }
    }

    public onup() {
        if (this.elt !== undefined) Layer.copypaste.removeChild(this.elt);

        const sx = Measure.halfcell(Math.min(this.sx, this.tx));
        const sy = Measure.halfcell(Math.min(this.sy, this.ty));
        const tx = Measure.halfcell(Math.max(this.sx, this.tx));
        const ty = Measure.halfcell(Math.max(this.sy, this.ty));

        const xoff = Math.round(sx/2)*2;
        const yoff = Math.round(sy/2)*2;

        const stamp = new Array<Data.Item>();
        let xmin = tx+1, xmax = sx-1, ymin = ty+1, ymax = sy-1;

        for (let x = sx; x <= tx; ++x) {
            for (let y = sy; y <= ty; ++y) {
                const n = Data.encode(x, y);
                const hc = Data.halfcells.get(n);
                if (hc !== undefined) {
                    stamp.push(...Array.from(hc.entries()).map(([k,v]) => {
                        return new Data.Item(n, k, v);
                    }));
                    if (x < xmin) xmin = x;
                    if (x > xmax) xmax = x;
                    if (y < ymin) ymin = y;
                    if (y > ymax) ymax = y;
                }
            }
        }

        Stamp.add(stamp, xmin, xmax, ymin, ymax);
    }

}
