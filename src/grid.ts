import * as Measure from './measure.js';
import Image from './image.js';

export function initialize(image: Image) {
    for (let i = 0; i < Measure.GRIDSIZE; ++i) {
        image.draw(image.grid, 'line', {
            x1: 0, x2: Measure.GRIDSIZE * Measure.CELL, y1: i * Measure.CELL, y2: i * Measure.CELL
        });
        image.draw(image.grid, 'line', {
            x1: i * Measure.CELL, x2: i * Measure.CELL, y1: 0, y2: Measure.GRIDSIZE * Measure.CELL
        });
    }
}
