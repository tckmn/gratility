export const GRIDCOLOR = '#aaa';
export const GRIDLINE = 1;

export const HALFCELL = 20;
export const ZOOMTICK = 1.1;
export const LINE = 2;

export const CELL = 2*HALFCELL;

// this doesn't really belong here lol
export function round(x: number, r: number) { return Math.round(x/r)*r; }

// when you only care about which square in the visual grid the point is in, use this one
export function cell(x: number) { return Math.floor(x / CELL); }

// i think of this as the fundamental one, i guess
// "spc" specifies how much to weight grid-aligned points relative to half-grid-aligned points
// higher values of "spc" result in rounding towards gridline intersections more
// cf pzv MouseInput#getpos
export function hc(x: number, spc: number = 0.25) {
    const prelim = x / CELL, cellpos = Math.floor(prelim), offset = prelim - cellpos;
    return cellpos*2 + (offset >= spc ? 1 : 0) + (offset >= 1-spc ? 1 : 0);
}

// sometimes you want the physical coordinates
export function physhc(x: number, spc: number = 0.25) { return hc(x, spc) * HALFCELL; }

export const enum HC {
    CORNER = 0,
    EVERT,
    EHORIZ,
    CENTER
}
export function hctype(x: number, y: number): HC {
    return (Math.abs(x % 2) << 1) | Math.abs(y % 2);
}

// lmao surely there is a better way
// locs is bitmask: 0b center edge corner
export function atlocs(x: number, y: number, locs: number): [number, number] {
    const dx = x / HALFCELL, dy = y / HALFCELL;
    const fx = Math.floor(dx), fy = Math.floor(dy);
    let best = HALFCELL*HALFCELL*999, bx = fx, by = fy;

    for (let xp = 0; xp <= 1; ++xp) {
        for (let yp = 0; yp <= 1; ++yp) {
            if ((locs & (1 << (xp+yp))) === 0) continue;
            const tryx = fx + (fx % 2 === 0 ? xp : 1-xp), tryy = fy + (fy % 2 === 0 ? yp : 1-yp);
            const dist = (dx-tryx)*(dx-tryx) + (dy-tryy)*(dy-tryy);
            if (dist < best) { best = dist; bx = tryx; by = tryy; }
        }
    }

    return [bx, by];
}

export function atpos(x: number, y: number, cx: number, cy: number, mask: number): number {
    cx *= HALFCELL; cy *= HALFCELL;
    let best = HALFCELL*HALFCELL*999, bpos = 0;

    for (let xp = -1; xp <= 1; ++xp) {
        for (let yp = -1; yp <= 1; ++yp) {
            const pos = xp+1 + (yp+1)*3;
            if (((mask >> pos) & 1) === 0) continue;
            const tryx = cx + xp*HALFCELL/2, tryy = cy + yp*HALFCELL/2;
            const dist = (x-tryx)*(x-tryx) + (y-tryy)*(y-tryy);
            if (dist < best) { best = dist; bpos = pos; }
        }
    }

    return bpos;
}
