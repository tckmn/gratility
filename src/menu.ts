import * as Stamp from 'stamp';
import * as Data from 'data';
import Tool from 'tools/tool';
import Toolbox from 'toolbox';

import LineTool    from 'tools/line';
import PanTool     from 'tools/pan';
import SurfaceTool from 'tools/surface';
import ZoomTool    from 'tools/zoom';
import UndoTool    from 'tools/undo';
import CopyTool    from 'tools/copy';
import PasteTool   from 'tools/paste';

const menuactions: Map<string, () => void> = new Map([

    // ['stamp', () => {

    //     console.log(Stamp.stamps[Stamp.stamppos].cells);
    //     console.log(Data.deserialize(Data.serialize(Stamp.stamps[Stamp.stamppos].cells)));

    // }]

]);


const menuevents: Map<string, (manager: MenuManager, menu: Menu, e: never, target: never) => void> = new Map();

// ###### ADD TOOL MENU ###### //

let resolve: ((tool: Tool) => boolean) | undefined = undefined;

menuevents.set('addtool-open', (manager: MenuManager, menu: Menu) => {
    const elt = menu.inputs.get('binding') as HTMLTextAreaElement;
    elt.value = '';
    for (const el of Array.from(document.getElementsByClassName('addtool-active'))) {
        el.classList.remove('addtool-active');
    }
    resolve = undefined;
});

menuevents.set('addtool-bindmouse', (manager: MenuManager, menu: Menu, e: MouseEvent, target: HTMLInputElement) => {
    if (e.button !== 0) e.preventDefault();
    target.value = 'click ' + e.button;
    resolve = tool => manager.toolbox.bindMouse(e.button, tool);
});

menuevents.set('addtool-bindkey', (manager: MenuManager, menu: Menu, e: KeyboardEvent, target: HTMLInputElement) => {
    e.preventDefault();
    target.value = 'key [' + e.key + ']';
    resolve = tool => manager.toolbox.bindKey(e.key, tool);
});

menuevents.set('addtool-bindwheel', (manager: MenuManager, menu: Menu, e: WheelEvent, target: HTMLInputElement) => {
    target.value = 'scr ' + (e.deltaY < 0 ? 'up' : 'dn');
    resolve = tool => manager.toolbox.bindWheel(e.deltaY < 0, tool);
});

menuevents.set('addtool-nop', (manager: MenuManager, menu: Menu, e: Event) => {
    e.preventDefault();
});

menuevents.set('addtool-settool', (manager: MenuManager, menu: Menu, e: Event, target: Element) => {
    for (const el of Array.from(document.getElementsByClassName('addtool-active'))) {
        el.classList.remove('addtool-active');
    }
    target.classList.add('addtool-active');
});

menuevents.set('addtool-go', (manager: MenuManager, menu: Menu) => {
    if (resolve === undefined) {
        MenuManager.alert('please pick a binding for this tool');
        return;
    }

    const el = document.getElementsByClassName('addtool-active')[0] as HTMLElement | undefined;
    if (el === undefined) {
        MenuManager.alert('please pick an action for this tool');
        return;
    }

    const args = Array.from(el.getElementsByTagName('input')).map(x => x.value);

    switch (el.dataset.tool) {
    case 'surface': resolve(new SurfaceTool(parseInt(args[0], 10))); break;
    case 'line': resolve(new LineTool(parseInt(args[0], 10))); break;
    case 'pan': resolve(new PanTool()); break;
    case 'zoomin': resolve(new ZoomTool(1)); break;
    case 'zoomout': resolve(new ZoomTool(-1)); break;
    case 'copy': resolve(new CopyTool()); break;
    case 'paste': resolve(new PasteTool()); break;
    case 'undo': resolve(new UndoTool(true)); break;
    case 'redo': resolve(new UndoTool(false)); break;
    default: MenuManager.alert('unknown tool??'); return;
    }

    menu.close();
});

// ###### STAMP MENU ###### //

