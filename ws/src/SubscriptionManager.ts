import { PrismaClient } from '@prisma/client';
import { UserManager } from './UserManager';
import { OutgoingMessage } from './types/out';
import SpotifyWebApi from 'spotify-web-api-node';
import { CloseRoomPayload, CreateRoomPayload, JoinRoomPayload, LeaveRoomPayload, PauseMusicPayload, PlayMusicPayload, SeekMusicPayload, UserMessagePayload } from './types/in';

export class SubscriptionManager {
  private roomMusicStates: { [roomId: string]: { trackId: string | null, 
                                                  isPlaying: boolean, 
                                                  startTime: number | null, 
                                                  pausedAt: number | null,
                                                  spotifyDeviceId?: string  } 
                                                } = {};

  private spotify: SpotifyWebApi;
  constructor(
    private prisma: PrismaClient,
    private userManager: UserManager,
    spotifyConfig: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    }
  ) {
    this.spotify = new SpotifyWebApi(spotifyConfig);
  }

  async handleLeaveRoom(payload: LeaveRoomPayload) {
    const { userId, roomId } = payload;
    const user = this.userManager.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await this.prisma.usersInRoom.update({
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
    
    const message: OutgoingMessage = {
      type: 'ROOM_LEFT',
      payload: { userId, roomId },
    };
    
    this.userManager.broadcast(roomId, message);
  }


  async handleUserMessage(payload: UserMessagePayload) {
    const { roomId, userId, message, messageType = 'TEXT' } = payload;
    
    // Verify user exists
    const user = this.userManager.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify user is in the room
    const userInRoom = await this.prisma.usersInRoom.findUnique({
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
    
    const savedMessage = await this.prisma.message.create({
      data: {
        content: message,
        type: messageType,
        userId,
        roomId,
      }
    });
    

    // Prepare the outgoing message
    const outgoingMessage: OutgoingMessage = {
      type: 'USER_MESSAGE',
      payload: {
        roomId,
        userId,
        message,
        messageType,
        timestamp: new Date().toISOString(),
        // You might want to include additional user info
        userName: (await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true }
        }))?.name
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
  }

  async handleCreateRoom(payload: CreateRoomPayload) {
    const room = await this.prisma.room.create({
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
  }

  async handleJoinRoom(payload: JoinRoomPayload) {
    const { userId, roomId } = payload;
    const user = this.userManager.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Join room logic
    await this.prisma.usersInRoom.create({
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
    
    const message: OutgoingMessage = {
      type: 'ROOM_JOINED',
      payload: { userId, roomId },
    };
    
    this.userManager.broadcast(roomId, message);
  }

  async handleCloseRoom(payload: CloseRoomPayload) {
    const { roomId, hostId } = payload;
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, hostId },
    });

    if (!room) {
      throw new Error('Room not found or user is not the host');
    }

    await this.prisma.room.update({
      where: { id: roomId },
      data: { closedAt: new Date() },
    });

    // Clean up music state
    delete this.roomMusicStates[roomId];

    const message: OutgoingMessage = {
      type: 'ROOM_CLOSED',
      payload: { roomId },
    };
    
    this.userManager.broadcast(roomId, message);
  }

  // New music-related methods
  async handlePlayMusic(payload: PlayMusicPayload) {
    const { roomId, userId, trackId } = payload;

    // Verify user is host
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, hostId: userId },
    });

    if (!room) {
      throw new Error('Only host can control music');
    }

    const hostUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { spotifyAccessToken: true, spotifyDeviceId: true }
    });

    if (!hostUser?.spotifyAccessToken || !hostUser?.spotifyDeviceId) {
      throw new Error('Host Spotify credentials not found');
    }

    // Set access token for this request
    this.spotify.setAccessToken(hostUser.spotifyAccessToken);

    // Play the track on Spotify
    await this.spotify.play({
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

    const message: OutgoingMessage = {
      type: 'MUSIC_UPDATE',
      payload: {
        type: 'PLAY',
        trackId,
        timestamp: Date.now(),
        roomId
      }
    };

    this.userManager.broadcast(roomId, message);
  }


  async handlePauseMusic(payload: PauseMusicPayload) {
    const { roomId, userId } = payload;

    // Verify user is host
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, hostId: userId },
    });

    if (!room) {
      throw new Error('Only host can control music');
    }

    const hostUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { spotifyAccessToken: true }
    });

    if (!hostUser?.spotifyAccessToken) {
      throw new Error('Host Spotify credentials not found');
    }

    // Set access token for this request
    this.spotify.setAccessToken(hostUser.spotifyAccessToken);

    // Pause the track on Spotify
    await this.spotify.pause();

    const musicState = this.roomMusicStates[roomId];
    if (!musicState) {
      throw new Error('No active music in this room');
    }

    const currentTime = Date.now();
    const elapsedTime = musicState.startTime 
      ? currentTime - musicState.startTime 
      : 0;

    this.roomMusicStates[roomId] = {
      ...musicState,
      isPlaying: false,
      pausedAt: elapsedTime
    };

    const message: OutgoingMessage = {
      type: 'MUSIC_UPDATE',
      payload: {
        type: 'PAUSE',
        timestamp: currentTime,
        roomId
      }
    };

    this.userManager.broadcast(roomId, message);
  }

  async handleSeekMusic(payload: SeekMusicPayload) {
    const { roomId, userId, position } = payload;

    // Verify user is host
    const room = await this.prisma.room.findFirst({
      where: { id: roomId, hostId: userId },
    });

    if (!room) {
      throw new Error('Only host can control music');
    }

    const hostUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { spotifyAccessToken: true }
    });

    if (!hostUser?.spotifyAccessToken) {
      throw new Error('Host Spotify credentials not found');
    }

    // Set access token for this request
    this.spotify.setAccessToken(hostUser.spotifyAccessToken);

    // Seek to position on Spotify (position needs to be in milliseconds)
    await this.spotify.seek(position);

    const musicState = this.roomMusicStates[roomId];
    if (!musicState) {
      throw new Error('No active music in this room');
    }

    const currentTime = Date.now();
    
    this.roomMusicStates[roomId] = {
      ...musicState,
      startTime: musicState.isPlaying ? currentTime - position : null,
      pausedAt: musicState.isPlaying ? null : position
    };

    const message: OutgoingMessage = {
      type: 'MUSIC_UPDATE',
      payload: {
        type: 'SEEK',
        position,
        timestamp: currentTime,
        roomId
      }
    };

    this.userManager.broadcast(roomId, message);
  }

  // Helper method to get current music position
  private getCurrentPosition(roomId: string): number {
    const musicState = this.roomMusicStates[roomId];
    if (!musicState) return 0;

    if (musicState.isPlaying && musicState.startTime) {
      return Date.now() - musicState.startTime;
    }
    return musicState.pausedAt || 0;
  }

}