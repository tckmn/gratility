import * as Tool from './tools/tool.js';
import * as Tools from './tools/alltools.js';
import * as Data from './data.js';
import * as Color from './color.js';
import * as Gratility from './gratility.js';
import * as Courier from './courier.js';

const DEFAULT_TOOLS = `main
m1::pan:
k ::pan:
ks::surface:0
kr::line:L 8 2 0
ke::line:E 0 2 0
kt::text:
kz::undo:u
kx::undo:r
kc::copy:c
kd::copy:x
kv::paste:
w1::zoom:1
w0::zoom:-1`;

// for load()
function onesplit(s: string, delim: string): [string, string | undefined] {
    const parts = s.split(delim);
    return parts.length === 1 ? [s, undefined] : [parts[0], parts.slice(1).join(delim)];
}

export class ToolboxEntry {

    constructor(public tbind: number | string | boolean, public tool: Tool.Tool) {}

    public describeBind(): string {
        switch (typeof this.tbind) {
        case 'number': return `click ${this.tbind}`;
        case 'string': return `key [${this.tbind}]`;
        case 'boolean': return `scr ${this.tbind ? 'up' : 'dn'}`;
        }
    }

    private saveBind(): string {
        switch (typeof this.tbind) {
        case 'number': return `m${this.tbind}`;
        case 'string': return `k${this.tbind}`;
        case 'boolean': return `w${+this.tbind}`;
        }
    }

    public save(): string {
        // the delimiter is :: to avoid any confusion about keybinds to Space
        // maybe i should just globally turn ' ' into 'Space' everywhere,
        // but whatever
        return `${this.saveBind()}::${this.tool.tid}:${this.tool.save()}`;
    }

    static load(s: string): ToolboxEntry {
        const [bind, rest] = onesplit(s, '::');
        if (rest === undefined) throw new Error('malformed toolbox entry');
        const [tid, spec] = onesplit(rest, ':');
        if (spec === undefined) throw new Error('malformed toolbox entry');
        const toolfn = Tools.tidtotool.get(tid);
        if (toolfn === undefined) throw new Error('malformed toolbox entry');
        const bindtype = bind[0];
        const bindval = bind.slice(1);
        const tool = toolfn(spec);
        switch (bindtype) {
        case 'm': return new ToolboxEntry(parseInt(bindval, 10), tool);
        case 'k': return new ToolboxEntry(bindval, tool);
        case 'w': return new ToolboxEntry(bindval === '1', tool);
        default: throw new Error('malformed toolbox entry');
        }
    }

    public display(toolbox: Toolbox): HTMLElement {
        const container = document.createElement('div');

        const bind = document.createElement('div');
        bind.textContent = this.describeBind();
        container.appendChild(bind);

        const name = document.createElement('div');
        name.textContent = this.tool.name();
        container.appendChild(name);

        const icon = document.createElement('div');
        const maybeIcon = this.tool.icon();
        if (maybeIcon !== undefined) icon.appendChild(maybeIcon);
        container.appendChild(icon);

        container.addEventListener('click', e => {
            e.preventDefault();
            toolbox.showMenu(e, this, container);
        });

        return container;
    }

}

export class Toolbox {

    constructor(private readonly gf: Gratility.Frontend, public name: string, public readonly tools: Array<ToolboxEntry> = []) {}

    public hasBind(tbind: number | string | boolean): boolean {
        return this.tools.some(e => e.tbind === tbind);
    }

    public addBind(tbind: number | string | boolean, tool: Tool.Tool): boolean {
        if (this.hasBind(tbind)) return false;
        this.tools.push(new ToolboxEntry(tbind, tool));
        return true;
    }

    public delBind(e: ToolboxEntry) {
        const idx = this.tools.indexOf(e);
        if (idx !== -1) this.tools.splice(idx, 1);
    }

    // oops naming lol
    public save() { this.gf.toolbox.save(); }
    public saveStr(): string { return this.name + this.tools.map(t => '\n' + t.save()).join(''); }
    static load(gf: Gratility.Frontend, s: string) { return new Toolbox(gf, s.split('\n')[0], s.split('\n').slice(1).map(ToolboxEntry.load)); }

    public display(container: HTMLElement) {
        const title = document.createElement('div');
        title.classList.add('tbname');
        title.textContent = this.name;
        container.appendChild(title);

        title.addEventListener('click', e => {
            e.preventDefault();
            this.showMenu(e);
        });

        container.appendChild(this.generateList());
    }

    private generateList(): HTMLElement {
        const container = document.createElement('div');
        container.classList.add('tbtools');
        for (const t of this.tools) container.appendChild(t.display(this));
        return container;
    }

