import * as Tool from './tools/tool.js';
import * as Tools from './tools/alltools.js';
import * as Data from './data.js';
import * as Color from './color.js';
import * as Gratility from './gratility.js';
import * as Courier from './courier.js';

const DEFAULT_TOOLS = `main
m1::pan:
k ::pan:
ks::surface:0:
kr::line:P8:2N
ke::line:E0:2N
kt::text:0:
kz::undo:
kx::redo:
kc::copy:
kd::cut:
kv::paste:
w1::zoomin:
w0::zoomout:`;

// for load()
function onesplit(s: string, delim: string): [string, string | undefined] {
    const parts = s.split(delim);
    return parts.length === 1 ? [s, undefined] : [parts[0], parts.slice(1).join(delim)];
}

export class ToolboxEntry {

    constructor(public tbind: number | string | boolean, public tparam: string, public tool: Tool.Tool) {}
    public mid(): string { return this.tparam.split(':')[0]; }
    public spec(): string { return this.tparam.slice(this.tparam.indexOf(':')+1); }
    public menuItem(): MenuItem { return MenuItem.lookup.get(this.mid())!; }
    public replace(tbind: number | string | boolean, tparam: string, tool: Tool.Tool) { this.tbind = tbind; this.tparam = tparam; this.tool = tool; }

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
        return `${this.saveBind()}::${this.tparam}`;
    }

    static load(s: string): ToolboxEntry {
        const [bind, rest] = onesplit(s, '::');
        if (rest === undefined) { Courier.alert('malformed toolbox entry: no bind'); throw new Error(); }
        const [mid, spec] = onesplit(rest, ':');
        if (spec === undefined) { Courier.alert('malformed toolbox entry: no menu id'); throw new Error(); }
        const menuItem = MenuItem.lookup.get(mid);
        if (menuItem === undefined) { Courier.alert('malformed toolbox entry: bad menu id'); throw new Error(); }
        const bindtype = bind[0];
        const bindval = bind.slice(1);
        const tool = menuItem.fromStr(spec);
        if (tool === undefined) { Courier.alert('malformed toolbox entry: tool gen failed'); throw new Error(); }
        switch (bindtype) {
        case 'm': return new ToolboxEntry(parseInt(bindval, 10), rest, tool);
        case 'k': return new ToolboxEntry(bindval, rest, tool);
        case 'w': return new ToolboxEntry(bindval === '1', rest, tool);
        default: Courier.alert('malformed toolbox entry: bad bind'); throw new Error();
        }
    }

    public display(toolbox: Toolbox): HTMLElement {
        const container = document.createElement('div');

        const bind = document.createElement('div');
        bind.textContent = this.describeBind();
        container.appendChild(bind);

        const name = document.createElement('div');
        name.textContent = this.menuItem().name;
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

    public addBind(tbind: number | string | boolean, tparam: string, tool: Tool.Tool): boolean {
        if (this.hasBind(tbind)) return false;
        this.tools.push(new ToolboxEntry(tbind, tparam, tool));
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
            c.lbl(`tool ${te.menuItem().name}`);

            c.btn('✎ edit tool', () => {
                this.gf.menu.addToolBox = this;
                this.gf.menu.addToolEntry = te;
                this.gf.menu.open('addtool');
                return true;
            });

            c.btn('× delete tool', () => {
                this.gf.menu.confirm(`really delete tool ${te.menuItem().name}?`, [
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
            return () => new Tools.SurfaceTool(new Data.SurfaceSpec(color.val));
        }, 'full').element);

        group.append(new MenuItem('line', 'Line', (param) => {
            const type = param.multi('type', [['P', 'path', false], ['E', 'edge', true]]);
            const color = param.color('color');
            const thickness = param.multi('thickness', [['1', 'thin', 1], ['2', 'normal', 2], ['3', 'thick', 3]]);
            const head = param.multi('head', [['N', 'none', Data.Head.NONE], ['A', 'arrow', Data.Head.ARROW]]);
            return () => new Tools.LineTool(new Data.LineSpec(type.val, color.val, thickness.val, head.val));
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
                if (location.val.length === 0) {
                    Courier.alert('shape should be placeable in at least one location');
                    return;
                }
                if (outline.val === -1 && size.val === -1) {
                    Courier.alert('shape should should have at least one of fill or outline');
                    return;
                }
                return new Tools.ShapeTool(new Data.ShapeSpec(type.val, fill.val === -1 ? undefined : fill.val, outline.val === -1 ? undefined : outline.val, size.val),
                                           location.val.reduce((a,b) => a+b, 0));
            };
        }, 'full').element);

        group.append(new MenuItem('text', 'Text', (param) => {
            const color = param.color('color');
            const preset = param.text('preset');
            return () => new Tools.TextTool(new Data.TextSpec(color.val, preset.val));
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
            return () => new Tools.TransformTool(direction.val);
        }, 'natwidth').element);
        group.append(new MenuItem('rotate', 'Rotate', (param) => {
            const direction = param.multi('direction', [
                ['L', '\u00a0↶\u00a0', 10],
                ['R', '\u00a0↷\u00a0', 11],
                ['F', '180°', 12]
            ]);
            return () => new Tools.TransformTool(direction.val);
        }, 'natwidth').element);
        group.append(new MenuItem('func', 'Func', (param) => {
            const name = param.text('name');
            return () => new Tools.FuncTool(name.val);
        }, 'natwidth').element);

        group = makeGroup(menuCont, 'misc');
        group.append(new MenuItem('undo', 'Undo', () => () => new Tools.UndoTool(true)).element);
        group.append(new MenuItem('redo', 'Redo', () => () => new Tools.UndoTool(false)).element);

    }

}

