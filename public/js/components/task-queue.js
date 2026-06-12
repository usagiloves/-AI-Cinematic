/* ========================================
   AI Cinematic OS — Task Queue Component
   ======================================== */

const TaskQueue = {
  init() {
    this.render();
  },

  render() {
    const container = document.getElementById('section-queue');
    container.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📋 Task Queue</div>
          <button class="btn btn-ghost btn-sm" onclick="TaskQueue.refresh()">🔄 Refresh</button>
        </div>
        <div id="queueList">
          <div class="empty-state" style="padding:var(--space-8)">
            <div class="icon">📋</div>
            <h3>No tasks in queue</h3>
            <p style="color:var(--text-muted)">Tasks will appear here when AI requests are queued</p>
          </div>
        </div>
      </div>
    `;

    // Listen for SSE events
    SSEClient.on('ai:generating', (data) => this.addTask(data, 'generating'));
    SSEClient.on('ai:generated', (data) => this.addTask(data, 'completed'));
    SSEClient.on('image:generating', (data) => this.addTask(data, 'generating'));
    SSEClient.on('image:generated', (data) => this.addTask(data, 'completed'));
  },

  tasks: [],

  addTask(data, status) {
    this.tasks.unshift({
      ...data,
      status,
      timestamp: Date.now()
    });
    if (this.tasks.length > 50) this.tasks.pop();
    this.renderTasks();
  },

  renderTasks() {
    const list = document.getElementById('queueList');
    if (!list || this.tasks.length === 0) return;

    list.innerHTML = this.tasks.map(task => {
      const time = new Date(task.timestamp).toLocaleTimeString();
      const statusBadge = task.status === 'generating'
        ? '<span class="badge badge-pending">⏳ Running</span>'
        : '<span class="badge badge-online">✅ Done</span>';

      return `
        <div style="display:flex;align-items:center;gap:var(--space-3);padding:var(--space-3);border-bottom:var(--border-subtle)">
          <span style="font-size:1.2rem">${task.backend ? '🎨' : '📝'}</span>
          <div style="flex:1">
            <div style="font-size:var(--text-sm);font-weight:500">${task.provider || task.backend || 'Unknown'}</div>
            <div style="font-size:var(--text-xs);color:var(--text-muted)">${time} ${task.tokens ? `• ${task.tokens} tokens` : ''} ${task.latency ? `• ${task.latency}ms` : ''}</div>
          </div>
          ${statusBadge}
        </div>
      `;
    }).join('');
  },

  refresh() {
    Toast.info('Queue refreshed');
  }
};
