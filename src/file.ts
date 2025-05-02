import Gratility from './gratility.js';

// TODO: replace all instances of LOCAL and SERVER with enums

export default class FileManager {

    private readonly available = { LOCAL: false, SERVER: false };
    private pending: string | undefined = undefined;

    public constructor(private readonly container: HTMLElement, private readonly g: Gratility) {
        // does this belong here? idk
        g.data.connectDB(this.onopen('LOCAL'), this.onclose('LOCAL'));
        if (localStorage.token) {
            g.data.connectWS(localStorage.serverOverride || 'wss://gratility.tck.mn/ws/', {
                m: 'token', token: localStorage.token
            }, this.onopen('SERVER'), this.onclose('SERVER'));
        }
        if (localStorage.lastfile) {
            this.open(localStorage.lastfile);
        }
    }

    private schema(s: string): 'LOCAL' | 'SERVER' {
        const r = s.split(':')[0];
        if (r !== 'LOCAL' && r !== 'SERVER') {
            throw Error('??'); // TODO
        }
        return r;
    }

    public open(s: string) {
        const schema = this.schema(s);
        if (this.available[schema]) {
            if (schema === 'LOCAL') this.g.data.openLocal(s.split(':')[1], ()=>{});
            else this.g.data.openRemote(s.split(':')[1], ()=>{});
        } else {
            this.pending = s;
        }
    }

    public onopen(t: 'LOCAL' | 'SERVER'): () => void {
        return () => {
            this.available[t] = true;
            if (this.pending !== undefined && this.available[this.schema(this.pending)]) {
                this.open(this.pending);
            }
        };
    }

    public onclose(t: 'LOCAL' | 'SERVER'): () => void {
        return () => {
            this.available[t] = false;
        };
    }

}
