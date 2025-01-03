export interface MusicState {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;
    songUrl: string | null;
  }
  
  export interface MusicAction {
    type: 'PLAY' | 'PAUSE' | 'SEEK' | 'VOLUME' | 'LOAD_SONG';
    payload: {
      currentTime?: number;
      volume?: number;
      songUrl?: string;
    };
  }
  
  export interface MusicMessage {
    type: 'MUSIC_ACTION' | 'MUSIC_STATE_UPDATE';
    payload: MusicAction | MusicState;
  }