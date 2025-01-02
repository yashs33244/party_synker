import { PrismaClient } from '@prisma/client';
import { UserManager } from './UserManager';
import { OutgoingMessage } from './types/out';
import { CloseRoomPayload, CreateRoomPayload, JoinRoomPayload, LeaveRoomPayload, UserMessagePayload } from './types/in';

export class SubscriptionManager {
  constructor(
    private prisma: PrismaClient,
    private userManager: UserManager
  ) {}

  async handleJoinRoom(payload: JoinRoomPayload) {
    const { userId, roomId } = payload;
    const user = this.userManager.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    await this.prisma.usersInRoom.create({
      data: {
        userId,
        roomId,
        joinedAt: new Date(),
      },
    });

    user.addRoom(roomId);
    
    const message: OutgoingMessage = {
      type: 'ROOM_JOINED',
      payload: { userId, roomId },
    };
    
    this.userManager.broadcast(roomId, message);
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

  async handleCreateRoom(payload: CreateRoomPayload) {
    const { hostId, roomName } = payload;
    
    // First verify if the user exists
    const user = await this.prisma.user.findUnique({
      where: { id: hostId }
    });

    if (!user) {
      throw new Error('Host user not found');
    }

    // Create the room with proper host connection
    const room = await this.prisma.room.create({
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
}