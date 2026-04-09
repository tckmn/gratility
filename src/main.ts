import * as Event from './event.js';
import * as Stamp from './stamp.js';
import * as Color from './color.js';
import * as Data from './data.js';
import * as Draw from './draw.js';
import * as File from './file.js';
import * as Toolbox from './toolbox.js';
import MenuManager from './menu.js';
import ViewManager from './view.js';
import Image from './image.js';
import * as Gratility from './gratility.js';


// TODO make this better i guess
Draw.initialize(document);
const svg = document.getElementById('grid') as unknown as SVGElement;

const image = new Image(svg);
const data = new Data.DataManager(image);
const stamp = new Stamp.StampManager(image);
const view = new ViewManager(image);
const backend = new Gratility.Backend(image, data, stamp, view);

data.connect(document.getElementById('file')!, document.getElementById('server')!);

const frontend = new Gratility.Frontend(backend,
    document.getElementById('actions')!,
    document.getElementById('toolbox')!,
    Array.from(document.getElementsByClassName('menuaction')) as Array<HTMLElement>,
    Array.from(document.getElementById('menupopups')!.children) as Array<HTMLElement>);

Event.initialize(frontend, backend, svg, document.body);

// TODO better
image.grid(-500, 500, -500, 500);

// TODO this stuff should really go somewhere else
for (const multisel of Array.from(document.getElementsByClassName('multisel')) as Array<HTMLElement>) {
    const any = multisel.classList.contains('any');
    const children = Array.from(multisel.children) as Array<HTMLElement>;
    for (const child of children) {
        child.addEventListener('click', () => {
            if (!any) for (const ch of children) ch.classList.remove('active');
            child.classList.toggle('active');
            multisel.dataset.value = children
                .filter(ch => ch.classList.contains('active'))
                .map(ch => ch.dataset.multisel)
                .join('|');
        });
    }

    if (any) {
        multisel.dataset.value = '';
    } else {
        children[0].classList.add('active');
        multisel.dataset.value = children[0].dataset.multisel;
    }
}

window.addEventListener('beforeunload', e => {
    if (data.file?.unsavedChanges()) {
        e.preventDefault();
        e.returnValue = true;
    }
});

// TODO this should definitely definitely go somewhere else
document.getElementById('toolbar')?.addEventListener('wheel', e => e.stopPropagation());
