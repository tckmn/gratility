import * as Tool from './tools/tool.js';
import * as Tools from './tools/alltools.js';
import * as Data from './data.js';
import * as Gratility from './gratility.js';
import * as Courier from './courier.js';
import * as Input from './input.js';

const DEFAULT_TOOLS = `*main
m1::pan:
k ::pan:
ks::surface:0
kr::line:false,8,2,0
ke::line:true,0,2,0
kt::text:"",4,0,[4],0,-1
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

    constructor(private gf: Gratility.Frontend, public tbind: number | string | boolean, public tparam: string, public tool: Tool.Tool) {}
    public mid(): string { return this.tparam.split(':')[0]; }
    public spec(): string { return this.tparam.slice(this.tparam.indexOf(':')+1); }
    public menuItem(): MenuItem { return this.gf.toolbox.toolMenu.lookup.get(this.mid())!; }
    public replace(tbind: number | string | boolean, tparam: string, tool: Tool.Tool) { this.tbind = tbind; this.tparam = tparam; this.tool = tool; }

    public describeBind(): string {
        switch (typeof this.tbind) {
        case 'number': return `click ${this.tbind}`;
        case 'string': return `key [${this.tbind}]`;
        case 'boolean': return `scr ${this.tbind ? 'up' : 'dn'}`;
        }
    }

    public renderBind(): HTMLElement {
        const el = document.createElement('span');
        el.classList.add('pic');
        switch (typeof this.tbind) {
        case 'number': el.classList.add('mouse'); el.textContent = this.tbind.toString(); break;
        case 'string': el.classList.add('key'); el.textContent = this.tbind === ' ' ? '␣' : this.tbind; break;
        case 'boolean': el.classList.add('mouse'); el.textContent = this.tbind ? '⇑' : '⇓'; break;
        }
        return el;
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

    static load(gf: Gratility.Frontend, s: string): ToolboxEntry {
        const [bind, rest] = onesplit(s, '::');
        if (rest === undefined) { Courier.alert('malformed toolbox entry: no bind'); throw new Error(); }
        const [mid, spec] = onesplit(rest, ':');
        if (spec === undefined) { Courier.alert('malformed toolbox entry: no menu id'); throw new Error(); }
        const menuItem = gf.toolbox.toolMenu.lookup.get(mid);
        if (menuItem === undefined) { Courier.alert('malformed toolbox entry: bad menu id'); throw new Error(); }
        const bindtype = bind[0];
        const bindval = bind.slice(1);
        const tool = menuItem.fromJSON(spec);
        if (tool === undefined) { Courier.alert('malformed toolbox entry: tool gen failed'); throw new Error(); }
        switch (bindtype) {
        case 'm': return new ToolboxEntry(gf, parseInt(bindval, 10), rest, tool);
        case 'k': return new ToolboxEntry(gf, bindval, rest, tool);
        case 'w': return new ToolboxEntry(gf, bindval === '1', rest, tool);
        default: Courier.alert('malformed toolbox entry: bad bind'); throw new Error();
        }
    }

    public display(toolbox: Toolbox): HTMLElement {
        const container = document.createElement('div');

        container.appendChild(this.renderBind());

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

    constructor(private readonly gf: Gratility.Frontend, public enabled: boolean, public name: string, public readonly tools: Array<ToolboxEntry> = []) {}

    public hasBind(tbind: number | string | boolean): boolean {
        return this.tools.some(e => e.tbind === tbind);
    }

    public addBind(tbind: number | string | boolean, tparam: string, tool: Tool.Tool): boolean {
        if (this.hasBind(tbind)) return false;
        this.tools.push(new ToolboxEntry(this.gf, tbind, tparam, tool));
        return true;
    }

    public delBind(e: ToolboxEntry) {
        const idx = this.tools.indexOf(e);
        if (idx !== -1) this.tools.splice(idx, 1);
    }

    // oops naming lol
    public save() { this.gf.toolbox.save(); }
    public saveStr(): string { return (this.enabled ? '*' : '-') + this.name + this.tools.map(t => '\n' + t.save()).join(''); }
    static load(gf: Gratility.Frontend, s: string) { return new Toolbox(gf, s[0] === '*', s.split('\n')[0].slice(1), s.split('\n').slice(1).map(x => ToolboxEntry.load(gf, x))); }
    public replace(s: string) { this.enabled = s[0] === '*'; this.name = s.split('\n')[0].slice(1); this.tools.splice(0, Infinity, ...s.split('\n').slice(1).map(x => ToolboxEntry.load(this.gf, x))); this.gf.toolbox.refresh(); } // TODO remove duplication

    public display(container: HTMLElement) {
        const cont = document.createElement('div');
        cont.classList.toggle('disabled', !this.enabled);

        const title = document.createElement('div');
        title.classList.add('tbname');
        title.textContent = this.name;
        cont.appendChild(title);

        title.addEventListener('click', e => {
            e.preventDefault();
            this.showMenu(e);
        });

        cont.appendChild(this.generateList());
        cont.addEventListener('mousedown', e => {
            if (e.buttons === 4) {
                this.enabled = !this.enabled;
                this.gf.toolbox.saveRefresh();
            }
        });
        container.appendChild(cont);
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
                this.gf.menu.addtool(this, te);
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
            this.gf.menu.addtool(this, undefined);
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

        c.btn('⇅ import/export', () => {
            this.gf.menu.ietool(this.saveStr(), s => this.replace(s));
            return true;
        });

        c.space();

        c.lbl('all toolboxes');

        const addtxt = document.createElement('input');
        addtxt.setAttribute('placeholder', 'toolbox name...');
        c.menu.appendChild(addtxt);

        const addfn = () => {
            if (addtxt.value.replace(/\s/g, '')) {
                this.gf.toolbox.toolboxes.push(new Toolbox(this.gf, true, addtxt.value));
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

        c.btn('⇅ import/export', () => {
            this.gf.menu.ietool(this.gf.toolbox.saveStr(), s => this.gf.toolbox.load(s));
            return true;
        });
    }

}

export class Toolboxbox {

    public toolboxes: Array<Toolbox> = [];
    public toolMenu: ToolMenu;

    public readonly mouseTools = new Map<number, Tool.Tool>();
    public readonly keyTools = new Map<string, Tool.Tool>();
    public readonly wheelTools = new Map<boolean, Tool.Tool>();

    constructor(private gf: Gratility.Frontend, private container: HTMLElement | undefined) {
        this.toolMenu = gf.menu.init_addtool(el => this.generateMenu(el));
    }

    public save() { localStorage.toolbox = this.saveStr(); }
    public saveStr() { return this.toolboxes.map(b => b.saveStr()).join('\n:\n'); }
    public load(s: string) { this.toolboxes = s.split('\n:\n').map(x => Toolbox.load(this.gf, x)); this.refresh(); }
    public loadSaved(s: string | undefined) { this.load(s ?? DEFAULT_TOOLS); }

    public refresh() { this.recompute(); this.rerender(); }
    public saveRefresh() { this.refresh(); this.save(); }

    public delToolbox(t: Toolbox) {
        const idx = this.toolboxes.indexOf(t);
        if (idx !== -1) this.toolboxes.splice(idx, 1);
    }

    private recompute() {
        this.mouseTools.clear();
        this.keyTools.clear();
        this.wheelTools.clear();
        for (const toolbox of this.toolboxes) {
            if (!toolbox.enabled) continue;
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
        if (this.container === undefined) return;
        while (this.container.firstChild) this.container.removeChild(this.container.firstChild);
        for (const t of this.toolboxes) t.display(this.container);
    }

    private generateMenu(menuCont: HTMLElement): ToolMenu {
        const tm = new ToolMenu();
        let group;

        group = Input.makeGroup(menuCont, 'drawing');

        group.append(tm.item('surface', 'Surface', (param) => {
            const color = param.color('color');
            return () => new Tools.SurfaceTool(color.val);
        }, 'full'));

        group.append(tm.item('line', 'Line', (param) => {
            const type = param.multi('type', [['path', false], ['edge', true]]);
            const color = param.color('color');
            const thickness = param.multi('thickness', [['thin', 1], ['normal', 2], ['thick', 3]]);
            const head = param.multi('head', [['none', Data.Head.NONE], ['arrow', Data.Head.ARROW]]);
            return () => new Tools.LineTool(type.val, color.val, thickness.val, head.val);
        }, 'full'));

        group.append(tm.item('wall', 'Wall', (param) => {
            const color = param.color('color');
            const thickness = param.multi('thickness', [['thin', 1], ['normal', 2], ['thick', 3]]);
            const head = param.multi('head', [['none', Data.Head.NONE], ['arrow', Data.Head.ARROW]]);

            // TODO
            const location = param.multiAny('location', [
                ['center', 4],
                ['edge', 2],
                ['corner', 1]
            ]);

            return () => new Tools.WallTool(color.val, thickness.val, head.val, location.val.reduce((a,b) => a+b, 0));
        }, 'full'));

        group.append(tm.item('poly', 'Polygon', (param) => {
            const sides = param.num('sides', 3, 18);
            const star = param.bool('star');
            const spec = Input.objectParam(param, Data.PolyTile.paradigm[3]);
            sides.hook = n => spec.setParadigm(Data.PolyTile.paradigm[n]);
            return () => spec.generate(spec => new Tools.PolyTool(sides.val, star.val, spec));
        }, 'full'));

        group.append(tm.item('shape', 'Shape', (param) => {
            const type = param.multi('type', [
                ['circle', Data.Shape.CIRCLE],
                ['cross', Data.Shape.CROSS],
                ['flag', Data.Shape.FLAG],
                ['arrow', Data.Shape.ARROW],
            ]);
            const spec = Input.objectParam(param, Data.ShapeTile.paradigm[Data.Shape.CIRCLE]);
            type.hook = shape => spec.setParadigm(Data.ShapeTile.paradigm[shape]);
            return () => spec.generate(spec => new Tools.ShapeTool(type.val, spec));
        }, 'full'));

        group.append(tm.item('text', 'Text', (param) => {
            const preset = param.text('preset');
            const spec = Input.objectParam(param, Data.TextTile.paradigm);
            return () => spec.generate(spec => new Tools.TextTool(preset.val, spec));
        }, 'full'));

        group = Input.makeGroup(menuCont, 'movement');
        group.append(tm.item('pan', 'Pan', () => () => new Tools.PanTool()));
        group.append(tm.item('zoomin', 'Zoom in', () => () => new Tools.ZoomTool(1)));
        group.append(tm.item('zoomout', 'Zoom out', () => () => new Tools.ZoomTool(-1)));

        group = Input.makeGroup(menuCont, 'stamps');
        group.append(tm.item('copy', 'Copy', () => () => new Tools.CopyTool(false)));
        group.append(tm.item('cut', 'Cut', () => () => new Tools.CopyTool(true)));
        group.append(tm.item('paste', 'Paste', () => () => new Tools.PasteTool()));
        group.append(tm.item('flip', 'Flip', (param) => {
            const direction = param.multi('direction', [
                ['\u00a0↔\u00a0', 0],
                ['\u00a0↕\u00a0', 1],
                ['\u00a0⤡\u00a0', 2],
                ['\u00a0⤢\u00a0', 3]
            ]);
            return () => new Tools.TransformTool(direction.val);
        }, 'natwidth'));
        group.append(tm.item('rotate', 'Rotate', (param) => {
            const direction = param.multi('direction', [
                ['\u00a0↶\u00a0', 10],
                ['\u00a0↷\u00a0', 11],
                ['180°', 12]
            ]);
            return () => new Tools.TransformTool(direction.val);
        }, 'natwidth'));
        group.append(tm.item('func', 'Func', (param) => {
            const name = param.text('name');
            return () => new Tools.FuncTool(name.val);
        }, 'natwidth'));

        group = Input.makeGroup(menuCont, 'misc');
        group.append(tm.item('undo', 'Undo', () => () => new Tools.UndoTool(true)));
        group.append(tm.item('redo', 'Redo', () => () => new Tools.UndoTool(false)));

        group = Input.makeGroup(menuCont, 'meta');
        // group.append(tm.item('multi', 'Multi', (param) => {
        // }));

        return tm;
    }

}

export class ToolMenu {
    public lookup: Map<string, MenuItem> = new Map();
    constructor() {}

    public item(mid: string, name: string, f: (p: Input.ParamSource) => (() => Tool.Tool | undefined), extraClass: string | undefined = undefined): HTMLElement {
        const menuItem = new MenuItem(this, mid, name, f, extraClass);
        this.lookup.set(mid, menuItem);
        return menuItem.element;
    }

    public clearActive() { for (const v of this.lookup.values()) v.element.classList.remove('addtool-active'); }
}

export class MenuItem {
    private readonly psource: Input.ParamSource;
    public readonly element: HTMLElement;
    private readonly generate: () => Tool.Tool | undefined;

    // if f returns undefined, it should always show a Courier alert explaining why
    constructor(private toolMenu: ToolMenu,
                private mid: string,
                public name: string,
                f: (p: Input.ParamSource) => (() => Tool.Tool | undefined),
                extraClass: string | undefined = undefined) {
        this.element = document.createElement('div');
        this.element.dataset.tool = mid;
        this.element.classList.add('settool');
        if (extraClass !== undefined) this.element.classList.add(extraClass);
        this.element.append(document.createTextNode(name));
        this.element.addEventListener('click', () => {
            this.toolMenu.clearActive();
            this.element.classList.add('addtool-active');
        });

        this.psource = new Input.ParamSource(this.element);
        this.generate = f(this.psource);
    }

    public fromHTML(): Tool.Tool | undefined { this.psource.setFromHTML(); return this.generate(); }
    public fromJSON(s: string): Tool.Tool | undefined { this.psource.setFromJSON(s); return this.generate(); }

    public save(): string { return this.mid + ':' + this.psource.save(); }
    public load(s: string) { this.psource.load(s); }
}
