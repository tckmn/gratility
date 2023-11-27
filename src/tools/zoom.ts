import Tool from 'tool';
import * as View from 'view';

export default class ZoomTool implements Tool {

    public readonly repeat = false;
    public name(): string { return 'Zoom ' + (this.amount > 0 ? 'in' : 'out'); }
    public icon() {}

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
