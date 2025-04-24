import Tool from './tool.js';
import Gratility from '../gratility.js';
import * as Draw from '../draw.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';

export default class CopyTool implements Tool {

    public readonly repeat = false;
    public readonly tid = 'copy';
    public name(): string { return this.isCut ? 'Cut' : 'Copy'; }
    public icon() {}
    public save() { return this.isCut ? 'x' : 'c'; }
    public static load(s: string) { return new CopyTool(s === 'x'); }

    private sx = 0;
    private sy = 0;
    private tx = 0;
    private ty = 0;
    private elt: SVGElement | undefined;

    public constructor(private isCut: boolean) {}

    public ondown(x: number, y: number, g: Gratility) {
        this.sx = x;
        this.sy = y;
        this.tx = x;
        this.ty = y;
        this.elt = Draw.draw(g.image.copypaste, 'rect', {
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

    public onup(g: Gratility) {
        if (this.elt !== undefined) g.image.copypaste.removeChild(this.elt);

        const sx = Measure.hc(Math.min(this.sx, this.tx));
        const sy = Measure.hc(Math.min(this.sy, this.ty));
        const tx = Measure.hc(Math.max(this.sx, this.tx));
        const ty = Measure.hc(Math.max(this.sy, this.ty));

        if (sx === tx && sy === ty) {
            g.stamp.deselect();
            return;
        }

        const xoff = Math.round(sx/2)*2;
        const yoff = Math.round(sy/2)*2;

        const stamp = new Array<Data.Item>();

        let shouldBreak = false;
        for (let x = sx; x <= tx; ++x) {
            for (let y = sy; y <= ty; ++y) {
                const n = Data.encode(x, y);
                const hc = g.data.halfcells.get(n);
                if (hc !== undefined) {
                    const arr = Array.from(hc.entries());
                    stamp.push(...arr.map(([k,v], i) => {
                        if (this.isCut) {
                            shouldBreak = true;
                            g.data.add(new Data.Change(n, k, v, undefined, true));
                        }
                        return new Data.Item(n, k, v);
                    }));
                }
            }
        }
        if (shouldBreak) g.data.breakLink();

        g.stamp.add(stamp);
    }

}
