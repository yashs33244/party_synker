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
exports.MusicManager = void 0;
class MusicManager {
    constructor(prisma, userManager) {
        this.rooms = new Map();
        this.prisma = prisma;
        this.userManager = userManager;
    }
    initializeRoom(roomId, hostId) {
        const initialMusicState = {
            trackId: null,
            isPlaying: false,
            startTime: null,
            pausedAt: null
        };
        const musicRoom = {
            id: roomId,
            hostId,
            musicState: initialMusicState
        };
        this.rooms.set(roomId, musicRoom);
    }
    handlePlayTrack(roomId, userId, trackId) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = this.rooms.get(roomId);
            if (!room) {
                throw new Error('Room not found');
            }
            if (room.hostId !== userId) {
                throw new Error('Only host can control music');
            }
            room.musicState = {
                trackId,
                isPlaying: true,
                startTime: Date.now(),
                pausedAt: null
            };
            // Broadcast to all users in the room
            const usersInRoom = yield this.prisma.roomMember.findMany({
                where: { roomId }
            });
            usersInRoom.forEach((member) => {
                const user = this.userManager.getUser(member.userId);
                if (user) {
                    user.send({
                        type: 'MUSIC_UPDATE',
                        payload: {
                            type: 'PLAY',
                            trackId,
                            timestamp: room.musicState.startTime,
                            roomId
                        }
                    });
                }
            });
        });
    }
    handlePauseTrack(roomId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = this.rooms.get(roomId);
            if (!room) {
                throw new Error('Room not found');
            }
            if (room.hostId !== userId) {
                throw new Error('Only host can control music');
            }
            const currentTime = Date.now();
            const elapsedTime = room.musicState.startTime
                ? currentTime - room.musicState.startTime
                : 0;
            room.musicState = Object.assign(Object.assign({}, room.musicState), { isPlaying: false, pausedAt: elapsedTime });
            const usersInRoom = yield this.prisma.roomMember.findMany({
                where: { roomId }
            });
            usersInRoom.forEach((member) => {
                const user = this.userManager.getUser(member.id);
                if (user) {
                    user.send({
                        type: 'MUSIC_UPDATE',
                        payload: {
                            type: 'PAUSE',
                            timestamp: currentTime,
                            roomId
                        }
                    });
                }
            });
        });
    }
    handleSeekTrack(roomId, userId, position) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = this.rooms.get(roomId);
            if (!room) {
                throw new Error('Room not found');
            }
            if (room.hostId !== userId) {
                throw new Error('Only host can control music');
            }
            const currentTime = Date.now();
            room.musicState.startTime = currentTime - position;
            const usersInRoom = yield this.prisma.roomMember.findMany({
                where: { roomId }
            });
            usersInRoom.forEach((member) => {
                const user = this.userManager.getUser(member.id);
                if (user) {
                    user.send({
                        type: 'MUSIC_UPDATE',
                        payload: {
                            type: 'SEEK',
                            position,
                            timestamp: currentTime,
                            roomId
                        }
                    });
                }
            });
        });
    }
    sendCurrentState(roomId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const room = this.rooms.get(roomId);
            if (!room) {
                throw new Error('Room not found');
            }
            const user = this.userManager.getUser(userId);
            if (!user) {
                throw new Error('User not found');
            }
            const currentTime = Date.now();
            const position = room.musicState.isPlaying && room.musicState.startTime
                ? currentTime - room.musicState.startTime
                : room.musicState.pausedAt || 0;
            user.send({
                type: 'MUSIC_STATE',
                payload: {
                    trackId: room.musicState.trackId,
                    isPlaying: room.musicState.isPlaying,
                    position,
                    timestamp: currentTime,
                    roomId,
                    isHost: room.hostId === userId
                }
            });
        });
    }
    removeRoom(roomId) {
        this.rooms.delete(roomId);
    }
}
exports.MusicManager = MusicManager;
