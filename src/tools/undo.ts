import Tool from 'tool';
import * as Data from 'data';

export default class UndoTool implements Tool {

    public readonly name = 'Undo';
    public readonly repeat = true;
    public ondown() { Data.undo(); }
    public onmove() {}
    public onup() {}

}
