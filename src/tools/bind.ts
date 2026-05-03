import * as Tool from './tool.js';
import * as Toolbox from '../toolbox.js';

export default class BindTool extends Tool.Tool {
    public readonly repeat = false;
    public constructor(private toolbox: Toolbox.Toolboxbox, private name: string, private binding: Toolbox.Bind, private tparam: string, private action: Tool.Tool) { super(); }
    public ondown(x: number, y: number, g: any, b: Toolbox.Toolbox) {
        const box = this.name ? this.toolbox.toolboxes.find(t => t.name === this.name) : b;
        if (box === undefined) {
            const newEntry = new Toolbox.ToolboxEntry(this.toolbox.gf, this.binding, this.tparam, this.action);
            this.toolbox.toolboxes.push(new Toolbox.Toolbox(this.toolbox.gf, true, this.name, [newEntry]));
        } else {
            const entry = box.byBind(this.binding);
            if (entry === undefined) {
                box.addBind(this.binding, this.tparam, this.action);
            } else {
                entry.replace(this.binding, this.tparam, this.action);
            }
        }
        this.toolbox.saveRefresh();
    }
}
