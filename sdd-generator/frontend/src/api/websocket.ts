/**
 * WebSocket Manager for Real-time Interview
 */

import type { WebSocketMessage } from '@/types';

const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ||
  `ws://${window.location.hostname}:8000`;

export type WebSocketCallback = (message: WebSocketMessage) => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private callbacks: Set<WebSocketCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private projectName: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = `${WS_BASE_URL}/api/interview/ws/${this.projectName}`;
      console.log('Connecting to WebSocket:', url);

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('WebSocket message received:', message);
          this.callbacks.forEach((callback) => callback(message));
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason);

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(
            `Reconnecting... Attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
          );

          setTimeout(() => {
            this.connect().catch(console.error);
          }, this.reconnectDelay * this.reconnectAttempts);
        }
      };
    });
  }

  sendMessage(message: Partial<WebSocketMessage>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }

  sendAnswer(answer: string): void {
    this.sendMessage({
      type: 'answer',
      content: answer,
    });
  }

  onMessage(callback: WebSocketCallback): () => void {
    this.callbacks.add(callback);
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User initiated disconnect');
      this.ws = null;
    }
    this.callbacks.clear();
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
