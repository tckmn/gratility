import Gratility from './gratility.js';
import * as Data from './data.js';
import * as Courier from './courier.js';
import * as Stamp from './stamp.js';

// TODO: replace all instances of LOCAL and SERVER with enums

export default class FileManager {

    private readonly available = { LOCAL: false, SERVER: false };
    private readonly emoji = { LOCAL: '🏠', SERVER: '🌐' };
    private pending: [boolean, string, string] | undefined = undefined;

    private ws: WebSocket | undefined = undefined;
    private wscb: (_: boolean) => void = _=>{};
    private db: IDBDatabase | undefined = undefined;
    private dbto: ReturnType<typeof setTimeout> | undefined = undefined;

    private currentDocument: 'LOCAL' | 'SERVER' | undefined = undefined;
    private localName: string | undefined = undefined;  // TODO some type theoretic thing about how this is string exactly when currentDocument is LOCAL
    public localFiles: Array<[string, string]> = [];

    public constructor(private readonly container: HTMLElement, private readonly g: Gratility) {
        g.data.connect(this);
        this.connectDB(this.onopen('LOCAL'), this.onclose('LOCAL'));
        if (localStorage.token) {
            this.connectWS(localStorage.serverOverride || 'wss://gratility.tck.mn/ws/', {
                m: 'token', token: localStorage.token
            }, this.onopen('SERVER'), this.onclose('SERVER'));
        }
        if (localStorage.lastfile) {
            this.open(localStorage.lastfile, localStorage.lasttitle);
        }
    }

    public connectWS(url: string, initmsg: any, onopen: (() => void), onclose: (() => void)) {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';
        this.ws.addEventListener('open', () => {
            Courier.alert('connected to server');
            this.ws?.send(JSON.stringify(initmsg));
            onopen();
        });
        this.ws.addEventListener('error', () => {
            Courier.alert('server connection failed');
            this.ws = undefined;
            onclose();
        });
        this.ws.addEventListener('close', () => {
            Courier.alert('server connection lost');
            this.ws = undefined;
            onclose();
        });
        this.ws.addEventListener('message', this.message.bind(this));
    }

    private connectDB(onopen: (() => void), onclose: (() => void)) {
        const req = window.indexedDB.open('gratility', 1);
        req.onsuccess = (ev) => {
            this.db = (ev.target as IDBRequest).result;
            this.db!.transaction(['docs'], 'readonly').objectStore('docs').get('files').onsuccess = (ev: Event) => {
                const res = (ev.target as IDBRequest).result;
                if (res) this.localFiles = res;
            };
            onopen();
        };
        req.onerror = () => {
            Courier.alert('local database connection failed');
            this.db = undefined;
            onclose();
        };
        req.onupgradeneeded = (ev: IDBVersionChangeEvent) => {
            this.db = (ev.target as IDBRequest).result;
            this.db!.createObjectStore('docs');
        };
    }

    private message(msg: MessageEvent<any>) {
        if (!(msg.data instanceof ArrayBuffer)) {
            const json = JSON.parse(msg.data);
            if (json.alert !== undefined) Courier.alert(json.alert);
            if (json.token !== undefined) localStorage.token = json.token;
        } else if (this.currentDocument === 'SERVER') {
            for (const ch of Data.deserializeChanges(new Uint8Array(msg.data))) {
                this.g.data.perform(ch);
            }
        } else {
            this.g.data.frozen = false;
            // TODO kinda bad
            new Stamp.Stamp(Data.deserializeStamp(new Uint8Array(msg.data)), 0, 0, 0, 0, 0, 0).apply(this.g.data, 0, 0, true);
            this.wscb(true);
            this.wscb = ()=>{};
            this.currentDocument = 'SERVER';
        }
    }

    // TODO all of the below should make sure current doc is saved first

