"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle, Plus } from "lucide-react";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function Lobby() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("userid");

  const [rooms] = useState([
    { id: "1", name: "General Chat", participants: 5 },
    { id: "2", name: "Tech Talk", participants: 3 },
    { id: "3", name: "Gaming", participants: 8 },
  ]);

  const handleJoinRoom = (roomId: string) => {
    router.push(`/room?id=${roomId}&userid=${userId}`);
  };

  const handleCreateRoom = async (roomName: string) => {
    try {
      const response = await fetch("http://localhost:8000/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          hostId: userId,
          roomName: roomName 
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/room?id=${data.payload.roomId}&userid=${userId}`);
      } else {
        const error = await response.json();
        alert(`Failed to create room: ${error.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Error creating room:", err);
      alert("An error occurred while creating the room. Please try again.");
    }
  };

  if (!userId) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Chat Lobby</h1>
          </div>

          <CreateRoomDialog onCreateRoom={handleCreateRoom} />
        </div>

        <div className="grid gap-4">
          {rooms.map((room) => (
            <Card
              key={room.id}
              className="p-6 backdrop-blur-sm bg-background/80 hover:bg-background/90 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{room.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {room.participants} participants
                  </p>
                </div>
                <Button onClick={() => handleJoinRoom(room.id)}>Join Room</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function CreateRoomDialog({ onCreateRoom }: { onCreateRoom: (name: string) => void }) {
  const [roomName, setRoomName] = useState("");

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Room
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a New Room</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onCreateRoom(roomName);
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="roomName">Room Name</Label>
            <Input
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="Enter room name..."
              required
            />
          </div>
          <Button type="submit" className="w-full">
            Create Room
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}