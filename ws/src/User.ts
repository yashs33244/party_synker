import WebSocket from 'ws';
import { OutgoingMessage } from './types/out';
  
export class User {
  constructor(
    public readonly id: string,
    public readonly ws: WebSocket,
    private rooms: Set<string> = new Set()
  ) {}

  addRoom(roomId: string) {
    this.rooms.add(roomId);
  }

  removeRoom(roomId: string) {
    this.rooms.delete(roomId);
  }

  isInRoom(roomId: string): boolean {
    return this.rooms.has(roomId);
  }

  send(message: OutgoingMessage) {
    this.ws.send(JSON.stringify(message));
  }
}