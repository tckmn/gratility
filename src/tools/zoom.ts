import Tool from 'tool';
import * as View from 'view';

export default class ZoomTool implements Tool {

    public readonly name = 'Zoom';

    public constructor(private readonly amount: number) {}

    public ondown(x: number, y: number) {
        View.setZ(View.z + this.amount);
        View.update();
    }

    public onmove(x: number, y: number) {}

    public onup() {}

}
