import * as Gratility from '../gratility.js';

export abstract class Tool {
    abstract readonly repeat: boolean;
    abstract readonly tid: string;
    abstract name(): string;
    panel(): string { return this.tid; }
    setargs(args: Array<HTMLElement>) {}
    icon(): SVGElement | void {}
    abstract save(): string;
    // static load(s: string): Tool;
    ondown(x: number, y: number, g: Gratility.Backend): void {}
    onmove(x: number, y: number, g: Gratility.Backend): void {}
    onup(g: Gratility.Backend): void {}
}

export abstract class DragTool extends Tool {
    private isDrawing: boolean = false;
    abstract readonly layer: number;

    public ondown(x: number, y: number, g: Gratility.Backend) {
    }

    public onmove(x: number, y: number, g: Gratility.Backend) {
        // TODO
        // x = Measure.cell(x);
        // y = Measure.cell(y);
        // const n = Data.encode(Measure.cell(x)*2+1, Measure.cell(y)*2+1);
        // const data = g.data.halfcells.get(n)?.get(this.layer);
        // if (data === undefined) {
        //     if (this.isDrawing) {
        //         g.data.add(new Data.Change(n, this.layer, data, this.element));
        //     }
        // } else {
        //     if (!this.isDrawing) {
        //         g.data.add(new Data.Change(n, this.layer, data, undefined));
        //     }
        // }
    }
}
