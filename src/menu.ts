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

const menuevents: Map<string, (menu: Menu, e: never, target: never) => void> = new Map();

menuevents.set('stamp-open', (menu: Menu) => {
    // TODO this whole function is awful
    const elt = menu.inputs.get('value') as HTMLTextAreaElement;
    const stamp = Stamp.current();
    elt.value = stamp === undefined ? '' :
        btoa(String.fromCharCode.apply(null, Data.serialize(stamp.cells) as unknown as number[]));
    elt.focus();
    elt.select();
});

menuevents.set('stamp-go', (menu: Menu) => {
    const elt = menu.inputs.get('value') as HTMLTextAreaElement;
    Stamp.add(Data.deserialize(new Uint8Array(atob(elt.value).split('').map(c => c.charCodeAt(0)))));
    menu.close();
});

menuevents.set('stamp-key', (menu: Menu, e: KeyboardEvent) => {
    if (e.key === 'Enter') menuevent(menu, 'go');
});

menuevents.set('addtool-open', (menu: Menu) => {
    const elt = menu.inputs.get('binding') as HTMLTextAreaElement;
    elt.value = '';
});

menuevents.set('addtool-bindmouse', (menu: Menu, e: MouseEvent, target: HTMLInputElement) => {
    if (e.button !== 0) e.preventDefault();
    target.value = 'click ' + e.button;
});

menuevents.set('addtool-bindkey', (menu: Menu, e: KeyboardEvent, target: HTMLInputElement) => {
    e.preventDefault();
    target.value = 'key [' + e.key + ']';
});

menuevents.set('addtool-bindwheel', (menu: Menu, e: WheelEvent, target: HTMLInputElement) => {
    target.value = 'scr ' + (e.deltaY < 0 ? 'up' : 'dn');
});

menuevents.set('addtool-nop', (menu: Menu, e: Event) => {
    e.preventDefault();
});

menuevents.set('addtool-settool', (menu: Menu, e: Event, target: Element) => {
    for (const el of Array.from(document.getElementsByClassName('addtool-active'))) {
        el.classList.remove('addtool-active');
    }
    target.classList.add('addtool-active');
});

function menuevent(menu: Menu, ev: string, e: Event | undefined = undefined, target: Element | undefined = undefined) {
    const fn = menuevents.get(`${menu.name}-${ev}`);
    if (fn !== undefined) fn(menu, e as never, target as never);
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
                            menuevent(menu, v, e, ipt);
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
                                    menuevent(menu, v, e, ch);
                                });
                            }
                        }
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
