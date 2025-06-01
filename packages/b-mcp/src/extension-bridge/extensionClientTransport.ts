import {
  type Transport,
  type TransportSendOptions,
} from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  JSONRPCMessageSchema,
  type JSONRPCMessage,
} from '@modelcontextprotocol/sdk/types.js';
import {
  type EventId,
  type MCPConnectOptions,
  type MCPEventMessage,
  type MCPReplayEventMessage,
  type MCPServerInfoMessage,
} from '../browser-types';
import {
  createUIBridge,
  type BridgeResponse,
  type PageBridgeMessageType,
} from './uiConnector.js';

export const isJSONRPCMessage = (value: unknown): value is JSONRPCMessage =>
  JSONRPCMessageSchema.safeParse(value).success;

/**
 * Configuration options for reconnection behavior, mirroring BrowserReconnectionOptions
 */
export interface ExtensionReconnectionOptions {
  maxReconnectionDelay: number;
  initialReconnectionDelay: number;
  reconnectionDelayGrowFactor: number;
  maxRetries: number;
}

const DEFAULT_EXTENSION_RECONNECTION_OPTIONS: ExtensionReconnectionOptions = {
  initialReconnectionDelay: 1000,
  maxReconnectionDelay: 30000,
  reconnectionDelayGrowFactor: 1.5,
  maxRetries: 2,
};

/**
 * Configuration options for the ExtensionClientTransport
 */
export interface ExtensionClientTransportOptions {
  clientInstanceId?: string;
  reconnectionOptions?: ExtensionReconnectionOptions;
  connectionTimeout?: number;
}

export class ExtensionClientTransport implements Transport {
  onclose?: () => void;
  onerror?: (err: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: { authInfo?: any }) => void;

  public isConnected = false;
  public sessionId?: string;
  public lastEventId?: EventId;
  public serverInstanceId?: string;
  public hasEventStore: boolean = false;
  public streamId?: string;

  private clientId: string;
  private bridge: ReturnType<typeof createUIBridge>;

  private _reconnectionOptions: ExtensionReconnectionOptions;
  private _connectionTimeout: number;
  private _abortController?: AbortController;
  private _connectionPromise?: {
    resolve: () => void;
    reject: (error: Error) => void;
  };
  private _reconnectAttempt: number = 0;

