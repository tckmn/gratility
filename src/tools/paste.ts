import Tool from './tool.js';
import Gratility from '../gratility.js';
import * as Measure from '../measure.js';

export default class PasteTool implements Tool {

    public readonly repeat = false;
    public readonly tid = 'paste';
    public name(): string { return 'Paste'; }
    public icon() {}
    public save() { return ''; }
    public static load() { return new PasteTool(); }

    public ondown(x: number, y: number, g: Gratility) {
        const xoff = Math.round(x / Measure.CELL) * 2;
        const yoff = Math.round(y / Measure.CELL) * 2;

        g.stamp.current()?.apply(g.data, xoff, yoff);
    }

    public onmove(x: number, y: number) { }
    public onup() { }

}
