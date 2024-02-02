import Tool from './tool.js';
import * as Data from '../data.js';

export default class UndoTool implements Tool {

    public readonly repeat = true;
    public readonly tid = 'undo';
    public name(): string { return this.isUndo ? 'Undo' : 'Redo'; }
    public icon() {}
    public save() { return this.isUndo ? 'u' : 'r'; }
    public static load(s: string) { return new UndoTool(s === 'u'); }

    public constructor(private isUndo: boolean) {}

    public ondown() { Data.undo(this.isUndo); }
    public onmove() {}
    public onup() {}

}
