import { OutgoingMessage } from './types/out';
import { User } from './User';

export class UserManager {
  private users: Map<string, User> = new Map();
  private rooms: Map<string, Set<User>> = new Map();

  addUser(user: User) {
    this.users.set(user.id, user);
  }

  removeUser(userId: string) {
    const user = this.users.get(userId);
    if (user) {
      const roomId = user.getRoom();
      if (roomId) {
        this.removeUserFromRoom(userId, roomId);
      }
    }
    this.users.delete(userId);
  }

  addUserToRoom(userId: string, roomId: string) {
    const user = this.users.get(userId);
    if (!user) return;

    // Initialize room if it doesn't exist
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }

    const roomUsers = this.rooms.get(roomId);
    if (roomUsers) {
      user.addRoom(roomId);
      roomUsers.add(user);
      console.log(`Added user ${userId} to room ${roomId}. Room users:`, 
        Array.from(roomUsers).map(u => u.id)
      );
    }
  }

  removeUserFromRoom(userId: string, roomId: string) {
    const user = this.users.get(userId);
    if (!user) return;

    const roomUsers = this.rooms.get(roomId);
    if (roomUsers) {
      user.removeRoom(roomId);
      roomUsers.delete(user);
      console.log(`Removed user ${userId} from room ${roomId}. Room users:`, 
        Array.from(roomUsers).map(u => u.id)
      );
      
      // Clean up empty rooms
      if (roomUsers.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getUsers() {
    return this.users;
  }

  getRoomUsers(roomId: string): Set<User> {
    return this.rooms.get(roomId) || new Set();
  }

  broadcast(roomId: string, message: OutgoingMessage, excludeUserId?: string) {
    console.log(`Broadcasting to room ${roomId}. Users in manager:`, Array.from(this.users.keys()));
    const roomUsers = this.rooms.get(roomId);
    console.log(`Users in room ${roomId}:`, Array.from(roomUsers || []).map(u => u.id));
    
    if (roomUsers) {
      roomUsers.forEach(user => {
        console.log(`Checking user ${user.id} in room ${roomId}`);
        if (user.id !== excludeUserId) {
          console.log(`Sending to user ${user.id} in room ${roomId}`);
          user.send(message);
        } else {
          console.log(`ExcludeUserId: ${excludeUserId}`);
        }
      });
    }
  }
}