"use client";

import { Button } from "@/components/ui/button";
import { Play, Pause, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IncomingMessage } from "@/types/in";
import { OutgoingMessage } from "@/types/out";

interface MusicPlayerProps {
  songUrl: string;
  roomId: string;
  userId: string;
  isHost?: boolean;
  wsClient: any;
}

export function MusicPlayer({
  wsClient,
  songUrl,
  roomId,
  userId,
  isHost = true,
}: MusicPlayerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState(songUrl);
  const [isLoaded, setIsLoaded] = useState(false);

  // Handle WebSocket music commands
  useEffect(() => {
    if (!audioRef.current) return;

    const handleMessage = (message: OutgoingMessage) => {
      if (message.type === "MUSIC_COMMAND") {
        const { command, songUrl, timestamp } = message.payload;

        if (command === "LOAD" && songUrl) {
          console.log("Loading new song:", songUrl);
          setCurrentSong(songUrl);
          setIsPlaying(false);
          setIsLoaded(false);
          audioRef.current!.currentTime = 0;
        }

        if (command === "PLAY" && timestamp) {
          console.log("Scheduling play at timestamp:", timestamp);
          const delay = timestamp - Date.now();
          if (delay > 0) {
            setTimeout(() => {
              if (audioRef.current) {
                audioRef.current
                  .play()
                  .then(() => setIsPlaying(true))
                  .catch((error) =>
                    console.error("Error playing audio:", error)
                  );
              }
            }, delay);
          }
        }
      }
    };

    const unsubscribe = wsClient.onMessage(handleMessage);
    return () => unsubscribe();
  }, [wsClient]);

  // Handle audio loading
  useEffect(() => {
    if (!audioRef.current) return;

    const handleCanPlayThrough = () => {
      console.log("Audio can play through");
      setIsLoaded(true);

      const message: IncomingMessage = {
        type: "MUSIC_LOADED",
        payload: {
          roomId,
          userId,
        },
      };
      wsClient.send(message);
    };

    const handleEnded = () => {
      console.log("Audio playback ended");
      setIsPlaying(false);
    };

    const handleError = (error: ErrorEvent) => {
      console.error("Audio error:", error);
      setIsLoaded(false);
    };

    const audio = audioRef.current;
    audio.addEventListener("canplaythrough", handleCanPlayThrough);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("canplaythrough", handleCanPlayThrough);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, [roomId, userId, currentSong, wsClient]);

  const handlePlayPause = () => {
    if (!audioRef.current || !isHost) return;

    if (audioRef.current.paused) {
      console.log("Sending play command for song:", currentSong);
      const message: IncomingMessage = {
        type: "MUSIC_PLAY",
        payload: {
          roomId,
          songUrl: currentSong,
        },
      };
      wsClient.send(message);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!isHost) return;

    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // For now using local URL, but you can implement S3 upload here
      const url = URL.createObjectURL(file);
      console.log("New file loaded:", url);
      setCurrentSong(url);
      setIsPlaying(false);
      setIsLoaded(false);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  return (
    <div className="p-4 bg-card rounded-lg shadow-lg">
      <audio
        ref={audioRef}
        src={currentSong}
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="flex items-center gap-4 mb-4">
        {
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePlayPause}
              className="relative"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </Button>

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
        }
      </div>

      <div className="flex flex-col gap-2 text-sm">
        <p className="text-muted-foreground">{"Room Member"}</p>
        <p className="text-muted-foreground">
          Status: {isLoaded ? "Ready" : "Loading..."}
        </p>
        <p className="text-muted-foreground text-xs truncate">
          Now playing: {currentSong}
        </p>
      </div>
    </div>
  );
}
