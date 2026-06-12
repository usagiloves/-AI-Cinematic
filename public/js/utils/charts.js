/* ========================================
   AI Cinematic OS — Utilities: Charts
   ======================================== */

const Charts = {
  drawDonut(canvas, data, options = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const size = options.size || 120;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const radius = (size / 2) - 10;
    const lineWidth = options.lineWidth || 12;
    const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

    let startAngle = -Math.PI / 2;

    // Background circle
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.08)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    // Data segments
    data.forEach(d => {
      const sliceAngle = (d.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.strokeStyle = d.color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
      startAngle += sliceAngle;
    });

    // Center text
    if (options.centerText) {
      ctx.fillStyle = '#e8e8f0';
      ctx.font = `bold ${size * 0.18}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.centerText, cx, cy - 6);

      if (options.centerSubtext) {
        ctx.fillStyle = '#6b6b80';
        ctx.font = `${size * 0.1}px 'Inter', sans-serif`;
        ctx.fillText(options.centerSubtext, cx, cy + 12);
      }
    }
  },

  drawBar(canvas, data, options = {}) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = options.width || canvas.parentElement?.offsetWidth || 300;
    const height = options.height || 160;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    const padding = { top: 10, right: 10, bottom: 30, left: 10 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;
    const max = Math.max(...data.map(d => d.value), 1);
    const barWidth = Math.min(30, (chartW / data.length) - 6);

    data.forEach((d, i) => {
      const x = padding.left + (i * (chartW / data.length)) + (chartW / data.length - barWidth) / 2;
      const barH = (d.value / max) * chartH;
      const y = padding.top + chartH - barH;

      // Bar with gradient
      const grad = ctx.createLinearGradient(x, y, x, y + barH);
      grad.addColorStop(0, d.color || '#8b5cf6');
      grad.addColorStop(1, d.colorEnd || 'rgba(139,92,246,0.3)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Label
      ctx.fillStyle = '#6b6b80';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(d.label || '', x + barWidth / 2, height - 8);
    });
  },

  drawMiniLine(canvas, values, color = '#8b5cf6') {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.offsetWidth || 200;
    const height = 40;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    if (values.length < 2) return;
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;

    ctx.beginPath();
    values.forEach((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / range) * (height - 8) - 4;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Fill area
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, color.replace(')', ',0.15)').replace('rgb', 'rgba'));
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fill();
  }
};
