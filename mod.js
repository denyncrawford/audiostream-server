import express from 'express';
import { Server } from 'socket.io'
import cors from 'cors';
import { resolve } from 'path';

const app = express();

app.use(cors());

const server = app.listen(8081, () => {
    console.log('http://localhost:8081');
});

let mainSocket;
let firstChunk;

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  }
});

io.on('connection', (socket) => {
  mainSocket = socket;
  socket.once('packet', (packet) => {
    firstChunk = Buffer.from(packet);
  })
  socket.on('disconnect', () => {
    mainSocket = null;
    firstChunk = null;
  });
});

// Stream route 

app.get('/stream', (_, res) => {
  if (!mainSocket) return res.status(404).send('No socket connection');
  res.writeHead(200, {
    'Content-Type': 'audio/webm',
  });
  if (firstChunk) res.write(firstChunk);
  mainSocket.on('packet', blob => {
    const chunk = Buffer.from(blob);
    res.write(chunk);
  })
  mainSocket.on('error', err => {
    res.status(500).send(err);
  })
  mainSocket.on('end', () => {
    res.end();
  })
});

app.get('/', (req, res) => {
  res.sendFile(resolve('./index.html'));
});