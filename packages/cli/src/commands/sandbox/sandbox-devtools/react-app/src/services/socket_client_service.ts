import { io, Socket } from 'socket.io-client';

type ConnectionHandler = () => void;
type ErrorHandler = (error: Error) => void;

/**
 * Base service for handling client-side socket communication
 */
export class SocketClientService {
  protected socket: Socket | null = null;
  private requestBackoffTimer: number = 0;
  private lastRequestTime: number = 0;
  private requestQueue: Array<() => void> = [];
  private processingQueue: boolean = false;
  private tabId: string = Math.random().toString(36).substring(2, 10);

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
    console.log(
      `Connecting to socket at: ${currentUrl} (Tab ID: ${this.tabId})`,
    );

    this.socket = io(currentUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1000, // Start with 1s delay
      reconnectionDelayMax: 10000, // Max delay of 10s
      randomizationFactor: 0.5, // Add randomization to prevent all clients reconnecting at the same time
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
        this.socket.emit(
          'ping',
          {},
          (response: { error?: string } | undefined) => {
            if (!response || response.error) {
              console.warn('Ping failed:', response?.error || 'No response');
            }
          },
        );
      }
    }, interval);

    return () => clearInterval(pingInterval);
  }

  /**
   * Adds a request to the queue with exponential backoff
   * @param request The request function to queue
   */
  private queueRequest(request: () => void): void {
    this.requestQueue.push(request);
    this.processQueue();
  }

  /**
   * Processes the request queue with exponential backoff
   */
  private processQueue(): void {
    if (this.processingQueue || this.requestQueue.length === 0) return;

    this.processingQueue = true;
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // If we've waited long enough, process the next request
    if (timeSinceLastRequest >= this.requestBackoffTimer) {
      const request = this.requestQueue.shift();
      if (request) {
        this.lastRequestTime = now;
        // Increase backoff time for next request (max 5 seconds)
        this.requestBackoffTimer = Math.min(
          5000,
          Math.max(200, this.requestBackoffTimer * 1.5),
        );
        request();

        // Reset backoff after 10 seconds of no requests
        setTimeout(() => {
          if (Date.now() - this.lastRequestTime >= 10000) {
            this.requestBackoffTimer = 0;
          }
        }, 10000);
      }

      this.processingQueue = false;
      if (this.requestQueue.length > 0) {
        setTimeout(() => this.processQueue(), this.requestBackoffTimer);
      }
    } else {
      const waitTime = this.requestBackoffTimer - timeSinceLastRequest;
      setTimeout(() => {
        this.processingQueue = false;
        this.processQueue();
      }, waitTime);
    }
  }

  /**
   * Emits an event to the server with exponential backoff
   * @param event The event name
   * @param data The event data
   */
  protected emit<T>(event: string, data?: T): void {
    if (!this.socket) {
      console.error(
        `[Tab ${this.tabId}] Cannot emit ${event}: Socket is not initialized`,
      );
      return;
    }

    // Queue the emit request with exponential backoff
    this.queueRequest(() => {
      console.log(`[Tab ${this.tabId}] Emitting ${event}`);
      this.socket?.emit(event, data);
    });
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
