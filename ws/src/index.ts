

  import { createServer } from 'http';
  import { WebSocketServer } from 'ws';
  import { User } from './User';
  import { UserManager } from './UserManager';
  import { SubscriptionManager } from './SubscriptionManager';
  import { CloseRoomPayload, CreateRoomPayload, IncomingMessage, JoinRoomPayload, LeaveRoomPayload, PauseMusicPayload, PlayMusicPayload, SeekMusicPayload, UserMessagePayload } from './types/in';
  import prisma from '../../shared-db';
  import { parse } from 'url';
  
  
  
  const userManager = new UserManager();
  const config = {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
    redirectUri: process.env.SPOTIFY_REDIRECT_URI || ''
  }
  const subscriptionManager = new SubscriptionManager(prisma, userManager,config);
  
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
  
      ws.on('message', async (data: string) => {
        try {
          const message:IncomingMessage = JSON.parse(data);
          console.log('Received message:', message);
  
          switch (message.type) {
            case 'CREATE_ROOM':
              const room = await subscriptionManager.handleCreateRoom(message.payload as CreateRoomPayload);
              console.log('Room created:', room);
              break;
            case 'JOIN_ROOM':
              await subscriptionManager.handleJoinRoom(message.payload as JoinRoomPayload);
              break;
            case 'LEAVE_ROOM':
              await subscriptionManager.handleLeaveRoom(message.payload as LeaveRoomPayload);
              break;
            case 'CLOSE_ROOM':
              await subscriptionManager.handleCloseRoom(message.payload as CloseRoomPayload);
              break;
            case 'USER_MESSAGE':
              await subscriptionManager.handleUserMessage(message.payload as UserMessagePayload);
              break;
            case 'PLAY_MUSIC':
              await subscriptionManager.handlePlayMusic(message.payload as PlayMusicPayload);
              break;
            case 'PAUSE_MUSIC':
              await subscriptionManager.handlePauseMusic(message.payload as PauseMusicPayload);
              break;
            case 'SEEK_MUSIC':
              await subscriptionManager.handleSeekMusic(message.payload as SeekMusicPayload);
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
  
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`WebSocket server is running on port ${PORT}`);
  });