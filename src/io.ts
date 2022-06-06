import { Server, ServerOptions, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { RoomStream } from "./room_stream";
import { on } from "events";

// IoServer Handler for active rooms

interface Header {
  packet: Buffer;
  timestamp: number;
  isReconnect: boolean;
}

export const initIoListener = async (
  server: HttpServer,
  activeRooms: Map<string, RoomStream>,
) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    },
  } as Partial<ServerOptions>);

  const connection: AsyncIterable<Socket[]> = on(io, "connection");

  for await (const [socket] of connection) {
    // Get the room name from the query string
    const { id } = socket.handshake.query;
    console.log(`http://localhost:8081/stream/${id}`);
    const roomId = id as string;

    if (!roomId) {
      socket.emit("close_reason", "NO_ROOM_ID");
      socket.disconnect();
      socket.conn.close();
      return;
    }

    // Create a new stream for this room
    // This is ugly but it works by the way

    let roomStream: RoomStream | null = null;

    const headerIterator: AsyncIterable<Header[]> = on(socket, "header");
    const chunkIterator: AsyncIterable<Buffer[]> = on(socket, "packet");
    const endIterator: AsyncIterable<void> = on(socket, "end");
    const disconnectIterator: AsyncIterable<void> = on(socket, "disconnect");

    const initHeaderListener = async () => {
      for await (const [header] of headerIterator) {
        const { packet, isReconnect } = header;

        if (activeRooms.has(roomId) && !isReconnect) {
          socket.emit("close_reason", "ROOM_ALREADY_EXISTS");
          socket.disconnect();
          socket.conn.close();
          return;
        }

        const currentStream = activeRooms.get(roomId);
        if (!currentStream) {
          roomStream = new RoomStream();
          activeRooms.set(roomId, roomStream);
        }
        if (roomStream) {
          // Set the first chunk
          roomStream.setFirstChunk(packet);
          // Add the stream to the active rooms
          if (roomStream) activeRooms.set(roomId, roomStream);
        }
      }
    };

    // Push chunks to the stream

    const initPacketListener = async () => {
      for await (const [packet] of chunkIterator) {
        if (roomStream && !roomStream?.isEnded) roomStream.push(packet);
      }
    };

    // End the stream

    const initEndListener = async () => {
      for await (const _end of endIterator) {
        if (roomStream) {
          roomStream.push(null);
          roomStream.destroy();
          roomStream.isEnded = true;
        }
        roomStream = null;
        activeRooms.delete(roomId);
      }
    };

    //  Handle the end of the connection

    const initDisconnectListener = async () => {
      for await (const _disconnect of disconnectIterator) {
        socket.removeAllListeners();

        if (roomStream) {
          roomStream.push(null);
          roomStream.destroy();
          roomStream.isEnded = true;
        }
        roomStream = null;
        activeRooms.delete(roomId);
      }
    };

    // Init iterators

    try {
      initHeaderListener();
      initPacketListener();
      initEndListener();
      initDisconnectListener();
    } catch (e) {
      socket.emit("close_reason", "INTERNAL_ERROR");
      socket.disconnect();
      socket.conn.close();
    }
  }
};
