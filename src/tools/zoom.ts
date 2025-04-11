import Tool from './tool.js';
import Gratility from '../gratility.js';

export default class ZoomTool implements Tool {

    public readonly repeat = false;
    public readonly tid = 'zoom';
    public name(): string { return 'Zoom ' + (this.amount > 0 ? 'in' : 'out'); }
    public icon() {}
    public save() { return this.amount.toString(); }
    public static load(s: string) { return new ZoomTool(parseInt(s, 10)); }

    public constructor(private readonly amount: number) {}

    public ondown(x: number, y: number, g: Gratility) {
        g.view.x = (x + g.view.x) * g.view.zoom(-this.amount) - x;
        g.view.y = (y + g.view.y) * g.view.zoom(-this.amount) - y;
        g.view.z += this.amount;
        g.view.update();
    }

    public onmove(x: number, y: number) {}

    public onup() {}

}
