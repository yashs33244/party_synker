"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
class User {
    constructor(id, ws, rooms = new Set()) {
        this.id = id;
        this.ws = ws;
        this.rooms = rooms;
    }
    addRoom(roomId) {
        this.rooms.add(roomId);
    }
    removeRoom(roomId) {
        this.rooms.delete(roomId);
    }
    isInRoom(roomId) {
        return this.rooms.has(roomId);
    }
    send(message) {
        this.ws.send(JSON.stringify(message));
    }
}
exports.User = User;
