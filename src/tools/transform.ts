import Tool from './tool.js';
import * as Gratility from '../gratility.js';

// TODO: some of them don't work yet

export default class TransformTool extends Tool {

    public readonly repeat = false;
    public readonly tid = 'transform';
    public name(): string { return this.trnum < 10 ? 'Flip' : 'Rotate'; } // TODO say what kind
    public panel(): string { return this.trnum < 10 ? 'flip' : 'rotate'; }
    public save() { return this.trnum.toString(); }
    public static load(s: string) { return new TransformTool(parseInt(s, 10)); }

    public constructor(private trnum: number) { super(); }

    public ondown(x: number, y: number, g: Gratility.Backend) {
        switch (this.trnum) {
        case 0: g.stamp.transform(s => s.reflect(true)); break;
        case 1: g.stamp.transform(s => s.reflect(false)); break;
        case 10: g.stamp.transform(s => s.rotate(true)); break;
        case 11: g.stamp.transform(s => s.rotate(false)); break;
        }
    }

    public onmove() {}
    public onup() {}

}
