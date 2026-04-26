import * as Event from './event.js';
import * as Stamp from './stamp.js';
import * as Data from './data.js';
import * as Draw from './draw.js';
import * as File from './file.js';
import * as Toolbox from './toolbox.js';
import ViewManager from './view.js';
import Image from './image.js';
import * as Gratility from './gratility.js';


Draw.initialize(document);
const svg = document.getElementById('grid') as unknown as SVGElement;

const image = new Image(svg);
const data = new Data.DataManager(image);
const stamp = new Stamp.StampManager(image);
const view = new ViewManager(image);
const backend = new Gratility.Backend(image, data, stamp, view);

data.connect(document.getElementById('filecont')!, document.getElementById('server')!);

const frontend = new Gratility.Frontend(backend,
    document.getElementById('toolbox')!,
    Array.from(document.getElementsByClassName('menuaction')) as Array<HTMLElement>,
    Array.from(document.getElementById('menupopups')!.children) as Array<HTMLElement>,
    Array.from(document.getElementsByClassName('menustate')) as Array<HTMLElement>);

Event.initialize(frontend, backend, svg, document.body);

// TODO better
image.grid(-500, 500, -500, 500);

window.addEventListener('beforeunload', e => {
    if (data.file?.unsavedChanges()) {
        e.preventDefault();
        e.returnValue = true;
    }
});

document.getElementById('toolbar')?.addEventListener('wheel', e => e.stopPropagation());
