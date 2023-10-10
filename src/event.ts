import Tool from 'tools/tool';
import * as Toolbox from 'toolbox';

export function initialize(svg: SVGElement) {

    const activeTools = new Set<Tool>();
    const rect = svg.getBoundingClientRect();

    let lastX = 0;
    let lastY = 0;

    svg.addEventListener('contextmenu', e => e.preventDefault());

    svg.addEventListener('pointermove', e => {
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
        for (const t of activeTools) t.onmove(lastX, lastY);
    });

    svg.addEventListener('pointerdown', e => {
        const t = Toolbox.mouseTools.get(e.button);
        if (t === undefined) return;
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
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

}
