/* ========================================
   AI Cinematic OS — Workflow Panel Component (Arona & Human-in-the-Loop Edition)
   ======================================== */

const WorkflowPanel = {
  templates: [],
  isRunning: false,
  currentWorkflow: null,
  stepElapsedTimer: null, // Timer for tracking elapsed time on active step

  async init() {
    await this.loadTemplates();
    this.render();
    this.bindSSE();
  },

  async loadTemplates() {
    try {
      this.templates = await API.getWorkflowTemplates();
    } catch (e) {
      this.templates = [];
    }
  },

  render() {
    const container = document.getElementById('section-workflow');
    container.innerHTML = `
      <div style="display:grid; grid-template-columns: 320px 1fr 340px; gap:var(--panel-gap); align-items:start;">
        <!-- Column 1: Selection & Input -->
        <div style="display:flex; flex-direction:column; gap:var(--space-4);">
          <div class="card">
            <div class="card-title">⚡ Workflow Templates</div>
            <div style="margin-top:var(--space-4); display:flex; flex-direction:column; gap:var(--space-3)">
              ${this.templates.map(t => `
                <div class="card card-interactive" style="cursor:pointer; padding:var(--space-4);" onclick="WorkflowPanel.selectTemplate('${t.id}')" id="wfTpl_${t.id}">
                  <h4 style="font-size:var(--text-base); margin:0;">${t.name}</h4>
                  <p style="font-size:var(--text-xs); color:var(--text-secondary); margin:4px 0 0 0; line-height:1.4;">${t.description}</p>
                  <div style="display:flex; gap:var(--space-2); margin-top:var(--space-3); flex-wrap:wrap">
                    ${t.steps.map(s => `<span class="badge badge-purple" style="font-size:9px;">${s.type === 'image' ? '🎨' : '📝'} ${s.name}</span>`).join('')}
                  </div>
                </div>
              `).join('') || '<div class="empty-state"><p>No templates available</p></div>'}
            </div>
          </div>

          <div class="card">
            <div class="card-title">💡 Input Idea</div>
            <div style="margin-top:var(--space-3)">
              <textarea class="input textarea" id="wfInput" rows="5" style="font-weight:500;" placeholder="Nhập ý tưởng kịch bản, cốt truyện thô hoặc mô tả phân cảnh của bạn..."></textarea>
              <button class="btn btn-primary" id="wfRunBtn" onclick="WorkflowPanel.run()" style="margin-top:var(--space-3); width:100%" disabled>
                ⚡ Run Workflow
              </button>
            </div>
          </div>
        </div>

        <!-- Column 2: Workflow Steps Visualizer -->
        <div style="display:flex; flex-direction:column; gap:var(--space-4);">
          <div class="card" id="wfResultsCard">
            <div class="card-title">📋 Execution Flow</div>
            <div id="wfSteps" style="margin-top:var(--space-4)">
              <div class="empty-state" style="padding:var(--space-6)">
                <div class="icon">⚡</div>
                <p>Hãy chọn một template bên trái và chạy để xem luồng xử lý Agentic.</p>
              </div>
            </div>
          </div>
          <div class="card" style="display:none" id="wfOutputCard">
            <div class="card-title">📄 Aggregated Outputs</div>
            <pre id="wfOutput" style="margin-top:var(--space-3); max-height:none; white-space:pre-wrap; word-break:break-word; font-size:var(--text-sm)"></pre>
          </div>
        </div>

        <!-- Column 3: Arona Assistant & Human-in-the-Loop Editor -->
        <div style="display:flex; flex-direction:column; gap:var(--space-4);">
          <!-- Arona Assistant Widget -->
          <div class="card" id="aronaWidget" style="padding:var(--space-4); border-color:var(--color-accent-purple-glow); box-shadow:var(--shadow-glow-purple); transition:all 0.3s ease;">
            <div style="display:flex; align-items:center; gap:var(--space-3)">
              <div style="width:52px; height:52px; border-radius:50%; border:2px solid var(--color-accent-purple); overflow:hidden; background:var(--color-bg-secondary); flex-shrink:0; box-shadow:0 0 10px var(--color-accent-purple-glow);">
                <img src="/img/357159.jpg" style="width:170%; max-width:none; transform: translate(-30%, -24%) scale(1.1);" alt="Arona">
              </div>
              <div>
                <h4 style="font-size:var(--text-base); color:var(--text-bright); margin:0; display:flex; align-items:center; gap:var(--space-2)">
                  Arona <span class="badge badge-purple" style="font-size:9px; padding:1px 6px;">ASSISTANT</span>
                </h4>
                <p style="font-size:var(--text-xs); color:var(--text-secondary); margin:2px 0 0 0">Shittim Chest OS Trợ Lý</p>
              </div>
            </div>
            <div class="arona-bubble" style="position:relative; background:var(--color-bg-secondary); padding:var(--space-3); border-radius:var(--radius-md); border:var(--border-subtle); min-height:60px; font-size:var(--text-sm); line-height:1.5; color:var(--text-primary); transition:all 0.2s ease; margin-top:var(--space-3); white-space:pre-wrap;">
              <div style="position:absolute; left:20px; top:-8px; width:16px; height:8px; background:var(--color-bg-secondary); clip-path:polygon(50% 0%, 0% 100%, 100% 100%);"></div>
              <span id="aronaSpeech">Chào mừng Sensei trở lại! Hãy chọn một mẫu kịch bản bên trái rồi nhập ý tưởng để bắt đầu nhé! 💙</span>
            </div>
          </div>

          <!-- Human-in-the-Loop Editor -->
          <div class="card" id="humanEditorCard" style="display:none; border-color:var(--color-accent-cyan-glow); box-shadow:var(--shadow-glow-cyan); transition:all 0.3s ease;">
            <div class="card-title">📝 Editorial Board</div>
            <div style="margin-top:var(--space-3); display:flex; flex-direction:column; gap:var(--space-3);">
              <div class="input-group">
                <label id="editorLabel">Step Output</label>
                <textarea class="input textarea" id="editorTextArea" rows="10" style="font-size:var(--text-sm); line-height:1.5; font-family:var(--font-sans); font-weight:500;"></textarea>
              </div>
              <div class="input-group">
                <label>Yêu cầu sửa đổi (Tùy chọn)</label>
                <input type="text" class="input" id="editorRewritePrompt" placeholder="Ví dụ: Viết kết thúc có hậu hơn, làm kịch bản kịch tính hơn...">
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--space-2)">
                <button class="btn btn-secondary" id="editorRewriteBtn" onclick="WorkflowPanel.rewriteStep()">🔄 Viết Lại</button>
                <button class="btn btn-primary" id="editorApproveBtn" onclick="WorkflowPanel.approveStep()">✅ Duyệt & Tiếp tục</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  selectedTemplate: null,

  selectTemplate(id) {
    this.selectedTemplate = id;
    document.querySelectorAll('[id^="wfTpl_"]').forEach(el => {
      el.style.borderColor = el.id === `wfTpl_${id}` ? 'var(--color-accent-purple)' : '';
      el.style.boxShadow = el.id === `wfTpl_${id}` ? 'var(--shadow-glow-purple)' : '';
    });
    const btn = document.getElementById('wfRunBtn');
    if (btn) btn.disabled = false;

    const tpl = this.templates.find(t => t.id === id);
    this.setAronaSpeech(`Dạ, Sensei đã chọn kịch bản "${tpl.name}". Hãy nhập ý tưởng vào khung bên dưới rồi bấm "Run Workflow" để em xử lý nha! 🌟`);
  },

  async run() {
    if (!this.selectedTemplate || this.isRunning) return;
    const input = document.getElementById('wfInput')?.value.trim();
    if (!input) { Toast.warning('Please enter your idea'); return; }

    this.isRunning = true;
    const template = this.templates.find(t => t.id === this.selectedTemplate);
    document.getElementById('wfRunBtn').innerHTML = '<div class="spinner"></div> Running...';
    document.getElementById('wfRunBtn').disabled = true;

    // Show steps UI
    const stepsDiv = document.getElementById('wfSteps');
    stepsDiv.innerHTML = template.steps.map((s, i) => `
      <div class="workflow-step-card" id="wfStepCard_${i}" style="border: 1px solid rgba(255,255,255,0.05); border-radius:var(--radius-md); padding:var(--space-3); margin-bottom:var(--space-3); background: rgba(255,255,255,0.01); transition: all 0.3s ease;">
        <div class="workflow-step" id="wfStep_${i}" style="display:flex; align-items:center; gap:var(--space-3)">
          <div class="step-indicator" style="width:24px; height:24px; border-radius:50%; background:var(--color-bg-tertiary); display:flex; align-items:center; justify-content:center; font-size:var(--text-xs); font-weight:600; flex-shrink:0;">${i + 1}</div>
          <div style="flex:1">
            <h4 style="font-size:var(--text-sm); margin:0">${s.type === 'image' ? '🎨' : '📝'} ${s.name}</h4>
            <p style="font-size:var(--text-xs); color:var(--text-muted); margin:4px 0 0 0">Pending...</p>
          </div>
        </div>
        <div class="step-details" id="wfStepDetails_${i}" style="margin-top:var(--space-3); padding-top:var(--space-3); border-top: 1px dashed rgba(255,255,255,0.08); display:none; max-height:none; font-size:var(--text-xs); line-height:1.5;"></div>
      </div>
    `).join('');

    // Hide previous outputs and editor card
    document.getElementById('wfOutputCard').style.display = 'none';
    document.getElementById('humanEditorCard').style.display = 'none';

    this.currentWorkflow = {
      templateId: this.selectedTemplate,
      input: input,
      steps: template.steps,
      currentStepIndex: 0,
      results: {}
    };

    // Arona receives
    this.setAronaSpeech("Dạ! Em đã tiếp nhận ý tưởng kịch bản của Sensei rồi ạ. Đang khởi chạy chuỗi phân tích đây! ✨");

    // Start elapsed timer for the first step
    this.startElapsedTimer();

    // Execute first step
    this.executeCurrentStep();
  },

  startElapsedTimer() {
    if (this.stepElapsedTimer) clearInterval(this.stepElapsedTimer);
    const startTime = Date.now();
    this.stepElapsedTimer = setInterval(() => {
      const wf = this.currentWorkflow;
      if (!wf) return;
      const index = wf.currentStepIndex;
      const stepEl = document.getElementById(`wfStep_${index}`);
      if (stepEl) {
        const statusText = stepEl.querySelector('p');
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
        if (statusText && statusText.textContent.startsWith('⏳')) {
          statusText.textContent = `⏳ Running... (${timeStr})`;
        }
      }
    }, 1000);
  },

  stopElapsedTimer() {
    if (this.stepElapsedTimer) {
      clearInterval(this.stepElapsedTimer);
      this.stepElapsedTimer = null;
    }
  },

  async executeCurrentStep() {
    const wf = this.currentWorkflow;
    const index = wf.currentStepIndex;
    const step = wf.steps[index];

    // Highlight active step
    const stepEl = document.getElementById(`wfStep_${index}`);
    if (stepEl) {
      stepEl.className = "workflow-step running";
      const statusText = stepEl.querySelector('p');
      if (statusText) statusText.textContent = "⏳ Running...";
    }

    const cardEl = document.getElementById(`wfStepCard_${index}`);
    if (cardEl) {
      cardEl.style.borderColor = 'var(--color-accent-purple-glow)';
      cardEl.style.boxShadow = '0 0 10px rgba(139, 92, 246, 0.15)';
      cardEl.style.background = 'rgba(139, 92, 246, 0.02)';
    }

    const detailsEl = document.getElementById(`wfStepDetails_${index}`);
    if (detailsEl) {
      detailsEl.style.display = 'block';
      detailsEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:var(--space-2); color:var(--text-secondary); padding:var(--space-2); background:rgba(0,0,0,0.05); border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.03);">
          <div class="spinner" style="width:14px; height:14px; border-width:2px; flex-shrink:0;"></div>
          <span>🤖 AI đang khởi tạo mô hình và chuẩn bị phản hồi...</span>
        </div>
      `;
    }

    this.setAronaSpeech(`Dạ, em đang gửi yêu cầu qua bước "${step.name}". Đang tải mô hình, Sensei kiên nhẫn đợi em xíu nha... ⏳`);

    try {
      const result = await API.executeWorkflowStep(wf.templateId, index, wf.input, wf.results);

      // Handle step completion data
      if (step.type === 'text') {
        wf.results[step.id] = result.content;
      } else {
        wf.results[step.id] = result;
      }

      // Update step status UI to completed
      if (stepEl) {
        const statusText = stepEl.querySelector('p');
        if (statusText) {
          statusText.textContent = `✅ Completed (${result.provider || result.backend || ''})`;
        }
      }
      if (cardEl) {
        cardEl.style.borderColor = 'rgba(6, 214, 160, 0.2)';
        cardEl.style.background = 'rgba(6, 214, 160, 0.01)';
        cardEl.style.boxShadow = 'none';
      }

      // Display finalized details content
      if (detailsEl) {
        if (result.content) {
          try {
            const parsed = JSON.parse(result.content);
            detailsEl.innerHTML = `<pre style="white-space:pre-wrap; word-break:break-all; font-family:var(--font-mono); color:var(--text-secondary); margin:0; padding:var(--space-2); background:rgba(0,0,0,0.04); border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.05);">${JSON.stringify(parsed, null, 2)}</pre>`;
          } catch (e) {
            detailsEl.innerHTML = `<div style="white-space:pre-wrap; color:var(--text-secondary); padding:var(--space-2); background:rgba(0,0,0,0.03); border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.03); max-height:none;">${this.escapeHtml(result.content)}</div>`;
          }
        } else if (result.images && Array.isArray(result.images)) {
          detailsEl.innerHTML = `
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap:var(--space-2); margin-top:var(--space-2)">
              ${result.images.map(img => {
                const src = img.url || img;
                return `<img src="${src}" style="width:100%; border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.1); cursor:pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.03)'" onmouseout="this.style.transform='scale(1)'" onclick="window.open('${src}', '_blank')">`;
              }).join('')}
            </div>
          `;
        }
      }

      // HUMAN IN THE LOOP PAUSE!
      if (step.type === 'text') {
        this.setAronaSpeech(`Oa! Kết quả của "${step.name}" đã hoàn thành xuất sắc! 📝 Sensei hãy xem lại ở khung bên phải, biên tập kịch bản hoặc gõ yêu cầu em viết lại nếu chưa ưng ý nhé! Xong rồi bấm "Duyệt & Tiếp tục" nha! 💙`);
        this.showHumanEditor(step.name, result.content);
      } else {
        // If it's an image generation step (usually the final step), proceed immediately
        wf.currentStepIndex++;
        this.proceedToNextStep();
      }

    } catch (err) {
      this.setAronaSpeech(`Huhu... Bước "${step.name}" bị lỗi rồi Sensei ơi! 😭 Báo lỗi: ${err.message}. Sensei xem lại cấu hình hoặc thử chạy lại bước này xem sao nha.`);
      if (stepEl) {
        const statusText = stepEl.querySelector('p');
        if (statusText) statusText.textContent = `❌ Failed: ${err.message}`;
      }
      this.stopElapsedTimer();
      this.isRunning = false;
      const btn = document.getElementById('wfRunBtn');
      if (btn) { btn.innerHTML = '⚡ Run Workflow'; btn.disabled = false; }
    }
  },

  showHumanEditor(stepName, content) {
    const card = document.getElementById('humanEditorCard');
    const label = document.getElementById('editorLabel');
    const textarea = document.getElementById('editorTextArea');
    const rewriteInput = document.getElementById('editorRewritePrompt');

    if (card && label && textarea && rewriteInput) {
      card.style.display = 'block';
      label.textContent = `${stepName} Output`;
      textarea.value = content;
      rewriteInput.value = '';
      
      // Auto-focus textarea for quick editing
      textarea.focus();
    }
  },

  async approveStep() {
    const wf = this.currentWorkflow;
    const index = wf.currentStepIndex;
    const step = wf.steps[index];
    const editedContent = document.getElementById('editorTextArea')?.value;

    if (editedContent !== undefined) {
      wf.results[step.id] = editedContent;
      
      // Update UI with the edited content
      const detailsEl = document.getElementById(`wfStepDetails_${index}`);
      if (detailsEl) {
        try {
          const parsed = JSON.parse(editedContent);
          detailsEl.innerHTML = `<pre style="white-space:pre-wrap; word-break:break-all; font-family:var(--font-mono); color:var(--text-secondary); margin:0; padding:var(--space-2); background:rgba(0,0,0,0.04); border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.05);">${JSON.stringify(parsed, null, 2)}</pre>`;
        } catch (e) {
          detailsEl.innerHTML = `<div style="white-space:pre-wrap; color:var(--text-secondary); padding:var(--space-2); background:rgba(0,0,0,0.03); border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.03); max-height:200px; overflow-y:auto;">${this.escapeHtml(editedContent)}</div>`;
        }
      }
    }

    // Hide editor card
    document.getElementById('humanEditorCard').style.display = 'none';

    // Move to next step
    wf.currentStepIndex++;
    this.startElapsedTimer(); // Reset timer for next step
    this.proceedToNextStep();
  },

  async rewriteStep() {
    const wf = this.currentWorkflow;
    const index = wf.currentStepIndex;
    const step = wf.steps[index];
    const rewritePrompt = document.getElementById('editorRewritePrompt')?.value.trim();

    if (!rewritePrompt) {
      Toast.warning('Hãy nhập chỉ dẫn viết lại kịch bản');
      return;
    }

    this.setAronaSpeech(`Dạ, em hiểu rồi! Em đang yêu cầu AI viết lại bước "${step.name}" theo chỉ dẫn: "${rewritePrompt}". Đang chạy đây ạ! ⏳`);
    document.getElementById('humanEditorCard').style.display = 'none';

    // Enrich prompt with rewrite feedback
    const originalPrompt = wf.input;
    const enrichedInput = `${originalPrompt}\n\n[REWRITE REQUIREMENT]: Please modify your previous output to satisfy this user feedback: "${rewritePrompt}"`;

    // Highlight UI
    const stepEl = document.getElementById(`wfStep_${index}`);
    if (stepEl) {
      const statusText = stepEl.querySelector('p');
      if (statusText) statusText.textContent = "⏳ Rewriting...";
    }

    const detailsEl = document.getElementById(`wfStepDetails_${index}`);
    if (detailsEl) {
      detailsEl.innerHTML = `
        <div style="display:flex; align-items:center; gap:var(--space-2); color:var(--text-secondary); padding:var(--space-2); background:rgba(0,0,0,0.05); border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.03);">
          <div class="spinner" style="width:14px; height:14px; border-width:2px; flex-shrink:0;"></div>
          <span>🤖 AI đang sửa đổi kịch bản theo phản hồi của bạn...</span>
        </div>
      `;
    }

    try {
      const result = await API.executeWorkflowStep(wf.templateId, index, enrichedInput, wf.results);

      wf.results[step.id] = result.content;

      if (stepEl) {
        const statusText = stepEl.querySelector('p');
        if (statusText) statusText.textContent = `✅ Completed (${result.provider || result.backend || ''})`;
      }

      if (detailsEl) {
        try {
          const parsed = JSON.parse(result.content);
          detailsEl.innerHTML = `<pre style="white-space:pre-wrap; word-break:break-all; font-family:var(--font-mono); color:var(--text-secondary); margin:0; padding:var(--space-2); background:rgba(0,0,0,0.04); border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.05);">${JSON.stringify(parsed, null, 2)}</pre>`;
        } catch (e) {
          detailsEl.innerHTML = `<div style="white-space:pre-wrap; color:var(--text-secondary); padding:var(--space-2); background:rgba(0,0,0,0.03); border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.03); max-height:none;">${this.escapeHtml(result.content)}</div>`;
        }
      }

      this.setAronaSpeech(`Oa! Bản viết lại của bước "${step.name}" đã hoàn thành xong rồi! Sensei xem thử xem đã vừa ý chưa nha! 💙`);
      this.showHumanEditor(step.name, result.content);

    } catch (err) {
      this.setAronaSpeech(`Ui da... Viết lại bước "${step.name}" bị lỗi mất tiêu rồi: ${err.message}. Sensei kiểm tra lại nha!`);
      Toast.error(`Rewrite failed: ${err.message}`);
      this.showHumanEditor(step.name, wf.results[step.id] || '');
    }
  },

  proceedToNextStep() {
    const wf = this.currentWorkflow;
    if (wf.currentStepIndex < wf.steps.length) {
      this.executeCurrentStep();
    } else {
      // Completed!
      this.stopElapsedTimer();
      this.isRunning = false;
      const btn = document.getElementById('wfRunBtn');
      if (btn) { btn.innerHTML = '⚡ Run Workflow'; btn.disabled = false; }

      this.setAronaSpeech("Tuyệt vời, Sensei ơi! Chuỗi Workflow đã hoàn thành thành công mỹ mãn rồi! Kết quả kịch bản và tranh minh họa cinematic đẹp lung linh luôn! 🎬✨💙");
      Toast.success('Workflow completed successfully!');

      // Show output card with full aggregate results
      const outputCard = document.getElementById('wfOutputCard');
      const outputEl = document.getElementById('wfOutput');
      if (outputCard && outputEl) {
        outputCard.style.display = 'block';
        let outputText = '';
        for (const [key, value] of Object.entries(wf.results || {})) {
          outputText += `── ${key.toUpperCase()} ──\n`;
          if (typeof value === 'string') {
            outputText += value + '\n\n';
          } else {
            outputText += JSON.stringify(value, null, 2) + '\n\n';
          }
        }
        outputEl.textContent = outputText;
      }
    }
  },

  setAronaSpeech(speech) {
    const aronaSpeech = document.getElementById('aronaSpeech');
    if (aronaSpeech) {
      aronaSpeech.textContent = speech;
      
      const bubble = document.querySelector('.arona-bubble');
      if (bubble) {
        bubble.style.transform = 'scale(1.02)';
        setTimeout(() => bubble.style.transform = 'none', 200);
      }
    }
  },

  bindSSE() {
    // SSE Progress stream binder
    SSEClient.on('workflow:step:progress', (data) => {
      // Direct stream updates
      const detailsEl = document.getElementById(`wfStepDetails_${data.stepIndex}`);
      if (detailsEl) {
        detailsEl.style.display = 'block';
        
        try {
          const parsed = JSON.parse(data.content);
          detailsEl.innerHTML = `<pre style="white-space:pre-wrap; word-break:break-all; font-family:var(--font-mono); color:var(--text-secondary); margin:0; padding:var(--space-2); background:rgba(0,0,0,0.04); border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.05);">${JSON.stringify(parsed, null, 2)}<span class="typing-cursor" style="color:var(--color-accent-purple); animation: blink 0.8s infinite; margin-left:2px; font-weight:bold;">▋</span></pre>`;
        } catch (e) {
          detailsEl.innerHTML = `<div style="white-space:pre-wrap; color:var(--text-secondary); padding:var(--space-2); background:rgba(0,0,0,0.03); border-radius:var(--radius-sm); border:1px solid rgba(255,255,255,0.03); max-height:none;">${WorkflowPanel.escapeHtml(data.content)}<span class="typing-cursor" style="color:var(--color-accent-purple); animation: blink 0.8s infinite; margin-left:2px; font-weight:bold;">▋</span></div>`;
        }
        
        detailsEl.scrollTop = detailsEl.scrollHeight;
      }

      // Proactively update Arona Speech in real-time describing what she is writing
      const wf = this.currentWorkflow;
      if (wf && wf.steps[data.stepIndex]) {
        const step = wf.steps[data.stepIndex];
        
        // Dynamic stats
        const wordCount = data.content.split(/\s+/).filter(Boolean).length;
        
        // Get clean preview slice
        let cleanText = data.content.trim().replace(/[\#\*\_`\[\]]/g, '');
        const maxLen = 80;
        const preview = cleanText.length > maxLen 
          ? '...' + cleanText.substring(cleanText.length - maxLen)
          : cleanText;
          
        this.setAronaSpeech(`Em đang ghi chép kịch bản cho bước "${step.name}" nè Sensei! Đã viết được ${wordCount} từ rồi đó... ✍️\n\n"${preview} ▋"`);
      }
    });

    // SSE Keepalive listener — server sends heartbeat every 15s during long AI thinking
    SSEClient.on('workflow:step:keepalive', (data) => {
      const stepEl = document.getElementById(`wfStep_${data.stepIndex}`);
      if (stepEl) {
        const statusText = stepEl.querySelector('p');
        if (statusText) {
          const minutes = Math.floor(data.elapsed / 60);
          const seconds = data.elapsed % 60;
          const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
          if (statusText.textContent.startsWith('⏳')) {
            statusText.textContent = `⏳ Model đang suy nghĩ... (${timeStr})`;
          }
        }
      }

      // Update Arona speech if no tokens received yet
      const wf = this.currentWorkflow;
      if (wf && wf.steps[data.stepIndex]) {
        const step = wf.steps[data.stepIndex];
        const detailsEl = document.getElementById(`wfStepDetails_${data.stepIndex}`);
        // Only update Arona if we haven't started receiving content yet
        if (detailsEl && detailsEl.querySelector('.spinner')) {
          const providerLabel = data.provider ? ` (${data.provider})` : '';
          this.setAronaSpeech(`Model AI${providerLabel} đang suy nghĩ sâu cho bước "${step.name}"... Đã chờ ${Math.round(data.elapsed)}s rồi. Sensei kiên nhẫn nhé, em vẫn đang kết nối ổn định! 🔄`);
        }
      }
    });

    // SSE Fallback listener — triggered when an AI provider fails and falls back to the next one
    SSEClient.on('workflow:step:fallback', (data) => {
      const wf = this.currentWorkflow;
      if (wf && wf.steps[data.stepIndex]) {
        const step = wf.steps[data.stepIndex];
        const msg = `⚠️ Sensei ơi, kết nối với ${data.failedProvider} bị lỗi: ${data.error}. Em đang tự động chuyển sang nhà cung cấp tiếp theo nha!`;
        this.setAronaSpeech(msg);
        Toast.warning(`Provider ${data.failedProvider} failed. Falling back to next...`);
      }
    });
  },

  escapeHtml(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
};
