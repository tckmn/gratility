import * as Measure from './measure.js';
import * as Data from './data.js';
import * as Draw from './draw.js';

export default class Image {

    public readonly root:      SVGElement;
    public readonly gridlines: SVGElement;
    public readonly surface:   SVGElement;
    public readonly path:      SVGElement;
    public readonly edge:      SVGElement;
    public readonly shape:     SVGElement;
    public readonly textInd:   SVGElement;
    public readonly text:      SVGElement;
    public readonly copypaste: SVGElement;
    public readonly stamps:    SVGElement;

    constructor(svg: SVGElement) {
        this.root      = Draw.draw(svg, 'g');
        this.gridlines = Draw.draw(this.root, 'g', { stroke: Measure.GRIDCOLOR, strokeWidth: Measure.GRIDLINE });
        this.surface   = Draw.draw(this.root, 'g');
        this.path      = Draw.draw(this.root, 'g');
        this.edge      = Draw.draw(this.root, 'g');
        this.shape     = Draw.draw(this.root, 'g');
        this.textInd   = Draw.draw(this.root, 'g');
        this.text      = Draw.draw(this.root, 'g');
        this.copypaste = Draw.draw(this.root, 'g');
        this.stamps    = Draw.draw(this.root, 'g', { opacity: 0.5 });
    }

    public obj(obj: Data.Layer): SVGElement {
        switch (obj) {
        case Data.Layer.SURFACE: return this.surface;
        case Data.Layer.PATH:    return this.path;
        case Data.Layer.EDGE:    return this.edge;
        case Data.Layer.SHAPE:   return this.shape;
        case Data.Layer.TEXT:    return this.text;
        }
    }

    public grid(xmin: number, xmax: number, ymin: number, ymax: number) {
        for (let x = Math.ceil(xmin/2)*2; x <= xmax; x += 2) {
            Draw.draw(this.gridlines, 'line', {
                x1: x * Measure.HALFCELL, x2: x * Measure.HALFCELL,
                y1: ymin * Measure.HALFCELL, y2: ymax * Measure.HALFCELL
            });
        }
        for (let y = Math.ceil(ymin/2)*2; y <= ymax; y += 2) {
            Draw.draw(this.gridlines, 'line', {
                x1: xmin * Measure.HALFCELL, x2: xmax * Measure.HALFCELL,
                y1: y * Measure.HALFCELL, y2: y * Measure.HALFCELL
            });
        }
    }
}