    public showMenu(e: MouseEvent, te: ToolboxEntry | undefined = undefined, row: HTMLElement | undefined = undefined) {
        const c = this.gf.menu.newContextMenu(e, () => {
            if (row !== undefined) row.classList.remove('activerow');
        });
        if (c === undefined) return;
        if (row !== undefined) row.classList.add('activerow');

        if (te !== undefined) {
            c.lbl(`tool ${te.tool.name()}`);

            c.btn('✎ edit tool', () => {
                this.gf.menu.addToolBox = this;
                this.gf.menu.addToolEntry = te;
                this.gf.menu.open('addtool');
                return true;
            });

            c.btn('× delete tool', () => {
                this.gf.menu.confirm(`really delete tool ${te.tool.name()}?`, [
                    ['delete it', () => {
                        this.delBind(te);
                        this.gf.toolbox.saveRefresh();
                    }],
                    ['never mind', () => {}]
                ]);
                return true;
            });

            c.space();
        }

        c.lbl(`toolbox ${this.name}`);

        c.btn('+ add new tool', () => {
            this.gf.menu.addToolBox = this;
            this.gf.menu.open('addtool');
            return true;
        });

        c.btn('× delete toolbox', () => {
            this.gf.menu.confirm(`really delete toolbox ${this.name}?`, [
                ['delete it', () => {
                    this.gf.toolbox.delToolbox(this);
                    this.gf.toolbox.saveRefresh();
                }],
                ['never mind', () => {}]
            ]);
            return true;
        });

        c.space();

        const renametxt = document.createElement('input');
        renametxt.setAttribute('placeholder', 'toolbox name...');
        renametxt.value = this.name;
        c.menu.appendChild(renametxt);

        const renamefn = () => {
            if (renametxt.value.replace(/\s/g, '')) {
                this.name = renametxt.value;
                this.gf.toolbox.saveRefresh();
                return true;
            } else {
                Courier.alert(`please provide a name to rename ${this.name} to`);
            }
        };

        c.btn('✎ rename toolbox', renamefn);
        renametxt.addEventListener('keyup', e => e.stopPropagation());
        renametxt.addEventListener('keydown', e => {
            e.stopPropagation();
            if (e.key === 'Enter') if (renamefn()) c.close();
            if (e.key === 'Escape') renametxt.blur();
        });

        c.space();

        c.lbl('all toolboxes');

        const addtxt = document.createElement('input');
        addtxt.setAttribute('placeholder', 'toolbox name...');
        c.menu.appendChild(addtxt);

        const addfn = () => {
            if (addtxt.value.replace(/\s/g, '')) {
                this.gf.toolbox.toolboxes.push(new Toolbox(this.gf, addtxt.value));
                this.gf.toolbox.saveRefresh();
                return true;
            } else {
                Courier.alert('please provide a name for your new toolbox');
            }
        };

        c.btn('+ add new toolbox', addfn);
        addtxt.addEventListener('keyup', e => e.stopPropagation());
        addtxt.addEventListener('keydown', e => {
            e.stopPropagation();
            if (e.key === 'Enter') if (addfn()) c.close();
            if (e.key === 'Escape') addtxt.blur();
        });
    }

}

export class Toolboxbox {

    public toolboxes: Array<Toolbox> = [];

    public readonly mouseTools = new Map<number, Tool.Tool>();
    public readonly keyTools = new Map<string, Tool.Tool>();
    public readonly wheelTools = new Map<boolean, Tool.Tool>();

    constructor(private gf: Gratility.Frontend, menuCont: HTMLElement, private container: HTMLElement) {
        this.generateMenu(menuCont);
        this.load(localStorage.toolbox ?? DEFAULT_TOOLS);
    }

    public save() { localStorage.toolbox = this.toolboxes.map(b => b.saveStr()).join('\n:\n'); }
    private load(s: string) { this.toolboxes = s.split('\n:\n').map(x => Toolbox.load(this.gf, x)); this.recompute(); this.rerender(); }

    public saveRefresh() {
        this.recompute(); this.rerender(); this.save();
    }

    public delToolbox(t: Toolbox) {
        const idx = this.toolboxes.indexOf(t);
        if (idx !== -1) this.toolboxes.splice(idx, 1);
    }

    private recompute() {
        this.mouseTools.clear();
        this.keyTools.clear();
        this.wheelTools.clear();
        for (const toolbox of this.toolboxes) {
            for (const entry of toolbox.tools) {
                switch (typeof entry.tbind) {
                case 'number': this.mouseTools.set(entry.tbind, entry.tool); break;
                case 'string': this.keyTools.set(entry.tbind, entry.tool); break;
                case 'boolean': this.wheelTools.set(entry.tbind, entry.tool); break;
                }
            }
        }
    }

