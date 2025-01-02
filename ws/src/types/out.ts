
  

  export interface OutgoingMessage {
    type: 'ROOM_JOINED' | 'ROOM_LEFT' | 'ROOM_CREATED' | 'ROOM_CLOSED' | 'USER_MESSAGE' | 'ERROR' | 'USER_JOINED' | 
      'USER_LEFT' | 'MESSAGE_SENT' | 'MUSIC_UPDATE' | 'MUSIC_STATE';
    payload: any;
  }
