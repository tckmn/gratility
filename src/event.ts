import * as Tool from './tools/tool.js';
import * as Gratility from './gratility.js';

export const onmove: Array<(x: number, y: number) => void> = [];
export const keyeater: { ref: ((e: KeyboardEvent) => void) | undefined } = { ref: undefined };

export function initialize(gf: Gratility.Frontend, gb: Gratility.Backend, svg: SVGElement, page: HTMLElement) {

    const activeTools = new Set<Tool.Tool>();
    const rect = svg.getBoundingClientRect();

    let lastX = 0;
    let lastY = 0;
    let upd = (e: PointerEvent) => {
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
        t.ondown(lastX, lastY, gb);
        activeTools.add(t);
    });

    svg.addEventListener('pointerup', e => {
        if (gf.menu.isOpen()) return;
        const t = gf.toolbox.mouseTools.get(e.button);
        if (t === undefined) return;
        t.onup(gb);
        activeTools.delete(t);
    });

    svg.addEventListener('pointerleave', e => {
        for (const t of activeTools) t.onup(gb);
        activeTools.clear();
    });

    page.addEventListener('keydown', e => {
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
        if (e.repeat && !t.repeat) return;
        t.ondown(lastX, lastY, gb);
        activeTools.add(t);
    });

    page.addEventListener('keyup', e => {
        if (gf.menu.isOpen()) return;
        const t = gf.toolbox.keyTools.get(e.key);
        if (t === undefined) return;
        t.onup(gb);
        activeTools.delete(t);
    });

    page.addEventListener('wheel', e => {
        if (gf.menu.isOpen()) return;
        const t = gf.toolbox.wheelTools.get(e.deltaY < 0);
        if (t === undefined) return;
        t.ondown(lastX, lastY, gb);
        t.onup(gb);
    });

}
