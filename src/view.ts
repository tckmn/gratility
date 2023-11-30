import { parent } from './layer.js';
import * as Measure from './measure.js';

export let x = 0;
export let y = 0;
export let z = 0;
let elt: SVGElement;

export function initialize(svg: SVGElement) {
    elt = svg;
}

export function setX(n: number) { x = n; }
export function setY(n: number) { y = n; }
export function setZ(n: number) { z = n; }

export function zoom(n?: number) { return Math.pow(Measure.ZOOMTICK, n ?? z); }

export function update() {
    parent.setAttribute('transform', `scale(${zoom()}) translate(${x} ${y})`);
}
