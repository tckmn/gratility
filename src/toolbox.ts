import Tool from 'tools/tool';

import LineTool    from 'tools/line';
import PanTool     from 'tools/pan';
import SurfaceTool from 'tools/surface';
import ZoomTool    from 'tools/zoom';
import UndoTool    from 'tools/undo';
import CopyTool    from 'tools/copy';
import PasteTool   from 'tools/paste';

export default class Toolbox {

    public readonly mouseTools = new Map<number, Tool>();
    public readonly keyTools = new Map<string, Tool>();
    public readonly wheelTools = new Map<boolean, Tool>();

    constructor(private container: HTMLElement) {
        this.bindMouse(1, new PanTool());
        this.bindKey(' ', new PanTool());
        this.bindKey('s', new SurfaceTool(0));
        this.bindKey('d', new LineTool(1));
        this.bindKey('z', new UndoTool(true));
        this.bindKey('x', new UndoTool(false));
        this.bindKey('c', new CopyTool());
        this.bindKey('v', new PasteTool());
        this.bindWheel(true, new ZoomTool(1));
        this.bindWheel(false, new ZoomTool(-1));
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

}
