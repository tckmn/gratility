import * as Draw from 'draw';
import * as Measure from 'measure';

export let parent: SVGElement;
export let grid:   SVGElement;
export let blocks: SVGElement;

export function initialize(svg: SVGElement) {
    parent = Draw.draw(svg, 'g');
    grid   = Draw.draw(parent, 'g', { stroke: Measure.GRIDCOLOR, strokeWidth: Measure.GRIDLINE });
    blocks = Draw.draw(parent, 'g');
}
