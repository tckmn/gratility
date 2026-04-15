// TODO this is absolutely an extremely temporary bandaid lol
let doc: HTMLDocument;
export function initialize(document: HTMLDocument) { doc = document; }

const svgNS = 'http://www.w3.org/2000/svg';

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

export function poly(parent: SVGElement | undefined, sides: number, star: boolean, attrs: object = {}): SVGElement {
    if (star) sides *= 2;
    const offset = sides % 2 ? 0.25 : 1/sides/2;
    return draw(parent, 'path', {
        d: 'M' + Array.from({length: sides}, (_,n) => (
            (star&&n%2===1?0.5:1)*Math.cos((n/sides+offset)*2*Math.PI) + ' ' +
                -(star&&n%2===1?0.5:1)*Math.sin((n/sides+offset)*2*Math.PI)
        )).join('L') + 'Z',
        ...attrs
    });
}
