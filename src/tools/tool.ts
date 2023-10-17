export default interface Tool {
    readonly name: string;
    readonly repeat: boolean;
    ondown(x: number, y: number): void;
    onmove(x: number, y: number): void;
    onup(): void;
}
