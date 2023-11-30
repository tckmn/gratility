import * as Draw from './draw.js';
import * as Layer from './layer.js';
import * as Measure from './measure.js';

export function initialize() {
    for (let i = 0; i < Measure.GRIDSIZE; ++i) {
        Draw.draw(Layer.grid, 'line', {
            x1: 0, x2: Measure.GRIDSIZE * Measure.CELL, y1: i * Measure.CELL, y2: i * Measure.CELL
        });
        Draw.draw(Layer.grid, 'line', {
            x1: i * Measure.CELL, x2: i * Measure.CELL, y1: 0, y2: Measure.GRIDSIZE * Measure.CELL
        });
    }
}
