"use client";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, Upload } from "lucide-react";
import { useRef } from "react";
import { useMusicSync } from "@/hooks/useMusicSync";

interface MusicPlayerProps {
  isHost: boolean;
  roomId: string;
  userId: string;
}

export function MusicPlayer({ isHost, roomId, userId }: MusicPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { audioRef, musicState, sendMusicAction } = useMusicSync(
    isHost,
    roomId,
    userId
  );

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (audioRef.current.paused) {
      audioRef.current.play();
      sendMusicAction({ type: "PLAY", payload: {} });
    } else {
      audioRef.current.pause();
      sendMusicAction({ type: "PAUSE", payload: {} });
    }
  };

  const handleVolumeChange = (value: number) => {
    if (!audioRef.current) return;
    audioRef.current.volume = value;
    sendMusicAction({ type: "VOLUME", payload: { volume: value } });
  };

  const handleSeek = (value: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    sendMusicAction({ type: "SEEK", payload: { currentTime: value } });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !audioRef.current) return;

    const url = URL.createObjectURL(file);
    audioRef.current.src = url;
    sendMusicAction({ type: "LOAD_SONG", payload: { songUrl: url } });
  };

  return (
    <div className="p-4 bg-card rounded-lg shadow-lg">
      <audio ref={audioRef} />

      <div className="flex items-center gap-4 mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePlayPause}
          disabled={!isHost}
        >
          {musicState.isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </Button>

        <div className="flex-1">
          <Slider
            value={[musicState.currentTime]}
            max={musicState.duration}
            step={1}
            onValueChange={([value]) => handleSeek(value)}
            disabled={!isHost}
          />
        </div>

        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4" />
          <Slider
            value={[musicState.volume]}
            max={1}
            step={0.1}
            className="w-24"
            onValueChange={([value]) => handleVolumeChange(value)}
            disabled={!isHost}
          />
        </div>

        {isHost && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="audio/*"
              className="hidden"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
