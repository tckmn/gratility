import Image from '../image.js';

export default interface Tool {
    readonly repeat: boolean;
    readonly tid: string;
    name(): string;
    icon(image: Image): SVGElement | void;
    save(): string;
    // static load(s: string): Tool;
    ondown(x: number, y: number, image: Image): void;
    onmove(x: number, y: number, image: Image): void;
    onup(image: Image): void;
}
