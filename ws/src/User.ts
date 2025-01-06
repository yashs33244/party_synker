import WebSocket from 'ws';
import { OutgoingMessage } from './types/out';

export class User {
  constructor(
    public readonly id: string,
    public readonly ws: WebSocket,
    private roomId: string = ''
  ) {}

  addRoom(roomId: string) {
    console.log(`Adding user ${this.id} to room ${roomId}`);
    this.roomId = roomId;
  }

  removeRoom(roomId: string) {
    this.roomId = '';
  }

  isInRoom(roomId: string): boolean {
    console.log(`Checking if user ${this.id} is in room ${roomId}`);  
    return this.roomId === roomId;
  }

  send(message: OutgoingMessage) {
    this.ws.send(JSON.stringify(message));
  }

  getRoom() {
    return this.roomId;
  }
}
