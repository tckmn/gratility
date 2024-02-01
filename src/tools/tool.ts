import Image from '../image.js';

export default interface Tool {
    readonly repeat: boolean;
    name(): string;
    icon(image: Image): SVGElement | void;
    ondown(x: number, y: number, image: Image): void;
    onmove(x: number, y: number, image: Image): void;
    onup(image: Image): void;
}
