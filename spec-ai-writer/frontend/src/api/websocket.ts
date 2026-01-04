/**
 * WebSocket Manager for Real-time Interview
 * Supports mock mode when VITE_USE_MOCK_API=true
 */

import type { WebSocketMessage } from '@/types';

const WS_BASE_URL =
  import.meta.env.VITE_WS_BASE_URL ||
  `ws://${window.location.hostname}:8000`;
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

export type WebSocketCallback = (message: WebSocketMessage) => void;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private callbacks: Set<WebSocketCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private mockInterval: number | null = null;
  private mockAnswerCount = 0;

  constructor(private projectName: string) {}

  connect(): Promise<void> {
    if (USE_MOCK_API) {
      // Mock mode: simulate WebSocket connection
      console.log('Using mock WebSocket mode');
      return new Promise((resolve) => {
        setTimeout(() => {
          // Send initial question
          const initialMessage: WebSocketMessage = {
            type: 'question',
            content: `こんにちは！フェーズ1「原則定義」のインタビューを開始します。\n\nまず、プロジェクトの概要について教えてください。`,
            metadata: {
              phase_num: 1,
              phase_name: '原則定義',
              qa_count: 0,
            },
          };
          setTimeout(() => {
            this.callbacks.forEach((callback) => callback(initialMessage));
          }, 500);
          resolve();
        }, 300);
      });
    }

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
    if (USE_MOCK_API) {
      // Mock mode: simulate response
      this.mockAnswerCount++;
      const mockQuestions = [
        'ありがとうございます。次に、プロジェクトの主要な目的について詳しく教えてください。',
        '理解しました。では、このプロジェクトで最も重要な成功基準は何でしょうか？',
        '素晴らしいですね。最後に、プロジェクトの制約事項があれば教えてください。',
        '承知いたしました。それでは、次のフェーズに進みましょう。',
      ];
      
      setTimeout(() => {
        const isPhaseComplete = this.mockAnswerCount >= 3;
        const question: WebSocketMessage = {
          type: isPhaseComplete ? 'phase_complete' : 'question',
          content: isPhaseComplete 
            ? 'フェーズ1「原則定義」が完了しました！'
            : mockQuestions[Math.min(this.mockAnswerCount - 1, mockQuestions.length - 1)],
          metadata: {
            phase_num: 1,
            phase_name: '原則定義',
            qa_count: this.mockAnswerCount,
          },
        };
        this.callbacks.forEach((callback) => callback(question));

        if (isPhaseComplete) {
          setTimeout(() => {
            const specMessage: WebSocketMessage = {
              type: 'spec_generated',
              content: '仕様書「01-principle-definition.md」を生成しました。',
              metadata: {
                phase_num: 1,
                phase_name: '原則定義',
                filename: '01-principle-definition.md',
              },
            };
            this.callbacks.forEach((callback) => callback(specMessage));
          }, 1000);
        }
      }, 800);
      return;
    }

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
    if (USE_MOCK_API) {
      if (this.mockInterval) {
        clearInterval(this.mockInterval);
        this.mockInterval = null;
      }
      this.callbacks.clear();
      return;
    }

    if (this.ws) {
      this.ws.close(1000, 'User initiated disconnect');
      this.ws = null;
    }
    this.callbacks.clear();
  }

  isConnected(): boolean {
    if (USE_MOCK_API) {
      return true; // Always connected in mock mode
    }
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
