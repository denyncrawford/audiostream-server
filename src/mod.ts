import express, { Request, Response } from "express";
import { RoomStream } from "./room_stream";
import { initIoListener } from "./io";
import cors from "cors";

const app = express();

app.use(cors());

const server = app.listen(8081, () => {
  console.log("http://localhost:8081");
});

const activeRooms = new Map<string, RoomStream>();

initIoListener(server, activeRooms);

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
