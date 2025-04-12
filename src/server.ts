import WebSocket, { WebSocketServer } from 'ws';
import fs from 'node:fs';

import * as Data from './data.js';

export function serve() {

    const data = new Data.DataManager();
    const wss = new WebSocketServer({ port: +fs.readFileSync('serverdata/port', 'utf-8') });

    wss.on('connection', function connection(ws) {
        ws.on('error', console.error);

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
                console.log(msg);
            }
        });

        ws.send(Data.serializeStamp(data.listcells()));
    });

}
