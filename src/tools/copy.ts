import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';
import * as Draw from '../draw.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';

export default class CopyTool extends Tool.SelectTool {

    public readonly repeat = false;

    public constructor(private isCut: boolean) { super(); }

    protected onselect(sx: number, sy: number, tx: number, ty: number, g: Gratility.Backend) {
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
                    stamp.push(...hc.map((_,v) => {
                        if (this.isCut) {
                            shouldBreak = true;
                            g.data.add(new Data.Change(n, v, undefined, true));
                        }
                        return new Data.Item(n, v);
                    }));
                }
            }
        }
        if (shouldBreak) g.data.breakLink();

        g.stamp.add(stamp);
    }

}
