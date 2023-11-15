import * as Layer from 'layer';
import * as Event from 'event';
import * as Grid from 'grid';
import * as View from 'view';
import * as Stamp from 'stamp';

const svg = document.getElementById('grid') as unknown as SVGElement;

Layer.initialize(svg);
Event.initialize(svg);
View.initialize(svg);
Grid.initialize();
Stamp.initialize();
