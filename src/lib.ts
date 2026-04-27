import * as Event from './event.js';
import * as Stamp from './stamp.js';
import * as Data from './data.js';
import * as Draw from './draw.js';
import * as Toolbox from './toolbox.js';
import ViewManager from './view.js';
import Image from './image.js';
import * as Gratility from './gratility.js';
import * as Measure from './measure.js';


Draw.initialize(document);

export function create(maxw: number, maxh: number, initStamp: string, tools: string | undefined): object {
    const svg = Draw.draw(undefined, 'svg');

    const image = new Image(svg);
    const data = new Data.DataManager(image);
    const stamp = new Stamp.StampManager(image);
    const view = new ViewManager(image);
    const backend = new Gratility.Backend(image, data, stamp, view);
    const frontend = new Gratility.Frontend(backend, undefined, tools, [], [], []);

    const cleanup = Event.initialize(frontend, backend, svg, document.body);

    const s = Stamp.render(Data.deserializeStamp(new Uint8Array(atob(initStamp).split('').map(c => c.charCodeAt(0)))));

    // TODO duplication from stamp.ts
    const pad = 1;
    const xmin = Math.floor(s.xmin/2)*2;
    const ymin = Math.floor(s.ymin/2)*2;
    const xmax = Math.ceil(s.xmax/2)*2;
    const ymax = Math.ceil(s.ymax/2)*2;
    const w = xmax-xmin+pad;
    const h = ymax-ymin+pad;

    s.apply(data, -xmin, -ymin, true);
    image.grid(0, xmax-xmin, 0, ymax-ymin);

    const ratio = (w/h) / (maxw/maxh);
    view.x = Measure.HALFCELL*pad/2;
    view.y = Measure.HALFCELL*pad/2;
    view.z = ratio < 1 ?
        Math.log(maxh/(h*Measure.HALFCELL))/Math.log(Measure.ZOOMTICK) :
        Math.log(maxw/(w*Measure.HALFCELL))/Math.log(Measure.ZOOMTICK);
    view.update();

    svg.style.width = ratio < 1 ? (maxh/h*w)+'px' : maxw+'px';
    svg.style.height = ratio < 1 ? maxh+'px' : (maxw/w*h)+'px';
    svg.style.userSelect = 'none';

    return {
        svg, cleanup,
        set: (newStamp: string, offset: [number, number] | undefined = undefined) => {
            data.clear();
            const s = Stamp.render(Data.deserializeStamp(new Uint8Array(atob(newStamp).split('').map(c => c.charCodeAt(0)))));
            const xmin = Math.floor(s.xmin/2)*2;
            const ymin = Math.floor(s.ymin/2)*2;
            const xmax = Math.ceil(s.xmax/2)*2;
            const ymax = Math.ceil(s.ymax/2)*2;
            s.apply(data, -xmin + (offset ? offset[0]*2 : 0), -ymin + (offset ? offset[1]*2 : 0), true);
        }
    };
};
