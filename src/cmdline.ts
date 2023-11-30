import * as Data from './data.js';
import * as Stamp from './stamp.js';
import Image from './image.js';

import { JSDOM } from 'jsdom';
import fs from 'node:fs';

const dom = new JSDOM('<svg id="grid"></svg>');

const svg = dom.window.document.getElementById('grid') as unknown as SVGElement;
const image = new Image(dom.window.document, svg);
Data.initialize(image);

const stamp = Data.deserialize(new Uint8Array(atob('AAWACIAAAFgAmAAABYAKgAAAWAC4AAAGgAeAAABoAIgAAAaAC4AAAGgAyAAAB4AGgAAAeAB4AAAHgAyAAACIAHAkAAiACAJAAIgAkCQACIAKAkAAiADIAAAIgA2AAACQAGgkAAkACoJAAJgAYCQACYALAkAAmADIAAAJgA2AAACgALgkAAqADAJAAKgAyAAACwAMgkAAuAC4AAALgAyAAADAAMgkAA==').split('').map(c => c.charCodeAt(0))));

for (let i = 0; i < stamp.length; ++i) {
    const cell = stamp[i];

    // const [x, y] = Data.decode(cell.n);
    // const newn = Data.encode(x - stamp.xoff + xoff, y - stamp.yoff + yoff);
    const newn = cell.n;

    const pre = Data.halfcells.get(newn)?.get(cell.obj);
    if (pre !== cell.data) {
        Data.add(new Data.Change(newn, cell.obj, pre, cell.data, i !== stamp.length-1));
    }
}

fs.writeFileSync('out.svg', svg.outerHTML);
