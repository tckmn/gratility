import Tool from './tool.js';
import * as Data from '../data.js';

export default class UndoTool implements Tool {

    public readonly repeat = true;
    public name(): string { return this.isUndo ? 'Undo' : 'Redo'; }
    public icon() {}

    public constructor(private isUndo: boolean) {}

    public ondown() { Data.undo(this.isUndo); }
    public onmove() {}
    public onup() {}

}
