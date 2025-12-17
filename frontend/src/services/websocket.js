let ws = null;
let reconnectAttempts = 0;
let pingInterval = null;
const maxReconnectAttempts = 5;
const reconnectDelay = 3000;

export function connectWebSocket(onMessage, onError, onClose) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = process.env.REACT_APP_WS_PORT || '8001';
  const wsUrl = `${protocol}//${host}:${port}/ws`;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected to', wsUrl);
      reconnectAttempts = 0;
      
      // Clear any existing ping interval
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      
      // Send ping to keep connection alive
      pingInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send('ping');
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) {
          onMessage(data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      if (onError) {
        onError(error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      if (onClose) {
        onClose();
      }
      
      // Attempt to reconnect
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        console.log(`Attempting to reconnect (${reconnectAttempts}/${maxReconnectAttempts})...`);
        setTimeout(() => {
          connectWebSocket(onMessage, onError, onClose);
        }, reconnectDelay);
      } else {
        console.error('Max reconnection attempts reached');
      }
    };
  } catch (error) {
    console.error('Failed to create WebSocket:', error);
    if (onError) {
      onError(error);
    }
  }
}

export function disconnectWebSocket() {
  if (pingInterval) {
    clearInterval(pingInterval);
    pingInterval = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}

export function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}
