/* ========================================
   AI Cinematic OS — Image Generation Panel
   ======================================== */

const ImageGenPanel = {
  backend: 'automatic1111',
  isGenerating: false,
  params: { steps: 20, cfgScale: 7, width: 512, height: 512, seed: -1, batchSize: 1 },
  models: {},
  samplers: {},
  currentImage: null,

  async init() {
    this.backend = AppStorage.getLastImageBackend();
    this.render();
    this.bindEvents();
    this.loadModelsAndSamplers();
  },

  render() {
    const container = document.getElementById('section-image');
    container.innerHTML = `
      <div class="image-gen-layout">
        <div class="image-gen-controls">
          <div class="card">
            <div class="card-title">🎨 Image Generation</div>
            <div style="margin-top:var(--space-4); display:flex; flex-direction:column; gap:var(--space-3)">
              <div class="input-group">
                <label>Backend</label>
                <div class="tabs" id="imageBackendTabs">
                  <button class="tab ${this.backend === 'automatic1111' ? 'active' : ''}" data-backend="automatic1111">🎨 A1111</button>
                  <button class="tab ${this.backend === 'comfyui' ? 'active' : ''}" data-backend="comfyui">🖼️ ComfyUI</button>
                </div>
              </div>
              <div class="input-group">
                <label>Model</label>
                <select class="input select" id="imgModel">
                  <option>Loading models...</option>
                </select>
              </div>
              <div class="input-group">
                <label>Sampler</label>
                <select class="input select" id="imgSampler">
                  <option>Euler a</option>
                </select>
              </div>
              <div class="input-group">
                <label>Positive Prompt</label>
                <textarea class="input textarea" id="imgPrompt" rows="4" placeholder="masterpiece, best quality, anime style, 1girl, sakura blossoms..."></textarea>
              </div>
              <div class="input-group">
                <label>Negative Prompt</label>
                <textarea class="input textarea" id="imgNegPrompt" rows="2" placeholder="low quality, bad anatomy, blurry...">low quality, worst quality, bad anatomy, bad hands, blurry, deformed</textarea>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">⚙️ Parameters</div>
            <div style="margin-top:var(--space-3); display:flex; flex-direction:column; gap:var(--space-3)">
              <div class="param-row">
                <label>Steps</label>
                <input type="range" id="imgSteps" min="1" max="100" value="${this.params.steps}">
                <span class="param-value" id="imgStepsVal">${this.params.steps}</span>
              </div>
              <div class="param-row">
                <label>CFG Scale</label>
                <input type="range" id="imgCfg" min="1" max="30" step="0.5" value="${this.params.cfgScale}">
                <span class="param-value" id="imgCfgVal">${this.params.cfgScale}</span>
              </div>
              <div class="param-row">
                <label>Width</label>
                <input type="range" id="imgWidth" min="256" max="2048" step="64" value="${this.params.width}">
                <span class="param-value" id="imgWidthVal">${this.params.width}</span>
              </div>
              <div class="param-row">
                <label>Height</label>
                <input type="range" id="imgHeight" min="256" max="2048" step="64" value="${this.params.height}">
                <span class="param-value" id="imgHeightVal">${this.params.height}</span>
              </div>
              <div class="input-group" style="flex-direction:row; gap:var(--space-3)">
                <div class="input-group" style="flex:1">
                  <label>Seed</label>
                  <input class="input" type="number" id="imgSeed" value="-1" style="font-family:var(--font-mono)">
                </div>
                <div class="input-group" style="flex:1">
                  <label>Batch</label>
                  <input class="input" type="number" id="imgBatch" value="1" min="1" max="8">
                </div>
              </div>
            </div>
          </div>

          <button class="btn btn-primary btn-lg" id="generateBtn" onclick="ImageGenPanel.generate()" style="width:100%">
            🚀 Generate
          </button>
          <button class="btn btn-danger btn-sm" id="interruptBtn" onclick="ImageGenPanel.interrupt()" style="width:100%; display:none">
            ⏹ Interrupt
          </button>
          <div class="progress" id="imgProgress" style="display:none">
            <div class="progress-fill" id="imgProgressFill" style="width:0%"></div>
          </div>
        </div>

        <div class="image-gen-preview">
          <div class="image-preview-area" id="imagePreview">
            <div class="image-preview-placeholder">
              <div class="icon">🎨</div>
              <h3>Generate an image</h3>
              <p style="color:var(--text-muted);font-size:var(--text-sm)">Configure parameters and click Generate</p>
            </div>
          </div>
          <div style="margin-top:var(--space-3)">
            <button class="btn btn-ghost btn-sm" onclick="Sidebar.navigateTo('image');ImageGallery.init()">📁 View Gallery</button>
          </div>
        </div>
      </div>
    `;
  },

  bindEvents() {
    // Backend tabs
    document.getElementById('imageBackendTabs')?.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (tab) {
        this.backend = tab.dataset.backend;
        AppStorage.setLastImageBackend(this.backend);
        document.querySelectorAll('#imageBackendTabs .tab').forEach(t => t.classList.toggle('active', t === tab));
        this.loadModelsAndSamplers();
      }
    });

    // Sliders
    ['imgSteps', 'imgCfg', 'imgWidth', 'imgHeight'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          document.getElementById(id + 'Val').textContent = el.value;
        });
      }
    });

    // SSE progress
    SSEClient.on('image:progress', (data) => {
      if (this.isGenerating) {
        const fill = document.getElementById('imgProgressFill');
        if (fill) fill.style.width = `${data.percent}%`;
      }
    });
  },

  async loadModelsAndSamplers() {
    try {
      const [models, samplers] = await Promise.all([
        API.getImageModels(this.backend),
        API.getImageSamplers()
      ]);

      this.models = models;
      this.samplers = samplers;

      // Update model select
      const modelSelect = document.getElementById('imgModel');
      const backendModels = models[this.backend] || [];
      if (modelSelect) {
        modelSelect.innerHTML = backendModels.length
          ? backendModels.map(m => `<option value="${m.title || m.name}">${m.title || m.name}</option>`).join('')
          : '<option>No models found</option>';
      }

      // Update sampler select
      const samplerSelect = document.getElementById('imgSampler');
      if (samplerSelect) {
        let samplerList;
        if (this.backend === 'comfyui') {
          samplerList = (samplers.comfyui?.samplers || []);
        } else {
          samplerList = (samplers.automatic1111 || []).map(s => s.name);
        }
        samplerSelect.innerHTML = samplerList.map(s => `<option value="${s}">${s}</option>`).join('') || '<option>Default</option>';
      }
    } catch (e) {
      Toast.warning(`Could not load ${this.backend} models. Is it running?`);
    }
  },

  async generate() {
    const prompt = document.getElementById('imgPrompt')?.value.trim();
    if (!prompt) { Toast.warning('Please enter a prompt'); return; }

    this.isGenerating = true;
    const genBtn = document.getElementById('generateBtn');
    const intBtn = document.getElementById('interruptBtn');
    const progress = document.getElementById('imgProgress');

    genBtn.style.display = 'none';
    intBtn.style.display = 'block';
    progress.style.display = 'block';
    document.getElementById('imgProgressFill').style.width = '0%';

    // Show loading in preview
    document.getElementById('imagePreview').innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:var(--space-4)">
        <div class="loading-spinner"></div>
        <p style="color:var(--text-muted)">Generating with ${this.backend}...</p>
      </div>
    `;

    try {
      const result = await API.txt2img(
        prompt,
        document.getElementById('imgNegPrompt')?.value || '',
        this.backend,
        {
          model: document.getElementById('imgModel')?.value,
          sampler: document.getElementById('imgSampler')?.value,
          steps: parseInt(document.getElementById('imgSteps')?.value) || 20,
          cfgScale: parseFloat(document.getElementById('imgCfg')?.value) || 7,
          width: parseInt(document.getElementById('imgWidth')?.value) || 512,
          height: parseInt(document.getElementById('imgHeight')?.value) || 512,
          seed: parseInt(document.getElementById('imgSeed')?.value) || -1,
          batchSize: parseInt(document.getElementById('imgBatch')?.value) || 1
        }
      );

      if (result.images && result.images.length > 0) {
        const img = result.images[0];
        this.currentImage = img;
        document.getElementById('imagePreview').innerHTML = `
          <img src="${img.url}" alt="Generated image" style="cursor:pointer" onclick="ImageGenPanel.openLightbox('${img.url}')">
        `;
        Toast.success(`Image generated with ${this.backend}!`);
      }
    } catch (err) {
      document.getElementById('imagePreview').innerHTML = `
        <div class="image-preview-placeholder">
          <div class="icon">❌</div>
          <h3>Generation Failed</h3>
          <p style="color:var(--color-accent-red);font-size:var(--text-sm)">${err.message}</p>
        </div>
      `;
      Toast.error(`Image gen failed: ${err.message}`);
    }

    this.isGenerating = false;
    genBtn.style.display = 'block';
    intBtn.style.display = 'none';
    progress.style.display = 'none';
  },

  async interrupt() {
    try {
      await API.interruptImage(this.backend);
      Toast.info('Generation interrupted');
    } catch (e) {
      Toast.error('Failed to interrupt');
    }
  },

  openLightbox(url) {
    const lightbox = document.getElementById('lightbox');
    const content = document.getElementById('lightboxContent');
    content.innerHTML = `<img src="${url}" alt="Generated image">`;
    lightbox.classList.add('active');
  }
};
