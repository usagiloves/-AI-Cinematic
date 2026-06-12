/* ========================================
   AI Cinematic OS — Chat Panel Component
   ======================================== */

const ChatPanel = {
  messages: [],
  currentProvider: 'openai',
  currentModel: '',
  isGenerating: false,

  init() {
    this.messages = AppStorage.getChatHistory();
    this.currentProvider = AppStorage.getLastProvider();
    this.render();
    this.bindEvents();
  },

  render() {
    const container = document.getElementById('section-chat');
    const providers = ProviderCards.providers.filter(p => p.type === 'text');

    container.innerHTML = `
      <div class="chat-container">
        <div class="chat-controls">
          <div class="input-group" style="flex-direction:row; align-items:center; gap:var(--space-3); flex:1">
            <label style="min-width:auto">Provider</label>
            <select class="input select" id="chatProvider" style="max-width:160px">
              ${providers.map(p => `<option value="${p.id}" ${p.id === this.currentProvider ? 'selected' : ''}>${p.icon} ${p.name}</option>`).join('')}
            </select>
            <label style="min-width:auto">Model</label>
            <select class="input select" id="chatModel" style="max-width:200px">
              ${this.getModelOptions()}
            </select>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="ChatPanel.clearChat()">🗑️ Clear</button>
        </div>
        <div class="chat-messages" id="chatMessages">
          ${this.messages.length === 0 ? `
            <div class="empty-state">
              <div class="icon">💬</div>
              <h3>Start a conversation</h3>
              <p style="color:var(--text-muted)">Select a provider and send a message to begin</p>
            </div>
          ` : this.messages.map(m => this.renderMessage(m)).join('')}
        </div>
        <div class="chat-input-area">
          <div class="chat-input-wrapper">
            <textarea class="input textarea" id="chatInput" placeholder="Type your message..." rows="2" style="min-height:44px;max-height:120px;resize:none"></textarea>
            <button class="btn btn-primary" id="chatSendBtn" onclick="ChatPanel.send()">
              ${this.isGenerating ? '<div class="spinner"></div>' : '▶'}
            </button>
          </div>
        </div>
      </div>
    `;
  },

  getModelOptions() {
    const provider = ProviderCards.providers.find(p => p.id === this.currentProvider);
    if (!provider || !provider.models) return '<option>Default</option>';
    const lastModel = AppStorage.getLastModel(this.currentProvider);
    return provider.models.map(m => `<option value="${m}" ${m === lastModel ? 'selected' : ''}>${m}</option>`).join('');
  },

  renderMessage(msg) {
    return `
      <div class="chat-message ${msg.role}">
        <div class="avatar">${msg.role === 'user' ? '👤' : '🤖'}</div>
        <div class="chat-bubble">
          <div style="white-space:pre-wrap">${this.escapeHtml(msg.content)}</div>
          ${msg.meta ? `<div class="meta">
            ${msg.meta.provider ? `<span>${msg.meta.provider}</span>` : ''}
            ${msg.meta.tokens ? `<span>${msg.meta.tokens} tokens</span>` : ''}
            ${msg.meta.latency ? `<span>${msg.meta.latency}ms</span>` : ''}
          </div>` : ''}
        </div>
      </div>
    `;
  },

  bindEvents() {
    document.getElementById('chatProvider')?.addEventListener('change', (e) => {
      this.currentProvider = e.target.value;
      AppStorage.setLastProvider(this.currentProvider);
      document.getElementById('chatModel').innerHTML = this.getModelOptions();
    });

    document.getElementById('chatModel')?.addEventListener('change', (e) => {
      this.currentModel = e.target.value;
      AppStorage.setLastModel(this.currentProvider, this.currentModel);
    });

    document.getElementById('chatInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.send();
      }
    });

    // Auto-resize textarea
    document.getElementById('chatInput')?.addEventListener('input', (e) => {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
    });
  },

  async send() {
    const input = document.getElementById('chatInput');
    const text = input?.value.trim();
    if (!text || this.isGenerating) return;

    const provider = document.getElementById('chatProvider')?.value || this.currentProvider;
    const model = document.getElementById('chatModel')?.value || '';

    // Add user message
    this.messages.push({ role: 'user', content: text });
    input.value = '';
    input.style.height = 'auto';

    // Render user message
    const messagesDiv = document.getElementById('chatMessages');
    const emptyState = messagesDiv.querySelector('.empty-state');
    if (emptyState) emptyState.remove();
    messagesDiv.insertAdjacentHTML('beforeend', this.renderMessage({ role: 'user', content: text }));

    // Show typing
    messagesDiv.insertAdjacentHTML('beforeend', `
      <div class="chat-message ai" id="typingIndicator">
        <div class="avatar">🤖</div>
        <div class="chat-bubble">
          <div class="typing-indicator"><span></span><span></span><span></span></div>
        </div>
      </div>
    `);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;

    this.isGenerating = true;
    this.updateSendBtn();

    try {
      const apiMessages = this.messages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : m.role,
        content: m.content
      }));

      const result = await API.chat(apiMessages, provider, model);

      // Remove typing indicator
      document.getElementById('typingIndicator')?.remove();

      // Add AI message
      const aiMsg = {
        role: 'ai',
        content: result.content,
        meta: { provider: result.provider, tokens: result.usage?.totalTokens, latency: result.latency }
      };
      this.messages.push(aiMsg);
      messagesDiv.insertAdjacentHTML('beforeend', this.renderMessage(aiMsg));

      AppStorage.saveChatHistory(this.messages);
    } catch (err) {
      document.getElementById('typingIndicator')?.remove();
      Toast.error(`Chat error: ${err.message}`);

      // Add error message
      messagesDiv.insertAdjacentHTML('beforeend', `
        <div class="chat-message ai">
          <div class="avatar">❌</div>
          <div class="chat-bubble" style="border-color:rgba(239,68,68,0.3)">
            <div style="color:var(--color-accent-red)">Error: ${this.escapeHtml(err.message)}</div>
          </div>
        </div>
      `);
    }

    this.isGenerating = false;
    this.updateSendBtn();
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  },

  updateSendBtn() {
    const btn = document.getElementById('chatSendBtn');
    if (btn) {
      btn.innerHTML = this.isGenerating ? '<div class="spinner"></div>' : '▶';
      btn.disabled = this.isGenerating;
    }
  },

  clearChat() {
    this.messages = [];
    AppStorage.saveChatHistory([]);
    this.render();
    this.bindEvents();
    Toast.info('Chat cleared');
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
