
  

  export interface OutgoingMessage {
    type: 'ROOM_JOINED' | 'ROOM_LEFT' | 'ROOM_CREATED' | 'ROOM_CLOSED' | 'USER_MESSAGE' | 'ERROR' | 'USER_JOINED' | 'USER_LEFT' | 'MESSAGE_SENT' | 'MUSIC_COMMAND';
    payload: any;
  }

  export interface MusicCommandPayload {
    command: 'LOAD' | 'PLAY';
    songUrl?: string;
    timestamp?: number;
  }
  
