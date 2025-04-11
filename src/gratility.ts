import Image from './image.js';
import * as Data from './data.js';
import * as Stamp from './stamp.js';
import ViewManager from './view.js';

export default class Gratility {
    public constructor(public image: Image,
                       public data: Data.DataManager,
                       public stamp: Stamp.StampManager,
                       public view: ViewManager) {}
}
