import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';

// TODO: some of them don't work yet

export default class TransformTool extends Tool.Tool {

    public readonly repeat = false;

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
