/* ========================================
   AI Cinematic OS — Toast Component
   ======================================== */

const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toastContainer');
  },

  show(message, type = 'info', duration = 4000) {
    if (!this.container) this.init();

    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type] || ''}</span><span>${message}</span>`;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, duration);

    return toast;
  },

  success(msg) { return this.show(msg, 'success'); },
  error(msg) { return this.show(msg, 'error', 6000); },
  warning(msg) { return this.show(msg, 'warning'); },
  info(msg) { return this.show(msg, 'info'); }
};
