import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';

export default class ZoomTool extends Tool.Tool {

    public readonly repeat = false;

    public constructor(private readonly amount: number) { super(); }

    public ondown(x: number, y: number, g: Gratility.Backend) {
        g.view.x = (x + g.view.x) * g.view.zoom(-this.amount) - x;
        g.view.y = (y + g.view.y) * g.view.zoom(-this.amount) - y;
        g.view.z += this.amount;
        g.view.update();
    }

    public onmove(x: number, y: number) {}

    public onup() {}

}
