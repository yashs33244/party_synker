"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
class User {
    constructor(id, ws, roomId = '') {
        this.id = id;
        this.ws = ws;
        this.roomId = roomId;
    }
    addRoom(roomId) {
        console.log(`Adding user ${this.id} to room ${roomId}`);
        this.roomId = roomId;
    }
    removeRoom(roomId) {
        this.roomId = '';
    }
    isInRoom(roomId) {
        console.log(`Checking if user ${this.id} is in room ${roomId}`);
        return this.roomId === roomId;
    }
    send(message) {
        this.ws.send(JSON.stringify(message));
    }
    getRoom() {
        return this.roomId;
    }
}
exports.User = User;
