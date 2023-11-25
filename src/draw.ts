const svgNS = 'http://www.w3.org/2000/svg';

export function draw(parent: SVGElement | undefined, tagname: string, attrs: object = {}): SVGElement {
    const elt = document.createElementNS(svgNS, tagname);
    for (let [k, v] of Object.entries(attrs)) {
        if (k === 'children') {
            for (let child of v) elt.appendChild(child);
        } else {
            elt.setAttribute(k === 'viewBox' ? k : k.replace(/[A-Z]/g, m => '-'+m.toLowerCase()), v);
        }
    }
    if (parent !== undefined) parent.appendChild(elt);
    return elt;
}
