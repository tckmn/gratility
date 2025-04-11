import Gratility from './gratility.js';
import * as Stamp from './stamp.js';
import * as Data from './data.js';
import * as Draw from './draw.js';
import Tool from './tools/tool.js';
import Toolbox from './toolbox.js';
import * as Tools from './tools/alltools.js';


function download(fname: string, data: Uint8Array | string, contenttype: string) {
    const blob = new Blob([data], { type: contenttype });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', fname);
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}

const menuactions: Map<string, (manager: MenuManager) => void> = new Map([

    ['dark', () => {
        document.body.classList.toggle('dark');
    }],

    ['dlstamp', (manager: MenuManager) => {
        const stamp = manager.g.stamp.current();
        if (stamp === undefined) return;
        download('gratility.stamp', Data.serialize(stamp.cells), 'application/octet-stream');
    }],

    ['dlsvg', (manager: MenuManager) => {
        const stamp = manager.g.stamp.current();
        if (stamp === undefined) return;
        const svg = Draw.draw(undefined, 'svg');
        stamp.toSVG(svg);
        download('gratility.svg', svg.outerHTML, 'image/svg+xml;charset=utf-8');
    }]

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
    const conflict = manager.toolbox.mouseTools.has(e.button);
    target.classList.toggle('conflict', conflict);
    resolve = conflict ? undefined : tool => manager.toolbox.bindMouse(e.button, tool);
});

menuevents.set('addtool-bindkey', (manager: MenuManager, menu: Menu, e: KeyboardEvent, target: HTMLInputElement) => {
    e.preventDefault();
    target.value = 'key [' + e.key + ']';
    const conflict = manager.toolbox.keyTools.has(e.key);
    target.classList.toggle('conflict', conflict);
    resolve = conflict ? undefined : tool => manager.toolbox.bindKey(e.key, tool);
});

menuevents.set('addtool-bindwheel', (manager: MenuManager, menu: Menu, e: WheelEvent, target: HTMLInputElement) => {
    target.value = 'scr ' + (e.deltaY < 0 ? 'up' : 'dn');
    const conflict = manager.toolbox.wheelTools.has(e.deltaY < 0);
    target.classList.toggle('conflict', conflict);
    resolve = conflict ? undefined : tool => manager.toolbox.bindWheel(e.deltaY < 0, tool);
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
        MenuManager.alert('please pick an available binding for this tool');
        return;
    }

    const el = document.getElementsByClassName('addtool-active')[0] as HTMLElement | undefined;
    if (el === undefined) {
        MenuManager.alert('please pick an action for this tool');
        return;
    }

    const args = (Array.from(el.getElementsByClassName('arg')) as Array<HTMLElement>).map(el => {
        if (el.tagName === 'INPUT') {
            return (el as HTMLInputElement).value;
        } else if (el.dataset.value !== undefined) {
            return el.dataset.value;
        } else {
            return '???'; // TODO
        }
    });

    switch (el.dataset.tool) {
    case 'surface': resolve(new Tools.SurfaceTool(parseInt(args[0], 10))); break;
    case 'line':
        resolve(new Tools.LineTool({
            isEdge: parseInt(args[0]) === 1,
            color: parseInt(args[1]),
            thickness: parseInt(args[2]),
            head: parseInt(args[3]),
        }));
        break;
    case 'shape':
        if (!(parseInt(args[1], 10) >= 1 && parseInt(args[1], 10) <= 5)) {
            MenuManager.alert('shape size should be between 1 and 5');
            return;
        }
        if (args[2] === '') {
            MenuManager.alert('shape should be placeable in at least one location');
            return;
        }
        if (args[3] === '' && args[4] === '') {
            MenuManager.alert('shape should should have at least one of fill or outline');
            return;
        }
        resolve(new Tools.ShapeTool({
            shape: parseInt(args[0], 10),
            size: parseInt(args[1], 10),
            fill: args[3] === '' ? undefined : parseInt(args[3], 10),
            outline: args[4] === '' ? undefined : parseInt(args[4], 10)
        }, args[2].split('|').map(x => parseInt(x, 10)).reduce((x,y) => x+y, 0)));
        break;
    case 'text': resolve(new Tools.TextTool(args[0])); break;
    case 'pan': resolve(new Tools.PanTool()); break;
    case 'zoomin': resolve(new Tools.ZoomTool(1)); break;
    case 'zoomout': resolve(new Tools.ZoomTool(-1)); break;
    case 'copy': resolve(new Tools.CopyTool()); break;
    case 'paste': resolve(new Tools.PasteTool()); break;
    case 'undo': resolve(new Tools.UndoTool(true)); break;
    case 'redo': resolve(new Tools.UndoTool(false)); break;
    default: MenuManager.alert('unknown tool??'); return;
    }

    manager.close();
});

