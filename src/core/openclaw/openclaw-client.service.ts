import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import WebSocket from 'ws';

interface OpenClawRPCRequest {
  id: string;
  method: string;
  params?: any;
}

interface OpenClawRPCResponse {
  id: string;
  result?: any;
  error?: any;
}

interface OpenClawEvent {
  event: string;
  stream?: string;
  text?: string;
  phase?: string;
  [key: string]: any;
}

@Injectable()
export class OpenClawClientService implements OnModuleInit {
  private readonly logger = new Logger(OpenClawClientService.name);
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<string, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();
  private eventListeners = new Map<string, ((event: OpenClawEvent) => void)[]>();
  
  private readonly gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'ws://localhost:18789';
  private readonly authToken = process.env.OPENCLAW_AUTH_TOKEN;

  async onModuleInit() {
    await this.connect();
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.log(`Connecting to OpenClaw gateway at ${this.gatewayUrl}`);
      
      this.ws = new WebSocket(this.gatewayUrl);

      this.ws.on('open', () => {
        this.logger.log('Connected to OpenClaw gateway');
        
        // Send hello/connect frame
        this.send({
          type: 'req',
          method: 'connect',
          id: this.generateId(),
          params: {
            client: 'skellybot',
            version: '1.0.0',
            mode: 'agent',
            auth: {
              token: this.authToken,
            },
          },
        });
        
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          this.logger.error(`Failed to parse message: ${error}`);
        }
      });

      this.ws.on('error', (error) => {
        this.logger.error(`WebSocket error: ${error}`);
        reject(error);
      });

      this.ws.on('close', () => {
        this.logger.warn('Disconnected from OpenClaw gateway');
        // Attempt reconnection after delay
        setTimeout(() => this.connect(), 5000);
      });
    });
  }

  private handleMessage(message: any) {
    // Handle RPC responses
    if (message.type === 'res' && message.id) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message || 'RPC error'));
        } else {
          pending.resolve(message.result);
        }
      }
    }
    
    // Handle events
    if (message.type === 'event') {
      this.emitEvent(message);
    }
  }

  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  private generateId(): string {
    return `skellybot-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send an RPC request and wait for response
   */
  private async rpc(method: string, params?: any): Promise<any> {
    const id = this.generateId();
    
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      
      this.send({
        type: 'req',
        method,
        id,
        params,
      });
      
      // Timeout after 30s
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('RPC timeout'));
        }
      }, 30000);
    });
  }

  /**
   * Send a message to an OpenClaw session
   */
  async sendMessage(params: {
    sessionKey?: string;
    message: string;
    agentId?: string;
  }): Promise<any> {
    return this.rpc('sessions.send', params);
  }

  /**
   * Get session history
   */
  async getHistory(sessionKey: string, limit?: number): Promise<any> {
    return this.rpc('sessions.history', { sessionKey, limit });
  }

  /**
   * List active sessions
   */
  async listSessions(): Promise<any> {
    return this.rpc('sessions.list', {});
  }

  /**
   * Subscribe to agent stream events for a specific session
   */
  onAgentStream(
    sessionKey: string,
    callback: (text: string, phase?: string) => void,
  ): () => void {
    const listener = (event: OpenClawEvent) => {
      // Filter events for this session
      if (event.session === sessionKey || 
          (event.agent === 'main' && event.session === 'main')) {
        
        if (event.event === 'agent' && event.stream === 'assistant' && event.text) {
          callback(event.text, event.phase);
        }
      }
    };

    this.addEventListener('agent', listener);

    // Return unsubscribe function
    return () => this.removeEventListener('agent', listener);
  }

  private addEventListener(eventType: string, listener: (event: OpenClawEvent) => void): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(listener);
  }

  private removeEventListener(eventType: string, listener: (event: OpenClawEvent) => void): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emitEvent(event: OpenClawEvent): void {
    const listeners = this.eventListeners.get(event.event);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
