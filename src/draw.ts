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
