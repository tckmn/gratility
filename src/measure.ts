export const GRIDCOLOR = '#aaa';
export const GRIDLINE = 1;
export const GRIDSIZE = 500;

export const HALFCELL = 20;
export const ZOOMTICK = 1.1;
export const LINE = 5;

export const CELL = 2*HALFCELL;

// TODO figure these out
export function round(x: number, r: number) { return Math.round(x/r)*r; }
export function cell(x: number) { return Math.floor(x / CELL); }
export function halfcell(x: number) { return Math.round(x / HALFCELL); }
export function rhalfcell(x: number) { return Math.round(x / HALFCELL) * HALFCELL; }

export const enum HC {
    CORNER = 0,
    EVERT,
    EHORIZ,
    CENTER
}
export function hctype(x: number, y: number): HC {
    return (Math.abs(x % 2) << 1) | Math.abs(y % 2);
}
