"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserManager = void 0;
class UserManager {
    constructor() {
        this.users = new Map();
    }
    addUser(user) {
        this.users.set(user.id, user);
    }
    removeUser(userId) {
        this.users.delete(userId);
    }
    getUser(userId) {
        return this.users.get(userId);
    }
    broadcast(roomId, message, excludeUserId) {
        this.users.forEach((user) => {
            if (user.isInRoom(roomId) && user.id !== excludeUserId) {
                user.send(message);
            }
        });
    }
}
exports.UserManager = UserManager;
