import * as Draw from '../src/draw.js';
import * as Data from '../src/data.js';
import * as Stamp from '../src/stamp.js';
import Image from '../src/image.js';

import { JSDOM } from 'jsdom';
import { Resvg } from '@resvg/resvg-js';
import pixelmatch from 'pixelmatch';
import fs from 'node:fs';
import path from 'node:path';

const dir = process.argv[2];

for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.stamp')) continue;
    const g = f.replace('.stamp', '.svg');
    if (fs.existsSync(path.join('testout', g))) continue;

    console.log(`testing ${f}`);

    const stamp = Stamp.render(Data.deserializeStamp(new Uint8Array(fs.readFileSync(path.join(dir, f)))));
    const dom = new JSDOM('<svg id="grid"></svg>');
    Draw.initialize(dom.window.document);
    const svg = dom.window.document.getElementById('grid') as unknown as SVGElement;
    stamp.toSVG(svg);
    const generated = new Resvg(svg.outerHTML, {}).render();

    const expected = new Resvg(fs.readFileSync(path.join(dir, g)), {}).render();

    try {
        const diff = pixelmatch(generated.pixels, expected.pixels, undefined, expected.width, expected.height);
        if (diff) {
            console.log(` ** MISMATCH: ${diff} pixels differ **`);
            // fs.writeFileSync(g, generated.asPng());
        }
    } catch (e) {
        console.log(e);
        // fs.writeFileSync(g, generated.asPng());
    }

    fs.writeFileSync(path.join('testout', g), svg.outerHTML);
}