class Param<T> {
    public val: T;
    constructor(private source: ParamSource,
                private consumeFunc: (s: string) => [T, string],
                public produce: () => string,
                private readFunc: () => T,
                private writeFunc: (s: string) => string)
                { this.val = readFunc(); }
    public fromHTML() { this.val = this.readFunc(); }
    public toHTML(s: string): string { return this.writeFunc(s); }
    public consume(s: string): string { const ret = this.consumeFunc(s); this.val = ret[0]; return ret[1]; }
}

function consumeNum(s: string): [number, string] { const idx = s.indexOf(':'); return [parseInt(s.slice(0, idx), 10), s.slice(idx+1)]; }

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

        // TODO lol this is bad
        const param = new Param<number>(this, consumeNum,
                                        () => Math.min(max, Math.max(min, parseInt(el.value, 10))).toString() + ':',
                                        () => Math.min(max, Math.max(min, parseInt(el.value, 10))),
                                        s => { el.value = s.split(':')[0]; return s.slice(s.indexOf(':')+1); });
        this.params.push(param);
        return param;
    }

    public text(name: string): Param<string> {
        const el = document.createElement('input');
        this.element.append(makeArg('label', name, el));

        const param = new Param<string>(this, s => [s, ''], () => el.value, () => el.value, s => { el.value = s; return ''; });
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

        const param = new Param<number>(this, consumeNum, () => `${val}:`, () => val, s => {
            const i = parseInt(s.split(':')[0], 10);
            children[optional ? i+1 : i].click();
            return s.slice(s.indexOf(':')+1);
        });
        this.params.push(param);
        return param;
    }

    // TODO repetition here and multiAny kinda sucks
    public multi<T>(name: string, options: Array<[string, string, T]>): Param<T> {
        const multisel = document.createElement('span');
        multisel.classList.add('multisel');
        const children: Array<HTMLButtonElement> = [];
        let val = options[0];

        for (const opt of options) {
            const el = document.createElement('button');
            el.textContent = opt[1];
            el.addEventListener('click', () => {
                for (const ch of children) ch.classList.remove('active');
                el.classList.toggle('active');
                val = opt;
            });
            multisel.append(el);
            children.push(el);
        }
        children[0].classList.add('left');
        children[children.length-1].classList.add('right');

        children[0].classList.add('active');
        this.element.append(makeArg('span', name, multisel));

        // TODO should this default to [0] or should there be error handling somehow
        const param = new Param<T>(this, s => [(options.find(o => o[0] === s[0]) ?? options[0])[2], s.slice(1)], () => val[0], () => val[2], s => {
            children[options.findIndex(o => o[0] === s[0])].click(); return s.slice(1);
        });
        this.params.push(param);
        return param;
    }

    public multiAny<T>(name: string, options: Array<[string, string, T]>): Param<T[]> {
        const multisel = document.createElement('span');
        multisel.classList.add('multisel');
        const children: Array<HTMLButtonElement> = [];
        let val: Array<[string, string, T]> = [];

        for (const opt of options) {
            const el = document.createElement('button');
            el.textContent = opt[1];
            el.addEventListener('click', () => {
                el.classList.toggle('active');
                val = children
                    .map((ch, i) => ch.classList.contains('active') ? options[i] : undefined)
                    .filter(x => x !== undefined);
            });
            multisel.append(el);
            children.push(el);
        }
        children[0].classList.add('left');
        children[children.length-1].classList.add('right');

        this.element.append(makeArg('span', name, multisel));

        const param = new Param<T[]>(this, s => [options.filter(o => s.split(':')[0].includes(o[0])).map(o => o[2]), s.slice(s.indexOf(':')+1)],
                                     () => val.map(o => o[0]).join('') + ':', () => val.map(o => o[2]), s => {
                                         for (let i = 0; i < options.length; ++i) {
                                             children[i].classList.toggle('active', s.split(':')[0].includes(options[i][0]));
                                         }
                                         return s.slice(s.indexOf(':')+1);
                                     });
        this.params.push(param);
        return param;
    }

    public fromHTML() { for (const p of this.params) p.fromHTML(); }
    public toHTML(s: string) { for (const p of this.params) s = p.toHTML(s); }
    public inject(s: string) { for (const p of this.params) s = p.consume(s); }
    public extract(): string { return this.params.map(p => p.produce()).join(''); }
}

export class MenuItem {
    public static lookup: Map<string, MenuItem> = new Map();

    private readonly psource: ParamSource;
    public readonly element: HTMLElement;
    private readonly generate: () => Tool.Tool | undefined;

    // if f returns undefined, it should always show a Courier alert explaining why
    constructor(private mid: string, public name: string, f: (p: ParamSource) => (() => Tool.Tool | undefined), extraClass: string | undefined = undefined) {
        MenuItem.lookup.set(mid, this);
        this.element = document.createElement('div');
        this.element.dataset.tool = mid;
        this.element.classList.add('settool');
        if (extraClass !== undefined) this.element.classList.add(extraClass);
        this.element.append(document.createTextNode(name));
        this.psource = new ParamSource(this.element);
        this.generate = f(this.psource);
    }

    public fromHTML(): Tool.Tool | undefined { this.psource.fromHTML(); return this.generate(); }
    public toHTML(s: string) { this.psource.toHTML(s); }
    public fromStr(s: string): Tool.Tool | undefined { this.psource.inject(s); return this.generate(); }
    public toStr(): string { return this.mid + ':' + this.psource.extract(); }
}
