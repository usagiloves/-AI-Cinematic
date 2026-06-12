/* ========================================
   AI Cinematic OS — Token Monitor v2.0
   Full dashboard with charts, cost estimation,
   and usage history
   ======================================== */

const TokenMonitor = {
  stats: null,
  summary: null,

  async init() {
    await this.fetchData();
    this.render();
  },

  async fetchData() {
    try {
      this.summary = await API.request('/api/tokens/summary');
      this.stats = await API.request('/api/tokens/stats');
    } catch (e) {
      this.summary = { totalTokens: 0, totalRequests: 0, providers: {}, costEstimate: 0 };
      this.stats = { totalTokens: 0, totalRequests: 0, providers: {}, history: [] };
    }
  },

  render() {
    const container = document.getElementById('section-tokens');
    if (!container) return;
    const s = this.summary;
    const providerNames = Object.keys(s.providers || {});
    const providerColors = { openai: '#8b5cf6', gemini: '#06d6a0', claude: '#f472b6', deepseek: '#0066cc', openrouter: '#00f2d3', ollama: '#f59e0b' };

    container.innerHTML = `
      <div class="section-header">
        <h3>📈 Token Monitor</h3>
        <div style="display:flex;gap:var(--space-2)">
          <button class="btn btn-secondary btn-sm" onclick="TokenMonitor.refresh()">🔄 Refresh</button>
          <button class="btn btn-danger btn-sm" onclick="TokenMonitor.resetStats()">🗑️ Reset</button>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="token-grid">
        <div class="card token-stat-card">
          <div style="font-size:1.5rem;margin-bottom:var(--space-2)">🎯</div>
          <div class="stat-value">${this.formatNumber(s.totalTokens)}</div>
          <div class="stat-label">Total Tokens</div>
        </div>
        <div class="card token-stat-card">
          <div style="font-size:1.5rem;margin-bottom:var(--space-2)">📊</div>
          <div class="stat-value">${s.totalRequests}</div>
          <div class="stat-label">Total Requests</div>
        </div>
        <div class="card token-stat-card">
          <div style="font-size:1.5rem;margin-bottom:var(--space-2)">💰</div>
          <div class="stat-value">$${s.costEstimate.toFixed(4)}</div>
          <div class="stat-label">Est. Cost (USD)</div>
        </div>
      </div>

      <!-- Charts -->
      <div class="grid-2" style="margin-bottom:var(--space-5)">
        <!-- Provider Usage Donut -->
        <div class="card">
          <div class="card-title">🍩 Usage by Provider</div>
          <div style="display:flex;align-items:center;justify-content:center;gap:var(--space-6);flex-wrap:wrap;padding:var(--space-4) 0">
            <canvas id="tokenProviderDonut" width="160" height="160"></canvas>
            <div id="tokenLegend" style="font-size:var(--text-sm)">
              ${providerNames.map(name => {
                const data = s.providers[name];
                const color = providerColors[name] || '#6b6b80';
                return `
                  <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-2)">
                    <span style="width:10px;height:10px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color};flex-shrink:0"></span>
                    <span style="color:var(--text-secondary)">${name}</span>
                    <span style="color:var(--text-primary);font-family:var(--font-mono);margin-left:auto">${this.formatNumber(data.totalTokens)}</span>
                  </div>
                `;
              }).join('')}
              ${providerNames.length === 0 ? '<div style="color:var(--text-muted)">No data yet</div>' : ''}
            </div>
          </div>
        </div>

        <!-- Requests Bar Chart -->
        <div class="card">
          <div class="card-title">📊 Requests per Provider</div>
          <div style="padding:var(--space-4) 0">
            <canvas id="tokenBarChart"></canvas>
          </div>
        </div>
      </div>

      <!-- Provider Details -->
      ${providerNames.length > 0 ? `
        <h3 style="margin-bottom:var(--space-3);font-size:var(--text-lg)">📋 Provider Details</h3>
        <div class="grid-auto" style="margin-bottom:var(--space-5)">
          ${providerNames.map(name => {
            const data = s.providers[name];
            const color = providerColors[name] || '#6b6b80';
            const models = Object.entries(data.models || {});
            return `
              <div class="card">
                <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-3)">
                  <span style="width:12px;height:12px;border-radius:50%;background:${color};box-shadow:0 0 8px ${color}"></span>
                  <span style="font-family:var(--font-display);font-weight:600;text-transform:capitalize">${name}</span>
                  ${data.estimatedCost ? `<span class="badge badge-purple" style="margin-left:auto">$${data.estimatedCost.toFixed(4)}</span>` : ''}
                </div>
                <div style="display:flex;gap:var(--space-6);margin-bottom:var(--space-3)">
                  <div>
                    <div style="font-size:var(--text-xs);color:var(--text-muted)">Tokens</div>
                    <div style="font-family:var(--font-mono);font-weight:600;color:var(--text-primary)">${this.formatNumber(data.totalTokens)}</div>
                  </div>
                  <div>
                    <div style="font-size:var(--text-xs);color:var(--text-muted)">Requests</div>
                    <div style="font-family:var(--font-mono);font-weight:600;color:var(--text-primary)">${data.totalRequests}</div>
                  </div>
                </div>
                ${models.length > 0 ? `
                  <div style="border-top:var(--border-subtle);padding-top:var(--space-3)">
                    <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2)">Models</div>
                    ${models.map(([model, mdata]) => `
                      <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);padding:var(--space-1) 0">
                        <span style="color:var(--text-secondary);font-family:var(--font-mono)">${model}</span>
                        <span style="color:var(--text-primary)">${this.formatNumber(mdata.totalTokens)} tok · ${mdata.requests} req</span>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            `;
          }).join('')}
        </div>
      ` : ''}

      <!-- Usage History Timeline -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📈 Usage Timeline</div>
        </div>
        <div style="padding:var(--space-2) 0">
          <canvas id="tokenTimeline"></canvas>
        </div>
        ${(this.stats?.history || []).length === 0 ? `
          <div style="text-align:center;color:var(--text-muted);font-size:var(--text-sm);padding:var(--space-6) 0">
            No usage data yet. Start generating to see the timeline.
          </div>
        ` : ''}
      </div>
    `;

    // Draw charts after DOM is ready
    setTimeout(() => this.drawCharts(), 50);
  },

  drawCharts() {
    const s = this.summary;
    const providerNames = Object.keys(s.providers || {});
    const providerColors = { openai: '#8b5cf6', gemini: '#06d6a0', claude: '#f472b6', deepseek: '#0066cc', ollama: '#f59e0b' };

    // Donut chart
    const donut = document.getElementById('tokenProviderDonut');
    if (donut) {
      const donutData = providerNames.map(name => ({
        value: s.providers[name].totalTokens,
        color: providerColors[name] || '#6b6b80'
      }));
      if (donutData.length === 0) {
        donutData.push({ value: 1, color: 'rgba(139, 92, 246, 0.1)' });
      }
      Charts.drawDonut(donut, donutData, {
        size: 160,
        centerText: this.formatNumber(s.totalTokens),
        centerSubtext: 'total tokens',
        lineWidth: 14
      });
    }

    // Bar chart
    const bar = document.getElementById('tokenBarChart');
    if (bar) {
      const barData = providerNames.map(name => ({
        label: name,
        value: s.providers[name].totalRequests,
        color: providerColors[name] || '#6b6b80',
        colorEnd: (providerColors[name] || '#6b6b80') + '50'
      }));
      if (barData.length > 0) {
        Charts.drawBar(bar, barData, { height: 160 });
      }
    }

    // Timeline
    const timeline = document.getElementById('tokenTimeline');
    if (timeline && this.stats?.history?.length > 1) {
      const values = this.stats.history.map(h => h.tokens);
      Charts.drawMiniLine(timeline, values, '#8b5cf6');
    }
  },

  async refresh() {
    Toast.info('Refreshing token stats...');
    await this.fetchData();
    this.render();
    Toast.success('Stats updated!');
  },

  async resetStats() {
    if (!confirm('Reset all token stats? This cannot be undone.')) return;
    try {
      await API.request('/api/tokens/reset', { method: 'POST' });
      Toast.success('Token stats reset!');
      await this.fetchData();
      this.render();
    } catch (e) {
      Toast.error('Error: ' + e.message);
    }
  },

  formatNumber(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  },

  // Dashboard widget (compact version)
  renderDashboardWidget() {
    const s = this.summary || { totalTokens: 0, totalRequests: 0, costEstimate: 0, providers: {} };
    return `
      <div class="card card-interactive" onclick="Sidebar.navigateTo('tokens')">
        <div class="card-title">📈 Token Usage</div>
        <div style="display:flex;align-items:center;justify-content:center;padding:var(--space-4)">
          <canvas id="dashTokenDonut" width="100" height="100"></canvas>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:var(--text-xs);color:var(--text-muted);padding-top:var(--space-2);border-top:var(--border-subtle)">
          <span>${this.formatNumber(s.totalTokens)} tokens</span>
          <span>$${s.costEstimate.toFixed(4)}</span>
        </div>
      </div>
    `;
  }
};
