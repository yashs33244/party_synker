"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { wsClient } from "@/lib/websocket";
import { ArrowLeft, Music, Send, User } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MusicPlayer } from "@/components/MusicPlayer";

interface Message {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

const getUserColor = (userId: string) => {
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-yellow-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-teal-500",
  ];

  const hash = userId.split("").reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return colors[Math.abs(hash) % colors.length];
};

export default function Room() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get("id");
  const userId = searchParams.get("userid");
  const [messages, setMessages] = useState<Message[]>([]);
  const [receivedMessages, setReceivedMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [hostMessages, setHostMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<
    { id: string; name: string }[]
  >([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messageHandlerSet = useRef(false);

  const handleWebSocketMessage = (event: any) => {
    const message = typeof event === "string" ? JSON.parse(event) : event;
    console.log("Received WebSocket message:", message);

    switch (message.type) {
      case "GET_USERS":
        setParticipants(message.payload.users || []);
        break;
      case "ROOM_JOINED":
        setIsHost(message.payload.isHost);
        break;
      case "USER_MESSAGE":
        const newMsg = {
          id: message.payload.messageId || Date.now().toString(),
          userId: message.payload.userId,
          userName: message.payload.userName || "Unknown User",
          message: message.payload.message,
          timestamp: message.payload.timestamp || new Date().toISOString(),
        };

        setReceivedMessages((prev) => {
          // Check if message already exists
          const exists = prev.some(
            (m) =>
              m.message === newMsg.message &&
              m.userId === newMsg.userId &&
              m.timestamp === newMsg.timestamp
          );

          if (exists) return prev;
          return [...prev, newMsg];
        });
        break;
    }
  };

  useEffect(() => {
    if (!userId || !roomId) {
      router.push("/login");
      return;
    }

    if (!messageHandlerSet.current) {
      wsClient.connect(userId);

      // Join room
      wsClient.send({
        type: "JOIN_ROOM",
        payload: { roomId, userId },
      });

      // Get initial users list
      wsClient.send({
        type: "GET_USERS",
        payload: { roomId },
      });

      wsClient.onMessage(handleWebSocketMessage);
      messageHandlerSet.current = true;
    }
  }, [roomId, userId, router]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !roomId || !userId) return;

    wsClient.send({
      type: "USER_MESSAGE",
      payload: {
        roomId,
        userId,
        message: newMessage,
      },
    });
    setHostMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        userId,
        userName: "You",
        message: newMessage,
        timestamp: new Date().toISOString(),
      },
    ]);

    setNewMessage("");
  };

  if (!userId || !roomId) {
    return null;
  }
  const handleLeaveRoom = () => {
    wsClient.send({
      type: "LEAVE_ROOM",
      payload: { roomId, userId },
    });
    router.push("/lobby?userid=" + userId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <div className="container mx-auto p-4 h-screen flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link href={`/lobby?userid=${userId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <Music className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Music Room</h1>
            </div>
            <Button onClick={handleLeaveRoom}>Leave Room</Button>
          </div>
        </div>

        <div className="mb-4">
          {/* <MusicPlayer defaultSongUrl="https://songlist.s3.eu-north-1.amazonaws.com/believer.mp3" /> */}

          <MusicPlayer
            songUrl="https://songlist.s3.eu-north-1.amazonaws.com/believer.mp3"
            roomId={roomId}
            userId={userId}
            wsClient={wsClient}
          />
        </div>

        <div className="flex-1 flex gap-4">
          <Card className="flex-1 p-4 backdrop-blur-sm bg-background/80 flex flex-col">
            <ScrollArea ref={scrollRef} className="flex-1 pr-4">
              <div className="space-y-4">
                {/* Merge and sort messages by timestamp */}
                {[...hostMessages, ...receivedMessages]
                  .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                  .map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.userId === userId ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 text-white
                  ${
                    msg.userId === userId
                      ? "bg-primary text-primary-foreground"
                      : getUserColor(msg.userId)
                  }`}
                      >
                        <p className="text-sm font-medium">{msg.userName}</p>
                        <p>{msg.message}</p>
                        <p className="text-xs opacity-70">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>

            <Separator className="my-4" />

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button type="submit" size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </Card>

          <Card className="w-64 p-4 backdrop-blur-sm bg-background/80">
            <div className="flex items-center space-x-2 mb-4">
              <User className="h-4 w-4" />
              <h2 className="font-semibold">Participants</h2>
            </div>
            <ScrollArea className="h-[calc(100vh-12rem)]">
              <div className="space-y-2">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted"
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${getUserColor(
                        participant.id
                      )}`}
                    />
                    <span>{participant.name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  );
}
