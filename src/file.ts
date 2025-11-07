import Gratility from './gratility.js';

// TODO: replace all instances of LOCAL and SERVER with enums

export default class FileManager {

    private readonly available = { LOCAL: false, SERVER: false };
    private readonly emoji = { LOCAL: '🏠', SERVER: '🌐' };
    private pending: [boolean, string, string] | undefined = undefined;

    public constructor(private readonly container: HTMLElement, private readonly g: Gratility) {
        // does this belong here? idk
        g.data.connectDB(this.onopen('LOCAL'), this.onclose('LOCAL'));
        if (localStorage.token) {
            g.data.connectWS(localStorage.serverOverride || 'wss://gratility.tck.mn/ws/', {
                m: 'token', token: localStorage.token
            }, this.onopen('SERVER'), this.onclose('SERVER'));
        }
        if (localStorage.lastfile) {
            this.open(localStorage.lastfile, localStorage.lasttitle);
        }
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
            (schema === 'LOCAL' ? this.g.data.openLocal : this.g.data.openRemote).bind(this.g.data)(filename, success => {
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

    public openNew(schema: 'LOCAL' | 'SERVER', title: string) {
        const filename = crypto.randomUUID(), s = schema + ':' + filename, docname = this.emoji[schema] + ' ' + title;
        if (this.available[schema]) {
            this.container.innerText = `creating ${docname}...`;
            (schema === 'LOCAL' ? this.g.data.newLocal : this.g.data.newRemote).bind(this.g.data)(filename, title, success => {
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
                (this.pending[0] ? this.openNew : this.open).bind(this)(this.pending[1], this.pending[2]);
            }
        };
    }

    public onclose(t: 'LOCAL' | 'SERVER'): () => void {
        return () => {
            this.available[t] = false;
        };
    }

}