// ###### STAMP MENU ###### //

menuevents.set('stamp-open', (manager: MenuManager, menu: Menu) => {
    // TODO this whole function is awful
    const elt = menu.inputs.get('value') as HTMLTextAreaElement;
    const stamp = manager.g.stamp.current();
    elt.value = stamp === undefined ? '' :
        btoa(String.fromCharCode.apply(null, Data.serialize(stamp.cells) as unknown as number[]));
    elt.focus();
    elt.select();
});

menuevents.set('stamp-go', (manager: MenuManager, menu: Menu) => {
    const elt = menu.inputs.get('value') as HTMLTextAreaElement;
    manager.g.stamp.add(Data.deserialize(new Uint8Array(atob(elt.value).split('').map(c => c.charCodeAt(0)))));
    manager.close();
});

menuevents.set('stamp-key', (manager: MenuManager, menu: Menu, e: KeyboardEvent) => {
    if (e.key === 'Enter') manager.menuevent(menu, 'go');
});

// ###### TOOLBOX MENU ###### //

menuevents.set('toolbox-open', (manager: MenuManager, menu: Menu) => {
    const elt = menu.inputs.get('value') as HTMLTextAreaElement;
    elt.value = manager.toolbox.save();
    elt.focus();
    elt.select();
});

function onesplit(s: string, delim: string): [string, string | undefined] {
    const parts = s.split(delim);
    return parts.length === 1 ? [s, undefined] : [parts[0], parts.slice(1).join(delim)];
}
menuevents.set('toolbox-go', (manager: MenuManager, menu: Menu) => {
    const elt = menu.inputs.get('value') as HTMLTextAreaElement;
    manager.toolbox.clear();
    for (const line of elt.value.split('\n')) {
        const [bind, rest] = onesplit(line, '::');
        if (rest === undefined) continue;
        const [tid, spec] = onesplit(rest, ':');
        if (spec === undefined) continue;
        const toolfn = Tools.tidtotool.get(tid);
        if (toolfn === undefined) continue;
        const bindtype = bind[0];
        const bindval = bind.slice(1);
        const tool = toolfn(spec);
        switch (bindtype) {
        case 'm': manager.toolbox.bindMouse(parseInt(bindval, 10), tool); break;
        case 'k': manager.toolbox.bindKey(bindval, tool); break;
        case 'w': manager.toolbox.bindWheel(bindval === '1', tool); break;
        }
    }
    manager.close();
});

menuevents.set('toolbox-key', (manager: MenuManager, menu: Menu, e: KeyboardEvent) => {
    if (e.key === 'Enter') manager.menuevent(menu, 'go');
});


class Menu {
    constructor(
        public name: string,
        public popup: HTMLElement,
        public inputs: Map<string, HTMLElement>
    ) {}

    public open()  { this.popup.style.display = 'flex'; }
    public close() { this.popup.style.display = 'none'; }
}

export default class MenuManager {

    private activeMenu: Menu | undefined = undefined;
    public isOpen(): boolean { return this.activeMenu !== undefined; }

    public open(menu: Menu) {
        menu.open();
        this.activeMenu = menu;
        this.menuevent(menu, 'open');
    }

    public close() {
        if (this.activeMenu !== undefined) {
            const menu = this.activeMenu;
            this.activeMenu.close();
            this.activeMenu = undefined;
            this.menuevent(menu, 'close');
        }
    }

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

    constructor(btns: Array<HTMLElement>, popups: Array<HTMLElement>, public g: Gratility, public toolbox: Toolbox) {
        for (const btn of btns) {
            btn.addEventListener('click', () => {
                const menu = this.menus.get(btn.dataset.menu as string);
                if (menu !== undefined && this.activeMenu === undefined) {
                    this.open(menu);
                } else {
                    const fn = menuactions.get(btn.dataset.menu as string);
                    if (fn !== undefined) fn(this);
                }
            });
        }

        for (const popup of popups) {
            const menu = new Menu(
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
                this.close();
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
