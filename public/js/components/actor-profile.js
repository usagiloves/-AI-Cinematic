/* ========================================
   AI Cinematic OS — Actor Profile Component
   ======================================== */

const ActorProfile = {
  actors: [],
  editingId: null,

  async init() {
    await this.loadActors();
    this.render();
  },

  async loadActors() {
    try {
      this.actors = await API.request('/api/actors');
    } catch (e) {
      this.actors = [];
    }
  },

  render() {
    const container = document.getElementById('section-actors');
    if (!container) return;

    const avatarEmojis = ['🧑‍🎤', '👩‍🎨', '🧙', '🦸', '👸', '🥷', '🧝', '🎭', '👨‍🚀', '🧛'];

    container.innerHTML = `
      <div class="section-header">
        <h3>🎭 Actor Profiles</h3>
        <button class="btn btn-primary" onclick="ActorProfile.showForm()">
          ✨ New Actor
        </button>
      </div>

      <div class="card" style="margin-bottom:var(--space-5);background:var(--gradient-hero);background-size:200% 200%;animation:gradientShift 8s ease-in-out infinite">
        <div style="display:flex;align-items:center;gap:var(--space-4)">
          <div style="font-size:2.5rem">🎭</div>
          <div>
            <div style="font-family:var(--font-display);font-weight:700;font-size:var(--text-lg);color:var(--text-bright)">Character Consistency Engine</div>
            <div style="color:var(--text-secondary);font-size:var(--text-sm);margin-top:2px">
              Tạo hồ sơ diễn viên ảo để duy trì nhất quán nhân vật trong workflow AI.
              Mô tả nhân vật sẽ tự động được inject vào prompt khi chạy workflow.
            </div>
          </div>
        </div>
      </div>

      <!-- Actor Form Modal -->
      <div id="actorFormContainer" style="display:none;margin-bottom:var(--space-5)">
        <div class="card card-elevated">
          <div class="card-header">
            <div class="card-title" id="actorFormTitle">✨ Tạo Actor Mới</div>
            <button class="btn btn-ghost btn-sm" onclick="ActorProfile.hideForm()">✕</button>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-4)">
            <div class="input-group">
              <label>Tên nhân vật *</label>
              <input class="input" id="actorName" placeholder="Ví dụ: Sakura" />
            </div>
            <div class="input-group">
              <label>Giới tính</label>
              <select class="input select" id="actorGender">
                <option value="">-- Chọn --</option>
                <option value="female">Nữ (Female)</option>
                <option value="male">Nam (Male)</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div class="input-group">
              <label>Kiểu tóc</label>
              <input class="input" id="actorHair" placeholder="Ví dụ: long black" />
            </div>
            <div class="input-group">
              <label>Trang phục</label>
              <input class="input" id="actorOutfit" placeholder="Ví dụ: school uniform, red scarf" />
            </div>
          </div>
          <div class="input-group" style="margin-top:var(--space-4)">
            <label>Mô tả chi tiết</label>
            <textarea class="input textarea" id="actorDesc" placeholder="Mô tả ngoại hình, phong cách, tính cách nhân vật..."></textarea>
          </div>
          <div class="input-group" style="margin-top:var(--space-3)">
            <label>Tags / Traits (ngăn bởi dấu phẩy)</label>
            <input class="input" id="actorTraits" placeholder="Ví dụ: anime, blue eyes, petite, cheerful" />
          </div>
          <div style="display:flex;gap:var(--space-3);margin-top:var(--space-4);justify-content:flex-end">
            <button class="btn btn-secondary" onclick="ActorProfile.hideForm()">Hủy</button>
            <button class="btn btn-primary" onclick="ActorProfile.saveActor()">
              💾 Lưu Actor
            </button>
          </div>
        </div>
      </div>

      <!-- Actors Grid -->
      ${this.actors.length === 0 ? `
        <div class="empty-state">
          <div class="icon">🎭</div>
          <div style="font-size:var(--text-base);color:var(--text-secondary)">Chưa có actor nào</div>
          <div style="font-size:var(--text-sm);color:var(--text-muted)">Tạo actor mới để bắt đầu xây dựng nhất quán nhân vật</div>
          <button class="btn btn-primary" onclick="ActorProfile.showForm()">✨ Tạo Actor Đầu Tiên</button>
        </div>
      ` : `
        <div class="actor-grid">
          ${this.actors.map((actor, i) => {
            const emoji = avatarEmojis[i % avatarEmojis.length];
            const traits = actor.traits || [];
            return `
              <div class="card actor-card">
                <div style="display:flex;align-items:flex-start;gap:var(--space-4);margin-bottom:var(--space-3)">
                  <div class="actor-avatar">${emoji}</div>
                  <div class="actor-details">
                    <div class="actor-name">${actor.name}</div>
                    <div class="actor-desc">${[actor.gender, actor.hairStyle ? actor.hairStyle + ' hair' : '', actor.outfit].filter(Boolean).join(' · ') || 'Chưa có mô tả'}</div>
                    ${traits.length > 0 ? `
                      <div class="actor-traits">
                        ${traits.map(t => `<span class="chip chip-active">${t}</span>`).join('')}
                      </div>
                    ` : ''}
                  </div>
                </div>
                ${actor.description ? `
                  <div style="font-size:var(--text-xs);color:var(--text-secondary);line-height:1.5;padding:var(--space-3);background:var(--color-bg-deep);border-radius:var(--radius-sm);margin-bottom:var(--space-3)">
                    "${actor.description}"
                  </div>
                ` : ''}
                <div class="divider"></div>
                <div style="display:flex;gap:var(--space-2);justify-content:flex-end">
                  <button class="btn btn-ghost btn-sm" onclick="ActorProfile.copyPrompt('${actor.id}')" data-tooltip="Copy prompt">📋 Prompt</button>
                  <button class="btn btn-ghost btn-sm" onclick="ActorProfile.editActor('${actor.id}')">✏️ Sửa</button>
                  <button class="btn btn-danger btn-sm" onclick="ActorProfile.deleteActor('${actor.id}')">🗑️</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  },

  showForm(actor = null) {
    const form = document.getElementById('actorFormContainer');
    if (!form) return;
    form.style.display = 'block';

    if (actor) {
      this.editingId = actor.id;
      document.getElementById('actorFormTitle').textContent = '✏️ Sửa Actor';
      document.getElementById('actorName').value = actor.name || '';
      document.getElementById('actorGender').value = actor.gender || '';
      document.getElementById('actorHair').value = actor.hairStyle || '';
      document.getElementById('actorOutfit').value = actor.outfit || '';
      document.getElementById('actorDesc').value = actor.description || '';
      document.getElementById('actorTraits').value = (actor.traits || []).join(', ');
    } else {
      this.editingId = null;
      document.getElementById('actorFormTitle').textContent = '✨ Tạo Actor Mới';
      document.getElementById('actorName').value = '';
      document.getElementById('actorGender').value = '';
      document.getElementById('actorHair').value = '';
      document.getElementById('actorOutfit').value = '';
      document.getElementById('actorDesc').value = '';
      document.getElementById('actorTraits').value = '';
    }

    document.getElementById('actorName').focus();
  },

  hideForm() {
    const form = document.getElementById('actorFormContainer');
    if (form) form.style.display = 'none';
    this.editingId = null;
  },

  async saveActor() {
    const name = document.getElementById('actorName').value.trim();
    if (!name) {
      Toast.error('Vui lòng nhập tên nhân vật');
      return;
    }

    const data = {
      id: this.editingId || undefined,
      name,
      gender: document.getElementById('actorGender').value,
      hairStyle: document.getElementById('actorHair').value.trim(),
      outfit: document.getElementById('actorOutfit').value.trim(),
      description: document.getElementById('actorDesc').value.trim(),
      traits: document.getElementById('actorTraits').value.split(',').map(t => t.trim()).filter(Boolean)
    };

    try {
      await API.request('/api/actors', { method: 'POST', body: data });
      Toast.success(this.editingId ? 'Đã cập nhật actor!' : 'Đã tạo actor mới!');
      this.hideForm();
      await this.loadActors();
      this.render();
    } catch (e) {
      Toast.error('Lỗi: ' + e.message);
    }
  },

  editActor(id) {
    const actor = this.actors.find(a => a.id === id);
    if (actor) this.showForm(actor);
  },

  async deleteActor(id) {
    if (!confirm('Xóa actor này?')) return;
    try {
      await API.request(`/api/actors/${id}`, { method: 'DELETE' });
      Toast.success('Đã xóa actor');
      await this.loadActors();
      this.render();
    } catch (e) {
      Toast.error('Lỗi: ' + e.message);
    }
  },

  async copyPrompt(id) {
    try {
      const result = await API.request(`/api/actors/${id}/generate-prompt`, { method: 'POST' });
      await navigator.clipboard.writeText(result.promptFragment);
      Toast.success('Đã copy prompt fragment!');
    } catch (e) {
      Toast.error('Lỗi: ' + e.message);
    }
  },

  // Get all actors for workflow integration
  getActors() {
    return this.actors;
  },

  // Generate prompt fragment for a specific actor
  getPromptForActor(id) {
    const actor = this.actors.find(a => a.id === id);
    if (!actor) return '';
    const parts = [];
    if (actor.name) parts.push(actor.name);
    if (actor.gender) parts.push(actor.gender);
    if (actor.hairStyle) parts.push(`${actor.hairStyle} hair`);
    if (actor.outfit) parts.push(`wearing ${actor.outfit}`);
    if (actor.description) parts.push(actor.description);
    if (actor.traits && actor.traits.length > 0) parts.push(actor.traits.join(', '));
    return parts.join(', ');
  }
};
