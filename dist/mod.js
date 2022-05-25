"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const path_1 = require("path");
const node_stream_1 = require("node:stream");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = app.listen(8081, () => {
    console.log("http://localhost:8081");
});
class RoomStream extends node_stream_1.Readable {
    constructor() {
        super({ objectMode: true });
        this.isEnded = false;
        this.firstChunk = null;
        this.on("end", () => {
            this.destroy();
        });
    }
    _read() { }
    setFirstChunk(chunk) {
        this.firstChunk = chunk;
    }
}
const activeRooms = new Map();
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "*",
        methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    },
});
io.on("connection", (socket) => {
    // Get the room name from the query string
    const { id } = socket.handshake.query;
    console.log(`http://localhost:8081/stream/${id}`);
    const roomId = id;
    if (!roomId) {
        socket.emit("close_reason", "NO_ROOM_ID");
        socket.disconnect();
        socket.conn.close();
        return;
    }
    if (activeRooms.has(roomId)) {
        socket.emit("close_reason", "ROOM_ALREADY_EXISTS");
        socket.disconnect();
        socket.conn.close();
        return;
    }
    // Create a new stream for this room
    let roomStream = null;
    // Set the header for the stream
    socket.on("header", (packet) => {
        const currentStream = activeRooms.get(roomId);
        if (!currentStream) {
            roomStream = new RoomStream();
            activeRooms.set(roomId, roomStream);
        }
        if (roomStream)
            roomStream.setFirstChunk(packet);
    });
    // Push chunks to the stream
    socket.on("packet", (packet) => {
        if (roomStream && !(roomStream === null || roomStream === void 0 ? void 0 : roomStream.isEnded))
            roomStream.push(packet);
    });
    socket.on('end', () => {
        if (roomStream) {
            if (roomStream)
                roomStream.push(null);
            roomStream.isEnded = true;
        }
        roomStream = null;
        activeRooms.delete(roomId);
    });
    //  Handle the end of the stream
    socket.on("disconnect", () => {
        if (roomStream) {
            if (roomStream.firstChunk)
                roomStream.push(null);
            roomStream.isEnded = true;
        }
        roomStream = null;
        activeRooms.delete(roomId);
    });
    // Add the stream to the active rooms
    if (roomStream)
        activeRooms.set(roomId, roomStream);
});
// Stream route
app.get("/stream/:id", (req, res) => {
    const { id } = req.params;
    const roomStream = activeRooms.get(id);
    if (!roomStream)
        return res.status(404).send("Not found");
    res.writeHead(200, {
        "Content-Type": "audio/webm",
    });
    if (roomStream.firstChunk)
        res.write(roomStream.firstChunk);
    roomStream.pipe(res);
});
app.get("/", (_, res) => {
    res.sendFile((0, path_1.resolve)("./index.html"));
});
