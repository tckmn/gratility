import * as Draw from './draw.js';
import * as Measure from './measure.js';
import * as Data from './data.js';

export let parent:    SVGElement;
export let grid:      SVGElement;
export let surface:   SVGElement;
export let line:      SVGElement;
export let edge:      SVGElement;
export let shape:     SVGElement;
export let textInd:   SVGElement;
export let text:      SVGElement;
export let copypaste: SVGElement;
export let stamps:    SVGElement;

export function initialize(svg: SVGElement) {
    parent    = Draw.draw(svg, 'g');
    grid      = Draw.draw(parent, 'g', { stroke: Measure.GRIDCOLOR, strokeWidth: Measure.GRIDLINE });
    surface   = Draw.draw(parent, 'g');
    line      = Draw.draw(parent, 'g');
    edge      = Draw.draw(parent, 'g');
    shape     = Draw.draw(parent, 'g');
    textInd   = Draw.draw(parent, 'g');
    text      = Draw.draw(parent, 'g');
    copypaste = Draw.draw(parent, 'g');
    stamps    = Draw.draw(parent, 'g', { opacity: 0.5 });
}

export function obj(obj: Data.Obj): SVGElement {
    switch (obj) {
    case Data.Obj.SURFACE: return surface;
    case Data.Obj.LINE:    return line;
    case Data.Obj.EDGE:    return edge;
    case Data.Obj.SHAPE:   return shape;
    case Data.Obj.TEXT:    return text;
    }
}
