import * as Layer from 'layer';
import * as Event from 'event';
import * as Grid from 'grid';
import * as View from 'view';
import * as Stamp from 'stamp';
import * as Menu from 'menu';
import Toolbox from 'toolbox';

// TODO make this better i guess
const svg = document.getElementById('grid') as unknown as SVGElement;
const toolbox = new Toolbox(document.getElementById('toolbox')!);

Layer.initialize(svg);
Event.initialize(svg, document.body, toolbox);
Menu.initialize(Array.from(document.getElementsByClassName('menuaction')) as Array<HTMLElement>);
View.initialize(svg);
Grid.initialize();
Stamp.initialize();
