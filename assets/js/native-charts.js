(function () {
  const ORANGE = '#ff5a19';
  const INK = '#212121';
  const PAPER = '#f1eeee';

  function darkMode() {
    return document.documentElement.classList.contains('dark');
  }

  function palette() {
    const dark = darkMode();
    return {
      primary: ORANGE,
      secondary: dark ? '#f1eeee' : '#212121',
      text: dark ? '#f1eeee' : '#212121',
      muted: dark ? 'rgba(241,238,238,.62)' : 'rgba(33,33,33,.58)',
      grid: dark ? 'rgba(241,238,238,.12)' : 'rgba(33,33,33,.10)',
      softGrid: dark ? 'rgba(241,238,238,.07)' : 'rgba(33,33,33,.06)',
      card: dark ? '#1e1e1e' : '#ffffff',
      red: '#ef4444',
      blue: '#3b82f6'
    };
  }

  function setup(canvas) {
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(320, rect.width || canvas.clientWidth || 640);
    const height = Math.max(220, rect.height || canvas.clientHeight || 360);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    return { ctx, width, height };
  }

  function niceNumber(value) {
    if (!isFinite(value)) return '0';
    const abs = Math.abs(value);
    if (abs >= 1_000_000) return (value / 1_000_000).toFixed(1).replace('.', ',') + 'M';
    if (abs >= 1_000) return (value / 1_000).toFixed(1).replace('.', ',') + 'k';
    if (abs < 0.01 && abs > 0) return value.toFixed(4).replace('.', ',');
    if (abs < 1) return value.toFixed(2).replace('.', ',');
    return value.toFixed(1).replace('.', ',');
  }

  function pct(value) {
    return (Number(value) * 100).toFixed(1).replace('.', ',') + '%';
  }

  function parseDateLabel(date, short) {
    const d = new Date(date + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return date;
    return d.toLocaleDateString('pt-BR', short ? { month: 'short', year: '2-digit' } : { day: '2-digit', month: 'short', year: '2-digit' });
  }

  function extent(values, padRatio = 0.08) {
    let min = Infinity;
    let max = -Infinity;
    values.forEach(v => {
      const n = Number(v);
      if (Number.isFinite(n)) {
        min = Math.min(min, n);
        max = Math.max(max, n);
      }
    });
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const pad = (max - min) * padRatio;
    return [min - pad, max + pad];
  }

  function drawGrid(ctx, x, y, w, h, minY, maxY, opts = {}) {
    const c = palette();
    ctx.save();
    ctx.strokeStyle = c.grid;
    ctx.fillStyle = c.muted;
    ctx.lineWidth = 1;
    ctx.font = '12px Geist Mono, monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const py = y + (h * i / 4);
      const value = maxY - (maxY - minY) * i / 4;
      ctx.beginPath();
      ctx.moveTo(x, py);
      ctx.lineTo(x + w, py);
      ctx.stroke();
      ctx.fillText(opts.percent ? pct(value) : niceNumber(value), x - 10, py);
    }
    ctx.restore();
  }

  function downsample(rows, limit = 420) {
    if (!rows || rows.length <= limit) return rows || [];
    const step = Math.ceil(rows.length / limit);
    return rows.filter((_, i) => i % step === 0 || i === rows.length - 1);
  }

  function cumulativeReturns(rows, startIndex = 0) {
    let obs = 1;
    let pred = 1;
    return rows.slice(startIndex).map(row => {
      obs *= 1 + Number(row.Observado || 0);
      pred *= 1 + Number(row.Previsto || 0);
      return {
        date: row.Date,
        observado: obs - 1,
        previsto: pred - 1
      };
    });
  }

  function drawLegend(ctx, items, x, y) {
    const c = palette();
    ctx.save();
    ctx.font = '12px Geist Mono, monospace';
    ctx.textBaseline = 'middle';
    let cursor = x;
    items.forEach(item => {
      ctx.fillStyle = item.color;
      ctx.beginPath();
      ctx.arc(cursor + 5, y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = c.muted;
      ctx.fillText(item.label, cursor + 16, y);
      cursor += ctx.measureText(item.label).width + 52;
    });
    ctx.restore();
  }

  function drawTooltip(ctx, lines, x, y, chartW, chartH) {
    const c = palette();
    ctx.save();
    ctx.font = '12px Geist Mono, monospace';
    const paddingX = 12;
    const paddingY = 9;
    const lineH = 18;
    const textW = Math.max(...lines.map(line => ctx.measureText(line.text).width));
    const boxW = textW + paddingX * 2;
    const boxH = lines.length * lineH + paddingY * 2 - 2;
    let bx = x + 14;
    let by = y - boxH - 12;
    if (bx + boxW > chartW - 8) bx = x - boxW - 14;
    if (by < 8) by = y + 14;
    if (by + boxH > chartH - 8) by = chartH - boxH - 8;

    ctx.shadowColor = darkMode() ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.16)';
    ctx.shadowBlur = 18;
    ctx.fillStyle = darkMode() ? 'rgba(30,30,30,.96)' : 'rgba(255,255,255,.96)';
    roundedRect(ctx, bx, by, boxW, boxH, 14);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = darkMode() ? 'rgba(241,238,238,.12)' : 'rgba(33,33,33,.08)';
    ctx.stroke();

    lines.forEach((line, i) => {
      const ty = by + paddingY + 7 + i * lineH;
      if (line.color) {
        ctx.fillStyle = line.color;
        ctx.beginPath();
        ctx.arc(bx + paddingX + 4, ty - 1, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = c.text;
        ctx.fillText(line.text, bx + paddingX + 14, ty + 3);
      } else {
        ctx.fillStyle = c.muted;
        ctx.fillText(line.text, bx + paddingX, ty + 3);
      }
    });
    ctx.restore();
  }

  function ensureLineInteractions(canvas) {
    if (!canvas || canvas._finorLineInteractions) return;
    canvas._finorLineInteractions = true;
    canvas.style.cursor = 'crosshair';

    canvas.addEventListener('pointermove', event => {
      const model = canvas._finorLineModel;
      if (!model || !model.area || !model.area.data.length) return;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const { x0, w, data } = model.area;
      if (x < x0 || x > x0 + w) {
        if (model.hoverIndex !== null) {
          model.hoverIndex = null;
          drawLineChartInternal(canvas, model.rows, model.options, null);
        }
        return;
      }
      const idx = Math.max(0, Math.min(data.length - 1, Math.round(((x - x0) / w) * (data.length - 1))));
      if (idx !== model.hoverIndex) {
        model.hoverIndex = idx;
        drawLineChartInternal(canvas, model.rows, model.options, idx);
      }
    });

    canvas.addEventListener('pointerleave', () => {
      const model = canvas._finorLineModel;
      if (!model) return;
      model.hoverIndex = null;
      drawLineChartInternal(canvas, model.rows, model.options, null);
    });
  }

  function lineChart(canvas, rows, options) {
    if (!canvas) return;
    const hoverIndex = canvas._finorLineModel ? canvas._finorLineModel.hoverIndex : null;
    canvas._finorLineModel = { rows, options, hoverIndex, area: null };
    ensureLineInteractions(canvas);
    drawLineChartInternal(canvas, rows, options, hoverIndex);
  }

  function drawLineChartInternal(canvas, rows, options, hoverIndex) {
    const base = setup(canvas);
    if (!base) return;
    const { ctx, width, height } = base;
    const c = palette();
    const compact = height < 220;
    const margin = { top: compact ? 24 : 34, right: 18, bottom: compact ? 24 : 34, left: compact ? 52 : 64 };
    const x0 = margin.left;
    const y0 = margin.top;
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const data = downsample(rows, options.limit || 520);
    const series = options.series || [];
    const allValues = [];
    data.forEach(d => series.forEach(s => allValues.push(Number(d[s.key]))));
    let [minY, maxY] = extent(allValues, 0.1);
    if (options.zeroBase) minY = Math.min(0, minY);
    const xScale = i => x0 + (data.length <= 1 ? 0 : (i / (data.length - 1)) * w);
    const yScale = v => y0 + (1 - ((v - minY) / (maxY - minY))) * h;

    drawGrid(ctx, x0, y0, w, h, minY, maxY, { percent: options.percent });

    if (minY < 0 && maxY > 0) {
      const zy = yScale(0);
      ctx.save();
      ctx.strokeStyle = c.softGrid;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(x0, zy);
      ctx.lineTo(x0 + w, zy);
      ctx.stroke();
      ctx.restore();
    }

    series.forEach((s) => {
      ctx.save();
      ctx.strokeStyle = s.color || c.primary;
      ctx.lineWidth = s.width || 2.2;
      ctx.globalAlpha = s.alpha || 1;
      ctx.beginPath();
      data.forEach((d, i) => {
        const px = xScale(i);
        const py = yScale(Number(d[s.key]));
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.restore();
    });

    ctx.save();
    ctx.fillStyle = c.muted;
    ctx.font = '12px Geist Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const ticks = [0, Math.floor((data.length - 1) / 2), data.length - 1].filter((v, i, arr) => arr.indexOf(v) === i && data[v]);
    ticks.forEach(i => ctx.fillText(parseDateLabel(data[i].date, true), xScale(i), y0 + h + 12));
    ctx.restore();

    if (!compact) drawLegend(ctx, series.map(s => ({ label: s.label, color: s.color || c.primary })), x0, 16);

    if (hoverIndex !== null && data[hoverIndex]) {
      const d = data[hoverIndex];
      const px = xScale(hoverIndex);
      ctx.save();
      ctx.strokeStyle = darkMode() ? 'rgba(241,238,238,.32)' : 'rgba(33,33,33,.22)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(px, y0);
      ctx.lineTo(px, y0 + h);
      ctx.stroke();
      ctx.restore();

      const lines = [{ text: parseDateLabel(d.date, false) }];
      let tooltipY = y0 + h / 2;
      series.forEach(s => {
        const value = Number(d[s.key]);
        const py = yScale(value);
        tooltipY = py;
        ctx.save();
        ctx.fillStyle = s.color || c.primary;
        ctx.strokeStyle = c.card;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(px, py, 4.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        lines.push({ color: s.color || c.primary, text: `${s.label}: ${options.percent ? pct(value) : niceNumber(value)}` });
      });
      drawTooltip(ctx, lines, px, tooltipY, width, height);
    }

    if (canvas._finorLineModel) {
      canvas._finorLineModel.area = { x0, y0, w, h, data, series, minY, maxY };
    }
  }

  function scatterChart(canvas, rows, options) {
    const base = setup(canvas);
    if (!base) return;
    const { ctx, width, height } = base;
    const c = palette();
    const margin = { top: 28, right: 18, bottom: 48, left: 62 };
    const x0 = margin.left;
    const y0 = margin.top;
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const data = downsample(rows, options.limit || 650);
    const xs = data.map(d => Number(d[options.xKey]));
    const ys = data.map(d => Number(d[options.yKey]));
    const [minX, maxX] = extent(xs, 0.08);
    const [minY, maxY] = extent(ys, 0.08);
    const xScale = v => x0 + ((v - minX) / (maxX - minX)) * w;
    const yScale = v => y0 + (1 - ((v - minY) / (maxY - minY))) * h;

    drawGrid(ctx, x0, y0, w, h, minY, maxY, { percent: options.percent });

    if (options.diagonal) {
      const dMin = Math.max(minX, minY);
      const dMax = Math.min(maxX, maxY);
      ctx.save();
      ctx.strokeStyle = c.grid;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(xScale(dMin), yScale(dMin));
      ctx.lineTo(xScale(dMax), yScale(dMax));
      ctx.stroke();
      ctx.restore();
    }

    if (options.zeroLine && minY < 0 && maxY > 0) {
      const zy = yScale(0);
      ctx.save();
      ctx.strokeStyle = c.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, zy);
      ctx.lineTo(x0 + w, zy);
      ctx.stroke();
      ctx.restore();
    }

    ctx.save();
    ctx.fillStyle = options.color || c.primary;
    ctx.globalAlpha = options.alpha || 0.62;
    data.forEach(d => {
      const x = xScale(Number(d[options.xKey]));
      const y = yScale(Number(d[options.yKey]));
      ctx.beginPath();
      ctx.arc(x, y, options.radius || 2.3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    ctx.save();
    ctx.fillStyle = c.muted;
    ctx.font = '12px Geist Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= 4; i++) {
      const px = x0 + w * i / 4;
      const value = minX + (maxX - minX) * i / 4;
      ctx.fillText(options.percent ? pct(value) : niceNumber(value), px, y0 + h + 12);
    }
    ctx.font = '13px Geist, sans-serif';
    ctx.fillText(options.xLabel || '', x0 + w / 2, height - 18);
    ctx.restore();
  }

  function barHorizontal(canvas, rows, options) {
    const base = setup(canvas);
    if (!base) return;
    const { ctx, width, height } = base;
    const c = palette();
    const data = rows.slice(0, options.limit || 12);
    const margin = { top: 24, right: 28, bottom: 22, left: 98 };
    const x0 = margin.left;
    const y0 = margin.top;
    const w = width - margin.left - margin.right;
    const h = height - margin.top - margin.bottom;
    const values = data.map(d => Math.abs(Number(d[options.valueKey])));
    const max = Math.max(...values, 1);
    const rowH = h / data.length;

    ctx.save();
    ctx.font = '12px Geist Mono, monospace';
    ctx.textBaseline = 'middle';
    data.forEach((d, i) => {
      const y = y0 + i * rowH + rowH * 0.18;
      const labelY = y + rowH * 0.32;
      const value = Number(d[options.valueKey]);
      const bw = Math.max(2, (Math.abs(value) / max) * w);
      ctx.fillStyle = c.muted;
      ctx.textAlign = 'right';
      ctx.fillText(String(d[options.labelKey]), x0 - 12, labelY);
      ctx.fillStyle = i === 0 ? c.primary : c.secondary;
      ctx.globalAlpha = i === 0 ? 1 : 0.82;
      roundedRect(ctx, x0, y, bw, Math.max(8, rowH * 0.48), 8);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = c.muted;
      ctx.textAlign = 'left';
      const shown = options.percent ? pct(value) : niceNumber(value);
      ctx.fillText(shown, Math.min(x0 + bw + 8, width - 72), labelY);
    });
    ctx.restore();
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const radius = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }

  function shortAssetLabel(label) {
    const clean = String(label || '').replace('.SA', '');
    if (clean.length <= 7) return clean;
    return clean.slice(0, 7);
  }

  function heatmap(canvas, matrix, options = {}) {
    const base = setup(canvas);
    if (!base) return;
    const { ctx, width, height } = base;
    const c = palette();
    const labels = (matrix && matrix.labels) || [];
    const values = (matrix && matrix.values) || [];
    const n = labels.length;
    if (!n || !values.length) {
      message(canvas, 'Matriz de correlação indisponível.');
      return;
    }

    const isFullscreen = document.fullscreenElement && document.fullscreenElement.contains(canvas);
    const isDesktopFullscreen = isFullscreen && width >= 900;
    const isCompact = width < 720;
    const labelFontSize = isFullscreen ? 11 : (isCompact ? 8 : 9);
    const xLabelRoom = isFullscreen ? 112 : (isCompact ? 74 : 94);
    const margin = {
      top: xLabelRoom + 18,
      right: isDesktopFullscreen ? 34 : 18,
      bottom: isFullscreen ? 92 : 88,
      left: isFullscreen ? 122 : (isCompact ? 82 : 96)
    };
    const x0 = margin.left;
    const y0 = margin.top;
    const availableW = Math.max(240, width - margin.left - margin.right);
    const availableH = Math.max(240, height - margin.top - margin.bottom);
    const squareSize = Math.min(availableW, availableH);
    const heatW = isDesktopFullscreen ? availableW : squareSize;
    const heatH = isDesktopFullscreen ? Math.min(availableH, Math.max(520, availableH)) : squareSize;
    const cellW = heatW / n;
    const cellH = heatH / n;

    values.forEach((row, r) => {
      row.forEach((val, col) => {
        ctx.fillStyle = corrColor(Number(val));
        ctx.fillRect(x0 + col * cellW, y0 + r * cellH, Math.ceil(cellW), Math.ceil(cellH));
      });
    });

    ctx.save();
    ctx.strokeStyle = c.grid;
    ctx.strokeRect(x0, y0, heatW, heatH);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = c.muted;
    ctx.font = `${labelFontSize}px Geist Mono, monospace`;

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    labels.forEach((label, i) => {
      ctx.fillText(shortAssetLabel(label), x0 - 8, y0 + i * cellH + cellH / 2);
    });

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    labels.forEach((label, i) => {
      const tx = x0 + i * cellW + cellW / 2;
      const ty = y0 - 12;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(-Math.PI / 4);
      ctx.fillText(shortAssetLabel(label), 0, 0);
      ctx.restore();
    });
    ctx.restore();

    ctx.save();
    ctx.fillStyle = c.muted;
    ctx.font = '12px Geist, sans-serif';
    ctx.textAlign = 'left';
    const legendY = y0 + heatH + 34;
    ctx.fillText(options.caption || 'Correlação: tons mais intensos indicam relações mais fortes.', x0, legendY);
    drawGradientLegend(ctx, x0, legendY + 16, Math.min(260, width - x0 - 20), 10);
    ctx.restore();
  }

  function corrColor(v) {
    const value = Math.max(-1, Math.min(1, v || 0));
    if (value >= 0) {
      const alpha = 0.12 + Math.abs(value) * 0.82;
      return `rgba(255,90,25,${alpha})`;
    }
    const alpha = 0.12 + Math.abs(value) * 0.82;
    return `rgba(59,130,246,${alpha})`;
  }

  function drawGradientLegend(ctx, x, y, w, h) {
    const c = palette();
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, 'rgba(59,130,246,.94)');
    grad.addColorStop(0.5, darkMode() ? 'rgba(241,238,238,.18)' : 'rgba(33,33,33,.12)');
    grad.addColorStop(1, 'rgba(255,90,25,.94)');
    ctx.fillStyle = grad;
    roundedRect(ctx, x, y, w, h, h / 2);
    ctx.fill();
    ctx.fillStyle = c.muted;
    ctx.font = '11px Geist Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('-1', x, y + 26);
    ctx.textAlign = 'center';
    ctx.fillText('0', x + w / 2, y + 26);
    ctx.textAlign = 'right';
    ctx.fillText('+1', x + w, y + 26);
  }

  function message(canvas, text) {
    const base = setup(canvas);
    if (!base) return;
    const { ctx, width, height } = base;
    const c = palette();
    ctx.save();
    ctx.fillStyle = c.muted;
    ctx.font = '14px Geist, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
    ctx.restore();
  }

  function installFullscreenStyles() {
    if (document.getElementById('finor-fullscreen-styles')) return;
    const style = document.createElement('style');
    style.id = 'finor-fullscreen-styles';
    style.textContent = `
      .chart-card { position: relative; }
      .chart-fullscreen-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        z-index: 5;
        width: 36px;
        height: 36px;
        border-radius: 999px;
        border: 1px solid rgba(33,33,33,.08);
        background: rgba(255,255,255,.86);
        color: #212121;
        box-shadow: 0 8px 24px rgba(0,0,0,.08);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 17px;
        line-height: 1;
        cursor: pointer;
        backdrop-filter: blur(14px);
        transition: transform .2s ease, background .2s ease;
      }
      .dark .chart-fullscreen-btn {
        border-color: rgba(241,238,238,.12);
        background: rgba(30,30,30,.86);
        color: #f1eeee;
      }
      .chart-fullscreen-btn:hover { transform: scale(1.06); background: #ff5a19; color: white; }
      .chart-card:fullscreen {
        width: 100vw;
        height: 100vh;
        max-width: none;
        background: #f1eeee;
        padding: 28px;
        overflow: auto;
        border-radius: 0;
      }
      .dark .chart-card:fullscreen { background: #121212; }
      .chart-card:fullscreen canvas {
        width: 100% !important;
        height: calc(100vh - 150px) !important;
        min-height: 520px;
      }
      .chart-card:fullscreen #chart-heatmap {
        height: calc(100vh - 150px) !important;
        min-height: 680px;
      }
      @media (min-width: 900px) {
        .chart-card:fullscreen canvas {
          width: calc(100vw - 72px) !important;
          height: calc(100vh - 140px) !important;
          min-height: 620px;
        }
        .chart-card:fullscreen #chart-heatmap {
          width: calc(100vw - 72px) !important;
          height: calc(100vh - 136px) !important;
          min-height: 700px;
        }
      }
      @media (max-width: 640px) {
        .chart-card:fullscreen {
          padding: 18px;
        }
        .chart-card:fullscreen canvas,
        .chart-card:fullscreen #chart-heatmap {
          width: calc(100vw - 36px) !important;
          height: calc(100vw - 36px) !important;
          min-height: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function installFullscreenButtons() {
    installFullscreenStyles();
    document.querySelectorAll('.chart-card').forEach(card => {
      if (card.querySelector('.chart-fullscreen-btn')) return;
      const canvas = card.querySelector('canvas');
      if (!canvas || !card.requestFullscreen) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'chart-fullscreen-btn';
      btn.title = 'Expandir gráfico em tela cheia';
      btn.setAttribute('aria-label', 'Expandir gráfico em tela cheia');
      btn.textContent = '⛶';
      btn.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        if (document.fullscreenElement === card) {
          document.exitFullscreen && document.exitFullscreen();
        } else {
          card.requestFullscreen();
        }
      });
      card.appendChild(btn);
    });
  }

  document.addEventListener('DOMContentLoaded', installFullscreenButtons);
  window.addEventListener('load', installFullscreenButtons);
  document.addEventListener('fullscreenchange', () => {
    document.querySelectorAll('.chart-fullscreen-btn').forEach(btn => {
      const card = btn.closest('.chart-card');
      const expanded = document.fullscreenElement === card;
      btn.textContent = expanded ? '×' : '⛶';
      btn.title = expanded ? 'Sair da tela cheia' : 'Expandir gráfico em tela cheia';
      btn.setAttribute('aria-label', btn.title);
    });
    setTimeout(() => window.dispatchEvent(new Event('resize')), 80);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
  });

  window.FinorCharts = {
    cumulativeReturns,
    lineChart,
    scatterChart,
    barHorizontal,
    heatmap,
    message,
    palette,
    installFullscreenButtons
  };
})();
