import * as Gratility from '../gratility.js';
import * as Data from '../data.js';
import * as Draw from '../draw.js';
import * as Measure from '../measure.js';

export abstract class Tool {
    abstract readonly repeat: boolean;
    icon(): SVGElement | void {}
    ondown(x: number, y: number, g: Gratility.Backend): void {}
    onmove(x: number, y: number, g: Gratility.Backend): void {}
    onup(g: Gratility.Backend): void {}
}

export abstract class DragTool extends Tool {
    private isDrawing: boolean = false;
    protected abstract tile: Data.Tile;

    protected draw(cell: Data.Tile | undefined): Data.Tile { return this.tile; }
    protected erase(cell: Data.Tile): Data.Tile | undefined { return undefined; }

    protected drag(isDown: boolean, n: number, g: Gratility.Backend) {
        const cell = g.data.halfcells.get(n)?.get(this.tile.layer);
        // TODO think this is just impossible to get correct due to
        // lack of dependent types, but should think about it more
        // TODO wtf, this logic is really weird and i feel like something
        // should change/simplify but not sure what
        if (cell && (cell.eq(this.tile as never) || !isDown && !this.isDrawing)) {
            if (isDown || !this.isDrawing) {
                this.isDrawing = false;
                g.data.add(new Data.Change(n, cell, this.erase(cell)));
            }
        } else {
            if (isDown || this.isDrawing) {
                this.isDrawing = true;
                g.data.add(new Data.Change(n, cell, this.draw(cell)));
            }
        }
    }
}

export abstract class SelectTool extends Tool {
    private sx = 0;
    private sy = 0;
    private tx = 0;
    private ty = 0;
    private elt: SVGElement | undefined;

    protected abstract onselect(sx: number, sy: number, tx: number, ty: number, g: Gratility.Backend): void;

    public ondown(x: number, y: number, g: Gratility.Backend) {
        this.sx = x;
        this.sy = y;
        this.tx = x;
        this.ty = y;
        this.elt = Draw.draw(g.image.copypaste, 'rect', {
            x: x,
            y: y,
            width: 0,
            height: 0,
            fill: 'rgba(0,0,0,0.25)',
            stroke: '#000'
        });
    }

    public onmove(x: number, y: number) {
        this.tx = x;
        this.ty = y;

        const sx = Measure.physhc(Math.min(this.sx, this.tx));
        const sy = Measure.physhc(Math.min(this.sy, this.ty));
        const tx = Measure.physhc(Math.max(this.sx, this.tx));
        const ty = Measure.physhc(Math.max(this.sy, this.ty));

        if (this.elt !== undefined) {
            this.elt.setAttribute('x', sx.toString());
            this.elt.setAttribute('y', sy.toString());
            this.elt.setAttribute('width', (tx-sx).toString());
            this.elt.setAttribute('height', (ty-sy).toString());
        }
    }

    public onup(g: Gratility.Backend) {
        if (this.elt !== undefined) g.image.copypaste.removeChild(this.elt);

        const sx = Measure.hc(Math.min(this.sx, this.tx));
        const sy = Measure.hc(Math.min(this.sy, this.ty));
        const tx = Measure.hc(Math.max(this.sx, this.tx));
        const ty = Measure.hc(Math.max(this.sy, this.ty));

        this.onselect(sx, sy, tx, ty, g);
    }
}
