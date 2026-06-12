/* ========================================
   AI Cinematic OS — Sidebar Component v2.0
   ======================================== */

const Sidebar = {
  currentSection: 'dashboard',

  navItems: [
    { id: 'dashboard', icon: '📊', label: 'Dashboard', section: 'main' },
    { id: 'chat', icon: '💬', label: 'AI Chat', section: 'main' },
    { id: 'image', icon: '🎨', label: 'Image Gen', section: 'main' },
    { id: 'workflow', icon: '⚡', label: 'Workflows', section: 'main' },
    { id: 'actors', icon: '🎭', label: 'Actor Profiles', section: 'main' },
    { id: 'providers', icon: '🔌', label: 'Providers', section: 'system' },
    { id: 'keys', icon: '🔐', label: 'API Keys', section: 'system' },
    { id: 'tokens', icon: '📈', label: 'Token Monitor', section: 'system' },
    { id: 'queue', icon: '📋', label: 'Task Queue', section: 'system' }
  ],

  init() {
    this.render();
    this.bindEvents();
  },

  render() {
    const sidebar = document.getElementById('sidebar');
    const mainItems = this.navItems.filter(i => i.section === 'main');
    const systemItems = this.navItems.filter(i => i.section === 'system');

    sidebar.innerHTML = `
      <div class="sidebar-header">
        <span class="sidebar-logo-icon">🎬</span>
        <span class="sidebar-logo">AI Cinematic</span>
      </div>
      <nav class="sidebar-nav">
        <div class="nav-section-label">Workspace</div>
        ${mainItems.map(item => `
          <div class="nav-item ${item.id === this.currentSection ? 'active' : ''}" data-section="${item.id}">
            <span class="icon">${item.icon}</span>
            <span>${item.label}</span>
          </div>
        `).join('')}
        <div class="nav-section-label">System</div>
        ${systemItems.map(item => `
          <div class="nav-item ${item.id === this.currentSection ? 'active' : ''}" data-section="${item.id}">
            <span class="icon">${item.icon}</span>
            <span>${item.label}</span>
          </div>
        `).join('')}
      </nav>
      <div class="sidebar-footer">
        <div style="font-size: var(--text-xs); color: var(--text-muted); text-align: center;">
          <span style="background:var(--gradient-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-weight:600">AI Cinematic OS</span>
          <span> v2.0</span>
        </div>
      </div>
    `;
  },

  bindEvents() {
    document.getElementById('sidebar').addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item');
      if (navItem) {
        const section = navItem.dataset.section;
        this.navigateTo(section);
      }
    });

    // Mobile menu
    document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    document.getElementById('sidebarOverlay')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
    });
  },

  navigateTo(section) {
    this.currentSection = section;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });

    // Update sections
    document.querySelectorAll('.section-panel').forEach(el => {
      el.classList.toggle('active', el.id === `section-${section}`);
    });

    // Update header
    const item = this.navItems.find(i => i.id === section);
    if (item) {
      document.getElementById('headerIcon').textContent = item.icon;
      document.getElementById('headerTitle').textContent = item.label;
    }

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');

    // Trigger section-specific init
    if (typeof App !== 'undefined' && App.onSectionChange) {
      App.onSectionChange(section);
    }
  }
};
