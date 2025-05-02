import * as Measure from './measure.js';
import * as Data from './data.js';
import * as Color from './color.js';

// TODO this is absolutely an extremely temporary bandaid lol
let doc: HTMLDocument;
export function initialize(document: HTMLDocument) { doc = document; }

const svgNS = 'http://www.w3.org/2000/svg';

const drawfns: { [obj in Data.Obj]: (x: number, y: number, data: never) => SVGElement } = {

    [Data.Obj.SURFACE]: (x: number, y: number, data: number) => {
        return draw(undefined, 'rect', {
            width: Measure.CELL,
            height: Measure.CELL,
            x: Measure.HALFCELL*(x-1),
            y: Measure.HALFCELL*(y-1),
            fill: Color.colors[data]
        });
    },

    [Data.Obj.LINE]: (x: number, y: number, [spec, reversed]: [Data.LineSpec, boolean]) => {
        const g = draw(undefined, 'g', {
            transform: `
                rotate(${((y%2===0) == spec.isEdge ? 0 : 90) + (reversed ? 180 : 0)} ${x*Measure.HALFCELL} ${y*Measure.HALFCELL})
                `
        });
        const stroke = Color.colors[spec.color];
        const strokeLinecap = 'round'
        const strokeWidth = Measure.LINE * spec.thickness;
        const adjust = (z : number, n : number) => (z*Measure.HALFCELL+n*Math.sqrt(spec.thickness));
        draw(g, 'line', {
            x1: adjust(x+1,0),
            x2: adjust(x-1,0),
            y1: adjust(y,0),
            y2: adjust(y,0),
            stroke, strokeLinecap, strokeWidth
        });
        switch (spec.head) {
        case Data.Head.NONE:
            break;
        case Data.Head.ARROW:
            draw(g, 'path', {
                d: `M ${adjust(x,3)} ${adjust(y,5)} L ${adjust(x,-2)} ${adjust(y,0)} L ${adjust(x,3)} ${adjust(y,-5)}`,
                fill: 'none',
                stroke, strokeLinecap, strokeWidth
            });
        }
        return g;

    },

    [Data.Obj.SHAPE]: (x: number, y: number, data: Data.ShapeSpec[]) => {
        const g = draw(undefined, 'g', {
            transform: `translate(${x * Measure.HALFCELL} ${y * Measure.HALFCELL})`
        });

        for (const spec of data) {
            const r = Measure.HALFCELL * (spec.size/6);
            const strokeWidth = Measure.HALFCELL * (0.05 + 0.1*(spec.size/12));
            const fill = spec.fill === undefined ? 'none' : Color.colors[spec.fill];
            const stroke = spec.outline === undefined ? 'none' : Color.colors[spec.outline];

            switch (spec.shape) {
            case Data.Shape.CIRCLE:
                draw(g, 'circle', {
                    cx: 0, cy: 0, r: r,
                    strokeWidth, fill, stroke
                });
                break;
            case Data.Shape.SQUARE:
                draw(g, 'rect', {
                    width: r*2, height: r*2, x: -r, y: -r,
                    strokeWidth, fill, stroke
                });
                break;
            case Data.Shape.FLAG:
                draw(g, 'path', {
                    d: 'M -0.8 1 L -0.8 -1 L -0.6 -1 L 0.8 -0.5 L -0.6 0 L -0.6 1 Z',
                    transform: `scale(${r*0.9})`,
                    strokeWidth: strokeWidth/(r*0.9), fill, stroke
                });
                break;
            case Data.Shape.STAR:
                draw(g, 'path', {
                    d: 'M' + [0,1,2,3,4,5,6,7,8,9].map(n => (
                        r*(n%2===0?1:0.5)*Math.cos((n/5+0.5)*Math.PI) + ' ' +
                            -r*(n%2===0?1:0.5)*Math.sin((n/5+0.5)*Math.PI)
                    )).join('L') + 'Z',
                    strokeWidth, fill, stroke
                });
                break;
            }
        }

        return g;
    },

    [Data.Obj.TEXT]: (x: number, y: number, data: string) => {
        return draw(undefined, 'text', {
            x: Measure.HALFCELL*x,
            y: Measure.HALFCELL*y,
            textAnchor: 'middle',
            dominantBaseline: 'central',
            fontSize: Measure.CELL*(
                data.length === 1 ? 0.75 :
                data.length === 2 ? 0.55 :
                data.length === 3 ? 0.4 :
                0.3
            ),
            textContent: data
        });
    },

};

export function draw(parent: SVGElement | undefined, tagname: string, attrs: object = {}): SVGElement {
    const elt = doc.createElementNS(svgNS, tagname);
    for (let [k, v] of Object.entries(attrs)) {
        if (k === 'children') {
            for (let child of v) elt.appendChild(child);
        } else if (k === 'textContent') {
            elt.textContent = v;
        } else {
            elt.setAttribute(k === 'viewBox' ? k : k.replace(/[A-Z]/g, m => '-'+m.toLowerCase()), v);
        }
    }
    if (parent !== undefined) parent.appendChild(elt);
    return elt;
}

export function objdraw(elt: Data.Element, x: number, y: number) {
    return drawfns[elt.obj](x, y, elt.data as never);
}
