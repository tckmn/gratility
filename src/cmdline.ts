import * as Data from './data.js';
import * as Stamp from './stamp.js';
import * as Measure from './measure.js';
import Image from './image.js';

import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import { parseArgs } from 'node:util';


const { values, positionals } = parseArgs({
    options: {
        script: { type: 'string', short: 's' },
        out: { type: 'string', short: 'o' },
        help: { type: 'boolean', short: 'h' }
    },
    allowPositionals: true
});

if (values.help || positionals.length !== 1) {
    console.log(`usage: ${process.argv[1]} [options] INPUT`);
    console.log('INPUT can be:');
    console.log('  a filename (containing binary stamp data)');
    console.log('  a base64-encoded string');
    console.log('options:');
    console.log('  --help|-h          show this message');
    console.log('  --out|-o FILE      specify output filename (derived from input by default)');
    console.log('  --script|-s FILE   run script on stamp and output new stamp');
    process.exit();
}


function interpret(s: string) {
    try {
        return Stamp.render(Data.deserialize(new Uint8Array(atob(s).split('').map(c => c.charCodeAt(0)))));
    } catch (e) {
        return Stamp.render(Data.deserialize(fs.readFileSync(s)));
    }
}

function outname(s: string) {
    if (values.out) return values.out;
    const ext = values.script ? '.new.stamp' : '.svg';
    if (s.slice(-6) === '.stamp') return s.replace(/\.stamp$/, ext);
    return 'out'+ext;
}


const imgpad = 1;
const gridpad = 0;

const dom = new JSDOM('<svg id="grid"></svg>');
const svg = dom.window.document.getElementById('grid') as unknown as SVGElement;
const image = new Image(dom.window.document, svg);
Data.initialize(image);

const stamp = interpret(positionals[0]);
if (values.script) {
    // TODO check if outname exists before running script
    // TODO also add a flag -f probably that overwrites
    require(values.script).runScript(stamp, { Data, Stamp, Measure });
    fs.writeFileSync(outname(positionals[0]), Data.serialize(stamp.cells), { flag: 'wx' });
    process.exit();
}
stamp.apply(0, 0);

const xmin = Math.floor(stamp.xmin/2)*2;
const ymin = Math.floor(stamp.ymin/2)*2;
const xmax = Math.ceil(stamp.xmax/2)*2;
const ymax = Math.ceil(stamp.ymax/2)*2;
image.grid(xmin-gridpad, xmax+gridpad, ymin-gridpad, ymax+gridpad);

image.text.setAttribute('transform', 'translate(0 2.5)');
svg.setAttribute('viewBox', `${Measure.HALFCELL*(xmin-imgpad)} ${Measure.HALFCELL*(ymin-imgpad)} ${Measure.HALFCELL*(xmax-xmin+2*imgpad)} ${Measure.HALFCELL*(ymax-ymin+2*imgpad)}`);

fs.writeFileSync(outname(positionals[0]), svg.outerHTML, { flag: 'wx' });
