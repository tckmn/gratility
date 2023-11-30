import * as Measure from './measure.js';
import Image from './image.js';

export let x = 0;
export let y = 0;
export let z = 0;
// TODO this is absolutely an extremely temporary bandaid lol
let img: Image;

export function initialize(image: Image) {
    img = image;
}

export function setX(n: number) { x = n; }
export function setY(n: number) { y = n; }
export function setZ(n: number) { z = n; }

export function zoom(n?: number) { return Math.pow(Measure.ZOOMTICK, n ?? z); }

export function update() {
    img.root.setAttribute('transform', `scale(${zoom()}) translate(${x} ${y})`);
}