    private rerender() {
        while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
        for (const t of this.toolboxes) t.display(this.container);
    }

    private generateMenu(menuCont: HTMLElement) {
        let group;

        group = makeGroup(menuCont, 'drawing');

        group.append(new MenuItem('surface', 'Surface', (param) => {
            const color = param.color('color');
            return () => new Tools.SurfaceTool(new Data.SurfaceSpec(color.get()));
        }, 'full').element);

        group.append(new MenuItem('line', 'Line', (param) => {
            const type = param.multi('type', [['P', 'path', false], ['E', 'edge', true]]);
            const color = param.color('color');
            const thickness = param.multi('thickness', [['1', 'thin', 1], ['2', 'normal', 2], ['3', 'thick', 3]]);
            const head = param.multi('head', [['N', 'none', Data.Head.NONE], ['A', 'arrow', Data.Head.ARROW]]);
            return () => new Tools.LineTool(new Data.LineSpec(type.get(), color.get(), thickness.get(), head.get()));
        }, 'full').element);

        group.append(new MenuItem('shape', 'Shape', (param) => {
            const type = param.multi('type', [
                ['C', 'circle', Data.Shape.CIRCLE],
                ['S', 'square', Data.Shape.SQUARE],
                ['F', 'flag', Data.Shape.FLAG],
                ['R', 'star', Data.Shape.STAR]
            ]);
            const size = param.num('size', 1, 5);
            const location = param.multiAny('location', [
                ['C', 'center', 4],
                ['E', 'edge', 2],
                ['R', 'corner', 1]
            ]);
            const fill = param.color('fill', true);
            const outline = param.color('outline', true);
            return () => {
                if (location.get().length === 0) {
                    Courier.alert('shape should be placeable in at least one location');
                    return;
                }
                if (outline.get() === -1 && size.get() === -1) {
                    Courier.alert('shape should should have at least one of fill or outline');
                    return;
                }
                return new Tools.ShapeTool(new Data.ShapeSpec(type.get(), fill.get() === -1 ? undefined : fill.get(), outline.get() === -1 ? undefined : outline.get(), size.get()),
                                           location.get().reduce((a,b) => a+b, 0));
            };
        }, 'full').element);

        group.append(new MenuItem('text', 'Text', (param) => {
            const color = param.color('color');
            const preset = param.text('preset');
            return () => new Tools.TextTool(new Data.TextSpec(color.get(), preset.get()));
        }, 'full').element);

        group = makeGroup(menuCont, 'movement');
        group.append(new MenuItem('pan', 'Pan', () => () => new Tools.PanTool()).element);
        group.append(new MenuItem('zoomin', 'Zoom in', () => () => new Tools.ZoomTool(1)).element);
        group.append(new MenuItem('zoomout', 'Zoom out', () => () => new Tools.ZoomTool(-1)).element);

        group = makeGroup(menuCont, 'stamps');
        group.append(new MenuItem('copy', 'Copy', () => () => new Tools.CopyTool(false)).element);
        group.append(new MenuItem('cut', 'Cut', () => () => new Tools.CopyTool(true)).element);
        group.append(new MenuItem('paste', 'Paste', () => () => new Tools.PasteTool()).element);
        group.append(new MenuItem('flip', 'Flip', (param) => {
            const direction = param.multi('direction', [
                ['|', '\u00a0↔\u00a0', 0],
                ['-', '\u00a0↕\u00a0', 1],
                ['/', '\u00a0⤡\u00a0', 2],
                ['\\', '\u00a0⤢\u00a0', 3]
            ]);
            return () => new Tools.TransformTool(direction.get());
        }, 'natwidth').element);
        group.append(new MenuItem('rotate', 'Rotate', (param) => {
            const direction = param.multi('direction', [
                ['L', '\u00a0↶\u00a0', 10],
                ['R', '\u00a0↷\u00a0', 11],
                ['F', '180°', 12]
            ]);
            return () => new Tools.TransformTool(direction.get());
        }, 'natwidth').element);
        group.append(new MenuItem('func', 'Func', (param) => {
            const name = param.text('name');
            return () => new Tools.FuncTool(name.get());
        }, 'natwidth').element);

        group = makeGroup(menuCont, 'misc');
        group.append(new MenuItem('undo', 'Undo', () => () => new Tools.UndoTool(true)).element);
        group.append(new MenuItem('redo', 'Redo', () => () => new Tools.UndoTool(false)).element);

    }

}

class Param<T> {
    private val: T | undefined;
    constructor(private source: ParamSource, private consumeFunc: (s: string) => [T, string], private readFunc: () => T) {}
    public get(): T {
        if (this.val !== undefined) return this.val;
        return this.readFunc();
    }
    public consume(s: string): string { const ret = this.consumeFunc(s); this.val = ret[0]; return ret[1]; }
    public clean() { this.val = undefined; }
}

