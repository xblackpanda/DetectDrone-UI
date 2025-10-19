const envSocketUrl =
  typeof process !== 'undefined' && process.env && process.env.REACT_APP_SOCKET_URL;

const DEFAULT_SOCKET_URL = envSocketUrl || 'wss://sharri-unpatted-cythia.ngrok-free.dev/ws';

let activeSocket = undefined;
let reconnectTimer = undefined;
let shouldReconnect = false;

const defaultHandlers = {
  onOpen: (url) => console.info(`Connected to ${url}`),
  onMessage: (event) => console.info('Received message:', event.data),
  onClose: (event) =>
    console.info(`Socket closed (code: ${event.code}${event.reason ? `, reason: ${event.reason}` : ''})`),
  onError: (event) => console.error('Socket error:', event),
};

/**
 * Creates or replaces a WebSocket connection that works in the browser.
 * Call `disconnect()` before navigating away if you enabled autoReconnect.
 */
export function connectWebSocket(userConfig = {}) {
  const config = {
    url: DEFAULT_SOCKET_URL,
    autoReconnect: false,
    reconnectInterval: 5000,
    onOpen: undefined,
    onMessage: undefined,
    onClose: undefined,
    onError: undefined,
    ...userConfig,
  };

  if (activeSocket) {
    disconnect();
  }

  const socket = new WebSocket(config.url);
  activeSocket = socket;
  shouldReconnect = Boolean(config.autoReconnect);

  const wrapHandler = (handler, fallback) => (event) => {
    try {
      if (handler) {
        handler(event);
      } else {
        fallback(event);
      }
    } catch (error) {
      console.error('WebSocket handler threw an error:', error);
    }
  };

  socket.addEventListener('open', wrapHandler(config.onOpen, () => defaultHandlers.onOpen(config.url)));
  socket.addEventListener('message', wrapHandler(config.onMessage, defaultHandlers.onMessage));

  socket.addEventListener(
    'error',
    wrapHandler(config.onError, (event) => {
      defaultHandlers.onError(event);
      if (!config.autoReconnect) {
        // Without auto-reconnect we surface the error but keep the socket open.
        return;
      }
      // With auto-reconnect, close the socket so the close handler can retry.
      socket.close();
    })
  );

  socket.addEventListener(
    'close',
    (event) => {
      wrapHandler(config.onClose, defaultHandlers.onClose)(event);

      if (!shouldReconnect || config.reconnectInterval <= 0) {
        return;
      }

      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }

      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        if (!shouldReconnect) {
          return;
        }
        connectWebSocket(config);
      }, config.reconnectInterval);
    }
  );

  return socket;
}

/**
 * Sends a message through the active socket, if connected.
 * Accepts strings, ArrayBuffers, Blobs, or typed arrays just like the native API.
 */
export function sendMessage(message) {
  if (!activeSocket) {
    console.warn('Cannot send message: socket is not connected.');
    return false;
  }

  if (activeSocket.readyState !== WebSocket.OPEN) {
    console.warn('Cannot send message: socket is not open.');
    return false;
  }

  activeSocket.send(message);
  return true;
}

/**
 * Closes the active socket and stops any scheduled reconnect.
 */
export function disconnect(code = 1000, reason) {
  shouldReconnect = false;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = undefined;
  }

  if (!activeSocket) {
    return;
  }

  if (activeSocket.readyState === WebSocket.OPEN || activeSocket.readyState === WebSocket.CONNECTING) {
    activeSocket.close(code, reason);
  }

  activeSocket = undefined;
}

export function getActiveSocket() {
  return activeSocket;
}
