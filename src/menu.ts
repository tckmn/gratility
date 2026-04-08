import * as Gratility from './gratility.js';
import * as Stamp from './stamp.js';
import * as Data from './data.js';
import * as Draw from './draw.js';
import * as Toolbox from './toolbox.js';
import * as File from './file.js';
import * as Tools from './tools/alltools.js';
import * as Courier from './courier.js';


function download(fname: string, data: Uint8Array<ArrayBuffer> | string, contenttype: string) {
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

// TODO bad
function isFullPage(): boolean { return document.getElementById('iesel')!.dataset.value === 'full'; }

// TODO full page import
// TODO refactor some of this
// TODO give feedback when no stamp

const menuactions: Map<string, (manager: MenuManager) => void> = new Map([

    ['dark', () => {
        document.body.classList.toggle('dark');
    }],

    ['ultxt', (manager: MenuManager) => {
        navigator.clipboard.readText().then(s => {
            manager.gb.stamp.add(Data.deserializeStamp(new Uint8Array(atob(s).split('').map(c => c.charCodeAt(0)))));
        }, e => {
            Courier.alert(`failed to read from clipboard: ${e}`);
        });
    }],

    ['ulstamp', (manager: MenuManager) => {
        const fileinput = document.getElementById('fileinput') as HTMLInputElement;
        const cb = () => {
            fileinput.removeEventListener('change', cb);
            fileinput.files![0].bytes().then(x => manager.gb.stamp.add(Data.deserializeStamp(x)));
        };
        fileinput.addEventListener('change', cb);
        fileinput.click();
    }],

    ['dltxt', (manager: MenuManager) => {
        const stamp = isFullPage() ? Stamp.unsafeWrap(manager.gb.data.listcells()) : manager.gb.stamp.current();
        if (stamp === undefined) return;
        navigator.clipboard.writeText(btoa(String.fromCharCode.apply(null, Data.serializeStamp(stamp.cells) as unknown as number[]))).then(() => {
            Courier.alert('copied to clipboard!');
        }, e => {
            Courier.alert(`failed to copy to clipboard: ${e}`);
        });
    }],

    ['dlstamp', (manager: MenuManager) => {
        const stamp = isFullPage() ? Stamp.unsafeWrap(manager.gb.data.listcells()) : manager.gb.stamp.current();
        if (stamp === undefined) return;
        download('gratility.stamp', Data.serializeStamp(stamp.cells), 'application/octet-stream');
    }],

    ['dlsvg', (manager: MenuManager) => {
        const stamp = isFullPage() ? Stamp.render(manager.gb.data.listcells()) : manager.gb.stamp.current();
        if (stamp === undefined) return;
        const svg = Draw.draw(undefined, 'svg');
        stamp.toSVG(svg);
        download('gratility.svg', svg.outerHTML, 'image/svg+xml;charset=utf-8');
    }]

]);


const menuevents: Map<string, (manager: MenuManager, menu: Menu, e: never, target: never) => void> = new Map();

// ###### ADD TOOL MENU ###### //

let resolve: number | string | boolean | undefined = undefined;

menuevents.set('addtool-open', (manager: MenuManager, menu: Menu) => {
    const elt = menu.inputs.get('binding') as HTMLTextAreaElement;
    const btn = menu.inputs.get('go') as HTMLInputElement;
    elt.classList.remove('conflict');
    for (const el of Array.from(document.getElementsByClassName('addtool-active'))) {
        el.classList.remove('addtool-active');
    }

    if (manager.addToolEntry === undefined) {
        elt.value = '';
        resolve = undefined;
        btn.textContent = 'add';
    } else {
        elt.value = manager.addToolEntry.describeBind();
        resolve = manager.addToolEntry.tbind;
        btn.textContent = 'save edits';

        const tool = manager.addToolEntry.tool;
        const panel = menu.popup.querySelector(`[data-tool="${tool.panel()}"]`)!;
        panel.classList.add('addtool-active');
        panel.scrollIntoView();
        const args = Array.from(panel.getElementsByClassName('arg')) as Array<HTMLElement>;
        tool.setargs(args);
    }
});

menuevents.set('addtool-bindmouse', (manager: MenuManager, menu: Menu, e: MouseEvent, target: HTMLInputElement) => {
    if (e.button !== 0) e.preventDefault();
    target.value = 'click ' + e.button;
    const conflict = e.button != manager.addToolEntry?.tbind && manager.addToolBox!.hasBind(e.button);
    target.classList.toggle('conflict', conflict);
    resolve = conflict ? undefined : e.button;
});

menuevents.set('addtool-bindkey', (manager: MenuManager, menu: Menu, e: KeyboardEvent, target: HTMLInputElement) => {
    e.preventDefault();
    target.value = 'key [' + e.key + ']';
    const conflict = e.key != manager.addToolEntry?.tbind && manager.addToolBox!.hasBind(e.key);
    target.classList.toggle('conflict', conflict);
    resolve = conflict ? undefined : e.key;
});

menuevents.set('addtool-bindwheel', (manager: MenuManager, menu: Menu, e: WheelEvent, target: HTMLInputElement) => {
    target.value = 'scr ' + (e.deltaY < 0 ? 'up' : 'dn');
    const conflict = (e.deltaY < 0) != manager.addToolEntry?.tbind && manager.addToolBox!.hasBind(e.deltaY < 0);
    target.classList.toggle('conflict', conflict);
    resolve = conflict ? undefined : e.deltaY < 0;
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
        Courier.alert('please pick an available binding for this tool');
        return;
    }

    const el = document.getElementsByClassName('addtool-active')[0] as HTMLElement | undefined;
    if (el === undefined) {
        Courier.alert('please pick an action for this tool');
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

    let tool;
    switch (el.dataset.tool) {
    case 'surface': tool = new Tools.SurfaceTool(new Data.SurfaceSpec(parseInt(args[0], 10))); break;
    case 'line':
        tool = new Tools.LineTool(new Data.LineSpec(
            parseInt(args[0]) === 1,
            parseInt(args[1]),
            parseInt(args[2]),
            parseInt(args[3])
        ));
        break;
    case 'shape':
        if (!(parseInt(args[1], 10) >= 1 && parseInt(args[1], 10) <= 5)) {
            Courier.alert('shape size should be between 1 and 5');
            return;
        }
        if (args[2] === '') {
            Courier.alert('shape should be placeable in at least one location');
            return;
        }
        if (args[3] === '' && args[4] === '') {
            Courier.alert('shape should should have at least one of fill or outline');
            return;
        }
        tool = new Tools.ShapeTool(new Data.ShapeSpec(
            parseInt(args[0], 10),
            args[3] === '' ? undefined : parseInt(args[3], 10),
            args[4] === '' ? undefined : parseInt(args[4], 10),
            parseInt(args[1], 10)
        ), args[2].split('|').map(x => parseInt(x, 10)).reduce((x,y) => x+y, 0));
        break;
    case 'text': tool = new Tools.TextTool(new Data.TextSpec(parseInt(args[0], 10), args[1])); break;
    case 'pan': tool = new Tools.PanTool(); break;
    case 'zoomin': tool = new Tools.ZoomTool(1); break;
    case 'zoomout': tool = new Tools.ZoomTool(-1); break;
    case 'copy': tool = new Tools.CopyTool(false); break;
    case 'cut': tool = new Tools.CopyTool(true); break;
    case 'paste': tool = new Tools.PasteTool(); break;
    case 'undo': tool = new Tools.UndoTool(true); break;
    case 'redo': tool = new Tools.UndoTool(false); break;
    case 'transform': tool = new Tools.TransformTool(parseInt(args[0], 10)); break;
    default: Courier.alert('unknown tool??'); return;
    }

    if (manager.addToolEntry === undefined) {
        manager.addToolBox?.addBind(resolve, tool);
    } else {
        manager.addToolEntry.tbind = resolve;
        manager.addToolEntry.tool = tool;
    }

    manager.gf.toolbox.saveRefresh();
    manager.close();
});

menuevents.set('addtool-close', (manager: MenuManager, menu: Menu) => {
    manager.addToolBox = undefined;
    manager.addToolEntry = undefined;
});

// TODO: something if file does not exist below? it should never not exist

// ###### SERVER MENU ###### //

menuevents.set('server-login', (manager: MenuManager, menu: Menu) => {
    manager.gb.data.file?.connectWS(localStorage.serverOverride || 'wss://gratility.tck.mn/ws/', {
        m: 'login',
        username: (menu.inputs.get('username') as HTMLInputElement).value,
        password: (menu.inputs.get('password') as HTMLInputElement).value
    });
    manager.close();
});

menuevents.set('server-register', (manager: MenuManager, menu: Menu) => {
    manager.gb.data.file?.connectWS(localStorage.serverOverride || 'wss://gratility.tck.mn/ws/', {
        m: 'register',
        username: (menu.inputs.get('username') as HTMLInputElement).value,
        password: (menu.inputs.get('password') as HTMLInputElement).value
    });
    manager.close();
});

// ###### FILE MENU ###### //

menuevents.set('file-open', (manager: MenuManager, menu: Menu) => {
    const file = manager.gb.data.file;
    if (file === undefined) return;
    const localList: HTMLDivElement = menu.popup.querySelector('#localfilelist')!;
    while (localList.firstChild) localList.removeChild(localList.firstChild);
    for (const [s, t] of file.localFiles) {
        const e = document.createElement('div');
        e.innerText = t;
        e.addEventListener('click', () => {
            file.open(new File.File(File.Schema.LOCAL, s, t));
            manager.close();
        });
        localList.appendChild(e);
    }
});

menuevents.set('file-newlocal', (manager: MenuManager, menu: Menu) => {
    manager.gb.data.file?.open(new File.File(File.Schema.LOCAL, '', (menu.inputs.get('newlocaltitle') as HTMLInputElement).value), true);
    manager.close();
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

class ContextMenu {
    public readonly menu: HTMLElement;
    private readonly overlay: HTMLElement;

    constructor(e: MouseEvent, private readonly onclose: () => void) {
        this.menu = document.createElement('div');
        this.menu.classList.add('contextmenu');
        this.menu.style.left = e.pageX + 'px';
        this.menu.style.top = e.pageY + 'px';
        document.body.appendChild(this.menu);

        this.overlay = document.createElement('div');
        this.overlay.classList.add('overlay');
        document.body.appendChild(this.overlay);

        this.overlay.addEventListener('click', e => {
            e.stopPropagation();
            this.close();
        });
    }

    public close() {
        this.menu.remove();
        this.overlay.remove();
        this.onclose();
    }

    public lbl(label: string) {
        const lbl = document.createElement('div');
        lbl.classList.add('menulbl');
        lbl.textContent = label;
        this.menu.appendChild(lbl);
    }

    public btn(label: string, click: () => boolean | undefined) {
        const btn = document.createElement('div');
        btn.classList.add('menubtn');
        btn.textContent = label;
        btn.addEventListener('click', () => {
            if (click()) this.close();
        });
        this.menu.appendChild(btn);
    }

    public space() {
        const elt = document.createElement('div');
        elt.classList.add('spacer');
        this.menu.appendChild(elt);
    }
}

export default class MenuManager {

    private activeMenu: Menu | undefined = undefined;
    private contextMenu: ContextMenu | undefined = undefined;

    // these are very hacky
    public addToolBox: Toolbox.Toolbox | undefined = undefined;
    public addToolEntry: Toolbox.ToolboxEntry | undefined = undefined;

    public isOpen(): boolean { return this.activeMenu !== undefined || this.contextMenu !== undefined; }

    public open(mname: string): Menu | undefined {
        if (this.activeMenu !== undefined) return;
        const menu = this.menus.get(mname);
        if (menu === undefined) return;
        menu.open();
        this.activeMenu = menu;
        this.menuevent(menu, 'open');
        return menu;
    }

    public close() {
        if (this.activeMenu !== undefined) {
            const menu = this.activeMenu;
            this.activeMenu.close();
            this.activeMenu = undefined;
            this.menuevent(menu, 'close');
        }
    }

    public newContextMenu(e: MouseEvent, onclose: () => void): ContextMenu | undefined {
        if (this.contextMenu !== undefined) return undefined;
        this.contextMenu = new ContextMenu(e, () => {
            this.contextMenu = undefined;
            onclose();
        });
        return this.contextMenu;
    }

    public closeContextMenu() {
        this.contextMenu?.close();
    }

    public confirm(msg: string, btns: Array<[string, () => void]>) {
        const menu = this.open('confirm');
        if (menu === undefined) return;
        menu.popup.querySelector('#confmsg')!.textContent = msg;
        menu.popup.querySelector('#confbtn')!.textContent = '';
        for (const [lbl, cb] of btns) {
            const btn = document.createElement('button');
            btn.textContent = lbl;
            btn.addEventListener('click', () => {
                this.close();
                cb();
            });
            menu.popup.querySelector('#confbtn')!.appendChild(btn);
        }
    }

    private readonly menus: Map<string, Menu> = new Map();

    constructor(public gf: Gratility.Frontend, public gb: Gratility.Backend, btns: Array<HTMLElement>, popups: Array<HTMLElement>) {
        for (const btn of btns) {
            btn.addEventListener('click', () => {
                if (this.open(btn.dataset.menu as string)) return;
                const fn = menuactions.get(btn.dataset.menu as string);
                if (fn !== undefined) fn(this);
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
