import { PrismaClient } from '@prisma/client';
import { UserManager } from './UserManager';
import { OutgoingMessage } from './types/out';
import { CloseRoomPayload, CreateRoomPayload, JoinRoomPayload, LeaveRoomPayload, UserMessagePayload } from './types/in';

export class SubscriptionManager {
  constructor(
    private prisma: PrismaClient,
    private userManager: UserManager
  ) {}

  async handleLeaveRoom(payload: LeaveRoomPayload) {
    const { userId, roomId } = payload;
    const user = this.userManager.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    
    // delete users in room

    this.userManager.removeUserFromRoom(userId, roomId);
    
    const message: OutgoingMessage = {
      type: 'ROOM_LEFT',
      payload: { userId, roomId },
    };
    
    this.userManager.broadcast(roomId, message);
  }

  async handleCreateRoom(payload: CreateRoomPayload) {
    const { hostId, roomName } = payload;
    
    const user = await this.prisma.user.findUnique({
      where: { id: hostId }
    });
  
    if (!user) {
      throw new Error('Host user not found');
    }
  
    const room = await this.prisma.room.create({
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
  }
  
  async handleJoinRoom(payload: JoinRoomPayload) {
    const { userId, roomId } = payload;
    const user = this.userManager.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
  
    const room = await this.prisma.room.findUnique({
      where: { id: roomId }
    });
  
    if (!room) {
      throw new Error('Room not found');
    }
  
    const existingUserInRoom = await this.prisma.usersInRoom.findUnique({
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
  
    await this.prisma.usersInRoom.upsert({
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
    
    const message: OutgoingMessage = {
      type: 'ROOM_JOINED',
      payload: { 
        userId, 
        roomId,
        userName: (await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true }
        }))?.name 
      },
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

    const message: OutgoingMessage = {
      type: 'ROOM_CLOSED',
      payload: { roomId },
    };
    
    this.userManager.broadcast(roomId, message);
  }

  async handleUserMessage(payload: UserMessagePayload) {
    const { roomId, userId, message, messageType = 'TEXT' } = payload;
    
    const user = this.userManager.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

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
      await this.prisma.usersInRoom.delete({
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

    const savedMessage = await this.prisma.message.create({
      data: {
        content: message,
        type: messageType,
        userId,
        roomId,
      }
    });

    const outgoingMessage: OutgoingMessage = {
      type: 'USER_MESSAGE',
      payload: {
        roomId,
        userId,
        message,
        messageType,
        timestamp: new Date().toISOString(),
        userName: (await this.prisma.user.findUnique({
          where: { id: userId },
          select: { name: true }
        }))?.name
      }
    };

    console.log('Current users in UserManager:', 
      Array.from(this.userManager.getUsers().keys())
    );

    this.userManager.broadcast(roomId, outgoingMessage, userId);

    user.send({
      type: 'MESSAGE_SENT',
      payload: {
        messageId: savedMessage.id,
        timestamp: new Date().toISOString()
      }
    });

    return outgoingMessage;
  }

  async handleGetUsers(payload: { roomId: string }) {
    const { roomId } = payload;
    const users = await this.prisma.usersInRoom.findMany({
      where: { roomId },
      select: { userId: true }
    });

    return users.map((u:any) => u.userId);
  }
}