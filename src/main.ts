import * as Layer from 'layer';
import * as Event from 'event';
import * as Grid from 'grid';
import * as View from 'view';
import * as Stamp from 'stamp';
import MenuManager from 'menu';
import Toolbox from 'toolbox';

// TODO make this better i guess
const svg = document.getElementById('grid') as unknown as SVGElement;
const toolbox = new Toolbox(document.getElementById('toolbox')!);
const menu = new MenuManager(
    Array.from(document.getElementsByClassName('menuaction')) as Array<HTMLElement>,
    Array.from(document.getElementById('menupopups')!.children) as Array<HTMLElement>,
    toolbox
);

Layer.initialize(svg);
Event.initialize(svg, document.body, toolbox, menu);
View.initialize(svg);
Grid.initialize();
Stamp.initialize();

// TODO this stuff should really go somewhere else
for (const multisel of Array.from(document.getElementsByClassName('multisel')) as Array<HTMLElement>) {
    const children = Array.from(multisel.children) as Array<HTMLElement>;
    for (const child of children) {
        child.addEventListener('click', () => {
            for (const ch of children) ch.classList.remove('active');
            child.classList.add('active');
            multisel.dataset.multisel = child.dataset.multisel;
        });
    }
}
