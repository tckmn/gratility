import Tool from 'tools/tool';
import PanTool from 'tools/pan';
import SurfaceTool from 'tools/surface';
import ZoomTool from 'tools/zoom';

export const mouseTools = new Map<number, Tool>();
export const keyTools = new Map<string, Tool>();
export const wheelTools = new Map<boolean, Tool>();

mouseTools.set(1, new PanTool());
keyTools.set(' ', new PanTool());
keyTools.set('s', new SurfaceTool());
wheelTools.set(true, new ZoomTool(1));
wheelTools.set(false, new ZoomTool(-1));
