"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { wsClient } from "@/lib/websocket";
import { ArrowLeft, MessageCircle, Send, User } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
}

export default function Room() {
  const { id: roomId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [participants] = useState([
    { id: "1", name: "John Doe" },
    { id: "2", name: "Jane Smith" },
    { id: "3", name: "Bob Johnson" },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // TODO: Replace with actual user ID from authentication
    const userId = "user123";
    wsClient.connect(userId);

    wsClient.send({
      type: "JOIN_ROOM",
      payload: { roomId, userId },
    });

    wsClient.onMessage((message) => {
      if (message.type === "USER_MESSAGE") {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            userId: message.payload.userId,
            username: "User", // TODO: Get actual username
            content: message.payload.message,
            timestamp: new Date(),
          },
        ]);
      }
    });

    return () => {
      wsClient.send({
        type: "LEAVE_ROOM",
        payload: { roomId, userId },
      });
      wsClient.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    wsClient.send({
      type: "USER_MESSAGE",
      payload: {
        roomId,
        userId: "user123", // TODO: Replace with actual user ID
        message: newMessage,
      },
    });

    setNewMessage("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <div className="container mx-auto p-4 h-screen flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <Link href="/lobby">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="flex items-center space-x-2">
              <MessageCircle className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Chat Room</h1>
            </div>
          </div>
        </div>

        <div className="flex-1 flex gap-4">
          <Card className="flex-1 p-4 backdrop-blur-sm bg-background/80 flex flex-col">
            <ScrollArea ref={scrollRef} className="flex-1 pr-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.userId === "user123"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] ${
                        message.userId === "user123"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      } rounded-lg px-4 py-2`}
                    >
                      <p className="text-sm font-medium">{message.username}</p>
                      <p>{message.content}</p>
                      <p className="text-xs opacity-70">
                        {new Date(message.timestamp).toLocaleTimeString()}
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
                    <div className="w-2 h-2 rounded-full bg-green-500" />
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