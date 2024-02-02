import Tool from './tool.js';
import * as View from '../view.js';

export default class ZoomTool implements Tool {

    public readonly repeat = false;
    public readonly tid = 'zoom';
    public name(): string { return 'Zoom ' + (this.amount > 0 ? 'in' : 'out'); }
    public icon() {}
    public save() { return this.amount.toString(); }
    public static load(s: string) { return new ZoomTool(parseInt(s, 10)); }

    public constructor(private readonly amount: number) {}

    public ondown(x: number, y: number) {
        View.setX((x + View.x) * View.zoom(-this.amount) - x);
        View.setY((y + View.y) * View.zoom(-this.amount) - y);
        View.setZ(View.z + this.amount);
        View.update();
    }

    public onmove(x: number, y: number) {}

    public onup() {}

}
