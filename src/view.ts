import { parent } from 'layer';

export let x = 0;
export let y = 0;
export let z = 1;
let elt: SVGElement;

export function initialize(svg: SVGElement) {
    elt = svg;
}

export function setX(n: number) { x = n; }
export function setY(n: number) { y = n; }
export function setZ(n: number) { z = n; }

export function update() {
    parent.setAttribute('transform', `translate(${x} ${y}) scale(${z})`);
}
