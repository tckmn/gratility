import * as Tool from './tool.js';
import * as Gratility from '../gratility.js';
import * as Data from '../data.js';

export default class UndoTool extends Tool.Tool {

    public readonly repeat = true;

    public constructor(private isUndo: boolean) { super(); }

    public ondown(x: number, y: number, g: Gratility.Backend) { g.data.undo(this.isUndo); }
    public onmove() {}
    public onup() {}

}
