import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MessageCircle } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <div className="container mx-auto px-4 py-16">
        <div className="flex flex-col items-center justify-center space-y-8 text-center">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-12 w-12 text-primary" />
            <h1 className="text-4xl font-bold">ChatSphere</h1>
          </div>
          
          <Card className="w-full max-w-2xl p-8 backdrop-blur-sm bg-background/80">
            <h2 className="text-2xl font-semibold mb-4">
              Connect, Chat, Collaborate
            </h2>
            <p className="text-muted-foreground mb-8">
              Join our real-time chat platform where you can create rooms, 
              connect with others, and communicate seamlessly.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
            <FeatureCard
              title="Create Rooms"
              description="Create private or public chat rooms for different topics and discussions."
            />
            <FeatureCard
              title="Real-time Chat"
              description="Experience seamless real-time messaging with instant updates."
            />
            <FeatureCard
              title="Secure & Fast"
              description="Built with security in mind, ensuring your conversations stay private."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="p-6 backdrop-blur-sm bg-background/80">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </Card>
  );
}