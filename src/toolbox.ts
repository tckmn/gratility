import Tool from 'tools/tool';

import LineTool    from 'tools/line';
import PanTool     from 'tools/pan';
import SurfaceTool from 'tools/surface';
import ZoomTool    from 'tools/zoom';
import UndoTool    from 'tools/undo';
import RedoTool    from 'tools/redo';
import CopyTool    from 'tools/copy';
import PasteTool   from 'tools/paste';

export const mouseTools = new Map<number, Tool>();
export const keyTools = new Map<string, Tool>();
export const wheelTools = new Map<boolean, Tool>();

function toolDisplay(tool: Tool, txt: string, delcb: () => void) {
    const disp = document.createElement('div');
    disp.textContent = txt + ' -- ' + tool.name;
    const delbtn = document.createElement('button');
    delbtn.textContent = 'x';
    delbtn.addEventListener('click', () => {
        delcb();
        document.getElementById('toolbox')!.removeChild(disp);
    });
    disp.appendChild(delbtn);
    document.getElementById('toolbox')!.appendChild(disp); // TODO
}

export function bindMouse(btn: number, tool: Tool): boolean {
    if (mouseTools.has(btn)) return false;
    mouseTools.set(btn, tool);
    toolDisplay(tool, `mouse ${btn}`, () => {
        mouseTools.delete(btn);
    });
    return true;
}

export function bindKey(key: string, tool: Tool): boolean {
    if (keyTools.has(key)) return false;
    keyTools.set(key, tool);
    toolDisplay(tool, `key [${key}]`, () => {
        keyTools.delete(key);
    });
    return true;
}

export function bindWheel(dir: boolean, tool: Tool) {
    if (wheelTools.has(dir)) return false;
    wheelTools.set(dir, tool);
    toolDisplay(tool, `wheel ${dir ? 'up' : 'dn'}`, () => {
        wheelTools.delete(dir);
    });
    return true;
}

bindMouse(1, new PanTool());
bindKey(' ', new PanTool());
bindKey('s', new SurfaceTool());
bindKey('d', new LineTool());
bindKey('z', new UndoTool());
bindKey('x', new RedoTool());
bindKey('c', new CopyTool());
bindKey('v', new PasteTool());
bindWheel(true, new ZoomTool(1));
bindWheel(false, new ZoomTool(-1));
