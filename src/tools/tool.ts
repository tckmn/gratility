export default interface Tool {
    readonly name: string;
    ondown(x: number, y: number): void;
    onmove(x: number, y: number): void;
    onup(): void;
}
