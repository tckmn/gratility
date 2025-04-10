import Tool from './tool.js';
import * as Draw from '../draw.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';

export default class LineTool implements Tool {

    public readonly repeat = false;
    public readonly tid = 'line';
    public name(): string { return 'Line'; }
    public icon(): SVGElement {
        return Draw.draw(undefined, 'svg', {
            viewBox: `-${Measure.HALFCELL} 0 ${Measure.CELL} ${Measure.CELL}`,
            children: [
                Draw.objdraw(new Data.Element(Data.Obj.LINE, [this.spec, false]), 0, 1)
            ]
        });
    }
    public save() { return [
        this.spec.isEdge ? 'E' : 'L',
        this.spec.color.toString(),
        this.spec.thickness.toString(),
        this.spec.head.toString()
    ].join(' '); }
    public static load(s: string) {
        const ss = s.split(' '), ns = ss.map(x => parseInt(x, 10));
        return new LineTool({
            isEdge: ss[0] === 'E',
            color: ns[1],
            thickness: ns[2],
            head: ns[3]
        });
    }

    constructor(private spec: Data.LineSpec) {
        this.HC_WEIGHT = spec.isEdge ? 0.35 : 0;
        this.LAYER = spec.isEdge ? Data.Layer.EDGE : Data.Layer.PATH;
    }

    private isDrawing: boolean | undefined = undefined;
    private x = 0;
    private y = 0;
    private HC_WEIGHT : number;
    private LAYER : Data.Layer;

    public ondown(x: number, y: number) {
        this.x = Measure.hc(x, this.HC_WEIGHT);
        this.y = Measure.hc(y, this.HC_WEIGHT);
    }

    public onmove(x: number, y: number) {
        x = Measure.hc(x, this.HC_WEIGHT);
        y = Measure.hc(y, this.HC_WEIGHT);
        if (x === this.x && y === this.y) return;

        let dx = this.x - x;
        let dy = this.y - y;
        const lx = Math.min(x, this.x);
        const ly = Math.min(y, this.y);
        this.x = x;
        this.y = y;
        let cx, cy, dir;

        if (!this.spec.isEdge) {
            dx = dx/2;
            dy = dy/2;
        }

        dir = dx + dy;

        if (dx**2 + dy**2 !== 1) return;

        if (this.spec.isEdge) {
            if (dx === 0) {
                if (x%2 !== 0) return;
                cx = x;
                cy = y%2 ? y : y+dy;
            } else {
                if (y%2 !== 0) return;
                cy = y;
                cx = x%2 ? x : x+dx;
            }
        } else {
            cx = x + dx;
            cy = y + dy;
        }

        const n = Data.encode(cx, cy)

        const oldline = Data.halfcells.get(n)?.get(this.LAYER);
        const newline = new Data.Element(Data.Obj.LINE,
                                         [this.spec, dir === -1] as [Data.LineSpec, boolean])

        if (this.isDrawing === undefined) {
            this.isDrawing = oldline === undefined || !Data.lineeq(oldline.data, newline.data);
        }

        if (this.isDrawing) {
            if (oldline === undefined || !Data.lineeq(oldline.data, newline.data)) {
                Data.add(new Data.Change(n, this.LAYER, oldline, newline));
            }
        } else {
            if (oldline !== undefined) {
                Data.add(new Data.Change(n, this.LAYER, oldline, undefined));
            }
        }
    }

    public onup() { this.isDrawing = undefined; }

}
