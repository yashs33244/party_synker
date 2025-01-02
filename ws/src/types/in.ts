// src/types/in.ts
export type IncomingMessage = {
  type: 'CREATE_ROOM' | 'JOIN_ROOM' | 'LEAVE_ROOM' | 'CLOSE_ROOM' | 'USER_MESSAGE' | 
        'PLAY_MUSIC' | 'PAUSE_MUSIC' | 'SEEK_MUSIC';
  payload: CreateRoomPayload | JoinRoomPayload | LeaveRoomPayload | CloseRoomPayload | 
          UserMessagePayload | PlayMusicPayload | PauseMusicPayload | SeekMusicPayload;
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
    messageType?: 'TEXT' | 'ACTION'; // can be extended for different message types
    timestamp?: Date;
  }


  // types/in.ts

export interface PlayMusicPayload {
  roomId: string;
  userId: string;
  trackId: string;
}

export interface PauseMusicPayload {
  roomId: string;
  userId: string;
}

export interface SeekMusicPayload {
  roomId: string;
  userId: string;
  position: number; // in milliseconds
}

// Update your IncomingMessage type to include these new message types

export interface MusicState {
  trackId: string | null;
  isPlaying: boolean;
  startTime: number | null;
  pausedAt: number | null;
}

export interface MusicRoom {
  id: string;
  hostId: string;
  musicState: MusicState;
}

// Add these to your existing IncomingMessage type
export interface MusicPayloads {
  PLAY_TRACK: {
    roomId: string;
    trackId: string;
    userId: string;
  };
  PAUSE_TRACK: {
    roomId: string;
    userId: string;
  };
  SEEK_TRACK: {
    roomId: string;
    userId: string;
    position: number;
  };
}

// Update your existing types/in.ts to include these message types
export type MusicMessageType = 'PLAY_TRACK' | 'PAUSE_TRACK' | 'SEEK_TRACK';