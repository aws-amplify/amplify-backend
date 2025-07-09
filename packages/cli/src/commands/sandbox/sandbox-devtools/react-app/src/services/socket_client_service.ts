import { io, Socket } from 'socket.io-client';

type ConnectionHandler = () => void;
type ErrorHandler = (error: Error) => void;

/**
 * Base service for handling client-side socket communication
 */
export class SocketClientService {
  protected socket: Socket | null = null;

  /**
   * Creates a new SocketClientService
   */
  constructor() {
    this.initialize();
  }

  /**
   * Initializes the socket connection
   */
  private initialize(): void {
    const currentUrl = window.location.origin;
    console.log('Connecting to socket at:', currentUrl);

    this.socket = io(currentUrl, {
      reconnectionAttempts: 5,
      timeout: 10000,
    });
  }

  /**
   * Checks if the socket is connected
   * @returns Whether the socket is connected
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Disconnects the socket
   */
  public disconnect(): void {
    this.socket?.disconnect();
  }

  /**
   * Registers a handler for connection events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onConnect(handler: ConnectionHandler): () => void {
    if (!this.socket) return () => {};
    this.socket.on('connect', handler);
    return () => this.socket?.off('connect', handler);
  }

  /**
   * Registers a handler for disconnection events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onDisconnect(handler: (reason: string) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('disconnect', handler);
    return () => this.socket?.off('disconnect', handler);
  }

  /**
   * Registers a handler for connection error events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onConnectError(handler: ErrorHandler): () => void {
    if (!this.socket) return () => {};
    this.socket.on('connect_error', handler);
    return () => this.socket?.off('connect_error', handler);
  }

  /**
   * Registers a handler for connection timeout events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onConnectTimeout(handler: ConnectionHandler): () => void {
    if (!this.socket) return () => {};
    this.socket.on('connect_timeout', handler);
    return () => this.socket?.off('connect_timeout', handler);
  }

  /**
   * Registers a handler for reconnection events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onReconnect(handler: (attempt: number) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('reconnect', handler);
    return () => this.socket?.off('reconnect', handler);
  }

  /**
   * Registers a handler for reconnection attempt events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onReconnectAttempt(handler: (attempt: number) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on('reconnect_attempt', handler);
    return () => this.socket?.off('reconnect_attempt', handler);
  }

  /**
   * Registers a handler for reconnection error events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onReconnectError(handler: ErrorHandler): () => void {
    if (!this.socket) return () => {};
    this.socket.on('reconnect_error', handler);
    return () => this.socket?.off('reconnect_error', handler);
  }

  /**
   * Registers a handler for reconnection failed events
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  public onReconnectFailed(handler: ConnectionHandler): () => void {
    if (!this.socket) return () => {};
    this.socket.on('reconnect_failed', handler);
    return () => this.socket?.off('reconnect_failed', handler);
  }

  /**
   * Starts a periodic ping to check connection health
   * @param interval The ping interval in milliseconds
   * @returns A function to stop the ping
   */
  public startPingInterval(interval: number = 30000): () => void {
    if (!this.socket) return () => {};

    const pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.socket.emit('ping', {}, (response: any) => {
          if (!response || response.error) {
            console.warn('Ping failed:', response?.error || 'No response');
          }
        });
      }
    }, interval);

    return () => clearInterval(pingInterval);
  }

  /**
   * Emits an event to the server
   * @param event The event name
   * @param data The event data
   */
  protected emit<T>(event: string, data?: T): void {
    if (!this.socket) return;
    this.socket.emit(event, data);
  }

  /**
   * Registers a handler for an event
   * @param event The event name
   * @param handler The event handler
   * @returns A function to unsubscribe
   */
  protected on<T>(event: string, handler: (data: T) => void): () => void {
    if (!this.socket) return () => {};
    this.socket.on(event, handler);
    return () => this.socket?.off(event, handler);
  }
}
