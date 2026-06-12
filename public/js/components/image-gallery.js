/* ========================================
   AI Cinematic OS — Image Gallery Component
   ======================================== */

const ImageGallery = {
  images: [],

  async init() {
    await this.loadHistory();
    this.renderGallery();
  },

  async loadHistory() {
    try {
      const history = await API.getImageHistory(100);
      this.images = [];
      history.forEach(entry => {
        if (entry.images) {
          entry.images.forEach(img => {
            this.images.push({
              ...img,
              prompt: entry.prompt,
              negativePrompt: entry.negativePrompt,
              backend: entry.backend,
              timestamp: entry.timestamp,
              parameters: entry.parameters
            });
          });
        }
      });
    } catch (e) {
      this.images = [];
    }
  },

  renderGallery() {
    // Inject gallery below image gen panel
    const section = document.getElementById('section-image');
    let gallery = document.getElementById('imageGalleryArea');
    if (!gallery) {
      gallery = document.createElement('div');
      gallery.id = 'imageGalleryArea';
      gallery.style.marginTop = 'var(--space-6)';
      section.appendChild(gallery);
    }

    if (this.images.length === 0) {
      gallery.innerHTML = `
        <div class="card">
          <div class="card-title">📁 Gallery</div>
          <div class="empty-state" style="padding:var(--space-8)">
            <div class="icon">🖼️</div>
            <p>No images generated yet</p>
          </div>
        </div>
      `;
      return;
    }

    gallery.innerHTML = `
      <div class="card">
        <div class="card-header">
          <div class="card-title">📁 Gallery (${this.images.length})</div>
          <button class="btn btn-ghost btn-sm" onclick="ImageGallery.init()">🔄 Refresh</button>
        </div>
        <div class="gallery-grid">
          ${this.images.map((img, idx) => `
            <div class="gallery-item" onclick="ImageGallery.openLightbox(${idx})">
              <img src="${img.url}" alt="${(img.prompt || '').substring(0, 50)}" loading="lazy">
              <div class="overlay">
                <span class="overlay-text">${img.prompt ? img.prompt.substring(0, 60) + '...' : 'Image'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  openLightbox(idx) {
    const img = this.images[idx];
    if (!img) return;

    const lightbox = document.getElementById('lightbox');
    const content = document.getElementById('lightboxContent');
    const time = img.timestamp ? new Date(img.timestamp).toLocaleString() : '';

    content.innerHTML = `
      <img src="${img.url}" alt="Generated image">
      <div class="lightbox-meta">
        <div style="display:flex;gap:var(--space-4);flex-wrap:wrap;font-size:var(--text-sm);">
          <div><strong style="color:var(--text-muted)">Backend:</strong> ${img.backend || '—'}</div>
          <div><strong style="color:var(--text-muted)">Time:</strong> ${time}</div>
        </div>
        <div style="margin-top:var(--space-3)">
          <strong style="color:var(--text-muted);font-size:var(--text-xs)">PROMPT</strong>
          <p style="font-size:var(--text-sm);margin-top:4px;color:var(--text-primary)">${img.prompt || '—'}</p>
        </div>
        ${img.negativePrompt ? `
          <div style="margin-top:var(--space-2)">
            <strong style="color:var(--text-muted);font-size:var(--text-xs)">NEGATIVE</strong>
            <p style="font-size:var(--text-sm);margin-top:4px;color:var(--text-secondary)">${img.negativePrompt}</p>
          </div>
        ` : ''}
        <div style="margin-top:var(--space-3);display:flex;gap:var(--space-2)">
          <button class="btn btn-secondary btn-sm" onclick="ImageGallery.copyPrompt(${idx})">📋 Copy Prompt</button>
          <a class="btn btn-secondary btn-sm" href="${img.url}" download="${img.filename}">💾 Download</a>
        </div>
      </div>
    `;
    lightbox.classList.add('active');
  },

  copyPrompt(idx) {
    const img = this.images[idx];
    if (img?.prompt) {
      navigator.clipboard.writeText(img.prompt);
      Toast.success('Prompt copied!');
    }
  }
};