menuevents.set('stamp-open', (manager: MenuManager, menu: Menu) => {
    // TODO this whole function is awful
    const elt = menu.inputs.get('value') as HTMLTextAreaElement;
    const stamp = Stamp.current();
    elt.value = stamp === undefined ? '' :
        btoa(String.fromCharCode.apply(null, Data.serialize(stamp.cells) as unknown as number[]));
    elt.focus();
    elt.select();
});

menuevents.set('stamp-go', (manager: MenuManager, menu: Menu) => {
    const elt = menu.inputs.get('value') as HTMLTextAreaElement;
    Stamp.add(Data.deserialize(new Uint8Array(atob(elt.value).split('').map(c => c.charCodeAt(0)))));
    menu.close();
});

menuevents.set('stamp-key', (manager: MenuManager, menu: Menu, e: KeyboardEvent) => {
    if (e.key === 'Enter') manager.menuevent(menu, 'go');
});


class Menu {
    constructor(
        private manager: MenuManager,
        public name: string,
        public popup: HTMLElement,
        public inputs: Map<string, HTMLElement>
    ) {}

    public open() {
        if (this.manager.isOpen()) return;
        this.manager.activeMenu = this;
        this.popup.style.display = 'flex';
        this.manager.menuevent(this, 'open');
    }

    public close() {
        this.manager.activeMenu = undefined;
        this.popup.style.display = 'none';
        this.manager.menuevent(this, 'close');
    }
}

export default class MenuManager {

    // this should morally be private; only Menu accesses it directly
    public activeMenu: Menu | undefined = undefined;
    public isOpen(): boolean { return this.activeMenu !== undefined; }
    public close() { if (this.activeMenu !== undefined) this.activeMenu.close(); }

    // TODO
    public static alert(msg: string) {
        const alerts = document.getElementById('alerts')!;

        const elt = document.createElement('div');
        elt.textContent = msg;
        const rm = () => {
            alerts.removeChild(elt);
        };
        elt.addEventListener('click', rm);
        setTimeout(rm, Math.max(3000, 250*msg.length));

        alerts.insertBefore(elt, alerts.firstChild);
    }

    private readonly menus: Map<string, Menu> = new Map();

    constructor(btns: Array<HTMLElement>, popups: Array<HTMLElement>, public toolbox: Toolbox) {
        for (const btn of btns) {
            btn.addEventListener('click', () => {
                const menu = this.menus.get(btn.dataset.menu as string);
                if (menu !== undefined) menu.open();
                else {
                    const fn = menuactions.get(btn.dataset.menu as string);
                    if (fn !== undefined) fn();
                }
            });
        }

        for (const popup of popups) {
            const menu = new Menu(
                this,
                popup.dataset.menu as string,
                popup,
                new Map((Array.from(popup.getElementsByClassName('menuinput')) as Array<HTMLElement>).map(ipt => {

                    const evs = ipt.dataset.event;
                    if (evs !== undefined) {
                        for (const ev of evs.split(';')) {
                            const [k, v] = ev.split('=');
                            ipt.addEventListener(k, e => {
                                this.menuevent(menu, v, e, ipt);
                            });
                        }
                    }

                    const chevs = ipt.dataset.events;
                    if (chevs !== undefined) {
                        for (const chev of chevs.split('&')) {
                            const [sel, subevs] = chev.split('@');
                            for (const ch of Array.from(popup.querySelectorAll(sel))) {
                                for (const subev of subevs.split(';')) {
                                    const [k, v] = subev.split('=');
                                    ch.addEventListener(k, e => {
                                        this.menuevent(menu, v, e, ch);
                                    });
                                }
                            }
                        }
                    }

                    return [ipt.dataset.menu as string, ipt];
                }))
            );
            this.menus.set(popup.dataset.menu as string, menu);

            const close = document.createElement('div');
            close.textContent = '×';
            close.className = 'menuclose';
            close.addEventListener('click', () => {
                menu.close();
            });
            popup.appendChild(close);
        }
    }

    public menuevent(menu: Menu, ev: string,
                     e: Event | undefined = undefined,
                     target: Element | undefined = undefined) {
        const fn = menuevents.get(`${menu.name}-${ev}`);
        if (fn !== undefined) fn(this, menu, e as never, target as never);
    }

}
