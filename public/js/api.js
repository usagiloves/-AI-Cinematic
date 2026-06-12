/* ========================================
   AI Cinematic OS — API Client v2.0
   Enhanced with timeouts, retry, and
   global error handling
   ======================================== */

const API = {
  base: '',
  defaultTimeout: 30000, // 30s
  maxRetries: 2,

  async request(endpoint, options = {}) {
    const { method = 'GET', body, headers = {}, timeout, retries = 0 } = options;
    const config = {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    if (body) config.body = JSON.stringify(body);

    // AbortController for timeout (0 means no timeout limit)
    const controller = new AbortController();
    const timeoutMs = timeout !== undefined ? timeout : (method === 'POST' ? 60000 : this.defaultTimeout);
    let timeoutId = null;
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    }
    config.signal = controller.signal;

    try {
      const res = await fetch(`${this.base}${endpoint}`, config);
      if (timeoutId) clearTimeout(timeoutId);

      const data = await res.json();
      if (!res.ok) {
        const error = new Error(data.error || `HTTP ${res.status}`);
        error.status = res.status;
        throw error;
      }
      return data;
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId);

      // Handle abort/timeout
      if (err.name === 'AbortError') {
        const timeoutErr = new Error(`Request timeout after ${timeoutMs / 1000}s`);
        timeoutErr.isTimeout = true;
        throw timeoutErr;
      }

      // Retry on network errors (not on 4xx)
      if (retries < this.maxRetries && !err.status) {
        console.warn(`Retrying ${method} ${endpoint} (attempt ${retries + 1})...`);
        await new Promise(r => setTimeout(r, 500 * (retries + 1)));
        return this.request(endpoint, { ...options, retries: retries + 1 });
      }

      // User-friendly error messages
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        err.message = 'Server không phản hồi. Kiểm tra kết nối.';
      }

      console.error(`API Error [${method} ${endpoint}]:`, err);
      throw err;
    }
  },

  // ─── AI Text ───
  async generate(prompt, provider, model, options = {}) {
    return this.request('/api/ai/generate', {
      method: 'POST',
      body: { prompt, provider, model, ...options },
      timeout: 0 // Unlimited timeout — allows local models (like 24GB Qwen) all the time they need
    });
  },

  async chat(messages, provider, model, options = {}) {
    return this.request('/api/ai/chat', {
      method: 'POST',
      body: { messages, provider, model, ...options },
      timeout: 0 // Unlimited timeout
    });
  },

  // ─── Image Generation ───
  async txt2img(prompt, negativePrompt, backend, options = {}) {
    return this.request('/api/image/txt2img', {
      method: 'POST',
      body: { prompt, negativePrompt, backend, ...options },
      timeout: 0 // Unlimited timeout
    });
  },

  async img2img(imageBase64, prompt, negativePrompt, backend, options = {}) {
    return this.request('/api/image/img2img', {
      method: 'POST',
      body: { image: imageBase64, prompt, negativePrompt, backend, ...options },
      timeout: 0 // Unlimited timeout
    });
  },

  async getImageModels(backend) {
    return this.request(`/api/image/models${backend ? `?backend=${backend}` : ''}`);
  },

  async getImageSamplers() {
    return this.request('/api/image/samplers');
  },

  async getImageProgress() {
    return this.request('/api/image/progress');
  },

  async interruptImage(backend) {
    return this.request('/api/image/interrupt', { method: 'POST', body: { backend } });
  },

  async getImageHistory(limit = 50) {
    return this.request(`/api/image/history?limit=${limit}`);
  },

  // ─── Providers ───
  async getProviders() {
    return this.request('/api/providers');
  },

  async healthCheck(providerId) {
    return this.request(`/api/providers/${providerId}/health`, { timeout: 10000 });
  },

  async healthCheckAll() {
    return this.request('/api/providers/health/all', { timeout: 15000 });
  },

  async updateProviderConfig(providerId, config) {
    return this.request(`/api/providers/${providerId}/config`, {
      method: 'PUT', body: config
    });
  },

  // ─── Workflow ───
  async executeWorkflow(templateId, input, actorId) {
    return this.request('/api/workflow/execute', {
      method: 'POST',
      body: { templateId, input, actorId },
      timeout: 0 // Unlimited timeout
    });
  },

  async executeWorkflowStep(templateId, stepIndex, input, prevResults) {
    return this.request('/api/workflow/execute-step', {
      method: 'POST',
      body: { templateId, stepIndex, input, prevResults },
      timeout: 0 // Unlimited timeout — no request timeout at all
    });
  },

  async getWorkflowTemplates() {
    return this.request('/api/workflow/templates');
  },

  async getWorkflowStatus(id) {
    return this.request(`/api/workflow/status/${id}`);
  },

  // ─── Keys ───
  async getKeys() {
    return this.request('/api/keys');
  },

  async saveKey(provider, key, url) {
    return this.request('/api/keys', {
      method: 'POST',
      body: { provider, key, url }
    });
  },

  async deleteKey(provider) {
    return this.request(`/api/keys/${provider}`, { method: 'DELETE' });
  },

  // ─── Actors ───
  async getActors() {
    return this.request('/api/actors');
  },

  async saveActor(data) {
    return this.request('/api/actors', { method: 'POST', body: data });
  },

  async deleteActor(id) {
    return this.request(`/api/actors/${id}`, { method: 'DELETE' });
  },

  // ─── Tokens ───
  async getTokenStats() {
    return this.request('/api/tokens/stats');
  },

  async getTokenSummary() {
    return this.request('/api/tokens/summary');
  },

  async getTokenHistory(limit = 100) {
    return this.request(`/api/tokens/history?limit=${limit}`);
  },

  // ─── Health ───
  async getHealth() {
    return this.request('/api/health', { timeout: 5000 });
  }
};
