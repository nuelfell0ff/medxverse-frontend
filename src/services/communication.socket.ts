import { getCommunicationWebSocketUrl } from '@/services/communication.service';

import { Message } from '@/types/communication';

type CommunicationSocketState =
  | 'connecting'
  | 'connected'
  | 'offline';

export type CommunicationSocketEvent = {
  state: CommunicationSocketState;
  type?: string;
  payload?: Message;
  conversationId?: string;
};

type CommunicationSocketListener = (
  event: CommunicationSocketEvent
) => void;

const SOCKET_RECONNECT_BASE_MS = 1000;
const SOCKET_RECONNECT_MAX_MS = 10000;
const SOCKET_CONNECT_TIMEOUT_MS = 15000;

class CommunicationSocketManager {
  private socket: WebSocket | null = null;

  private socketUrl: string | null = null;

  private token: string | null = null;

  private reconnectTimer: ReturnType<typeof setTimeout> | null =
    null;

  private connectTimeout: ReturnType<typeof setTimeout> | null =
    null;

  private reconnectAttempt = 0;

  private intentionallyDisconnected = false;

  private generation = 0;

  private listeners = new Set<CommunicationSocketListener>();

  subscribe(
    listener: CommunicationSocketListener
  ): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  connect(token: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    const normalizedToken = token.trim();

    if (!normalizedToken) {
      return;
    }

    const url = getCommunicationWebSocketUrl(
      normalizedToken
    );

    this.intentionallyDisconnected = false;

    if (
      this.socket &&
      this.socketUrl === url &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.token = normalizedToken;
    this.socketUrl = url;
    this.generation += 1;
    this.reconnectAttempt = 0;

    this.clearReconnectTimer();
    this.replaceSocket();
    this.openSocket(this.generation);
  }

  disconnect(): void {
    this.intentionallyDisconnected = true;
    this.token = null;
    this.socketUrl = null;
    this.generation += 1;
    this.reconnectAttempt = 0;

    this.clearReconnectTimer();
    this.clearConnectTimeout();

    const socket = this.socket;

    this.socket = null;

    if (socket) {
      socket.onopen = null;
      socket.onerror = null;
      socket.onclose = null;
      socket.onmessage = null;

      try {
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close(1000, 'Communication session ended');
        }
      } catch {
        // Ignore browser cleanup errors.
      }
    }

    this.emit({
      state: 'offline',
    });
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  private openSocket(generation: number): void {
    if (
      this.intentionallyDisconnected ||
      generation !== this.generation ||
      !this.socketUrl ||
      !this.token
    ) {
      return;
    }

    this.emit({
      state: 'connecting',
    });

    let socket: WebSocket;

    try {
      socket = new WebSocket(this.socketUrl);
    } catch (error) {
      console.error(
        '[Communication WebSocket] Failed to create socket:',
        error
      );

      this.emit({
        state: 'offline',
      });

      this.scheduleReconnect(generation);

      return;
    }

    this.socket = socket;

    this.clearConnectTimeout();

    this.connectTimeout = setTimeout(() => {
      if (
        generation !== this.generation ||
        this.socket !== socket
      ) {
        return;
      }

      if (socket.readyState === WebSocket.CONNECTING) {
        console.warn(
          '[Communication WebSocket] Connection timed out.'
        );

        socket.close(1000, 'Connection timeout');
      }
    }, SOCKET_CONNECT_TIMEOUT_MS);

    socket.onopen = () => {
      if (
        generation !== this.generation ||
        this.socket !== socket
      ) {
        return;
      }

      this.clearConnectTimeout();
      this.reconnectAttempt = 0;

      this.emit({
        state: 'connected',
      });
    };

    socket.onerror = (error) => {
      if (
        generation !== this.generation ||
        this.socket !== socket
      ) {
        return;
      }

      console.warn(
        '[Communication WebSocket] Browser socket error:',
        error
      );
    };

    socket.onclose = (event) => {
      if (this.socket === socket) {
        this.socket = null;
      }

      this.clearConnectTimeout();

      console.warn(
        '[Communication WebSocket] Connection closed:',
        {
          code: event.code,
          reason:
            event.reason || 'No reason supplied',
          wasClean: event.wasClean,
        }
      );

      if (
        this.intentionallyDisconnected ||
        generation !== this.generation
      ) {
        return;
      }

      this.emit({
        state: 'offline',
      });

      this.scheduleReconnect(generation);
    };

    socket.onmessage = (
      event: MessageEvent<string>
    ) => {
      if (
        generation !== this.generation ||
        this.socket !== socket
      ) {
        return;
      }

      let data: {
        type?: string;
        payload?: Message;
        conversationId?: string;
      };

      try {
        data = JSON.parse(event.data) as typeof data;
      } catch {
        return;
      }

      if (data.type === 'communication.connected') {
        this.emit({
          state: 'connected',
          type: data.type,
        });

        return;
      }

      if (
        data.type === 'message.created' &&
        data.payload
      ) {
        this.emit({
          state: 'connected',
          type: data.type,
          payload: data.payload,
          conversationId: data.conversationId,
        });
      }
    };
  }

  private replaceSocket(): void {
    const socket = this.socket;

    this.socket = null;

    this.clearConnectTimeout();

    if (!socket) {
      return;
    }

    socket.onopen = null;
    socket.onerror = null;
    socket.onclose = null;
    socket.onmessage = null;

    try {
      if (
        socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING
      ) {
        socket.close(
          1000,
          'Replacing communication socket'
        );
      }
    } catch {
      // Ignore stale socket cleanup errors.
    }
  }

  private scheduleReconnect(
    generation: number
  ): void {
    if (
      this.intentionallyDisconnected ||
      generation !== this.generation ||
      this.reconnectTimer
    ) {
      return;
    }

    const attempt = this.reconnectAttempt++;

    const delay = Math.min(
      SOCKET_RECONNECT_BASE_MS *
        Math.pow(2, attempt),
      SOCKET_RECONNECT_MAX_MS
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;

      if (
        generation !== this.generation ||
        this.intentionallyDisconnected
      ) {
        return;
      }

      this.openSocket(generation);
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearConnectTimeout(): void {
    if (this.connectTimeout) {
      clearTimeout(this.connectTimeout);
      this.connectTimeout = null;
    }
  }

  private emit(
    event: CommunicationSocketEvent
  ): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(
          '[Communication WebSocket] Listener error:',
          error
        );
      }
    }
  }
}

type CommunicationSocketGlobal = typeof globalThis & {
  __medxverseCommunicationSocketManager__?: CommunicationSocketManager;
};

const communicationSocketGlobal =
  globalThis as CommunicationSocketGlobal;

export const communicationSocketManager =
  communicationSocketGlobal.__medxverseCommunicationSocketManager__ ??
  (communicationSocketGlobal.__medxverseCommunicationSocketManager__ =
    new CommunicationSocketManager());
