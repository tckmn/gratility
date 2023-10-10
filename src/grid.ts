import * as Draw from 'draw';
import * as Layer from 'layer';
import * as Measure from 'measure';

export function initialize() {
    const gridSize = 100; // TODO tmp

    for (let i = 0; i < gridSize; ++i) {
        Draw.draw(Layer.grid, 'line', {
            x1: 0, x2: gridSize * Measure.CELL, y1: i * Measure.CELL, y2: i * Measure.CELL
        });
        Draw.draw(Layer.grid, 'line', {
            x1: i * Measure.CELL, x2: i * Measure.CELL, y1: 0, y2: gridSize * Measure.CELL
        });
    }
}
