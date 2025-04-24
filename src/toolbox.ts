import Tool from './tools/tool.js';
import * as Tools from './tools/alltools.js';
import * as Data from './data.js';

export default class Toolbox {

    public readonly mouseTools = new Map<number, Tool>();
    public readonly keyTools = new Map<string, Tool>();
    public readonly wheelTools = new Map<boolean, Tool>();

    constructor(private container: HTMLElement) {
        this.bindMouse(1, new Tools.PanTool());
        this.bindKey(' ', new Tools.PanTool());
        this.bindKey('s', new Tools.SurfaceTool(0));
        this.bindKey('r', new Tools.LineTool({
            isEdge: false,
            head: Data.Head.NONE,
            color: 8,
            thickness: 2
        }));
        this.bindKey('e', new Tools.LineTool({
            isEdge: true,
            head: Data.Head.NONE,
            color: 0,
            thickness: 2
        }));
        this.bindKey('t', new Tools.TextTool(''));
        this.bindKey('z', new Tools.UndoTool(true));
        this.bindKey('x', new Tools.UndoTool(false));
        this.bindKey('c', new Tools.CopyTool(false));
        this.bindKey('d', new Tools.CopyTool(true));
        this.bindKey('v', new Tools.PasteTool());
        this.bindWheel(true, new Tools.ZoomTool(1));
        this.bindWheel(false, new Tools.ZoomTool(-1));
    }

    private toolDisplay(tool: Tool, txt: string, delcb: () => void) {
        const bind = document.createElement('div');
        bind.textContent = txt;
        this.container.appendChild(bind);

        const name = document.createElement('div');
        name.textContent = tool.name();
        this.container.appendChild(name);

        const icon = document.createElement('div');
        const maybeIcon = tool.icon();
        if (maybeIcon !== undefined) icon.appendChild(maybeIcon);
        this.container.appendChild(icon);

        const delbtn = document.createElement('div');
        delbtn.className = 'delbtn';
        delbtn.textContent = '×';
        delbtn.addEventListener('click', () => {
            delcb();
            this.container.removeChild(bind);
            this.container.removeChild(name);
            this.container.removeChild(icon);
            this.container.removeChild(delbtn);
        });
        this.container.appendChild(delbtn);
    }

    public bindMouse(btn: number, tool: Tool): boolean {
        if (this.mouseTools.has(btn)) return false;
        this.mouseTools.set(btn, tool);
        this.toolDisplay(tool, `click ${btn}`, () => {
            this.mouseTools.delete(btn);
        });
        return true;
    }

    public bindKey(key: string, tool: Tool): boolean {
        if (this.keyTools.has(key)) return false;
        this.keyTools.set(key, tool);
        this.toolDisplay(tool, `key [${key}]`, () => {
            this.keyTools.delete(key);
        });
        return true;
    }

    public bindWheel(dir: boolean, tool: Tool): boolean {
        if (this.wheelTools.has(dir)) return false;
        this.wheelTools.set(dir, tool);
        this.toolDisplay(tool, `scr ${dir ? 'up' : 'dn'}`, () => {
            this.wheelTools.delete(dir);
        });
        return true;
    }

    public save(): string {
        // the delimiter is :: to avoid any confusion about keybinds to Space
        // maybe i should just globally turn ' ' into 'Space' everywhere,
        // but whatever
        return [
            ...Array.from(this.mouseTools.entries()).map(([btn, tool]) => `m${btn}::${tool.tid}:${tool.save()}`),
            ...Array.from(this.keyTools.entries()).map(([key, tool]) => `k${key}::${tool.tid}:${tool.save()}`),
            ...Array.from(this.wheelTools.entries()).map(([dir, tool]) => `w${+dir}::${tool.tid}:${tool.save()}`)
        ].join('\n');
    }

    public clear() {
        while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
        this.mouseTools.clear();
        this.keyTools.clear();
        this.wheelTools.clear();
    }

}
