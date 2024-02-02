import Tool from './tool.js';

import CopyTool    from './copy.js';
import LineTool    from './line.js';
import PanTool     from './pan.js';
import PasteTool   from './paste.js';
import ShapeTool   from './shape.js';
import SurfaceTool from './surface.js';
import TextTool    from './text.js';
import UndoTool    from './undo.js';
import ZoomTool    from './zoom.js';

export { default as CopyTool    } from './copy.js';
export { default as LineTool    } from './line.js';
export { default as PanTool     } from './pan.js';
export { default as PasteTool   } from './paste.js';
export { default as ShapeTool   } from './shape.js';
export { default as SurfaceTool } from './surface.js';
export { default as TextTool    } from './text.js';
export { default as UndoTool    } from './undo.js';
export { default as ZoomTool    } from './zoom.js';

/*
 * TODO:
 * these strings must be manually checked to match the "tid" instance of each class.
 * afaict, there's no good way to fix this with typescript's """type system""",
 * because this needs to be accessible both statically and from an instance.
 * you can't even put static constraints on an interface.
 * object-oriented programming is a blight upon this world :(
 */
export const tidtotool = new Map<string, (s: string) => Tool>([
    ['copy',    CopyTool.load],
    ['line',    LineTool.load],
    ['pan',     PanTool.load],
    ['paste',   PasteTool.load],
    ['shape',   ShapeTool.load],
    ['surface', SurfaceTool.load],
    ['text',    TextTool.load],
    ['undo',    UndoTool.load],
    ['zoom',    ZoomTool.load],
]);
