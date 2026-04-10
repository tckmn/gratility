import WebSocket, { WebSocketServer } from 'ws';
import fs from 'node:fs';
import crypto from 'node:crypto';
// import sqlite from 'node:sqlite';
const sqlite = require('node:sqlite');

import * as Data from './data.js';
import * as Stamp from './stamp.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WRANGLER_INTERVAL = 1000 * 10;
const WRANGLER_TIMEOUT = 1000 * 60 * 30;

class DataWrangler {
    private datas: Map<string, [number, Data.DataManager]> = new Map();
    private lastUpdate: number = Date.now();
    constructor() { setInterval(() => this.upkeep(), WRANGLER_INTERVAL); }

    public get(name: string): [number, Data.DataManager] | undefined {
        const entry = this.datas.get(name);
        if (entry === undefined) {
            if (!UUID_REGEX.test(name)) return undefined;
            try {
                const data: [number, Data.DataManager] = [this.lastUpdate, new Data.DataManager()];
                Stamp.unsafeWrap(Data.deserializeStamp(new Uint8Array(fs.readFileSync(`serverdata/files/${name}`)))).apply(data[1], 0, 0, true);
                this.datas.set(name, data);
                return data;
            } catch {
                return undefined;
            }
        } else {
            return entry;
        }
    }

    public create(name: string): [number, Data.DataManager] {
        const data: [number, Data.DataManager] = [Date.now(), new Data.DataManager()];
        this.datas.set(name, data);
        return data;
    }

    public upkeep() {
        const now = Date.now();
        for (const [name, entry] of this.datas) {
            if (entry[0] > this.lastUpdate) {
                fs.writeFileSync(`serverdata/files/${name}`, Data.serializeStamp(entry[1].listcells()));
            } else if (entry[0] < now - WRANGLER_TIMEOUT) {
                this.datas.delete(name); // this feels wrong but should be safe
            }
        }
        this.lastUpdate = now;
    }
}

export function serve() {

    const wrangler = new DataWrangler();
    let data: [number, Data.DataManager] | undefined;
    const wss = new WebSocketServer({ port: +fs.readFileSync('serverdata/port', 'utf-8') });

    const db = new sqlite.DatabaseSync('serverdata/db');
    db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
            uid INTEGER PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            salt BLOB NOT NULL
        );
        CREATE TABLE IF NOT EXISTS tokens (
            token TEXT UNIQUE NOT NULL,
            uid INTEGER NOT NULL,
            date TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS documents (
            did INTEGER PRIMARY KEY,
            creator INTEGER NOT NULL,
            name TEXT UNIQUE NOT NULL,
            title TEXT NOT NULL,
            date TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS access (
            uid INTEGER NOT NULL,
            did INTEGER NOT NULL,
            access INTEGER NOT NULL
        );
    `);

    const mktoken = (uid: number) => {
        const token = crypto.randomUUID();
        db.prepare('INSERT INTO tokens (token, uid, date) VALUES (?, ?, ?)').run(token, uid, new Date().toISOString());
        return token;
    };

    wss.on('connection', (ws) => {
        ws.on('error', console.error);
        let authenticated: number | undefined = undefined;

        ws.on('message', function message(msg, isBinary) {
            if (isBinary) {
                if (data !== undefined) {
                    for (const ch of Data.deserializeChanges(msg as Buffer<ArrayBuffer>)) {
                        data[1].add(ch);
                    }
                    wss.clients.forEach(client => {
                        if (client !== ws && client.readyState === WebSocket.OPEN) {
                            client.send(msg, { binary: true });
                        }
                    });
                    data[0] = Date.now();
                } // TODO do something otherwise?
            } else {
                const json = JSON.parse(msg as unknown as string);
                if (json.m === 'login') {
                    const res = db.prepare('SELECT uid, password, salt FROM accounts WHERE username = ?').get(json.username);
                    if (res === undefined) {
                        ws.send(JSON.stringify({ alert: 'no user with that username' }));
                    } else if (crypto.scryptSync(json.password, res.salt, 64).toString('hex') !== res.password) {
                        ws.send(JSON.stringify({ alert: 'incorrect password' }));
                    } else {
                        authenticated = res.uid;
                        const docs = db.prepare('SELECT name, title FROM documents WHERE creator = ?').all(authenticated);
                        ws.send(JSON.stringify({ alert: 'logged in!', token: mktoken(res.uid), doclist: docs }));
                    }
                } else if (json.m === 'register') {
                    if (fs.readFileSync('serverdata/register', 'utf-8')[0] === 'y') {
                        const salt = crypto.randomBytes(16);
                        const pwd = crypto.scryptSync(json.password, salt, 64).toString('hex');
                        try {
                            const res = db.prepare('INSERT INTO accounts (username, password, salt) VALUES (?, ?, ?) RETURNING uid').get(json.username, pwd, salt);
                            authenticated = res.uid;
                            ws.send(JSON.stringify({ alert: 'account created!', token: mktoken(res.uid) }));
                        } catch (e) {
                            if ((e as any).errcode === 2067) {
                                ws.send(JSON.stringify({ alert: 'that username is already in use' }));
                            } else {
                                console.log(e); // TODO better logging
                                ws.send(JSON.stringify({ alert: 'could not create account' }));
                            }
                        }
                    } else {
                        ws.send(JSON.stringify({ alert: 'account creation is currently disabled' }));
                    }
                } else if (json.m === 'token') {
                    const res = db.prepare('SELECT uid FROM tokens WHERE token = ?').get(json.token);
                    if (res === undefined) {
                        ws.send(JSON.stringify({ token: '' }));
                    } else {
                        // TODO update token date?
                        authenticated = res.uid;
                        const docs = db.prepare('SELECT name, title FROM documents WHERE creator = ?').all(authenticated);
                        ws.send(JSON.stringify({ alert: 'logged in!', doclist: docs }));
                    }
                } else if (json.m === 'open') {
                    data = wrangler.get(json.name);
                    if (data === undefined) ws.send(JSON.stringify({ alert: 'server file does not exist', wscb: false }));
                    else ws.send(Data.serializeStamp(data[1].listcells()));
                } else if (json.m === 'new') {
                    if (authenticated === undefined) ws.send(JSON.stringify({ alert: 'you must be logged in to create a server file', wscb: false }));
                    else if (!json.title) ws.send(JSON.stringify({ alert: 'please provide a title', wscb: false }));
                    else if (!json.name || !UUID_REGEX.test(json.name)) ws.send(JSON.stringify({ alert: 'misbehaving client?', wscb: false }));
                    else {
                        let succeeded = false;
                        try {
                            db.prepare('INSERT INTO documents (creator, name, title, date) VALUES (?, ?, ?, ?)').run(authenticated, json.name, json.title, new Date().toISOString());
                            succeeded = true;
                        } catch (e) {
                            // this uuid is untrusted so could collide
                            if ((e as any).errcode === 2067) ws.send(JSON.stringify({ alert: 'server file uuid already exists??', wscb: false }));
                            else ws.send(JSON.stringify({ alert: 'something very weird happened', wscb: false }));
                        }

                        // kinda weird control flow cuz don't want errors here to be caught
                        // TODO update doclist
                        if (succeeded) {
                            data = wrangler.create(json.name);
                            ws.send(Data.serializeStamp(data[1].listcells()));
                        }
                    }
                }
            }
        });
    });

}
