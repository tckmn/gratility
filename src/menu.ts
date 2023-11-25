import * as Stamp from 'stamp';
import * as Data from 'data';

const menuactions: Map<string, () => void> = new Map([

    ['stamp', () => {

        console.log(Stamp.stamps[Stamp.stamppos].cells);
        console.log(Data.deserialize(Data.serialize(Stamp.stamps[Stamp.stamppos].cells)));

    }]

]);

export function initialize(btns: Array<HTMLElement>) {
    for (const btn of btns) {
        btn.addEventListener('click', () => {
            const fn = menuactions.get(btn.dataset.menu as string);
            if (fn !== undefined) fn();
        });
    }
}
