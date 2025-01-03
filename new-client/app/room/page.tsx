"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { OutgoingMessage } from "../lobby/page";

export interface UserMessagePayload {
  roomId: string;
  userId: string;
  message: string;
  messageType?: "TEXT" | "ACTION";
  timestamp?: Date;
}

interface Message {
  userId: string;
  content: string;
  userName?: string;
  timestamp: string;
}

export default function RoomPage() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("id");
  const userId = searchParams.get("userid");
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [currentTrack, setCurrentTrack] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !roomId) {
      router.push("/lobby");
      return;
    }

    const wsConnection = new WebSocket(`ws://localhost:4000?userId=${userId}`);

    wsConnection.onopen = () => {
      console.log("Connected to WebSocket server");
      setWs(wsConnection);
      setIsConnected(true);
      setError(null);

      const joinRoomMessage = {
        type: "JOIN_ROOM",
        payload: {
          userId,
          roomId,
        },
      };
      wsConnection.send(JSON.stringify(joinRoomMessage));
    };

    wsConnection.onmessage = (event) => {
      try {
        const data: OutgoingMessage = JSON.parse(event.data);
        console.log("Received message:", data);

        switch (data.type) {
          case "USER_MESSAGE":
            setMessages((prev) => [
              ...prev,
              {
                userId: data.payload.userId,
                content: data.payload.message,
                timestamp: new Date().toISOString(),
              },
            ]);
            break;
          case "ROOM_CLOSED":
            setError("Room has been closed");
            setTimeout(() => router.push("/lobby"), 2000);
            break;
          case "USER_JOINED":
            setMessages((prev) => [
              ...prev,
              {
                userId: "system",
                content: `User ${data.payload.userId} joined the room`,
                timestamp: new Date().toISOString(),
              },
            ]);
            break;
          case "USER_LEFT":
            setMessages((prev) => [
              ...prev,
              {
                userId: "system",
                content: `User ${data.payload.userId} left the room`,
                timestamp: new Date().toISOString(),
              },
            ]);
            break;
          case "ERROR":
            setError(data.payload.message);
            break;
        }
      } catch (err) {
        console.error("Error processing message:", err);
        setError("Failed to process server response");
      }
    };

    wsConnection.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError("Failed to connect to server");
      setIsConnected(false);
    };

    // return () => {
    //   if (wsConnection) {
    //     const leaveRoomMessage = {
    //       type: "LEAVE_ROOM",
    //       payload: {
    //         userId,
    //         roomId,
    //       },
    //     };
    //     wsConnection.send(JSON.stringify(leaveRoomMessage));
    //     wsConnection.close();
    //   }
    // };
  }, [userId, roomId, router]);

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ws || !isConnected || !newMessage) return;

    const messagePayload: UserMessagePayload = {
      roomId: roomId!,
      userId: userId!,
      message: newMessage,
      messageType: "TEXT",
    };

    const message = {
      type: "USER_MESSAGE",
      payload: messagePayload,
    };

    ws.send(JSON.stringify(message));
    setNewMessage("");
  };

  const leaveRoom = () => {
    router.push("/lobby");
  };

  const closeRoom = () => {
    if (!ws || !isConnected) return;

    const closeRoomMessage = {
      type: "CLOSE_ROOM",
      payload: {
        roomId,
        hostId: userId,
      },
    };

    ws.send(JSON.stringify(closeRoomMessage));
  };

  if (!userId || !roomId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 flex items-center justify-center text-white">
        <div className="text-center">
          <p className="text-xl">Invalid room access</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Room: {roomId}</h1>
          <div className="space-x-4">
            {isHost && (
              <button
                onClick={closeRoom}
                className="bg-red-500 text-white px-4 py-2 rounded font-semibold hover:bg-opacity-90 transition"
              >
                Close Room
              </button>
            )}
            <button
              onClick={leaveRoom}
              className="bg-white text-purple-600 px-4 py-2 rounded font-semibold hover:bg-opacity-90 transition"
            >
              Leave Room
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 text-red-300 bg-red-900/50 px-4 py-2 rounded">
            {error}
          </div>
        )}

        {!isConnected && (
          <div className="mb-4 text-yellow-300 bg-yellow-900/50 px-4 py-2 rounded">
            Connecting to server...
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Chat</h2>
            <div className="bg-white bg-opacity-10 p-4 rounded h-96 overflow-y-auto">
              {messages.map((msg, index) => (
                <div key={index} className="mb-2">
                  <span className="font-semibold">
                    {msg.userName || msg.userId}:{" "}
                  </span>
                  <span>{msg.content}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
            <form onSubmit={sendMessage} className="flex space-x-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-grow px-4 py-2 rounded text-black"
                placeholder="Type a message..."
                disabled={!isConnected}
              />
              <button
                type="submit"
                disabled={!isConnected || !newMessage}
                className="bg-white text-purple-600 px-4 py-2 rounded font-semibold hover:bg-opacity-90 transition disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
