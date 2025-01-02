import { User } from './User';
import { UserManager } from './UserManager';
import { MusicRoom, MusicState } from './types/in';
import { PrismaClient } from '@prisma/client';

export class MusicManager {
    private rooms: Map<string, MusicRoom>;
    private userManager: UserManager;
    private prisma: PrismaClient;
  
    constructor(prisma: PrismaClient, userManager: UserManager) {
      this.rooms = new Map();
      this.prisma = prisma;
      this.userManager = userManager;
    }
  
    public initializeRoom(roomId: string, hostId: string) {
      const initialMusicState: MusicState = {
        trackId: null,
        isPlaying: false,
        startTime: null,
        pausedAt: null
      };
  
      const musicRoom: MusicRoom = {
        id: roomId,
        hostId,
        musicState: initialMusicState
      };
  
      this.rooms.set(roomId, musicRoom);
    }
  
    public async handlePlayTrack(roomId: string, userId: string, trackId: string) {
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
      const usersInRoom = await this.prisma.roomMember.findMany({
        where: { roomId }
      });
  
      usersInRoom.forEach((member:any) => {
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
    }
  
    public async handlePauseTrack(roomId: string, userId: string) {
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
  
      room.musicState = {
        ...room.musicState,
        isPlaying: false,
        pausedAt: elapsedTime
      };
  
      const usersInRoom = await this.prisma.roomMember.findMany({
        where: { roomId }
      });
  
      usersInRoom.forEach((member:User) => {
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
    }
  
    public async handleSeekTrack(roomId: string, userId: string, position: number) {
      const room = this.rooms.get(roomId);
      if (!room) {
        throw new Error('Room not found');
      }
  
      if (room.hostId !== userId) {
        throw new Error('Only host can control music');
      }
  
      const currentTime = Date.now();
      room.musicState.startTime = currentTime - position;
  
      const usersInRoom = await this.prisma.roomMember.findMany({
        where: { roomId }
      });
  
      usersInRoom.forEach((member:User) => {
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
    }
  
    public async sendCurrentState(roomId: string, userId: string) {
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
    }
  
    public removeRoom(roomId: string) {
      this.rooms.delete(roomId);
    }
  }