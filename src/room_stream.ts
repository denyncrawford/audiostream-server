import { Readable } from "node:stream";

export class RoomStream extends Readable {
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