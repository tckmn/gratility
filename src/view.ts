import * as Measure from './measure.js';
import Image from './image.js';

export default class ViewManager {
    public x: number = 0;
    public y: number = 0;
    public z: number = 0;
    public constructor(private image: Image) {}
    public zoom(n?: number) { return Math.pow(Measure.ZOOMTICK, n ?? this.z); }
    public update() {
        this.image.root.setAttribute('transform', `scale(${this.zoom()}) translate(${this.x} ${this.y})`);
    }
}