    private openLocal(localName: string, cb: (_: boolean) => void) {
        this.g.data.frozen = true;
        // TODO check db existence
        this.db!.transaction(['docs'], 'readonly').objectStore('docs').get(localName).onsuccess = (ev: Event) => {
            const res = (ev.target as IDBRequest).result;
            this.g.data.clear();
            this.g.data.frozen = false;
            if (res !== undefined) {
                // TODO kinda bad
                new Stamp.Stamp(Data.deserializeStamp(res), 0, 0, 0, 0, 0, 0).apply(this.g.data, 0, 0, true);
                this.currentDocument = 'LOCAL';
                this.localName = localName;
                cb(true);
            } else cb(false);
        };
    }

    private newLocal(localName: string, localTitle: string, cb: (_: boolean) => void) {
        // TODO handle error on tr, don't clear immediately + freeze
        this.g.data.clear();
        this.currentDocument = 'LOCAL';
        this.localName = localName;
        this.localFiles.push([localName, localTitle]);
        const tr = this.db!.transaction(['docs'], 'readwrite');
        tr.oncomplete = () => { cb(true); };
        tr.objectStore('docs').put(this.localFiles, 'files');
    }

    private openRemote(remoteName: string, cb: (_: boolean) => void) {
        this.g.data.frozen = true;
        // TODO check ws existence
        this.wscb = cb;
        this.ws?.send(JSON.stringify({ m: 'open', name: remoteName }));
    }

    private newRemote(remoteName: string, remoteTitle: string, cb: (_: boolean) => void) {
        // TODO
    }

    private schema(s: string): 'LOCAL' | 'SERVER' {
        const r = s.split(':')[0];
        if (r !== 'LOCAL' && r !== 'SERVER') {
            throw Error('??'); // TODO
        }
        return r;
    }

    private filename(s: string): string {
        return s.split(':')[1];
    }

    public open(s: string, title: string) {
        const schema = this.schema(s), filename = this.filename(s), docname = this.emoji[schema] + ' ' + title;
        if (this.available[schema]) {
            this.container.innerText = `opening ${docname}...`;
            (schema === 'LOCAL' ? this.openLocal : this.openRemote).bind(this)(filename, success => {
                this.container.innerText = success ? docname : `failed to open ${docname}`;
                if (success) {
                    localStorage.lastfile = s;
                    localStorage.lasttitle = title;
                }
            });
        } else {
            this.pending = [false, s, title];
        }
    }

    public recv(change: Data.Change) {
        if (this.currentDocument === 'SERVER') {
            this.ws?.send(Data.serializeChanges([change]));
        } else if (this.currentDocument === 'LOCAL') {
            if (this.dbto === undefined) this.dbto = setTimeout(() => {
                // TODO what happens if a change occurs during the transaction
                const tr = this.db!.transaction(['docs'], 'readwrite');
                tr.oncomplete = () => { this.dbto = undefined; };
                tr.objectStore('docs').put(Data.serializeStamp(this.g.data.listcells()), this.localName);
            }, 1000);
        }
    }

    public openNew(schema: 'LOCAL' | 'SERVER', title: string) {
        const filename = crypto.randomUUID(), s = schema + ':' + filename, docname = this.emoji[schema] + ' ' + title;
        if (this.available[schema]) {
            this.container.innerText = `creating ${docname}...`;
            (schema === 'LOCAL' ? this.newLocal : this.newRemote).bind(this)(filename, title, success => {
                this.container.innerText = success ? docname : `failed to create ${docname}`;
                if (success) {
                    localStorage.lastfile = s;
                    localStorage.lasttitle = title;
                }
            });
        } else {
            this.pending = [true, s, title];
        }
    }

    public onopen(t: 'LOCAL' | 'SERVER'): () => void {
        return () => {
            this.available[t] = true;
            if (this.pending !== undefined && this.available[this.schema(this.pending[1])]) {
                // TODO so hacky lol
                (this.pending[0] ? this.openNew : this.open).bind(this)(this.pending[1] as any, this.pending[2]);
            }
        };
    }

    public onclose(t: 'LOCAL' | 'SERVER'): () => void {
        return () => {
            this.available[t] = false;
        };
    }

    public unsavedChanges(): boolean {
        return this.currentDocument === 'LOCAL' && this.dbto !== undefined;
    }

}
