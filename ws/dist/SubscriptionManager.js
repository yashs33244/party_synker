"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionManager = void 0;
class SubscriptionManager {
    constructor(loadedUsers = new Map(), prisma, userManager) {
        this.loadedUsers = loadedUsers;
        this.prisma = prisma;
        this.userManager = userManager;
    }
    handleLeaveRoom(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userId, roomId } = payload;
            const user = this.userManager.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }
            // delete users in room
            this.userManager.removeUserFromRoom(userId, roomId);
            const message = {
                type: 'ROOM_LEFT',
                payload: { userId, roomId },
            };
            this.userManager.broadcast(roomId, message);
        });
    }
    handleCreateRoom(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { hostId, roomName } = payload;
            const user = yield this.prisma.user.findUnique({
                where: { id: hostId }
            });
            if (!user) {
                throw new Error('Host user not found');
            }
            const room = yield this.prisma.room.create({
                data: {
                    roomName,
                    host: {
                        connect: {
                            id: hostId
                        }
                    },
                    users: {
                        create: {
                            userId: hostId,
                            joinedAt: new Date()
                        }
                    }
                },
                include: {
                    host: true,
                    users: true
                }
            });
            // Explicitly add user to room in UserManager
            this.userManager.addUserToRoom(hostId, room.id);
            const wsUser = this.userManager.getUser(hostId);
            if (wsUser) {
                wsUser.send({
                    type: 'ROOM_CREATED',
                    payload: {
                        roomId: room.id,
                        roomName: room.roomName,
                        hostId: room.hostId
                    }
                });
            }
            return room;
        });
    }
    handleJoinRoom(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { userId, roomId } = payload;
            const user = this.userManager.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }
            const room = yield this.prisma.room.findUnique({
                where: { id: roomId }
            });
            if (!room) {
                throw new Error('Room not found');
            }
            const existingUserInRoom = yield this.prisma.usersInRoom.findUnique({
                where: {
                    userId_roomId: {
                        userId,
                        roomId
                    }
                }
            });
            if (existingUserInRoom && !existingUserInRoom.leftAt) {
                throw new Error('User is already in this room');
            }
            yield this.prisma.usersInRoom.upsert({
                where: {
                    userId_roomId: {
                        userId,
                        roomId
                    }
                },
                update: {
                    joinedAt: new Date(),
                    leftAt: null
                },
                create: {
                    userId,
                    roomId,
                    joinedAt: new Date()
                }
            });
            // Add user to room in UserManager
            this.userManager.addUserToRoom(userId, roomId);
            const message = {
                type: 'ROOM_JOINED',
                payload: {
                    userId,
                    roomId,
                    userName: (_a = (yield this.prisma.user.findUnique({
                        where: { id: userId },
                        select: { name: true }
                    }))) === null || _a === void 0 ? void 0 : _a.name
                },
            };
            this.userManager.broadcast(roomId, message);
        });
    }
    handleCloseRoom(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId, hostId } = payload;
            const room = yield this.prisma.room.findFirst({
                where: { id: roomId, hostId },
            });
            if (!room) {
                throw new Error('Room not found or user is not the host');
            }
            yield this.prisma.room.update({
                where: { id: roomId },
                data: { closedAt: new Date() },
            });
            const message = {
                type: 'ROOM_CLOSED',
                payload: { roomId },
            };
            this.userManager.broadcast(roomId, message);
        });
    }
    handleUserMessage(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const { roomId, userId, message, messageType = 'TEXT' } = payload;
            const user = this.userManager.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }
            const userInRoom = yield this.prisma.usersInRoom.findUnique({
                where: {
                    userId_roomId: {
                        userId,
                        roomId
                    }
                },
                include: {
                    room: true
                }
            });
            if (!userInRoom) {
                throw new Error('User is not in this room');
            }
            if (userInRoom.leftAt) {
                yield this.prisma.usersInRoom.delete({
                    where: {
                        userId_roomId: {
                            userId,
                            roomId
                        }
                    }
                });
                throw new Error('User has left this room');
            }
            if (userInRoom.room.closedAt) {
                throw new Error('Room is closed');
            }
            const savedMessage = yield this.prisma.message.create({
                data: {
                    content: message,
                    type: messageType,
                    userId,
                    roomId,
                }
            });
            const outgoingMessage = {
                type: 'USER_MESSAGE',
                payload: {
                    roomId,
                    userId,
                    message,
                    messageType,
                    timestamp: new Date().toISOString(),
                    userName: (_a = (yield this.prisma.user.findUnique({
                        where: { id: userId },
                        select: { name: true }
                    }))) === null || _a === void 0 ? void 0 : _a.name
                }
            };
            console.log('Current users in UserManager:', Array.from(this.userManager.getUsers().keys()));
            this.userManager.broadcast(roomId, outgoingMessage, userId);
            user.send({
                type: 'MESSAGE_SENT',
                payload: {
                    messageId: savedMessage.id,
                    timestamp: new Date().toISOString()
                }
            });
            return outgoingMessage;
        });
    }
    handleGetUsers(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId } = payload;
            const users = yield this.prisma.usersInRoom.findMany({
                where: { roomId },
                select: { userId: true }
            });
            return users.map((u) => u.userId);
        });
    }
    handleMusicLoaded(_a) {
        return __awaiter(this, arguments, void 0, function* ({ roomId, userId }) {
            if (!this.loadedUsers.has(roomId)) {
                this.loadedUsers.set(roomId, new Set());
            }
            const loadedUsersInRoom = this.loadedUsers.get(roomId);
            loadedUsersInRoom.add(userId);
            const roomUsers = this.userManager.getRoomUsers(roomId);
            // If all users have loaded, broadcast play command
            if (loadedUsersInRoom.size === roomUsers.size) {
                this.loadedUsers.delete(roomId);
                const playTimestamp = Date.now() + 1000; // Play in 1 second
                this.userManager.broadcast(roomId, {
                    type: 'MUSIC_COMMAND',
                    payload: {
                        command: 'PLAY',
                        timestamp: playTimestamp
                    }
                });
            }
        });
    }
    handleMusicPlay(_a) {
        return __awaiter(this, arguments, void 0, function* ({ roomId, songUrl }) {
            this.loadedUsers.delete(roomId);
            this.userManager.broadcast(roomId, {
                type: 'MUSIC_COMMAND',
                payload: {
                    command: 'LOAD',
                    songUrl
                }
            });
        });
    }
}
exports.SubscriptionManager = SubscriptionManager;
