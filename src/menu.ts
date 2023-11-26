import * as Stamp from 'stamp';
import * as Data from 'data';

let activeMenu: Menu | undefined = undefined;
export function isOpen(): boolean { return activeMenu !== undefined; }
export function close() { if (activeMenu !== undefined) activeMenu.close(); }

export function alert(msg: string) {
    const alerts = document.getElementById('alerts')!; // TODO

    const elt = document.createElement('div');
    elt.textContent = msg;
    const rm = () => {
        alerts.removeChild(elt);
    };
    elt.addEventListener('click', rm);
    setTimeout(rm, Math.max(3000, 250*msg.length));

    alerts.insertBefore(elt, alerts.firstChild);
}

class Menu {
    constructor(
        public name: string,
        public popup: HTMLElement,
        public inputs: Map<string, HTMLElement>
    ) {}

    public open() {
        if (activeMenu !== undefined) return;
        activeMenu = this;
        this.popup.style.display = 'flex';
        menuevent(this, 'open');
    }

    public close() {
        activeMenu = undefined;
        this.popup.style.display = 'none';
        menuevent(this, 'close');
    }
}

const menuactions: Map<string, () => void> = new Map([

    // ['stamp', () => {

    //     console.log(Stamp.stamps[Stamp.stamppos].cells);
    //     console.log(Data.deserialize(Data.serialize(Stamp.stamps[Stamp.stamppos].cells)));

    // }]

]);

const menuevents: Map<string, (menu: Menu, e: Event | undefined) => void> = new Map([

    ['stamp-open', (menu: Menu) => {
        // TODO this whole function is awful
        const elt = menu.inputs.get('value') as HTMLTextAreaElement;
        const stamp = Stamp.current();
        elt.value = stamp === undefined ? '' : btoa(String.fromCharCode.apply(null, Data.serialize(stamp.cells) as unknown as number[]));
        elt.focus();
        elt.select();
    }],

    ['stamp-go', (menu: Menu) => {
        const elt = menu.inputs.get('value') as HTMLTextAreaElement;
        Stamp.add(Data.deserialize(new Uint8Array(atob(elt.value).split('').map(c => c.charCodeAt(0)))));
        menu.close();
    }],

    ['stamp-key', (menu: Menu, e: Event | undefined) => {
        // TODO the types in here are awful
        if (e !== undefined && (e as KeyboardEvent).key === 'Enter') menuevent(menu, 'go');
    }],

    ['addtool-open', (menu: Menu) => {
        const elt = menu.inputs.get('binding') as HTMLTextAreaElement;
        elt.value = '';
    }],

    ['addtool-bindmouse', (menu: Menu, e_: Event | undefined) => {
        const e = e_ as MouseEvent;
        if (e.button !== 0) e.preventDefault();
        (e.target as HTMLInputElement).value = 'click ' + e.button;
    }],

    ['addtool-bindkey', (menu: Menu, e_: Event | undefined) => {
        const e = e_ as KeyboardEvent;
        e.preventDefault();
        (e.target as HTMLInputElement).value = 'key [' + e.key + ']';
    }],

    ['addtool-bindwheel', (menu: Menu, e_: Event | undefined) => {
        const e = e_ as WheelEvent;
        (e.target as HTMLInputElement).value = 'scr ' + (e.deltaY < 0 ? 'up' : 'dn');
    }],

    ['addtool-nop', (menu: Menu, e: Event | undefined) => {
        e!.preventDefault();
    }]

]);

function menuevent(menu: Menu, ev: string, e: Event | undefined = undefined) {
    const fn = menuevents.get(`${menu.name}-${ev}`);
    if (fn !== undefined) fn(menu, e);
}

const menus: Map<string, Menu> = new Map();

export function initialize(btns: Array<HTMLElement>, popups: Array<HTMLElement>) {
    for (const btn of btns) {
        btn.addEventListener('click', () => {
            const menu = menus.get(btn.dataset.menu as string);
            if (menu !== undefined) menu.open();
            else {
                const fn = menuactions.get(btn.dataset.menu as string);
                if (fn !== undefined) fn();
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
                            menuevent(menu, v, e);
                        });
                    }
                }
                return [ipt.dataset.menu as string, ipt];
            }))
        );
        menus.set(popup.dataset.menu as string, menu);

        const close = document.createElement('div');
        close.textContent = '×';
        close.className = 'menuclose';
        close.addEventListener('click', () => {
            menu.close();
        });
        popup.appendChild(close);
    }
}
