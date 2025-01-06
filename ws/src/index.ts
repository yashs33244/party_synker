
  // src/index.ts
  import { createServer } from 'http';
  import { WebSocketServer } from 'ws';
  import { User } from './User';
  import { UserManager } from './UserManager';
  import { SubscriptionManager } from './SubscriptionManager';
  import { IncomingMessage } from './types/in';
  import prisma from '../../shared-db';
import { parse } from 'url';
  
  
  
  const userManager = new UserManager();
  const subscriptionManager = new SubscriptionManager(prisma, userManager);
  
  const server = createServer();
  const wss = new WebSocketServer({ server });
  
  wss.on('connection', async (ws, req) => {
    try {
      // Extract user ID from query parameters
      const { userId } = parse(req.url ?? '', true).query;
      
      if (!userId || Array.isArray(userId)) {
        ws.close(4001, 'User ID is required');
        return;
      }
  
      // Verify if the user exists in the database
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
  
      if (!user) {
        ws.close(4002, 'User not found');
        return;
      }
  
      // Create WebSocket user
      const wsUser = new User(userId.toString(), ws);
      userManager.addUser(wsUser);
  
      console.log(`User ${userId} connected`);
      const activeRoom = await prisma.usersInRoom.findFirst({
        where: {
          userId: userId.toString(),
          leftAt: null
        }
      });
      if (activeRoom) {
        // if already in room don't add user to room
        if(wsUser.getRoom() == activeRoom.roomId){
          console.log('User already in room');
        }

          userManager.addUserToRoom(userId.toString(), activeRoom.roomId);
      }
      
      
      console.log(`User ${userId} connected`);
  
      ws.on('message', async (data: string) => {
        try {
          const message: IncomingMessage = JSON.parse(data);
          console.log('Received message:', message);
          console.log('Users in UserManager after adding:', 
            Array.from(userManager.getUsers().keys())
          );
          
          // broadcast to all users of the room
          
  
          switch (message.type) {
            case 'CREATE_ROOM':
              const room = await subscriptionManager.handleCreateRoom(message.payload);
              console.log('Room created:', room);
              break;
            case 'JOIN_ROOM':
              await subscriptionManager.handleJoinRoom(message.payload);
              break;
            case 'LEAVE_ROOM':
              await subscriptionManager.handleLeaveRoom(message.payload);
              break;
            case 'CLOSE_ROOM':
              await subscriptionManager.handleCloseRoom(message.payload);
              break;
            case 'USER_MESSAGE':
              await subscriptionManager.handleUserMessage(message.payload);
              break;
            case 'GET_USERS':
              await subscriptionManager.handleGetUsers(message.payload);
              break;
          }
        } catch (error:any) {
          console.error('Error processing message:', error);
          wsUser.send({
            type: 'ERROR',
            payload: { message: error.message }
          });
        }
      });
  
      ws.on('close', () => {
        console.log(`User ${userId} disconnected`);
        userManager.removeUser(userId.toString());
      });
  
    } catch (error) {
      console.error('Connection error:', error);
      ws.close(4000, 'Connection error');
    }
  });
  
  const PORT = process.env.PORT || 4000;
  server.listen(PORT, () => {
    console.log(`WebSocket server is running on port ${PORT}`);
  });