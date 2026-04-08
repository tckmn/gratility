import * as Gratility from '../gratility.js';
import * as Data from '../data.js';

export abstract class Tool {
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

export abstract class DragTool extends Tool {
    private isDrawing: boolean = false;
    protected abstract readonly layer: Data.Layer;
    protected abstract readonly tile: Data.Tile;

    protected draw(cell: Data.Tile | undefined): Data.Tile { return this.tile; }
    protected erase(cell: Data.Tile): Data.Tile | undefined { return undefined; }

    protected drag(isDown: boolean, n: number, g: Gratility.Backend) {
        const cell = g.data.halfcells.get(n)?.[this.layer];
        // TODO think this is just impossible to get correct due to
        // lack of dependent types, but should think about it more
        // TODO wtf, this logic is really weird and i feel like something
        // should change/simplify but not sure what
        if (cell && (cell.eq(this.tile as never) || !isDown && !this.isDrawing)) {
            if (isDown || !this.isDrawing) {
                this.isDrawing = false;
                g.data.add(new Data.Change(n, this.layer, cell, this.erase(cell)));
            }
        } else {
            if (isDown || this.isDrawing) {
                this.isDrawing = true;
                g.data.add(new Data.Change(n, this.layer, cell, this.draw(cell)));
            }
        }
    }
}
