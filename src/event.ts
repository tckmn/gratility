import Tool from 'tools/tool';
import Toolbox from 'toolbox';
import * as Menu from 'menu';
import * as View from 'view';

export const onmove: Array<(x: number, y: number) => void> = [];

export function initialize(svg: SVGElement, page: HTMLElement, toolbox: Toolbox) {

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
        if (Menu.isOpen()) return;
        upd(e);
        for (const t of activeTools) t.onmove(lastX, lastY);
        for (const f of onmove) f(lastX, lastY);
    });

    svg.addEventListener('pointerdown', e => {
        if (Menu.isOpen()) return;
        upd(e);
        const t = toolbox.mouseTools.get(e.button);
        if (t === undefined) return;
        t.ondown(lastX, lastY);
        activeTools.add(t);
    });

    svg.addEventListener('pointerup', e => {
        if (Menu.isOpen()) return;
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
        if (Menu.isOpen()) {
            if (e.key === 'Escape') Menu.close();
            return;
        }
        const t = toolbox.keyTools.get(e.key);
        if (t === undefined) return;
        if (e.repeat && !t.repeat) return;
        t.ondown(lastX, lastY);
        activeTools.add(t);
    });

    page.addEventListener('keyup', e => {
        if (Menu.isOpen()) return;
        const t = toolbox.keyTools.get(e.key);
        if (t === undefined) return;
        t.onup();
        activeTools.delete(t);
    });

    page.addEventListener('wheel', e => {
        if (Menu.isOpen()) return;
        const t = toolbox.wheelTools.get(e.deltaY < 0);
        if (t === undefined) return;
        t.ondown(lastX, lastY);
        t.onup();
    });

}
