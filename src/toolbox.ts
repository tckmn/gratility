import Tool from './tools/tool.js';
import * as Tools from './tools/alltools.js';
import * as Data from './data.js';
import * as Gratility from './gratility.js';

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

class ToolboxEntry {

    constructor(public readonly tbind: number | string | boolean, public readonly tool: Tool) {}

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

    public display(container: HTMLElement, editMode: boolean, delcb: () => void) {
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

        if (editMode) {
            const delbtn = document.createElement('div');
            delbtn.className = 'delbtn';
            delbtn.textContent = '×';
            delbtn.addEventListener('click', () => {
                delcb();
                container.removeChild(bind);
                container.removeChild(name);
                container.removeChild(icon);
                container.removeChild(delbtn);
            });
            container.appendChild(delbtn);
        }
    }

}

export class Toolbox {

    constructor(public readonly name: string, public readonly tools: Array<ToolboxEntry> = []) {}

    public addBind(tbind: number | string | boolean, tool: Tool): boolean {
        if (this.tools.some(e => e.tbind === tbind)) return false;
        this.tools.push(new ToolboxEntry(tbind, tool));
        return true;
    }

    public save(): string { return this.name + '\n' + this.tools.map(t => t.save()).join('\n'); }
    static load(s: string) { return new Toolbox(s.split('\n')[0], s.split('\n').slice(1).map(ToolboxEntry.load)); }

    public display(container: HTMLElement, editMode: boolean) {
        const title = document.createElement('div');
        title.classList.add('tbname');
        title.textContent = this.name;
        container.appendChild(title);

        container.appendChild(this.generateList(editMode));

        if (editMode) {
            const addbtn = document.createElement('button');
            addbtn.textContent = '+ add tool...';
            // addbtn.addEventListener('click', () => );
            container.appendChild(addbtn);
        }
    }

    private generateList(editMode: boolean): HTMLElement {
        const container = document.createElement('div');
        container.classList.add('tbtools');
        if (editMode) container.classList.add('edit');
        for (const t of this.tools) t.display(container, editMode, () => {});
        return container;
    }

}

export class Toolboxbox {

    public toolboxes: Array<Toolbox> = [];
    private editMode: boolean = false;
    public toggleEdit() { this.editMode = !this.editMode; this.rerender(); }

    public readonly mouseTools = new Map<number, Tool>();
    public readonly keyTools = new Map<string, Tool>();
    public readonly wheelTools = new Map<boolean, Tool>();

    constructor(private frontend: Gratility.Frontend, private container: HTMLElement) {
        this.load(localStorage.toolbox ?? DEFAULT_TOOLS);
    }

    private save(): string { return this.toolboxes.map(b => b.save()).join('\n:\n'); }
    private load(s: string) { this.toolboxes = s.split('\n:\n').map(Toolbox.load); this.recompute(); this.rerender(); }

    private recompute() {
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
        for (const t of this.toolboxes) t.display(this.container, this.editMode);

        if (this.editMode) {
            const addbtn = document.createElement('button');
            addbtn.textContent = '+ new toolbox';
            this.container.appendChild(addbtn);
        }
    }

}
