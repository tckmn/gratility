import Tool from './tool.js';
import Image from '../image.js';
import * as View from '../view.js';

export default class PanTool implements Tool {

    public readonly repeat = false;
    public readonly tid = 'pan';
    public name(): string { return 'Pan'; }
    public icon(image: Image) {}
    public save() { return ''; }
    public static load() { return new PanTool(); }

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
