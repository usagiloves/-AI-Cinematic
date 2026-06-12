/* ========================================
   AI Cinematic OS — Utilities: SSE Client
   ======================================== */

const SSEClient = {
  source: null,
  listeners: {},
  reconnectDelay: 3000,
  maxRetries: 10,
  retries: 0,

  connect() {
    if (this.source) this.source.close();

    this.source = new EventSource('/api/sse');

    this.source.onopen = () => {
      this.retries = 0;
      console.log('📡 SSE connected');
    };

    this.source.onerror = () => {
      console.warn('📡 SSE disconnected, reconnecting...');
      this.source.close();
      if (this.retries < this.maxRetries) {
        this.retries++;
        setTimeout(() => this.connect(), this.reconnectDelay);
      }
    };

    this.source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit('message', data);
      } catch (e) {}
    };

    // Register named event listeners
    const events = [
      'ai:generating', 'ai:generated',
      'image:generating', 'image:generated', 'image:progress',
      'workflow:start', 'workflow:step', 'workflow:complete', 'workflow:error',
      'workflow:step:progress', 'workflow:step:keepalive',
      'keys:updated'
    ];

    events.forEach(event => {
      this.source.addEventListener(event, (e) => {
        try {
          const data = JSON.parse(e.data);
          this.emit(event, data);
        } catch (err) {}
      });
    });
  },

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  },

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  },

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  },

  disconnect() {
    if (this.source) {
      this.source.close();
      this.source = null;
    }
  }
};
