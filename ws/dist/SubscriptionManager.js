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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionManager = void 0;
const spotify_web_api_node_1 = __importDefault(require("spotify-web-api-node"));
class SubscriptionManager {
    constructor(prisma, userManager, spotifyConfig) {
        this.prisma = prisma;
        this.userManager = userManager;
        this.roomMusicStates = {};
        this.spotify = new spotify_web_api_node_1.default(spotifyConfig);
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
    handleCreateRoom(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = yield this.prisma.room.create({
                data: {
                    roomName: payload.roomName,
                    host: {
                        connect: {
                            id: payload.hostId
                        }
                    },
                    users: {
                        create: {
                            userId: payload.hostId,
                            joinedAt: new Date()
                        }
                    }
                },
                include: {
                    host: true,
                    users: true
                }
            });
            // Initialize music state for the new room
            this.roomMusicStates[room.id] = {
                trackId: null,
                isPlaying: false,
                startTime: null,
                pausedAt: null
            };
            const wsUser = this.userManager.getUser(payload.hostId);
            if (wsUser) {
                wsUser.addRoom(room.id);
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
            const { userId, roomId } = payload;
            const user = this.userManager.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }
            // Join room logic
            yield this.prisma.usersInRoom.create({
                data: {
                    userId,
                    roomId,
                    joinedAt: new Date(),
                },
            });
            user.addRoom(roomId);
            // Send current music state to joining user
            const musicState = this.roomMusicStates[roomId];
            if (musicState) {
                const currentPosition = musicState.isPlaying && musicState.startTime
                    ? Date.now() - musicState.startTime
                    : musicState.pausedAt || 0;
                user.send({
                    type: 'MUSIC_STATE',
                    payload: {
                        trackId: musicState.trackId,
                        isPlaying: musicState.isPlaying,
                        position: currentPosition,
                        timestamp: Date.now()
                    }
                });
            }
            const message = {
                type: 'ROOM_JOINED',
                payload: { userId, roomId },
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
            // Clean up music state
            delete this.roomMusicStates[roomId];
            const message = {
                type: 'ROOM_CLOSED',
                payload: { roomId },
            };
            this.userManager.broadcast(roomId, message);
        });
    }
    // New music-related methods
    handlePlayMusic(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId, userId, trackId } = payload;
            // Verify user is host
            const room = yield this.prisma.room.findFirst({
                where: { id: roomId, hostId: userId },
            });
            if (!room) {
                throw new Error('Only host can control music');
            }
            const hostUser = yield this.prisma.user.findUnique({
                where: { id: userId },
                select: { spotifyAccessToken: true, spotifyDeviceId: true }
            });
            if (!(hostUser === null || hostUser === void 0 ? void 0 : hostUser.spotifyAccessToken) || !(hostUser === null || hostUser === void 0 ? void 0 : hostUser.spotifyDeviceId)) {
                throw new Error('Host Spotify credentials not found');
            }
            // Set access token for this request
            this.spotify.setAccessToken(hostUser.spotifyAccessToken);
            // Play the track on Spotify
            yield this.spotify.play({
                uris: [`spotify:track:${trackId}`],
                device_id: hostUser.spotifyDeviceId
            });
            // Update music state
            this.roomMusicStates[roomId] = {
                trackId,
                isPlaying: true,
                startTime: Date.now(),
                pausedAt: null,
                spotifyDeviceId: hostUser.spotifyDeviceId
            };
            const message = {
                type: 'MUSIC_UPDATE',
                payload: {
                    type: 'PLAY',
                    trackId,
                    timestamp: Date.now(),
                    roomId
                }
            };
            this.userManager.broadcast(roomId, message);
        });
    }
    handlePauseMusic(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId, userId } = payload;
            // Verify user is host
            const room = yield this.prisma.room.findFirst({
                where: { id: roomId, hostId: userId },
            });
            if (!room) {
                throw new Error('Only host can control music');
            }
            const hostUser = yield this.prisma.user.findUnique({
                where: { id: userId },
                select: { spotifyAccessToken: true }
            });
            if (!(hostUser === null || hostUser === void 0 ? void 0 : hostUser.spotifyAccessToken)) {
                throw new Error('Host Spotify credentials not found');
            }
            // Set access token for this request
            this.spotify.setAccessToken(hostUser.spotifyAccessToken);
            // Pause the track on Spotify
            yield this.spotify.pause();
            const musicState = this.roomMusicStates[roomId];
            if (!musicState) {
                throw new Error('No active music in this room');
            }
            const currentTime = Date.now();
            const elapsedTime = musicState.startTime
                ? currentTime - musicState.startTime
                : 0;
            this.roomMusicStates[roomId] = Object.assign(Object.assign({}, musicState), { isPlaying: false, pausedAt: elapsedTime });
            const message = {
                type: 'MUSIC_UPDATE',
                payload: {
                    type: 'PAUSE',
                    timestamp: currentTime,
                    roomId
                }
            };
            this.userManager.broadcast(roomId, message);
        });
    }
    handleSeekMusic(payload) {
        return __awaiter(this, void 0, void 0, function* () {
            const { roomId, userId, position } = payload;
            // Verify user is host
            const room = yield this.prisma.room.findFirst({
                where: { id: roomId, hostId: userId },
            });
            if (!room) {
                throw new Error('Only host can control music');
            }
            const hostUser = yield this.prisma.user.findUnique({
                where: { id: userId },
                select: { spotifyAccessToken: true }
            });
            if (!(hostUser === null || hostUser === void 0 ? void 0 : hostUser.spotifyAccessToken)) {
                throw new Error('Host Spotify credentials not found');
            }
            // Set access token for this request
            this.spotify.setAccessToken(hostUser.spotifyAccessToken);
            // Seek to position on Spotify (position needs to be in milliseconds)
            yield this.spotify.seek(position);
            const musicState = this.roomMusicStates[roomId];
            if (!musicState) {
                throw new Error('No active music in this room');
            }
            const currentTime = Date.now();
            this.roomMusicStates[roomId] = Object.assign(Object.assign({}, musicState), { startTime: musicState.isPlaying ? currentTime - position : null, pausedAt: musicState.isPlaying ? null : position });
            const message = {
                type: 'MUSIC_UPDATE',
                payload: {
                    type: 'SEEK',
                    position,
                    timestamp: currentTime,
                    roomId
                }
            };
            this.userManager.broadcast(roomId, message);
        });
    }
    // Helper method to get current music position
    getCurrentPosition(roomId) {
        const musicState = this.roomMusicStates[roomId];
        if (!musicState)
            return 0;
        if (musicState.isPlaying && musicState.startTime) {
            return Date.now() - musicState.startTime;
        }
        return musicState.pausedAt || 0;
    }
}
exports.SubscriptionManager = SubscriptionManager;
