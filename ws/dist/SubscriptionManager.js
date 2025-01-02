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
    constructor(prisma, userManager) {
        this.prisma = prisma;
        this.userManager = userManager;
    }
    handleJoinRoom(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userId, roomId } = payload;
            const user = this.userManager.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }
            yield this.prisma.usersInRoom.create({
                data: {
                    userId,
                    roomId,
                    joinedAt: new Date(),
                },
            });
            user.addRoom(roomId);
            const message = {
                type: 'ROOM_JOINED',
                payload: { userId, roomId },
            };
            this.userManager.broadcast(roomId, message);
        });
    }
    handleLeaveRoom(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userId, roomId } = payload;
            const user = this.userManager.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }
            yield this.prisma.usersInRoom.update({
                where: {
                    userId_roomId: {
                        userId,
                        roomId,
                    },
                },
                data: {
                    leftAt: new Date(),
                },
            });
            user.removeRoom(roomId);
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
            // First verify if the user exists
            const user = yield this.prisma.user.findUnique({
                where: { id: hostId }
            });
            if (!user) {
                throw new Error('Host user not found');
            }
            // Create the room with proper host connection
            const room = yield this.prisma.room.create({
                data: {
                    roomName,
                    host: {
                        connect: {
                            id: hostId
                        }
                    },
                    // Also create the initial UsersInRoom entry for the host
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
            // Add the room to the WebSocket user if they're connected
            const wsUser = this.userManager.getUser(hostId);
            if (wsUser) {
                wsUser.addRoom(room.id);
                // Notify the user that the room was created
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
            // Verify user exists
            const user = this.userManager.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }
            // Verify user is in the room
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
                throw new Error('User has left this room');
            }
            if (userInRoom.room.closedAt) {
                throw new Error('Room is closed');
            }
            // You might want to store messages in database
            // If you want to add a Messages table to your schema, you can do:
            const savedMessage = yield this.prisma.message.create({
                data: {
                    content: message,
                    type: messageType,
                    userId,
                    roomId,
                }
            });
            // Prepare the outgoing message
            const outgoingMessage = {
                type: 'USER_MESSAGE',
                payload: {
                    roomId,
                    userId,
                    message,
                    messageType,
                    timestamp: new Date().toISOString(),
                    // You might want to include additional user info
                    userName: (_a = (yield this.prisma.user.findUnique({
                        where: { id: userId },
                        select: { name: true }
                    }))) === null || _a === void 0 ? void 0 : _a.name
                }
            };
            // Broadcast the message to all users in the room except the sender
            this.userManager.broadcast(roomId, outgoingMessage, userId);
            // Also send confirmation back to the sender
            user.send({
                type: 'MESSAGE_SENT',
                payload: {
                    messageId: Date.now().toString(), // or use savedMessage.id if storing in DB
                    timestamp: new Date().toISOString()
                }
            });
            return outgoingMessage;
        });
    }
}
exports.SubscriptionManager = SubscriptionManager;
