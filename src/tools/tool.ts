export default interface Tool {
    readonly repeat: boolean;
    name(): string;
    icon(): SVGElement | void;
    ondown(x: number, y: number): void;
    onmove(x: number, y: number): void;
    onup(): void;
}
