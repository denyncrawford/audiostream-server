import express, { Request, Response } from "express";
import { Server, Socket } from "socket.io";
import cors from "cors";
import { Readable } from "node:stream";

const app = express();

app.use(cors());

const server = app.listen(8081, () => {
  console.log("http://localhost:8081");
});

class RoomStream extends Readable {
  public firstChunk: Buffer | null;
  public isEnded: boolean = false;
  constructor() {
    super({ objectMode: true });
    this.firstChunk = null;
  }
  _read() {}
  setFirstChunk(chunk: Buffer) {
    this.firstChunk = chunk;
  }
}

const activeRooms = new Map<string, RoomStream>();

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
  },
});

io.on("connection", (socket: Socket) => {
  // Get the room name from the query string
  const { id } = socket.handshake.query;
  console.log(`http://localhost:8081/stream/${id}`)
  const roomId = id as string;
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
  let roomStream: RoomStream | null = null;
  // Set the header for the stream
  socket.on("header", (packet) => {
    const currentStream = activeRooms.get(roomId);
    if (!currentStream) {
      roomStream = new RoomStream();
      activeRooms.set(roomId, roomStream);
    }
    if (roomStream) roomStream.setFirstChunk(packet);
  });
  // Push chunks to the stream
  socket.on("packet", (packet) => {
    if (roomStream && !roomStream?.isEnded) roomStream.push(packet);
  });

  socket.on('end', () => {
    if (roomStream) {
      roomStream.push(null);
      roomStream.destroy();
      roomStream.isEnded = true;
    }
    roomStream = null;
    activeRooms.delete(roomId);
  })
  //  Handle the end of the stream
  socket.on("disconnect", () => {

    socket.removeAllListeners();

    if (roomStream) {
      roomStream.push(null);
      roomStream.destroy();
      roomStream.isEnded = true;
    }
    roomStream = null;
    activeRooms.delete(roomId);
  });

  // Add the stream to the active rooms
  if (roomStream) activeRooms.set(roomId, roomStream);
});

// Stream route

app.get("/stream/:id", (req: Request, res: Response) => {
  const { id } = req.params;
  const roomStream = activeRooms.get(id);
  if (!roomStream) return res.status(404).send("Not found");
  res.writeHead(200, {
    "Content-Type": "audio/webm",
  });
  if (roomStream.firstChunk) res.write(roomStream.firstChunk);
  roomStream.pipe(res);
});
