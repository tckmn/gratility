import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';

export default class MultiTool extends Tool.Tool {
    public readonly repeat = false;
    public constructor(private readonly tools: Array<Tool.Tool>) { super(); }

    public ondown(x: number, y: number, g: Gratility.Backend) {
        for (const t of this.tools) t.ondown(x, y, g);
    }
    public onmove(x: number, y: number, g: Gratility.Backend) {
        for (const t of this.tools) t.onmove(x, y, g);
    }
    public onup(g: Gratility.Backend) {
        for (const t of this.tools) t.onup(g);
    }
}
