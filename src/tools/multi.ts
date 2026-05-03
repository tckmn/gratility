import * as Tool from './tool.js';
import * as Toolbox from '../toolbox.js';
import * as Gratility from '../gratility.js';

export default class MultiTool extends Tool.Tool {
    public readonly repeat = false;
    public constructor(private readonly tools: Array<Tool.Tool>) { super(); }

    public ondown(x: number, y: number, g: Gratility.Backend, b: Toolbox.Toolbox) {
        for (const t of this.tools) t.ondown(x, y, g, b);
    }
    public onmove(x: number, y: number, g: Gratility.Backend) {
        for (const t of this.tools) t.onmove(x, y, g);
    }
    public onup(g: Gratility.Backend) {
        for (const t of this.tools) t.onup(g);
    }
    public onclick(g: Gratility.Backend): boolean {
        let ret = false;
        for (const t of this.tools) ret ||= t.onclick(g);
        return ret;
    }
}
