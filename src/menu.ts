import * as Stamp from 'stamp';
import * as Data from 'data';

class Menu {
    constructor(
        public name: string,
        public popup: HTMLElement,
        public inputs: Map<string, HTMLElement>
    ) {}

    public open() {
        this.popup.style.display = 'flex';
        menuevent(this, 'open');
    }

    public close() {
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

const menuevents: Map<string, (menu: Menu) => void> = new Map([

    ['stamp-open', (menu: Menu) => {
        // TODO awful
        const elt = menu.inputs.get('value') as HTMLTextAreaElement;
        elt.value = btoa(String.fromCharCode.apply(null, Data.serialize(Stamp.stamps[Stamp.stamppos].cells) as unknown as number[]));
        elt.focus();
        elt.select();
    }],

    ['stamp-go', (menu: Menu) => {
        const elt = menu.inputs.get('value') as HTMLTextAreaElement;
        const newst = Data.deserialize(new Uint8Array(atob(elt.value).split('').map(c => c.charCodeAt(0))));
        console.log(newst);
        Stamp.add(newst);
        menu.close();
    }]

]);

function menuevent(menu: Menu, ev: string) {
    const fn = menuevents.get(`${menu.name}-${ev}`);
    if (fn !== undefined) fn(menu);
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
                if (ipt.dataset.event !== undefined) {
                    ipt.addEventListener(ipt.dataset.event, () => {
                        menuevent(menu, ipt.dataset.menu as string);
                    });
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
