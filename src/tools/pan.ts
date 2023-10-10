import Tool from 'tool';
import * as View from 'view';

export default class PanTool implements Tool {

    public readonly name = 'Pan';

    private mx = 0;
    private my = 0;
    private vx = 0;
    private vy = 0;

    public ondown(x: number, y: number) {
        this.mx = x;
        this.my = y;
        this.vx = View.x;
        this.vy = View.y;
    }

    public onmove(x: number, y: number) {
        View.setX(this.vx - this.mx + x);
        View.setY(this.vy - this.my + y);
        View.update();
    }

    public onup() {}

}
