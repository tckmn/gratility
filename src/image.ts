import * as Measure from './measure.js';
import * as Data from './data.js';
import * as Draw from './draw.js';

export default class Image {

    public readonly root:      SVGElement;
    public readonly gridlines: SVGElement;
    public readonly surface:   SVGElement;
    public readonly path:      SVGElement;
    public readonly edge:      SVGElement;
    public readonly wall:      SVGElement;
    public readonly shape_xl:  SVGElement;
    public readonly shape_l:   SVGElement;
    public readonly shape_m:   SVGElement;
    public readonly shape_s:   SVGElement;
    public readonly shape_xs:  SVGElement;
    public readonly textInd:   SVGElement;
    public readonly text_xl:   SVGElement;
    public readonly text_l:    SVGElement;
    public readonly text_m:    SVGElement;
    public readonly text_s:    SVGElement;
    public readonly text_xs:   SVGElement;
    public readonly copypaste: SVGElement;
    public readonly stamps:    SVGElement;

    constructor(svg: SVGElement) {
        this.root      = Draw.draw(svg, 'g');
        this.gridlines = Draw.draw(this.root, 'g', { stroke: Measure.GRIDCOLOR, strokeWidth: Measure.GRIDLINE });
        this.surface   = Draw.draw(this.root, 'g');
        this.shape_xl  = Draw.draw(this.root, 'g');
        this.shape_l   = Draw.draw(this.root, 'g');
        this.path      = Draw.draw(this.root, 'g');
        this.edge      = Draw.draw(this.root, 'g');
        this.wall      = Draw.draw(this.root, 'g');
        this.shape_m   = Draw.draw(this.root, 'g');
        this.shape_s   = Draw.draw(this.root, 'g');
        this.shape_xs  = Draw.draw(this.root, 'g');
        this.textInd   = Draw.draw(this.root, 'g');
        this.text_xl   = Draw.draw(this.root, 'g');
        this.text_l    = Draw.draw(this.root, 'g');
        this.text_m    = Draw.draw(this.root, 'g');
        this.text_s    = Draw.draw(this.root, 'g');
        this.text_xs   = Draw.draw(this.root, 'g');
        this.copypaste = Draw.draw(this.root, 'g');
        this.stamps    = Draw.draw(this.root, 'g', { opacity: 0.5 });
    }

    public layer(layer: Data.Layer): SVGElement {
        switch (layer) {
        case Data.Layer.SURFACE:    return this.surface;
        case Data.Layer.PATH:       return this.path;
        case Data.Layer.EDGE:       return this.edge;
        case Data.Layer.WALL:       return this.wall;
        case Data.Layer.SHAPE_XL:   return this.shape_xl;
        case Data.Layer.SHAPE_L:    return this.shape_l;
        case Data.Layer.SHAPE_M:    return this.shape_m;
        case Data.Layer.SHAPE_S:    return this.shape_s;
        case Data.Layer.SHAPE_XS:
        case Data.Layer.SHAPE_XSNW:
        case Data.Layer.SHAPE_XSN:
        case Data.Layer.SHAPE_XSNE:
        case Data.Layer.SHAPE_XSW:
        case Data.Layer.SHAPE_XSE:
        case Data.Layer.SHAPE_XSSW:
        case Data.Layer.SHAPE_XSS:
        case Data.Layer.SHAPE_XSSE: return this.shape_xs;
        case Data.Layer.TEXT_XL:    return this.text_xl;
        case Data.Layer.TEXT_L:     return this.text_l;
        case Data.Layer.TEXT_M:     return this.text_m;
        case Data.Layer.TEXT_S:     return this.text_s;
        case Data.Layer.TEXT_XS:
        case Data.Layer.TEXT_XSNW:
        case Data.Layer.TEXT_XSN:
        case Data.Layer.TEXT_XSNE:
        case Data.Layer.TEXT_XSW:
        case Data.Layer.TEXT_XSE:
        case Data.Layer.TEXT_XSSW:
        case Data.Layer.TEXT_XSS:
        case Data.Layer.TEXT_XSSE:  return this.text_xs;
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
