export interface IncomingMessage {
  type: 'JOIN_ROOM' | 'LEAVE_ROOM' | 'CREATE_ROOM' | 'CLOSE_ROOM' | 'USER_MESSAGE' | 'MUSIC_STATE_UPDATE' | 'MUSIC_ACTION' | 'GET_USERS';

  payload: any;
}

export interface JoinRoomPayload {
  roomId: string;
  userId: string;
}

export interface LeaveRoomPayload {
  roomId: string;
  userId: string;
}

export interface CreateRoomPayload {
  hostId: string;
  roomName?: string;
}

export interface CloseRoomPayload {
  roomId: string;
  hostId: string;
}

export interface UserMessagePayload {
  roomId: string;
  userId: string;
  message: string;
  messageType?: 'TEXT' | 'ACTION';
  timestamp?: Date;
}