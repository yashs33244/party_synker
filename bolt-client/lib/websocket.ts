import { OutgoingMessage } from '@/types/out';
import { IncomingMessage } from '@/types/in';

class WebSocketClient {
  private ws: WebSocket | null = null;
  private messageHandlers: ((message: OutgoingMessage) => void)[] = [];

  connect(userId: string) {
    this.ws = new WebSocket(`ws://localhost:4000?userId=${userId}`);

    this.ws.onmessage = (event) => {
      const message: OutgoingMessage = JSON.parse(event.data);
      this.messageHandlers.forEach(handler => handler(message));
    };

    this.ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  send(message: IncomingMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  onMessage(handler: (message: OutgoingMessage) => void) {
    this.messageHandlers.push(handler);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

export const wsClient = new WebSocketClient();