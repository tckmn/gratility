import Tool from './tools/tool.js';
import Toolbox from './toolbox.js';
import MenuManager from './menu.js';
import * as View from './view.js';

export const onmove: Array<(x: number, y: number) => void> = [];
export const keyeater: { ref: ((e: KeyboardEvent) => void) | undefined } = { ref: undefined };

export function initialize(svg: SVGElement, page: HTMLElement, toolbox: Toolbox, menu: MenuManager) {

    const activeTools = new Set<Tool>();
    const rect = svg.getBoundingClientRect();

    let lastX = 0;
    let lastY = 0;
    let upd = (e: PointerEvent) => {
        lastX = (e.clientX - rect.left) / View.zoom() - View.x;
        lastY = (e.clientY - rect.top) / View.zoom() - View.y;
    };

    svg.addEventListener('contextmenu', e => e.preventDefault());

    svg.addEventListener('pointermove', e => {
        if (menu.isOpen()) return;
        upd(e);
        for (const t of activeTools) t.onmove(lastX, lastY);
        for (const f of onmove) f(lastX, lastY);
    });

    svg.addEventListener('pointerdown', e => {
        if (menu.isOpen()) return;
        upd(e);
        const t = toolbox.mouseTools.get(e.button);
        if (t === undefined) return;
        t.ondown(lastX, lastY);
        activeTools.add(t);
    });

    svg.addEventListener('pointerup', e => {
        if (menu.isOpen()) return;
        const t = toolbox.mouseTools.get(e.button);
        if (t === undefined) return;
        t.onup();
        activeTools.delete(t);
    });

    svg.addEventListener('pointerleave', e => {
        for (const t of activeTools) t.onup();
        activeTools.clear();
    });

    page.addEventListener('keydown', e => {
        if (menu.isOpen()) {
            if (e.key === 'Escape') menu.close();
            return;
        }
        if (keyeater.ref !== undefined) {
            keyeater.ref(e);
            return;
        }
        const t = toolbox.keyTools.get(e.key);
        if (t === undefined) return;
        if (e.repeat && !t.repeat) return;
        t.ondown(lastX, lastY);
        activeTools.add(t);
    });

    page.addEventListener('keyup', e => {
        if (menu.isOpen()) return;
        const t = toolbox.keyTools.get(e.key);
        if (t === undefined) return;
        t.onup();
        activeTools.delete(t);
    });

    page.addEventListener('wheel', e => {
        if (menu.isOpen()) return;
        const t = toolbox.wheelTools.get(e.deltaY < 0);
        if (t === undefined) return;
        t.ondown(lastX, lastY);
        t.onup();
    });

}
