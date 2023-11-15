import Tool from 'tool';
import * as Draw from 'draw';
import * as Layer from 'layer';
import * as Measure from 'measure';
import * as Data from 'data';

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

        const xoff = Math.round((sx+tx)/2);
        const yoff = Math.round((sy+ty)/2);

        const stamp = new Map<number, Data.Halfcell>();

        for (let x = sx; x <= tx; ++x) {
            for (let y = sy; y <= ty; ++y) {
                const hc = Data.halfcells.get(Data.encode(x, y));
                if (hc !== undefined) {
                    stamp.set(Data.encode(x-xoff, y-yoff), hc);
                }
            }
        }

        console.log(stamp);
    }

}
