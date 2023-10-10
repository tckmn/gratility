const svgNS = 'http://www.w3.org/2000/svg';

export function draw(parent: SVGElement, tagname: string, attrs: object = {}): SVGElement {
    const elt = document.createElementNS(svgNS, tagname);
    for (let [k, v] of Object.entries(attrs)) {
        elt.setAttribute(k.replace(/[A-Z]/g, m => '-'+m.toLowerCase()), v);
    }
    parent.appendChild(elt);
    return elt;
}
