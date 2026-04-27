import Image from './image.js';
import * as Data from './data.js';
import * as Stamp from './stamp.js';
import ViewManager from './view.js';
import * as Toolbox from './toolbox.js';
import MenuManager from './menu.js';

export class Backend {
    public constructor(public image: Image,
                       public data: Data.DataManager,
                       public stamp: Stamp.StampManager,
                       public view: ViewManager) {}
}

export class Frontend {
    public readonly toolbox: Toolbox.Toolboxbox;
    public readonly menu: MenuManager;
    public constructor(backend: Backend, toolcont: HTMLElement | undefined, toolsaved: string | undefined, btns: Array<HTMLElement>, popups: Array<HTMLElement>, states: Array<HTMLElement>) {
        // kinda hacky, but must be done in this order, because toolbox references menu
        this.menu = new MenuManager(this, backend, btns, popups, states);
        this.toolbox = new Toolbox.Toolboxbox(this, toolcont);
        this.toolbox.loadSaved(toolsaved); // uh oh it got hackier (same reason)
    }
}
