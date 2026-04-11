import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';
import * as Draw from '../draw.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';
import * as Stamp from '../stamp.js';

export default class FuncTool extends Tool.SelectTool {

    public readonly repeat = false;

    public constructor(private funcName: string) { super(); }

    protected onselect(sx: number, sy: number, tx: number, ty: number, g: Gratility.Backend) {
        if (sx === tx && sy === ty) {
            g.stamp.deselect();
            return;
        }

        const xoff = Math.round(sx/2)*2;
        const yoff = Math.round(sy/2)*2;

        const stamp = new Array<Data.Item>();

        for (let x = sx; x <= tx; ++x) {
            for (let y = sy; y <= ty; ++y) {
                const n = Data.encode(x, y);
                const hc = g.data.halfcells.get(n);
                if (hc !== undefined) {
                    stamp.push(...hc.values().map((t) => {
                        // TODO can make this more efficient, obviously
                        // intentionally not calling breakLink() so that the
                        // whole thing is one operation
                        g.data.add(new Data.Change(n, t, undefined, true));
                        return new Data.Item(n, t);
                    }));
                }
            }
        }

        const newcells = stamp.map(item => {
            if (item.tile.obj === Data.Obj.SURFACE) return new Data.Item(
                item.n, new Data.SurfaceTile(new Data.SurfaceSpec(0))
            );
            if (item.tile.obj === Data.Obj.TEXT) return new Data.Item(
                item.n, new Data.TextTile(new Data.TextSpec(4, (item.tile as Data.TextTile).spec.val))
            );
            return item;
        });

        Stamp.unsafeWrap(newcells).apply(g.data, 0, 0);
    }

}
