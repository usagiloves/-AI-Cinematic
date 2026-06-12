/* ========================================
   AI Cinematic OS — Utilities: Local Storage
   ======================================== */

const AppStorage = {
  prefix: 'aicos_',

  get(key) {
    try {
      const raw = localStorage.getItem(this.prefix + key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) {
      console.warn('LocalStorage write failed:', e);
    }
  },

  remove(key) {
    localStorage.removeItem(this.prefix + key);
  },

  getLastProvider() {
    return this.get('lastProvider') || 'openai';
  },

  setLastProvider(provider) {
    this.set('lastProvider', provider);
  },

  getLastModel(provider) {
    return this.get(`lastModel_${provider}`);
  },

  setLastModel(provider, model) {
    this.set(`lastModel_${provider}`, model);
  },

  getLastImageBackend() {
    return this.get('lastImageBackend') || 'automatic1111';
  },

  setLastImageBackend(backend) {
    this.set('lastImageBackend', backend);
  },

  getChatHistory() {
    return this.get('chatHistory') || [];
  },

  saveChatHistory(messages) {
    // Keep last 100 messages
    const trimmed = messages.slice(-100);
    this.set('chatHistory', trimmed);
  }
};
