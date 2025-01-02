  // src/UserManager.ts
import { OutgoingMessage } from './types/out';
import { User } from './User';
  
  export class UserManager {
    private users: Map<string, User> = new Map();
  
    addUser(user: User) {
      this.users.set(user.id, user);
    }
  
    removeUser(userId: string) {
      this.users.delete(userId);
    }
  
    getUser(userId: string): User | undefined {
      return this.users.get(userId);
    }
  
    broadcast(roomId: string, message: OutgoingMessage, excludeUserId?: string) {
      this.users.forEach((user) => {
        if (user.isInRoom(roomId) && user.id !== excludeUserId) {
          user.send(message);
        }
      });
    }
  }