import Tool from 'tool';
import * as View from 'view';

export default class PanTool implements Tool {

    public readonly name = 'Pan';

    private mx = 0;
    private my = 0;

    public ondown(x: number, y: number) {
        this.mx = x;
        this.my = y;
    }

    public onmove(x: number, y: number) {
        View.setX(View.x - this.mx + x);
        View.setY(View.y - this.my + y);
        View.update();
    }

    public onup() {}

}