function consumeNum(s: string): [number, string] { const idx = s.indexOf(':'); return [parseInt(s.slice(0, idx), 10), s.slice(idx+1)]; }
function consumeStr(s: string): [string, string] { return [s, '']; }

function makeGroup(cont: HTMLElement, name: string) {
    const group = document.createElement('section');
    group.classList.add('group');
    const lbl = document.createElement('span');
    lbl.textContent = name;
    group.append(lbl);
    cont.append(group);
    return group;
}
function makeArg(tag: string, name: string, el: HTMLElement) {
    const arg = document.createElement(tag);
    arg.append(document.createTextNode(`${name}: `));
    arg.append(el);
    return arg;
}

class ParamSource {
    private params: Array<Param<any>> = [];
    constructor(private element: HTMLElement) {}

    public num(name: string, min: number, max: number): Param<number> {
        const el = document.createElement('input');
        el.setAttribute('type', 'number');
        el.setAttribute('size', '3');
        el.setAttribute('min', min.toString());
        el.setAttribute('max', max.toString());
        this.element.append(makeArg('label', name, el));

        const param = new Param<number>(this, consumeNum, () => Math.min(max, Math.max(min, parseInt(el.value, 10))));
        this.params.push(param);
        return param;
    }

    public text(name: string): Param<string> {
        const el = document.createElement('input');
        this.element.append(makeArg('label', name, el));

        const param = new Param<string>(this, consumeStr, () => el.value);
        this.params.push(param);
        return param;
    }

    public color(name: string, optional: boolean = false): Param<number> {
        const colorpicker = document.createElement('span');
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
        this.element.append(makeArg('label', name, colorpicker));

        const param = new Param<number>(this, consumeNum, () => val);
        this.params.push(param);
        return param;
    }

    // TODO repetition here and multiAny kinda sucks
    public multi<T>(name: string, options: Array<[string, string, T]>): Param<T> {
        const multisel = document.createElement('span');
        multisel.classList.add('multisel');
        const children: Array<HTMLButtonElement> = [];
        let val = options[0][2];

        for (const opt of options) {
            const el = document.createElement('button');
            el.textContent = opt[1];
            el.addEventListener('click', () => {
                for (const ch of children) ch.classList.remove('active');
                el.classList.toggle('active');
                val = opt[2];
            });
            multisel.append(el);
            children.push(el);
        }
        children[0].classList.add('left');
        children[children.length-1].classList.add('right');

        children[0].classList.add('active');
        this.element.append(makeArg('span', name, multisel));

        const param = new Param<T>(this, 0 as never, () => val);
        this.params.push(param);
        return param;
    }

    public multiAny<T>(name: string, options: Array<[string, string, T]>): Param<T[]> {
        const multisel = document.createElement('span');
        multisel.classList.add('multisel');
        const children: Array<HTMLButtonElement> = [];
        let val: Array<T> = [];

        for (const opt of options) {
            const el = document.createElement('button');
            el.textContent = opt[1];
            el.addEventListener('click', () => {
                el.classList.toggle('active');
                val = children
                    .map((ch, i) => ch.classList.contains('active') ? options[i][2] : undefined)
                    .filter(x => x !== undefined);
            });
            multisel.append(el);
            children.push(el);
        }
        children[0].classList.add('left');
        children[children.length-1].classList.add('right');

        this.element.append(makeArg('span', name, multisel));

        const param = new Param<T[]>(this, 0 as never, () => val);
        this.params.push(param);
        return param;
    }

    public inject(s: string) { for (const p of this.params) s = p.consume(s); }
    public reject() { for (const p of this.params) p.clean(); }
}

class MenuItem {
    public static lookup: Map<string, MenuItem> = new Map();

    private readonly psource: ParamSource;
    public readonly element: HTMLElement;
    private readonly generate: () => Tool.Tool | undefined;

    constructor(private mid: string, private name: string, f: (p: ParamSource) => (() => Tool.Tool | undefined), extraClass: string | undefined = undefined) {
        MenuItem.lookup.set(mid, this);
        this.element = document.createElement('div');
        this.element.classList.add('settool');
        if (extraClass !== undefined) this.element.classList.add(extraClass);
        this.element.append(document.createTextNode(name));
        this.psource = new ParamSource(this.element);
        this.generate = f(this.psource);
    }

    public fromHTML(): Tool.Tool | undefined { return this.generate(); }
    public fromStr(s: string): Tool.Tool | undefined { this.psource.inject(s); return this.generate(); }
}
