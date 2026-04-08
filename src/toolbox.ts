import * as Tool from './tools/tool.js';
import * as Tools from './tools/alltools.js';
import * as Data from './data.js';
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

    constructor(private gf: Gratility.Frontend, private container: HTMLElement) {
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

}
