import * as Draw from 'draw';
import * as Measure from 'measure';

export let parent:    SVGElement;
export let grid:      SVGElement;
export let surface:   SVGElement;
export let line:      SVGElement;
export let copypaste: SVGElement;

export function initialize(svg: SVGElement) {
    parent    = Draw.draw(svg, 'g');
    grid      = Draw.draw(parent, 'g', { stroke: Measure.GRIDCOLOR, strokeWidth: Measure.GRIDLINE });
    surface   = Draw.draw(parent, 'g');
    line      = Draw.draw(parent, 'g', { strokeWidth: Measure.LINE, strokeLinecap: 'round' });
    copypaste = Draw.draw(parent, 'g');
}
