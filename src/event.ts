import * as Tool from './tools/tool.js';
import * as Gratility from './gratility.js';

export const onmove: Array<(x: number, y: number) => void> = [];
export const keyeater: { ref: ((e: KeyboardEvent) => void) | undefined } = { ref: undefined };

export function initialize(gf: Gratility.Frontend, gb: Gratility.Backend, svg: SVGElement, page: HTMLElement): () => void {

    const activeTools = new Set<Tool.Tool>();

    let lastX = 0;
    let lastY = 0;
    let upd = (e: PointerEvent) => {
        // TODO this moved in here to support gratility as a library usage
        // but maybe there's a better way
        const rect = svg.getBoundingClientRect();
        lastX = (e.clientX - rect.left) / gb.view.zoom() - gb.view.x;
        lastY = (e.clientY - rect.top) / gb.view.zoom() - gb.view.y;
    };

    svg.addEventListener('contextmenu', e => e.preventDefault());

    svg.addEventListener('pointermove', e => {
        if (gf.menu.isOpen()) return;
        upd(e);
        for (const t of activeTools) t.onmove(lastX, lastY, gb);
        for (const f of onmove) f(lastX, lastY);
    });

    svg.addEventListener('pointerdown', e => {
        if (gf.menu.isOpen()) return;
        upd(e);
        const t = gf.toolbox.mouseTools.get(e.button);
        if (t === undefined) return;
        t[1].ondown(lastX, lastY, gb, t[0]);
        activeTools.add(t[1]);
    });

    svg.addEventListener('pointerup', e => {
        if (gf.menu.isOpen()) return;
        const t = gf.toolbox.mouseTools.get(e.button);
        if (t === undefined) return;
        t[1].onup(gb);
        activeTools.delete(t[1]);
    });

    svg.addEventListener('pointerleave', e => {
        for (const t of activeTools) t.onup(gb);
        activeTools.clear();
    });

    const kd = (e: KeyboardEvent) => {
        if (gf.menu.isOpen()) {
            if (e.key === 'Escape') { gf.menu.close(); gf.menu.closeContextMenu(); }
            return;
        }
        if (keyeater.ref !== undefined) {
            keyeater.ref(e);
            return;
        }
        const t = gf.toolbox.keyTools.get(e.key);
        if (t === undefined) return;
        if (e.repeat && !t[1].repeat) return;
        t[1].ondown(lastX, lastY, gb, t[0]);
        activeTools.add(t[1]);
    };
    page.addEventListener('keydown', kd);

    const ku = (e: KeyboardEvent) => {
        if (gf.menu.isOpen()) return;
        const t = gf.toolbox.keyTools.get(e.key);
        if (t === undefined) return;
        t[1].onup(gb);
        activeTools.delete(t[1]);
    };
    page.addEventListener('keyup', ku);

    const wh = (e: WheelEvent) => {
        if (gf.menu.isOpen()) return;
        const t = gf.toolbox.wheelTools.get(e.deltaY < 0);
        if (t === undefined) return;
        t[1].ondown(lastX, lastY, gb, t[0]);
        t[1].onup(gb);
    };
    page.addEventListener('wheel', wh);

    return () => {
        page.removeEventListener('keydown', kd);
        page.removeEventListener('keyup', ku);
        page.removeEventListener('wheel', wh);
    };

}
