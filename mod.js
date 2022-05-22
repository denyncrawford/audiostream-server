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

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  }
});

io.on('connection', (socket) => {
  mainSocket = socket;
  socket.on('disconnect', () => {
    mainSocket = null;
  });
});

// Stream route 

app.get('/stream', (req, res) => {
  // send response as a stream with received chunks from the client socket
  if (!mainSocket) return res.status(404).send('No socket connection');
  res.writeHead(200, {
    'Content-Type': 'audio/webm;codecs=opus',
    'Transfer-Encoding': 'chunked',
  });
  mainSocket.on('packet', blob => {
    res.write(blob);
  })
  mainSocket.on('end', () => {
    res.end();
  })
});

app.get('/', (req, res) => {
  res.sendFile(resolve('./index.html'));
});