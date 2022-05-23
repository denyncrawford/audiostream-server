"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const path_1 = require("path");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = app.listen(8081, () => {
    console.log('http://localhost:8081');
});
let mainSocket;
let firstChunk;
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    }
});
io.on('connection', (socket) => {
    mainSocket = socket;
    socket.once('packet', (packet) => {
        firstChunk = Buffer.from(packet);
    });
    socket.on('disconnect', () => {
        socket.removeAllListeners();
        mainSocket = null;
        firstChunk = null;
    });
});
// Stream route 
app.get('/stream', (_, res) => {
    if (!mainSocket)
        return res.status(404).send('No socket connection');
    res.writeHead(200, {
        'Content-Type': 'audio/webm',
    });
    if (firstChunk)
        res.write(firstChunk);
    mainSocket.on('packet', (blob) => {
        const chunk = Buffer.from(blob);
        res.write(chunk);
    });
    mainSocket.on('error', (err) => {
        res.status(500).send(err);
    });
    mainSocket.on('end', () => {
        res.end();
    });
});
app.get('/', (_, res) => {
    res.sendFile((0, path_1.resolve)('./index.html'));
});
