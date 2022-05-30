import express, { Request, Response } from "express";
import { RoomStream } from "./room_stream";
import { initIoListener } from "./io";
import cors from "cors";
import { config } from "dotenv";

config();
const app = express();
const port = process.env.PORT || 8081;

app.use(cors());

const server = app.listen(port, () => {
  console.log("http://localhost:8081");
});

const activeRooms = new Map<string, RoomStream>();
initIoListener(server, activeRooms);

// Stream route

// Todo create register stream route
// Create metadata route for the stream /stream/:id/metadata
// create index route for available streams /streams

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
