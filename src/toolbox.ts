import Tool from 'tools/tool';

import LineTool    from 'tools/line';
import PanTool     from 'tools/pan';
import SurfaceTool from 'tools/surface';
import ZoomTool    from 'tools/zoom';
import UndoTool    from 'tools/undo';
import RedoTool    from 'tools/redo';

export const mouseTools = new Map<number, Tool>();
export const keyTools = new Map<string, Tool>();
export const wheelTools = new Map<boolean, Tool>();

mouseTools.set(1, new PanTool());
keyTools.set(' ', new PanTool());
keyTools.set('s', new SurfaceTool());
keyTools.set('d', new LineTool());
keyTools.set('z', new UndoTool());
keyTools.set('x', new RedoTool());
wheelTools.set(true, new ZoomTool(1));
wheelTools.set(false, new ZoomTool(-1));
