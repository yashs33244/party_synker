import { IncomingMessage } from "@/types/in";
import { OutgoingMessage } from "@/types/out";

class WebSocketClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<(message: OutgoingMessage) => void> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(userId: string) {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(`ws://localhost:4000?userId=${userId}`);

    this.ws.onmessage = this.handleMessage.bind(this);

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
      this.handleReconnect(userId);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };
  }

  private handleMessage(event: MessageEvent) {
    try {
      const message: OutgoingMessage = JSON.parse(event.data);
      console.log('Received message:', message);
      this.messageHandlers.forEach(handler => handler(message));
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private handleReconnect(userId: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      setTimeout(() => this.connect(userId), this.reconnectDelay * this.reconnectAttempts);
    }
  }

  send(message: IncomingMessage) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket is not connected. Message not sent:', message);
      return;
    }
    
    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  onMessage(handler: (message: OutgoingMessage) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  disconnect() {
    if (this.ws) {
      this.messageHandlers.clear();
      this.ws.close();
      this.ws = null;
    }
  }

  // Remove the listenBroadcast method as it's not needed
}

export const wsClient = new WebSocketClient();