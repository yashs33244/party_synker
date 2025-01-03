"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export interface OutgoingMessage {
  type:
    | "ROOM_JOINED"
    | "ROOM_LEFT"
    | "ROOM_CREATED"
    | "ROOM_CLOSED"
    | "USER_MESSAGE"
    | "ERROR"
    | "USER_JOINED"
    | "USER_LEFT"
    | "MESSAGE_SENT"
    | "ROOM_HISTORY";
  payload: any;
}

// src/types/in.ts
export interface IncomingMessage {
  type:
    | "JOIN_ROOM"
    | "LEAVE_ROOM"
    | "CREATE_ROOM"
    | "CLOSE_ROOM"
    | "USER_MESSAGE";
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
  messageType?: "TEXT" | "ACTION"; // can be extended for different message types
  timestamp?: Date;
}

export default function LobbyPage() {
  const [roomId, setRoomId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userid");

  const handleServerMessage = useCallback(
    (data: OutgoingMessage) => {
      console.log("Received message:", data);

      switch (data.type) {
        case "ROOM_CREATED":
          setLoading(false);
          if (data.payload.roomId) {
            router.push(`/room?id=${data.payload.roomId}&userid=${userId}`);
          } else {
            setError("Invalid room ID received");
          }
          break;
        case "USER_JOINED":
        case "ROOM_JOINED":
          setLoading(false);
          if (data.payload.roomId) {
            router.push(`/room?id=${data.payload.roomId}&userid=${userId}`);
          } else {
            setError("Invalid room ID received");
          }
          break;
        case "ERROR":
          setLoading(false);
          setError(data.payload.message);
          break;
        default:
          console.log("Unhandled message type:", data.type);
      }
    },
    [userId, router]
  );

  useEffect(() => {
    if (!userId) {
      setError("User ID is required");
      return;
    }

    let wsConnection: WebSocket;
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      wsConnection = new WebSocket(`ws://localhost:4000?userId=${userId}`);

      wsConnection.onopen = () => {
        console.log("Connected to WebSocket server");
        setWs(wsConnection);
        setIsConnected(true);
        setError(null);
      };

      wsConnection.onmessage = (event) => {
        try {
          const data: OutgoingMessage = JSON.parse(event.data);
          handleServerMessage(data);
        } catch (err) {
          console.error("Error processing message:", err);
          setError("Failed to process server response");
          setLoading(false);
        }
      };

      wsConnection.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Failed to connect to server");
        setLoading(false);
        setIsConnected(false);
      };

      wsConnection.onclose = () => {
        console.log("Disconnected from WebSocket server");
        setIsConnected(false);
        setWs(null);

        // Attempt to reconnect after 3 seconds
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [userId, handleServerMessage]);

  const createRoom = async () => {
    if (!ws || !isConnected || !userId) return;
    setLoading(true);
    setError(null);

    const createRoomMessage = {
      type: "CREATE_ROOM",
      payload: {
        hostId: userId,
        roomName:
          roomName.trim() || `Room-${Math.random().toString(36).substr(2, 6)}`,
      },
    };

    try {
      ws.send(JSON.stringify(createRoomMessage));
    } catch (err) {
      console.error("Error sending create room message:", err);
      setError("Failed to create room");
      setLoading(false);
    }
  };

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ws || !isConnected || !roomId.trim() || !userId) return;
    setLoading(true);
    setError(null);

    const joinRoomMessage = {
      type: "JOIN_ROOM",
      payload: {
        userId: userId,
        roomId: roomId.trim(),
      },
    };

    try {
      ws.send(JSON.stringify(joinRoomMessage));
    } catch (err) {
      console.error("Error sending join room message:", err);
      setError("Failed to join room");
      setLoading(false);
    }
  };

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl">User ID is required to access this page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 flex flex-col items-center justify-center text-white">
      <h1 className="text-3xl font-bold mb-8">Party Synker Lobby</h1>

      {!isConnected && (
        <div className="mb-4 text-yellow-300 bg-yellow-900/50 px-4 py-2 rounded">
          Connecting to server...
        </div>
      )}

      {error && (
        <div className="mb-4 text-red-300 bg-red-900/50 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <div className="space-y-4 w-full max-w-md px-4">
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Room Name (optional)"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full px-4 py-2 rounded text-black"
            disabled={loading || !isConnected}
          />
          <button
            onClick={createRoom}
            disabled={loading || !isConnected}
            className="w-full bg-white text-purple-600 px-6 py-2 rounded font-semibold hover:bg-opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create a Room"}
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-transparent text-white">or</span>
          </div>
        </div>

        <form onSubmit={joinRoom} className="space-y-2">
          <input
            type="text"
            placeholder="Enter Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full px-4 py-2 rounded text-black"
            disabled={loading || !isConnected}
          />
          <button
            type="submit"
            disabled={loading || !isConnected || !roomId.trim()}
            className="w-full bg-white text-purple-600 px-4 py-2 rounded font-semibold hover:bg-opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Joining..." : "Join Room"}
          </button>
        </form>
      </div>
    </div>
  );
}
