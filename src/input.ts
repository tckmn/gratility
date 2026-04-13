import * as Color from './color.js';
import * as Draw from './draw.js';

export class Param<T> {
    public val: T;
    constructor(private source: ParamSource, private readFunc: () => T, private writeFunc: (t: T) => void) {
        this.val = readFunc();
    }

    public setFromHTML() { this.val = this.readFunc(); }
    public setFromJSON(t: T) { this.val = t; }

    public save(): string { return JSON.stringify(this.readFunc()); }
    public load(t: T) { this.writeFunc(t); }
}

export function makeGroup(cont: HTMLElement, name: string) {
    const group = document.createElement('section');
    group.classList.add('group');
    const lbl = document.createElement('span');
    lbl.textContent = name;
    group.append(lbl);
    cont.append(group);
    return group;
}

export class ParamSource {
    private params: Array<Param<any>> = [];
    constructor(private element: HTMLElement) {}

    private param<T>(readFunc: () => T, writeFunc: (t: T) => void) {
        const param = new Param<T>(this, readFunc, writeFunc);
        this.params.push(param);
        return param;
    }

    private el(labelTag: string, labelName: string, elTag: string) {
        const el = document.createElement(elTag) as HTMLInputElement; // this is a little dumb but whatever
        const arg = document.createElement(labelTag);
        arg.append(document.createTextNode(`${labelName}: `));
        arg.append(el);
        this.element.append(arg);
        return el;
    }

    public num(name: string, min: number, max: number): Param<number> {
        const el = this.el('label', name, 'input');
        el.setAttribute('type', 'number');
        el.setAttribute('size', '3');
        el.setAttribute('min', min.toString());
        el.setAttribute('max', max.toString());
        return this.param(() => Math.min(max, Math.max(min, parseInt(el.value, 10))), n => (el.value = n.toString()));
    }

    public text(name: string): Param<string> {
        const el = this.el('label', name, 'input');
        return this.param(() => el.value, s => (el.value = s));
    }

    public color(name: string, optional: boolean = false): Param<number> {
        const colorpicker = this.el('label', name, 'span');
        colorpicker.classList.add('colorpicker');
        const children: Array<HTMLSpanElement> = [];
        let val = optional ? -1 : 0;

        const sqr = (color: string, i: number) => {
            const el = document.createElement('span');
            if (color === 'transparent') el.classList.add('transparent');
            else el.style.backgroundColor = color;
            el.addEventListener('click', () => {
                for (const ch of children) ch.classList.remove('active');
                el.classList.add('active');
                val = i;
            });

            colorpicker.appendChild(el);
            children.push(el);
        };

        if (optional) sqr('transparent', -1);
        Color.colors.forEach((color, i) => { sqr(color, i); });

        children[0].classList.add('active');

        return this.param(() => val, i => children[optional ? i+1 : i].click());
    }

    public position(name: string): Param<number> {
        const picker = this.el('label', name, 'div');
        picker.classList.add('positionpicker', 's2');
        let sz = 2;

        const preview = document.createElement('div');
        for (let i = 0; i < 3; ++i) {
            const row = document.createElement('div');
            for (let j = 0; j < 3; ++j) {
                const cell = document.createElement('div');
                cell.classList.toggle('ctr', i==1&&j==1);
                cell.classList.toggle('on', i==1&&j==1);
                cell.addEventListener('click', () => {
                    cell.classList.toggle('on');
                });
                row.append(cell);
            }
            preview.append(row);
        }
        picker.append(preview);

        const size = document.createElement('div');
        for (let i = 0; i < 5; ++i) {
            const bar = document.createElement('div');
            bar.classList.add('b'+i);
            bar.addEventListener('click', (i => () => {
                picker.classList.remove('s'+sz);
                sz = i;
                picker.classList.add('s'+sz);
            })(i));
            size.append(bar);
        }
        picker.append(size);

        const controls = document.createElement('div');
        for (let i = 0; i < 2; ++i) {
            const btn = document.createElement('div');
            btn.textContent = '+−'[i];
            btn.addEventListener('click', (i => () => {
                picker.classList.remove('s'+sz);
                sz = [Math.max(0, sz-1), Math.min(4, sz+1)][i];
                picker.classList.add('s'+sz);
            })(i));
            btn.addEventListener('pointerdown', e => e.preventDefault());
            controls.append(btn);
        }
        picker.append(controls);

        return this.param(() => sz, sz => {
            // TODO
        });
    }

    public transform(name: string): Param<number> {
        const picker = this.el('label', name, 'div');
        picker.classList.add('transformpicker');
        let val = 0;

        const svg = Draw.draw(picker as never, 'svg', {
            viewBox: '-1 -1 2 2',
            children: [Draw.draw(undefined, 'path', {
                d: 'M' + [0,1,2,3,4].map(n => (
                    Math.cos((n/5+0.25)*2*Math.PI) + ' ' + -Math.sin((n/5+0.25)*2*Math.PI)
                )).join('L') + 'Z',
                strokeWidth: 0.03
            })]
        });

        svg.addEventListener('click', () => {
            svg.animate([
                { transform: `rotate(${90*val}deg)`, easing: 'ease-out' },
                { transform: `rotate(${90*(val+1)}deg)`, easing: 'ease-in', offset: 1 },
                { transform: `rotate(${90*(val = (val+1)%4)}deg)` }
            ], { duration: 200, fill: 'forwards' });
        });

        return this.param(() => val, n => svg.style.setProperty('transform', `rotate(${90*(val=n)}deg)`));
    }

    // TODO repetition here and multiAny kinda sucks
    public multi<T>(name: string, options: Array<[string, T]>): Param<T> {
        const multisel = this.el('span', name, 'span');
        multisel.classList.add('multisel');
        const children: Array<HTMLButtonElement> = [];
        let val = options[0][1];

        for (const opt of options) {
            const el = document.createElement('button');
            el.textContent = opt[0];
            el.addEventListener('click', () => {
                for (const ch of children) ch.classList.remove('active');
                el.classList.toggle('active');
                val = opt[1];
            });
            multisel.append(el);
            children.push(el);
        }

        children[0].classList.add('active');

        // TODO error handling?
        return this.param(() => val, t => children[options.findIndex(o => o[1] === t)].click());
    }

    public multiAny<T>(name: string, options: Array<[string, T]>): Param<T[]> {
        const multisel = this.el('span', name, 'span');
        multisel.classList.add('multisel');
        const children: Array<HTMLButtonElement> = [];
        let val = [options[0][1]];

        for (const opt of options) {
            const el = document.createElement('button');
            el.textContent = opt[0];
            el.addEventListener('click', () => {
                el.classList.toggle('active');
                val = children
                    .map((ch, i) => ch.classList.contains('active') ? options[i][1] : undefined)
                    .filter(x => x !== undefined);
            });
            multisel.append(el);
            children.push(el);
        }

        children[0].classList.add('active');

        return this.param(() => val, arr => {
            val = arr;
            for (let i = 0; i < options.length; ++i) {
                children[i].classList.toggle('active', arr.includes(options[i][1]));
            }
        });
    }

    public setFromHTML() { for (const p of this.params) p.setFromHTML(); }
    public setFromJSON(s: string) { JSON.parse(`[${s}]`).forEach((x:any,i:any) => this.params[i].setFromJSON(x)); }

    public save(): string { return this.params.map(p => p.save()).join(','); }
    public load(s: string) { JSON.parse(`[${s}]`).forEach((x:any,i:any) => this.params[i].load(x)); }
}
