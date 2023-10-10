import Tool from 'tools/tool';
import * as Toolbox from 'toolbox';
import * as View from 'view';

export function initialize(svg: SVGElement) {

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
        upd(e);
        for (const t of activeTools) t.onmove(lastX, lastY);
    });

    svg.addEventListener('pointerdown', e => {
        upd(e);
        const t = Toolbox.mouseTools.get(e.button);
        if (t === undefined) return;
        t.ondown(lastX, lastY);
        activeTools.add(t);
    });

    svg.addEventListener('pointerup', e => {
        const t = Toolbox.mouseTools.get(e.button);
        if (t === undefined) return;
        t.onup();
        activeTools.delete(t);
    });

    svg.addEventListener('pointerleave', e => {
        for (const t of activeTools) t.onup();
        activeTools.clear();
    });

    document.body.addEventListener('keydown', e => {
        if (e.repeat) return;
        const t = Toolbox.keyTools.get(e.key);
        if (t === undefined) return;
        t.ondown(lastX, lastY);
        activeTools.add(t);
    });

    document.body.addEventListener('keyup', e => {
        const t = Toolbox.keyTools.get(e.key);
        if (t === undefined) return;
        t.onup();
        activeTools.delete(t);
    });

    document.body.addEventListener('wheel', e => {
        console.log(e);
        const t = Toolbox.wheelTools.get(e.deltaY < 0);
        if (t === undefined) return;
        t.ondown(lastX, lastY);
        t.onup();
    });

}
