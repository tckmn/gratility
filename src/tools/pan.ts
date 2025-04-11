import Tool from './tool.js';
import Gratility from '../gratility.js';

export default class PanTool implements Tool {

    public readonly repeat = false;
    public readonly tid = 'pan';
    public name(): string { return 'Pan'; }
    public icon() {}
    public save() { return ''; }
    public static load() { return new PanTool(); }

    private mx = 0;
    private my = 0;

    public ondown(x: number, y: number) {
        this.mx = x;
        this.my = y;
    }

    public onmove(x: number, y: number, g: Gratility) {
        g.view.x += x - this.mx;
        g.view.y += y - this.my;
        g.view.update();
    }

    public onup() {}

}
