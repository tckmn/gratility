import Tool from './tool.js';
import Image from '../image.js';
import * as Data from '../data.js';
import * as Measure from '../measure.js';

export default class SurfaceTool implements Tool {

    public readonly repeat = false;
    public readonly tid = 'surface';
    public name(): string { return 'Surface'; }
    public icon(image: Image): SVGElement {
        return image.draw(undefined, 'svg', {
            viewBox: `0 0 ${Measure.CELL} ${Measure.CELL}`,
            children: [
                image.objdraw(this.element, 1, 1)
            ]
        });
    }
    public save() { return this.color.toString(); }
    public static load(s: string) { return new SurfaceTool(parseInt(s, 10)); }

    constructor(private color: number) {
        this.element = new Data.Element(Data.Obj.SURFACE, this.color);
    }

    private isDrawing = false;
    private element : Data.Element;

    public ondown(x: number, y: number) {
        x = Measure.cell(x);
        y = Measure.cell(y);
        const n = Data.encode(x*2+1, y*2+1);
        const surface = Data.halfcells.get(n)?.get(Data.Layer.SURFACE);
        if (surface === undefined) {
            Data.add(new Data.Change(n, Data.Layer.SURFACE, surface,
                                     new Data.Element(Data.Obj.SURFACE, this.color)));
            this.isDrawing = true;
        } else {
            Data.add(new Data.Change(n, Data.Layer.SURFACE, surface, undefined));
            this.isDrawing = false;
        }
    }

    public onmove(x: number, y: number) {
        x = Measure.cell(x);
        y = Measure.cell(y);
        const n = Data.encode(x*2+1, y*2+1);
        const surface = Data.halfcells.get(n)?.get(Data.Layer.SURFACE);
        if (surface === undefined) {
            if (this.isDrawing) {
                Data.add(new Data.Change(n, Data.Layer.SURFACE, surface, this.element));
            }
        } else {
            if (!this.isDrawing) {
                Data.add(new Data.Change(n, Data.Layer.SURFACE, surface, undefined));
            }
        }
    }

    public onup() {}

}
