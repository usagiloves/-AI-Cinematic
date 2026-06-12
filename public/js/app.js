/* ========================================
   AI Cinematic OS — App Main v2.0
   ======================================== */

const App = {
  healthData: null,

  async init() {
    console.log('🎬 AI Cinematic OS v2.0 initializing...');

    // Init particles
    this.initParticles();

    // Init toast first (other components use it)
    Toast.init();

    // Connect SSE
    SSEClient.connect();

    // Init sidebar
    Sidebar.init();

    // Load providers data
    await ProviderCards.init();

    // Init all panels
    ChatPanel.init();
    ImageGenPanel.init();
    WorkflowPanel.init();
    KeyManager.init();
    TaskQueue.init();

    // Init token monitor with data
    await TokenMonitor.fetchData();

    // Init actor profiles
    await ActorProfile.init();

    // Render dashboard
    await this.renderDashboard();

    // Lightbox close handlers
    document.getElementById('lightboxClose')?.addEventListener('click', () => {
      document.getElementById('lightbox').classList.remove('active');
    });
    document.getElementById('lightbox')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        e.currentTarget.classList.remove('active');
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.getElementById('lightbox').classList.remove('active');
        document.getElementById('sidebar').classList.remove('open');
      }
    });

    console.log('🎬 AI Cinematic OS v2.0 ready!');
    Toast.success('AI Cinematic OS loaded!');
  },

  onSectionChange(section) {
    switch (section) {
      case 'dashboard':
        this.renderDashboard();
        break;
      case 'providers':
        ProviderCards.startHealthCheck();
        break;
      case 'image':
        ImageGallery.init();
        break;
      case 'keys':
        KeyManager.init();
        break;
      case 'tokens':
        TokenMonitor.init();
        break;
      case 'actors':
        ActorProfile.init();
        break;
    }
  },

  async renderDashboard() {
    const container = document.getElementById('section-dashboard');
    const tokenSummary = TokenMonitor.summary || { totalTokens: 0, totalRequests: 0, costEstimate: 0, providers: {} };
    const actorCount = ActorProfile.actors?.length || 0;

    container.innerHTML = `
      <!-- Hero Section -->
      <div class="hero-section">
        <div style="display:flex;align-items:center;gap:var(--space-5)">
          <div style="font-size:3.5rem;animation:float 4s ease-in-out infinite">🎬</div>
          <div>
            <div class="hero-title">AI Cinematic OS</div>
            <div class="hero-subtitle">Multi-provider AI workflow dashboard — Text generation, image creation, and cinematic workflow automation.</div>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="stats-grid">
        <div class="card stat-card-dashboard" onclick="Sidebar.navigateTo('chat')">
          <span class="stat-icon">💬</span>
          <h4 style="font-size:var(--text-sm)">AI Chat</h4>
          <p style="font-size:var(--text-xs);color:var(--text-muted)">Start chatting</p>
        </div>
        <div class="card stat-card-dashboard" onclick="Sidebar.navigateTo('image')">
          <span class="stat-icon">🎨</span>
          <h4 style="font-size:var(--text-sm)">Image Gen</h4>
          <p style="font-size:var(--text-xs);color:var(--text-muted)">A1111 / ComfyUI</p>
        </div>
        <div class="card stat-card-dashboard" onclick="Sidebar.navigateTo('workflow')">
          <span class="stat-icon">⚡</span>
          <h4 style="font-size:var(--text-sm)">Workflows</h4>
          <p style="font-size:var(--text-xs);color:var(--text-muted)">Automated pipelines</p>
        </div>
        <div class="card stat-card-dashboard" onclick="Sidebar.navigateTo('actors')">
          <span class="stat-icon">🎭</span>
          <h4 style="font-size:var(--text-sm)">Actors</h4>
          <p style="font-size:var(--text-xs);color:var(--text-muted)">${actorCount} profile${actorCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      <!-- Live Stats Bar -->
      <div class="card" style="margin-bottom:var(--space-5);padding:var(--space-4) var(--space-5)">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-4)">
          <div style="display:flex;align-items:center;gap:var(--space-6)">
            <div style="text-align:center">
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px">TOKENS</div>
              <div style="font-family:var(--font-mono);font-weight:700;color:var(--color-accent-purple);font-size:var(--text-lg)">${TokenMonitor.formatNumber(tokenSummary.totalTokens)}</div>
            </div>
            <div style="width:1px;height:28px;background:rgba(139,92,246,0.15)"></div>
            <div style="text-align:center">
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px">REQUESTS</div>
              <div style="font-family:var(--font-mono);font-weight:700;color:var(--color-accent-cyan);font-size:var(--text-lg)">${tokenSummary.totalRequests}</div>
            </div>
            <div style="width:1px;height:28px;background:rgba(139,92,246,0.15)"></div>
            <div style="text-align:center">
              <div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:2px">EST. COST</div>
              <div style="font-family:var(--font-mono);font-weight:700;color:var(--color-accent-amber);font-size:var(--text-lg)">$${tokenSummary.costEstimate.toFixed(4)}</div>
            </div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="Sidebar.navigateTo('tokens')">📈 Details →</button>
        </div>
      </div>

      <!-- Providers -->
      <div class="section-header">
        <h3>🔌 Provider Status</h3>
        <button class="btn btn-ghost btn-sm" onclick="Sidebar.navigateTo('providers')">View all →</button>
      </div>
      <div class="grid-auto" style="margin-bottom:var(--space-5)">
        ${ProviderCards.renderDashboardCards()}
      </div>

      <!-- Workflow & Token Overview -->
      <div class="grid-2">
        <div class="card">
          <div class="card-title">⚡ Workflow Architecture</div>
          <div style="margin-top:var(--space-4);display:flex;flex-direction:column;gap:var(--space-2)">
            ${[
              { step: '1', text: 'User nhập ý tưởng', icon: '💡' },
              { step: '2', text: 'AI tạo story structure', icon: '✨' },
              { step: '3', text: 'AI tối ưu cinematic prompts', icon: '🔗' },
              { step: '4', text: 'A1111 / ComfyUI generate ảnh', icon: '🎨' },
              { step: '5', text: 'Actor consistency check', icon: '🎭' },
              { step: '6', text: 'Dashboard cập nhật realtime', icon: '📊' }
            ].map(s => `
              <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-2) var(--space-3);border-radius:var(--radius-sm);background:var(--color-bg-secondary);border:var(--border-subtle);transition:all var(--transition-fast)" onmouseenter="this.style.borderColor='rgba(139,92,246,0.3)';this.style.transform='translateX(4px)'" onmouseleave="this.style.borderColor='';this.style.transform=''">
                <span style="font-size:1.1rem">${s.icon}</span>
                <span style="font-size:var(--text-sm);color:var(--text-secondary)">
                  <strong style="color:var(--color-accent-purple)">Step ${s.step}</strong> — ${s.text}
                </span>
              </div>
            `).join('')}
          </div>
        </div>
        ${TokenMonitor.renderDashboardWidget()}
      </div>
    `;

    // Render mini donut
    setTimeout(() => {
      const donut = document.getElementById('dashTokenDonut');
      if (donut) {
        const providerColors = { openai: '#8b5cf6', gemini: '#06d6a0', claude: '#f472b6', deepseek: '#0066cc', ollama: '#f59e0b' };
        const providers = Object.keys(tokenSummary.providers || {});
        const donutData = providers.map(name => ({
          value: tokenSummary.providers[name].totalTokens,
          color: providerColors[name] || '#6b6b80'
        }));
        if (donutData.length === 0 || donutData.every(d => d.value === 0)) {
          donutData.push({ value: 1, color: 'rgba(139, 92, 246, 0.08)' });
        }
        Charts.drawDonut(donut, donutData, {
          size: 100,
          centerText: TokenMonitor.formatNumber(tokenSummary.totalTokens),
          centerSubtext: 'tokens',
          lineWidth: 10
        });
      }
    }, 100);
  },

  initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;

    const colors = [
      'var(--color-accent-purple)',
      'var(--color-accent-cyan)',
      'var(--color-accent-magenta)',
      'rgba(139, 92, 246, 0.6)',
      'rgba(6, 214, 160, 0.6)'
    ];

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      const isDrift = Math.random() > 0.5;
      particle.className = isDrift ? 'particle particle-drift' : 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 10 + 's';
      particle.style.animationDuration = (8 + Math.random() * 8) + 's';

      particle.style.background = colors[Math.floor(Math.random() * colors.length)];
      const size = 1 + Math.random() * 3;
      particle.style.width = size + 'px';
      particle.style.height = size + 'px';
      particle.style.boxShadow = `0 0 ${size * 3}px currentColor`;

      container.appendChild(particle);
    }
  }
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
