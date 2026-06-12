/* ========================================
   AI Cinematic OS — Provider Cards Component
   ======================================== */

const ProviderCards = {
  providers: [],
  healthData: {},

  async init() {
    await this.loadProviders();
    this.render();
    this.startHealthCheck();
  },

  async loadProviders() {
    try {
      this.providers = await API.getProviders();
    } catch (e) {
      this.providers = [];
    }
  },

  render() {
    const container = document.getElementById('section-providers');
    container.innerHTML = `
      <div class="grid-auto" id="providerGrid">
        ${this.providers.map(p => this.renderCard(p)).join('')}
      </div>
    `;
  },

  renderCard(provider) {
    const health = this.healthData[provider.id] || {};
    const status = health.status || (provider.configured ? 'pending' : 'unconfigured');

    return `
      <div class="card provider-card" data-provider="${provider.id}">
        <div class="card-accent"></div>
        <div class="card-header" style="margin-top: var(--space-2);">
          <div class="provider-meta">
            <div class="provider-icon">${provider.icon}</div>
            <div class="provider-info">
              <h4>${provider.name}</h4>
              <span class="provider-type">${provider.type === 'text' ? 'Text AI' : 'Image Gen'}</span>
            </div>
          </div>
          <span class="badge badge-${status === 'online' ? 'online' : status === 'offline' ? 'offline' : 'pending'}">
            <span class="badge-dot ${status}"></span>
            ${status}
          </span>
        </div>
        ${provider.type === 'text' ? `
          <div class="provider-stats">
            <div class="provider-stat">
              <span class="label">Model</span>
              <span class="value">${provider.defaultModel || '—'}</span>
            </div>
            <div class="provider-stat">
              <span class="label">Latency</span>
              <span class="value">${health.latency ? health.latency + 'ms' : '—'}</span>
            </div>
          </div>
        ` : `
          <div class="provider-stats">
            <div class="provider-stat">
              <span class="label">URL</span>
              <span class="value" style="font-size:var(--text-xs)">${provider.url || '—'}</span>
            </div>
            ${health.currentModel ? `
            <div class="provider-stat">
              <span class="label">Model</span>
              <span class="value" style="font-size:var(--text-xs)">${health.currentModel}</span>
            </div>` : ''}
          </div>
        `}
        <div style="margin-top: var(--space-3);">
          <button class="btn btn-ghost btn-sm" onclick="ProviderCards.checkHealth('${provider.id}')">
            🔄 Check Health
          </button>
        </div>
      </div>
    `;
  },

  async checkHealth(providerId) {
    try {
      Toast.info(`Checking ${providerId}...`);
      const health = await API.healthCheck(providerId);
      this.healthData[providerId] = health;
      this.updateCard(providerId);
      Toast.success(`${providerId}: ${health.status}`);
    } catch (e) {
      this.healthData[providerId] = { status: 'offline', error: e.message };
      this.updateCard(providerId);
      Toast.error(`${providerId}: ${e.message}`);
    }
  },

  updateCard(providerId) {
    const grid = document.getElementById('providerGrid');
    if (grid) {
      const provider = this.providers.find(p => p.id === providerId);
      if (provider) {
        const oldCard = grid.querySelector(`[data-provider="${providerId}"]`);
        if (oldCard) {
          oldCard.outerHTML = this.renderCard(provider);
        }
      }
    }
  },

  async startHealthCheck() {
    try {
      const health = await API.healthCheckAll();
      this.healthData = health;
      this.render();
    } catch (e) {}
  },

  renderDashboardCards() {
    return this.providers.map(p => {
      const health = this.healthData[p.id] || {};
      const status = health.status || 'pending';
      return `
        <div class="card provider-card" data-provider="${p.id}" style="cursor: pointer;" onclick="Sidebar.navigateTo('providers')">
          <div class="card-accent"></div>
          <div style="display:flex; align-items:center; gap:var(--space-3); margin-top:var(--space-2);">
            <div class="provider-icon">${p.icon}</div>
            <div>
              <h4 style="font-size:var(--text-sm)">${p.name}</h4>
              <span class="badge badge-${status === 'online' ? 'online' : status === 'offline' ? 'offline' : 'pending'}" style="margin-top:4px">
                <span class="badge-dot ${status}"></span> ${status}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
};
