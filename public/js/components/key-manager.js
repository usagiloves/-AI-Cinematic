/* ========================================
   AI Cinematic OS — Key Manager Component
   ======================================== */

const KeyManager = {
  keys: {},

  async init() {
    await this.loadKeys();
    this.render();
    this.bindEvents();
  },

  async loadKeys() {
    try {
      this.keys = await API.getKeys();
    } catch (e) {
      this.keys = {};
    }
  },

  render() {
    const container = document.getElementById('section-keys');
    container.innerHTML = `
      <div class="grid-2">
        <!-- Text AI Providers -->
        <div class="card">
          <div class="card-title">🔑 Text AI API Keys</div>
          <div style="margin-top:var(--space-4);display:flex;flex-direction:column;gap:var(--space-4)">
            ${this.renderKeyField('openai', '🔗 OpenAI Key', this.keys.openai, 'sk-...')}
            ${this.renderUrlField('openai', '🔗 OpenAI Custom Base URL (Optional - e.g. https://api.openai.com/v1)', this.keys.openaiUrl || '')}
            ${this.renderKeyField('gemini', '✨ Gemini', this.keys.gemini, 'AI...')}
            ${this.renderKeyField('claude', '🧩 Claude', this.keys.claude, 'sk-ant-...')}
            ${this.renderKeyField('deepseek', '🐳 DeepSeek Key', this.keys.deepseek, 'sk-...')}
            ${this.renderUrlField('deepseek', '🐳 DeepSeek Custom Base URL (Optional - e.g. https://api.deepseek.com)', this.keys.deepseekUrl || '')}
            ${this.renderKeyField('openrouter', '🌐 OpenRouter Key', this.keys.openrouter, 'sk-or-...')}
          </div>
        </div>

        <!-- Image Gen Endpoints -->
        <div class="card">
          <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
            <span>🌐 Image Gen & Local Endpoints</span>
            <span class="badge ${this.keys.configured?.siliconflow ? 'badge-online' : 'badge-offline'}">
              ${this.keys.configured?.siliconflow ? '☁️ Cloud SD Active' : 'Local Only'}
            </span>
          </div>
          <div style="margin-top:var(--space-4);display:flex;flex-direction:column;gap:var(--space-4)">
            ${this.renderKeyField('siliconflow', '☁️ SiliconFlow Cloud Key (Image Acceleration)', this.keys.siliconflow, 'sk-...')}
            ${this.renderUrlField('ollama', '🦙 Ollama Local URL', this.keys.ollamaUrl || 'http://localhost:11434')}
            ${this.renderUrlField('automatic1111', '🎨 AUTOMATIC1111', this.keys.a1111Url || 'http://localhost:7860')}
            ${this.renderUrlField('comfyui', '🖼️ ComfyUI', this.keys.comfyuiUrl || 'http://localhost:8188')}
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:var(--space-4)">
        <div class="card-title" style="display:flex;align-items:center;justify-content:space-between">
          <span>📢 Telegram Integration Settings</span>
          <span class="badge ${this.keys.configured?.telegram ? 'badge-online' : 'badge-offline'}">
            ${this.keys.configured?.telegram ? 'Active' : 'Disabled'}
          </span>
        </div>
        <p style="font-size:var(--text-xs);color:var(--text-muted);margin:var(--space-2) 0 var(--space-4) 0;line-height:1.4">
          Cấu hình trợ lý thông báo và điều khiển bất đồng bộ qua Telegram Bot. Khi kịch bản hoàn thành, Bot sẽ tự động gửi tệp tin và Album ảnh xem trước cho Sensei.
        </p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
          <div>
            ${this.renderTelegramKeyField('telegramToken', '🔑 Telegram Bot Token', this.keys.telegramToken, 'bot123456789:ABCdef...')}
            ${this.renderTelegramInputField('telegramChatIds', '💬 Target Chat IDs (Dấu phẩy ngăn cách)', this.keys.telegramChatIds || '', '-100123456789,987654321')}
          </div>
          <div>
            ${this.renderTelegramInputField('telegramWhitelist', '👥 User Whitelist (ID / @username)', this.keys.telegramWhitelist || '', '987654321,@sensei_username')}
            ${this.renderTelegramInputField('telegramAdminIds', '👑 Admin IDs (Quyền hủy/chạy lại tác vụ)', this.keys.telegramAdminIds || '', '987654321')}
          </div>
        </div>
        <div style="margin-top:var(--space-4);padding-top:var(--space-3);border-top:1px dashed rgba(255,255,255,0.08);display:flex;justify-content:flex-end;gap:var(--space-2)">
          <button class="btn btn-ghost" onclick="KeyManager.testTelegram()">⚡ Test Connection</button>
        </div>
      </div>
    `;
  },

  renderKeyField(provider, label, currentValue, placeholder) {
    const isConfigured = this.keys.configured?.[provider];
    return `
      <div class="input-group" style="border-bottom:var(--border-subtle);padding-bottom:var(--space-3)">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <label>${label}</label>
          <span class="badge ${isConfigured ? 'badge-online' : 'badge-offline'}">${isConfigured ? 'Configured' : 'Not Set'}</span>
        </div>
        <div style="display:flex;gap:var(--space-2)">
          <input class="input" type="password" id="key_${provider}" placeholder="${placeholder}" value="${currentValue || ''}">
          <button class="btn btn-secondary btn-sm" onclick="KeyManager.saveKey('${provider}')">Save</button>
          <button class="btn btn-ghost btn-sm" onclick="KeyManager.testKey('${provider}')">Test</button>
        </div>
      </div>
    `;
  },

  renderUrlField(provider, label, currentValue) {
    return `
      <div class="input-group" style="border-bottom:var(--border-subtle);padding-bottom:var(--space-3)">
        <label>${label}</label>
        <div style="display:flex;gap:var(--space-2)">
          <input class="input" type="url" id="url_${provider}" placeholder="http://localhost:..." value="${currentValue}">
          <button class="btn btn-secondary btn-sm" onclick="KeyManager.saveUrl('${provider}')">Save</button>
          <button class="btn btn-ghost btn-sm" onclick="KeyManager.testUrl('${provider}')">Test</button>
        </div>
      </div>
    `;
  },

  bindEvents() {},

  async saveKey(provider) {
    const input = document.getElementById(`key_${provider}`);
    const key = input?.value.trim();
    if (!key) { Toast.warning('Please enter an API key'); return; }

    try {
      await API.saveKey(provider, key);
      Toast.success(`${provider} key saved!`);
      await this.loadKeys();
      this.render();
    } catch (e) {
      Toast.error(`Failed to save key: ${e.message}`);
    }
  },

  async saveUrl(provider) {
    const input = document.getElementById(`url_${provider}`);
    const url = input?.value.trim();
    if (provider !== 'openai' && provider !== 'deepseek' && provider !== 'ollama' && !url) { Toast.warning('Please enter a URL'); return; }

    try {
      const mappedProvider = provider === 'automatic1111' ? 'a1111' : provider;
      await API.saveKey(mappedProvider, undefined, url || '');
      Toast.success(`${provider} URL saved!`);
    } catch (e) {
      Toast.error(`Failed to save URL: ${e.message}`);
    }
  },

  async testKey(provider) {
    Toast.info(`Testing ${provider}...`);
    try {
      const health = await API.healthCheck(provider);
      if (health.status === 'online') {
        Toast.success(`${provider}: Connected! ✅`);
      } else {
        Toast.error(`${provider}: ${health.error || 'Failed'}`);
      }
    } catch (e) {
      Toast.error(`${provider}: ${e.message}`);
    }
  },

  async testUrl(provider) {
    Toast.info(`Testing ${provider}...`);
    try {
      const health = await API.healthCheck(provider);
      if (health.status === 'online') {
        Toast.success(`${provider}: Connected! ✅`);
      } else {
        Toast.error(`${provider}: Offline - ${health.error || 'Cannot reach'}`);
      }
    } catch (e) {
      Toast.error(`${provider}: ${e.message}`);
    }
  },

  renderTelegramKeyField(provider, label, currentValue, placeholder) {
    return `
      <div class="input-group" style="border-bottom:var(--border-subtle);padding-bottom:var(--space-3);margin-bottom:var(--space-3)">
        <label>${label}</label>
        <div style="display:flex;gap:var(--space-2)">
          <input class="input" type="password" id="key_${provider}" placeholder="${placeholder}" value="${currentValue || ''}">
          <button class="btn btn-secondary btn-sm" onclick="KeyManager.saveKey('${provider}')">Save</button>
        </div>
      </div>
    `;
  },

  renderTelegramInputField(provider, label, currentValue, placeholder) {
    return `
      <div class="input-group" style="border-bottom:var(--border-subtle);padding-bottom:var(--space-3);margin-bottom:var(--space-3)">
        <label>${label}</label>
        <div style="display:flex;gap:var(--space-2)">
          <input class="input" type="text" id="input_${provider}" placeholder="${placeholder}" value="${currentValue || ''}">
          <button class="btn btn-secondary btn-sm" onclick="KeyManager.saveTelegramInput('${provider}')">Save</button>
        </div>
      </div>
    `;
  },

  async saveTelegramInput(provider) {
    const input = document.getElementById(`input_${provider}`);
    const val = input?.value.trim();
    
    try {
      await API.saveKey(provider, val);
      Toast.success(`Telegram setting saved!`);
      await this.loadKeys();
      this.render();
    } catch (e) {
      Toast.error(`Failed to save: ${e.message}`);
    }
  },

  async testTelegram() {
    Toast.info('Testing Telegram Bot Connection...');
    try {
      const health = await API.healthCheck('telegram');
      if (health.status === 'online') {
        Toast.success(`Telegram Bot Online! ✅ @${health.bot.username} (${health.bot.first_name})`);
      } else {
        Toast.error(`Telegram Bot Offline: ${health.error || 'Failed'}`);
      }
    } catch (e) {
      Toast.error(`Telegram health check failed: ${e.message}`);
    }
  }
};
