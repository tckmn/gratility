import * as Gratility from '../gratility.js';

export default abstract class Tool {
    abstract readonly repeat: boolean;
    abstract readonly tid: string;
    abstract name(): string;
    panel(): string { return this.tid; }
    setargs(args: Array<HTMLElement>) {}
    icon(): SVGElement | void {}
    abstract save(): string;
    // static load(s: string): Tool;
    ondown(x: number, y: number, g: Gratility.Backend): void {}
    onmove(x: number, y: number, g: Gratility.Backend): void {}
    onup(g: Gratility.Backend): void {}
}
