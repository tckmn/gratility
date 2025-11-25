import * as Data from './data.js';
import * as Courier from './courier.js';
import * as Stamp from './stamp.js';

export enum Schema { LOCAL, SERVER }

export class File {
    public constructor(public schema: Schema, public filename: string, public title: string) {}
    public stringify(): string { return JSON.stringify({ s: this.schema, f: this.filename, t: this.title }); }
    static destringify(s: string) { const o = JSON.parse(s); return new File(o.s, o.f, o.t); }
}

export class FileManager {

    private readonly available: { [key in Schema]: boolean } = { [Schema.LOCAL]: false, [Schema.SERVER]: false };
    private readonly emoji: { [key in Schema]: string } = { [Schema.LOCAL]: '🏠', [Schema.SERVER]: '🌐' };
    private pending: [File, boolean] | undefined = undefined;

    private ws: WebSocket | undefined = undefined;
    private wscb: (_: boolean) => void = _=>{};
    private db: IDBDatabase | undefined = undefined;
    private dbto: ReturnType<typeof setTimeout> | undefined = undefined;

    private currentDocument: Schema | undefined = undefined;
    private localName: string | undefined = undefined;  // TODO some type theoretic thing about how this is string exactly when currentDocument is LOCAL
    public localFiles: Array<[string, string]> = [];

    public constructor(private readonly fileCont: HTMLElement,
                       private readonly serverCont: HTMLElement,
                       private readonly data: Data.DataManager) {
        this.connectDB();
        if (localStorage.token) {
            this.connectWS(localStorage.serverOverride || 'wss://gratility.tck.mn/ws/', {
                m: 'token', token: localStorage.token
            });
        }
        if (localStorage.lastfile) {
            this.open(File.destringify(localStorage.lastfile));
        }
    }

    public connectWS(url: string, initmsg: any) {
        this.ws = new WebSocket(url);
        this.ws.binaryType = 'arraybuffer';
        this.ws.addEventListener('open', () => {
            this.serverCont.classList.remove('nc', 'dc');
            this.serverCont.classList.add('c');
            Courier.alert('connected to server');
            this.ws?.send(JSON.stringify(initmsg));
            this.onopen(Schema.SERVER);
        });
        this.ws.addEventListener('error', () => {
            this.serverCont.classList.remove('nc', 'c');
            this.serverCont.classList.add('dc');
            Courier.alert('server connection failed');
            this.ws = undefined;
            this.onclose(Schema.SERVER);
        });
        this.ws.addEventListener('close', () => {
            this.serverCont.classList.remove('nc', 'c');
            this.serverCont.classList.add('dc');
            Courier.alert('server connection lost');
            this.ws = undefined;
            this.onclose(Schema.SERVER);
        });
        this.ws.addEventListener('message', this.message.bind(this));
    }

    private connectDB() {
        const req = window.indexedDB.open('gratility', 1);
        req.onsuccess = (ev) => {
            this.db = (ev.target as IDBRequest).result;
            this.db!.transaction(['docs'], 'readonly').objectStore('docs').get('files').onsuccess = (ev: Event) => {
                const res = (ev.target as IDBRequest).result;
                if (res) this.localFiles = res;
            };
            this.onopen(Schema.LOCAL);
        };
        req.onerror = () => {
            Courier.alert('local database connection failed');
            this.db = undefined;
            this.onclose(Schema.LOCAL);
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
        } else if (this.currentDocument === Schema.SERVER) {
            for (const ch of Data.deserializeChanges(new Uint8Array(msg.data))) {
                this.data.perform(ch);
            }
        } else {
            this.data.frozen = false;
            Stamp.unsafeWrap(Data.deserializeStamp(new Uint8Array(msg.data))).apply(this.data, 0, 0, true);
            this.wscb(true);
            this.wscb = ()=>{};
            this.currentDocument = Schema.SERVER;
        }
    }

    // TODO all of the below should make sure current doc is saved first

    private openLocal(f: File, cb: (_: boolean) => void) {
        this.data.frozen = true;
        // TODO check db existence
        this.db!.transaction(['docs'], 'readonly').objectStore('docs').get(f.filename).onsuccess = (ev: Event) => {
            const res = (ev.target as IDBRequest).result;
            this.data.clear();
            this.data.frozen = false;
            if (res !== undefined) {
                Stamp.unsafeWrap(Data.deserializeStamp(res)).apply(this.data, 0, 0, true);
                this.currentDocument = Schema.LOCAL;
                this.localName = f.filename;
                cb(true);
            } else cb(false);
        };
    }

    private newLocal(f: File, cb: (_: boolean) => void) {
        // TODO handle error on tr, don't clear immediately + freeze
        this.data.clear();
        this.currentDocument = Schema.LOCAL;
        this.localName = f.filename;
        this.localFiles.push([f.filename, f.title]);
        const tr = this.db!.transaction(['docs'], 'readwrite');
        tr.oncomplete = () => { cb(true); };
        tr.objectStore('docs').put(this.localFiles, 'files');
    }

    private openRemote(f: File, cb: (_: boolean) => void) {
        this.data.frozen = true;
        // TODO check ws existence
        this.wscb = cb;
        this.ws?.send(JSON.stringify({ m: 'open', name: f.filename }));
    }

    private newRemote(f: File, cb: (_: boolean) => void) {
        // TODO
    }

    public open(f: File, createNew: boolean = false) {
        const docname = this.emoji[f.schema] + ' ' + f.title;
        if (this.available[f.schema]) {
            if (createNew) f.filename = crypto.randomUUID();
            this.fileCont.innerText = `${createNew ? 'creating' : 'opening'} ${docname}...`;
            (createNew
                ? f.schema === Schema.LOCAL ? this.newLocal : this.newRemote
                : f.schema === Schema.LOCAL ? this.openLocal : this.openRemote).bind(this)(f, success => {
                this.fileCont.innerText = success ? docname : `failed to ${createNew ? 'create' : 'open'} ${docname}`;
                if (success) localStorage.lastfile = f.stringify();
            });
        } else {
            this.pending = [f, createNew];
        }
    }

    public onopen(t: Schema) {
        this.available[t] = true;
        if (this.pending !== undefined && this.available[this.pending[0].schema]) {
            this.open(this.pending[0], this.pending[1]);
        }
    }

    public onclose(t: Schema) {
        this.available[t] = false;
    }

    public recv(change: Data.Change) {
        if (this.currentDocument === Schema.SERVER) {
            this.ws?.send(Data.serializeChanges([change]));
        } else if (this.currentDocument === Schema.LOCAL) {
            if (this.dbto === undefined) this.dbto = setTimeout(() => {
                // TODO what happens if a change occurs during the transaction
                const tr = this.db!.transaction(['docs'], 'readwrite');
                tr.oncomplete = () => { this.dbto = undefined; };
                tr.objectStore('docs').put(Data.serializeStamp(this.data.listcells()), this.localName);
            }, 1000);
        }
    }

    public unsavedChanges(): boolean {
        return this.currentDocument === Schema.LOCAL && this.dbto !== undefined;
    }

}