  constructor(
    options?: ExtensionClientTransportOptions & { port?: chrome.runtime.Port }
  ) {
    this.clientId =
      options?.clientInstanceId ||
      (crypto.randomUUID?.() ??
        `ext-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);

    this._reconnectionOptions =
      options?.reconnectionOptions ?? DEFAULT_EXTENSION_RECONNECTION_OPTIONS;
    this._connectionTimeout = options?.connectionTimeout ?? 30000;
    this.bridge = createUIBridge(options?.port);
  }

  async start(): Promise<void> {
    if (this._abortController) {
      throw new Error('ExtensionClientTransport already started or starting!');
    }
    this._abortController = new AbortController();
    return this._connectWithRetry();
  }

  private async _connectWithRetry(resumptionToken?: EventId): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this._connectionPromise = { resolve, reject };
      let handshakeComplete = false;
      let handshakeTimer: ReturnType<typeof setTimeout>;

      const signal = this._abortController?.signal;
      if (signal?.aborted) {
        return reject(new Error('Connection aborted'));
      }

      // Cleanup previous listener if any (e.g., during retries)
      // This is tricky as chrome.runtime.Port.onMessage doesn't have a direct removeListener by function ref for all listeners.
      // For simplicity, we rely on the fact that createUIBridge() is called once per transport instance,
      // and its onMessage handler is set once. If retries re-call _connectWithRetry, the existing handler will be overwritten
      // by the new closure, which is acceptable for this flow.

      this.bridge.onMessage((resp: BridgeResponse) => {
        if (signal?.aborted || resp.clientId !== this.clientId) return;

        const data: PageBridgeMessageType = resp.msg;
        try {
          if ('type' in data && data.type === 'mcp-server-info') {
            const serverInfo = data as MCPServerInfoMessage;
            if (handshakeTimer) clearTimeout(handshakeTimer);
            handshakeComplete = true;
            this.sessionId = serverInfo.serverSessionId;
            this.serverInstanceId = serverInfo.serverInstanceId;
            this.hasEventStore = serverInfo.hasEventStore || false;
            this.streamId = serverInfo.streamId;
            this.isConnected = true;
            this._reconnectAttempt = 0;
            this._connectionPromise?.resolve();
            this._connectionPromise = undefined;
            return; // Handshake complete, further messages handled by this same listener if still connected
          }

          if (!handshakeComplete && !this.isConnected) {
            // If we receive other messages before handshake is complete, it might be an error or unexpected state.
            // For now, we'll let the handshake timer handle timeouts.
            console.warn(
              'ExtensionClientTransport: Received non-handshake message before handshake completion',
              data
            );
            // Potentially reject early if it's a clear error message from the bridge, but that needs protocol definition.
            return;
          }

          // Handle messages after handshake/connection established
          if (
            'type' in data &&
            (data.type === 'mcp-replay-event' || data.type === 'mcp-event')
          ) {
            const eventMsg = data as MCPEventMessage | MCPReplayEventMessage;
            this.lastEventId = eventMsg.eventId;
            if (isJSONRPCMessage(eventMsg.message)) {
              this.onmessage?.(eventMsg.message);
            } else {
              const message = JSONRPCMessageSchema.parse(eventMsg.message);
              this.onmessage?.(message);
            }
          } else if (isJSONRPCMessage(data)) {
            // Check if it's a direct JSONRPCMessage
            this.onmessage?.(data);
          } else {
            console.warn(
              'ExtensionClientTransport received unknown message type post-connection:',
              data
            );
            // Optionally try to parse, but be cautious
            // const message = JSONRPCMessageSchema.parse(data);
            // this.onmessage?.(message);
          }
        } catch (err) {
          const error = err as Error;
          console.error(
            'Error processing message in ExtensionClientTransport:',
            error,
            'Data:',
            data
          );
          this.onerror?.(error);
          // Only reject initial connection promise on critical error during handshake phase
          if (
            !handshakeComplete &&
            !this.isConnected &&
            this._connectionPromise
          ) {
            if (handshakeTimer) clearTimeout(handshakeTimer);
            this._connectionPromise.reject(error);
            this._connectionPromise = undefined;
          }
        }
      });

      const connectOptions: MCPConnectOptions | undefined = resumptionToken
        ? { resumeFrom: resumptionToken }
        : undefined;
      this.bridge.connect(this.clientId, connectOptions);

      handshakeTimer = setTimeout(() => {
        if (!handshakeComplete && !this.isConnected) {
          const error = new Error(
            'ExtensionClientTransport: Server handshake timeout'
          );
          this._handleConnectionError(error, resumptionToken);
        }
      }, this._connectionTimeout);

      signal?.addEventListener('abort', () => {
        if (handshakeTimer) clearTimeout(handshakeTimer);
        // If connectionPromise still exists, it means we haven't resolved/rejected it yet.
        if (this._connectionPromise) {
          this._connectionPromise.reject(
            new Error('Connection aborted during handshake')
          );
          this._connectionPromise = undefined;
        }
      });
    });
  }

  private _handleConnectionError(
    error: Error,
    resumptionToken?: EventId
  ): void {
    this.onerror?.(error);
    this.isConnected = false; // Ensure disconnected state

    if (this._connectionPromise) {
      this._connectionPromise.reject(error);
      this._connectionPromise = undefined;
    }

    // Attempt reconnection if appropriate (not aborted and lastEventId exists for resumption)
    const shouldRetry =
      this._abortController &&
      !this._abortController.signal.aborted &&
      (resumptionToken || this.lastEventId) && // Need a token to resume
      this._reconnectionOptions.maxRetries > 0 &&
      this._reconnectAttempt < this._reconnectionOptions.maxRetries;

    if (shouldRetry) {
      this._scheduleReconnection(resumptionToken || this.lastEventId!);
    } else {
      // If no retry, call onclose if it was previously connected or trying to connect
      // This prevents calling onclose if start() was never called or already closed.
      if (this._abortController) {
        // Check if connection process was initiated
        this.onclose?.();
        // Clean up abort controller as we are fully stopping
        this._abortController = undefined;
      }
    }
  }

  private _getNextReconnectionDelay(attempt: number): number {
    const {
      initialReconnectionDelay,
      maxReconnectionDelay,
      reconnectionDelayGrowFactor,
    } = this._reconnectionOptions;
    return Math.min(
      initialReconnectionDelay * Math.pow(reconnectionDelayGrowFactor, attempt),
      maxReconnectionDelay
    );
  }

  private _scheduleReconnection(tokenToResume: EventId): void {
    const delay = this._getNextReconnectionDelay(this._reconnectAttempt);
    this._reconnectAttempt++;

    console.log(
      `ExtensionClientTransport: Scheduling reconnection attempt ${this._reconnectAttempt} in ${delay}ms`
    );

    setTimeout(() => {
      if (this._abortController?.signal.aborted) {
        console.log('ExtensionClientTransport: Reconnection aborted.');
        return;
      }
      console.log(
        `ExtensionClientTransport: Attempting reconnection (attempt ${this._reconnectAttempt})`
      );
      this._connectWithRetry(tokenToResume).catch((err) => {
        // Error during a scheduled reconnection attempt is handled by _handleConnectionError within that attempt.
        // We log it here for visibility, but _handleConnectionError will decide on further retries or final close.
        console.error(
          `ExtensionClientTransport: Scheduled reconnection attempt failed:`,
          err
        );
        // If _handleConnectionError doesn't schedule another retry, it will call onclose.
      });
    }, delay);
  }

  async send(message: JSONRPCMessage, _?: TransportSendOptions): Promise<void> {
    // options?.resumptionToken and options?.onresumptiontoken are not directly applicable here
    // as the extension bridge manages its own event stream concept via lastEventId internally.
    if (!this.isConnected) {
      const canAttemptReconnect =
        this._reconnectionOptions.maxRetries > 0 &&
        this.lastEventId &&
        this._abortController &&
        !this._abortController.signal.aborted;
      if (canAttemptReconnect) {
        console.log(
          'ExtensionClientTransport: Not connected. Attempting auto-reconnect before send.'
        );
        try {
          await this._connectWithRetry(this.lastEventId);
        } catch (err) {
          const reconErr = new Error(
            `ExtensionClientTransport: Failed to auto-reconnect before send: ${err instanceof Error ? err.message : String(err)}`
          );
          this.onerror?.(reconErr);
          throw reconErr; // Propagate error if reconnection fails
        }
        if (!this.isConnected) {
          throw new Error(
            'ExtensionClientTransport: Not connected after attempting auto-reconnection.'
          );
        }
      } else {
        throw new Error(
          'ExtensionClientTransport: Not connected and cannot auto-reconnect.'
        );
      }
    }
    this.bridge.send(this.clientId, message);
  }

  async close(): Promise<void> {
    if (this._abortController) {
      this._abortController.abort();
      this._abortController = undefined; // Clear it as we are now closed
    }

    if (this._connectionPromise) {
      this._connectionPromise.reject(
        new Error('ExtensionClientTransport: Transport closed by client.')
      );
      this._connectionPromise = undefined;
    }

    // Future: If bridge supported explicit disconnect message:
    // if (this.isConnected) { // Or even if not, to clean up server-side if client ID is known
    //   this.bridge.disconnect(this.clientId); // This would need to be added to UIBridge and handled by background
    // }

    this.isConnected = false;
    // Only call onclose if it hasn't been called by _handleConnectionError already
    // However, a direct call to close() should always trigger onclose if not already closed.
    // The _abortController being undefined (set by _handleConnectionError on final failure or here on direct close)
    // can be a guard. If _handleConnectionError already cleaned up, onclose was called.
    // For simplicity now: always call onclose, assuming it handles multiple calls gracefully or is only set once.
    this.onclose?.();
  }
}
