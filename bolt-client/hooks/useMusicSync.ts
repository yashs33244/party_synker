"use client";

import { useEffect, useRef, useState } from 'react';
import { MusicState, MusicAction } from '../types/music';
import { wsClient } from '@/lib/websocket';

export function useMusicSync(isHost: boolean, roomId: string, userId: string) {
  const [musicState, setMusicState] = useState<MusicState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    songUrl: null,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const syncIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!audioRef.current) return;

    const audio = audioRef.current;

    const handleTimeUpdate = () => {
      if (isHost) {
        wsClient.send({
          type: 'MUSIC_STATE_UPDATE',
          payload: {
            isPlaying: !audio.paused,
            currentTime: audio.currentTime,
            duration: audio.duration,
            volume: audio.volume,
            songUrl: audio.src,
          },
        });
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => audio.removeEventListener('timeupdate', handleTimeUpdate);
  }, [isHost]);

  useEffect(() => {
    wsClient.onMessage((message) => {
      if (message.type === 'MUSIC_STATE_UPDATE' && !isHost) {
        const newState = message.payload as MusicState;
        setMusicState(newState);
        
        if (audioRef.current) {
          const audio = audioRef.current;
          audio.currentTime = newState.currentTime;
          audio.volume = newState.volume;
          
          if (newState.isPlaying && audio.paused) {
            audio.play();
          } else if (!newState.isPlaying && !audio.paused) {
            audio.pause();
          }
        }
      }
    });
  }, [isHost]);

  const sendMusicAction = (action: MusicAction) => {
    if (isHost) {
      wsClient.send({
        type: 'MUSIC_ACTION',
        payload: action,
      });
    }
  };

  return {
    audioRef,
    musicState,
    sendMusicAction,
  };
}