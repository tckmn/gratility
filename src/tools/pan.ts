import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';

export default class PanTool extends Tool.Tool {

    public readonly repeat = false;

    private mx = 0;
    private my = 0;

    public ondown(x: number, y: number) {
        this.mx = x;
        this.my = y;
    }

    public onmove(x: number, y: number, g: Gratility.Backend) {
        g.view.x += x - this.mx;
        g.view.y += y - this.my;
        g.view.update();
    }

}
