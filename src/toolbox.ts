import Tool from 'tools/tool';
import PanTool from 'tools/pan';

export const mouseTools = new Map<number, Tool>();
export const keyTools = new Map<string, Tool>();

mouseTools.set(1, new PanTool());
keyTools.set(' ', new PanTool());
