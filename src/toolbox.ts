import Tool from 'tools/tool';

import LineTool    from 'tools/line';
import PanTool     from 'tools/pan';
import SurfaceTool from 'tools/surface';
import ZoomTool    from 'tools/zoom';
import UndoTool    from 'tools/undo';
import RedoTool    from 'tools/redo';
import CopyTool    from 'tools/copy';
import PasteTool   from 'tools/paste';

export default class Toolbox {

    public readonly mouseTools = new Map<number, Tool>();
    public readonly keyTools = new Map<string, Tool>();
    public readonly wheelTools = new Map<boolean, Tool>();

    constructor(private container: HTMLElement) {
        this.bindMouse(1, new PanTool());
        this.bindKey(' ', new PanTool());
        this.bindKey('s', new SurfaceTool());
        this.bindKey('d', new LineTool());
        this.bindKey('z', new UndoTool());
        this.bindKey('x', new RedoTool());
        this.bindKey('c', new CopyTool());
        this.bindKey('v', new PasteTool());
        this.bindWheel(true, new ZoomTool(1));
        this.bindWheel(false, new ZoomTool(-1));
    }

    private toolDisplay(tool: Tool, txt: string, delcb: () => void) {
        const disp = document.createElement('div');
        disp.textContent = txt + ' -- ' + tool.name;
        const delbtn = document.createElement('button');
        delbtn.textContent = 'x';
        delbtn.addEventListener('click', () => {
            delcb();
            this.container.removeChild(disp);
        });
        disp.appendChild(delbtn);
        this.container.appendChild(disp);
    }

    public bindMouse(btn: number, tool: Tool): boolean {
        if (this.mouseTools.has(btn)) return false;
        this.mouseTools.set(btn, tool);
        this.toolDisplay(tool, `mouse ${btn}`, () => {
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

    public bindWheel(dir: boolean, tool: Tool) {
        if (this.wheelTools.has(dir)) return false;
        this.wheelTools.set(dir, tool);
        this.toolDisplay(tool, `wheel ${dir ? 'up' : 'dn'}`, () => {
            this.wheelTools.delete(dir);
        });
        return true;
    }

}
