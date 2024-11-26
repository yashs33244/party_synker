import React, { useState, useEffect, useRef } from 'react';
import './Player.css';
import io from 'socket.io-client';

const socket = io('http://10.0.6.18:5000/');

const Player = () => {
  const [users, setUsers] = useState([]);
  const [audioURL, setAudioURL] = useState(null);
  const audioRef = useRef(null);
  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const [canSyncPlay, setCanSyncPlay] = useState(false);

  const manageClick = () => {
    const selectedSong = 'your_song_file.mp3'; // Update with the actual song file name
    socket.emit('select_song', selectedSong);
    console.log(`Requested file: ${selectedSong}`);
  };

  const syncPlay = () => {
    socket.emit('request_time');
    console.log("Time synchronization requested");
  };

  useEffect(() => {
    const performClockSync = () => {
      const samples = [];
      const numSamples = 5; // Increase the number of samples for better precision

      const sampleClock = () => {
        if (samples.length >= numSamples) {
          const avgOffset = samples.reduce((a, b) => a + b, 0) / samples.length;
          setServerTimeOffset(avgOffset);
          return;
        }

        const start = Date.now();
        socket.emit('sync_clock', start, (serverTime) => {
          const end = Date.now();
          const roundTripTime = end - start;
          const estimatedServerTime = serverTime + roundTripTime / 2;
          const offset = estimatedServerTime - end;
          samples.push(offset);

          setTimeout(sampleClock, 100); // Small delay between samples
        });
      };

      sampleClock();
    };

    socket.on('connect', performClockSync);
    const intervalId = setInterval(performClockSync, 60000); // Re-sync every minute

    return () => {
      clearInterval(intervalId);
      socket.off('connect', performClockSync);
    };
  }, []);

  useEffect(() => {
    socket.on('song_url', (url) => {
      setAudioURL(url);
      console.log(`Received song URL: ${url}`);
    });

    return () => {
      socket.off('song_url'); // Cleanup the event listener
    };
  }, []);

  useEffect(() => {
    const playAudioAtTime = (delayedTime) => {
      const clientPlayTime = delayedTime - serverTimeOffset;
      const now = Date.now();
      const timeToWait = clientPlayTime - now;

      // Compensate for network jitter by adding a buffer
      const jitterBuffer = 50; // Add a small buffer in milliseconds

      const play = () => {
        if (audioRef.current) {
          audioRef.current.play();
          // Send playback start time to server
          socket.emit('playback_started', Date.now());
        }
      };

      if (timeToWait > jitterBuffer) {
        setTimeout(play, timeToWait - jitterBuffer);
      } else {
        play();
      }
    };

    socket.on('time_to_play_at', (delayedTime) => {
      console.log("Requested time to play at (server time):", delayedTime);
      playAudioAtTime(delayedTime); // Schedule playback to start at delayed_time
    });

    return () => {
      socket.off('time_to_play_at'); // Cleanup the event listener
    };
  }, [serverTimeOffset]);

  // Updating connected users...
  useEffect(() => {
    socket.on('users', (users) => {
      setUsers(users);
    });

    return () => {
      socket.off('users'); // Cleanup the event listener
    };
  }, []);

  // Track audio loading progress
  const handleProgress = () => {
    const audio = audioRef.current;
  
    if (audio) {
   
      const buffered = audio.buffered;
      if (buffered.length > 0) {
        setCanSyncPlay(false)
        const percentLoaded = (buffered.end(0) / audio.duration) * 100;
        console.log(`Audio loaded: ${percentLoaded.toFixed(2)}%`);
        if (percentLoaded < 20)
        setCanSyncPlay(false);
        if (percentLoaded >= 20) {
          setCanSyncPlay(true);
        }
      }
    }
  };

  return (
    <div className="player-container">
      <div className='text'>
        <span className="fancy">{users.length / 2} </span> USERS CONNECTED!
      </div>
      {audioURL && (
        <audio ref={audioRef} controls src={audioURL} preload="auto" onProgress={handleProgress}></audio>
      )}
      {canSyncPlay && (
        <button className='button' onClick={syncPlay} disabled={!canSyncPlay}>
          PLAY IN SYNC
        </button>
      )}
    </div>
  );
};

export default Player;
