import WebSocket, { WebSocketServer } from 'ws';
import fs from 'node:fs';
import crypto from 'node:crypto';
// import sqlite from 'node:sqlite';
const sqlite = require('node:sqlite');

import * as Data from './data.js';

export function serve() {

    const data = new Data.DataManager();
    const wss = new WebSocketServer({ port: +fs.readFileSync('serverdata/port', 'utf-8') });

    const db = new sqlite.DatabaseSync('serverdata/db');
    db.exec(`
        CREATE TABLE IF NOT EXISTS accounts (
            uid INTEGER PRIMARY KEY,
            username TEXT UNIQUE,
            password TEXT,
            salt BLOB
        );
        CREATE TABLE IF NOT EXISTS tokens (
            token TEXT,
            uid INTEGER,
            date TEXT
        );
    `);

    const mktoken = (uid: number) => {
        const token = crypto.randomUUID();
        db.prepare('INSERT INTO tokens (token, uid, date) VALUES (?, ?, ?)').run(token, uid, new Date().toISOString());
        return token;
    };

    wss.on('connection', function connection(ws) {
        ws.on('error', console.error);
        let authenticated: number | undefined = undefined;

        ws.on('message', function message(msg, isBinary) {
            if (isBinary) {
                for (const ch of Data.deserializeChanges(msg as Buffer)) {
                    data.add(ch);
                }
                wss.clients.forEach(client => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(msg, { binary: true });
                    }
                });
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
                        ws.send(JSON.stringify({ alert: 'logged in!', token: mktoken(res.uid) }));
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
                        ws.send(JSON.stringify({ alert: 'logged in!' })); // TODO update date?
                    }
                }
            }
        });

        ws.send(Data.serializeStamp(data.listcells()));
    });

}
