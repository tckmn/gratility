import * as Event from './event.js';
import * as View from './view.js';
import * as Stamp from './stamp.js';
import * as Color from './color.js';
import * as Data from './data.js';
import MenuManager from './menu.js';
import Toolbox from './toolbox.js';
import Image from './image.js';

// TODO make this better i guess
const svg = document.getElementById('grid') as unknown as SVGElement;
const image = new Image(document, svg);
const toolbox = new Toolbox(image, document.getElementById('toolbox')!);
const menu = new MenuManager(
    Array.from(document.getElementsByClassName('menuaction')) as Array<HTMLElement>,
    Array.from(document.getElementById('menupopups')!.children) as Array<HTMLElement>,
    toolbox,
    image
);

Event.initialize(svg, document.body, toolbox, menu);
View.initialize(image);
Stamp.initialize(image);
Data.initialize(image);

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

for (const colorpicker of Array.from(document.getElementsByClassName('colorpicker')) as Array<HTMLElement>) {
    const children: Array<HTMLSpanElement> = [];

    // TODO less repetition
    if (colorpicker.classList.contains('optional')) {
        const el = document.createElement('span');
        el.classList.add('transparent');
        el.addEventListener('click', () => {
            for (const ch of children) ch.classList.remove('active');
            el.classList.add('active');
            colorpicker.dataset.value = '';
        });

        colorpicker.appendChild(el);
        children.push(el);
    }

    Color.colors.forEach((color, i) => {
        const el = document.createElement('span');
        el.style.backgroundColor = color;
        el.addEventListener('click', () => {
            for (const ch of children) ch.classList.remove('active');
            el.classList.add('active');
            colorpicker.dataset.value = i.toString();
        });

        colorpicker.appendChild(el);
        children.push(el);
    });

    children[0].classList.add('active');
    colorpicker.dataset.value = colorpicker.classList.contains('optional') ? '' : '0';
}
