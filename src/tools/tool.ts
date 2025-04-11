import Gratility from '../gratility.js';

export default interface Tool {
    readonly repeat: boolean;
    readonly tid: string;
    name(): string;
    icon(): SVGElement | void;
    save(): string;
    // static load(s: string): Tool;
    ondown(x: number, y: number, g: Gratility): void;
    onmove(x: number, y: number, g: Gratility): void;
    onup(g: Gratility): void;
}
