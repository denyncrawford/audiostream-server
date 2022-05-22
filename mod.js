import express from 'express';
import { Server } from 'socket.io'
import cors from 'cors';

const app = express();

app.use(cors());

const server = app.listen(8081, () => {
    console.log('http://localhost:8081');
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  }
});

io.on('connection', (socket) => {
  socket.emit('initialized')
});

// Stream route 

app.get('/stream', (req, res) => {
  if (Object.keys(io.sockets).length > 0) {
    res.status(200);
    res.contentType('audio/webm');
    res.setHeader('Content-Disposition', 'attachment; filename=stream.webm');
    io.on('packet', (packet) => {
      res.write(packet);
    })
    io.on('end', () => {
      res.end();
    })
  } else {
    res.status(404).send('No clients connected');
  }
});