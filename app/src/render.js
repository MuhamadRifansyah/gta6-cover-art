// Vice Coast Cover Studio — the cover renderer: panels, grades, lettering, effects.
// Everything is drawn on a 2D canvas at the export size, so the live preview and
// the exported PNG are the same drawing.

import { EXPORT_SIZES, findGrade, findLayout } from './state.js';

const INK = '#0d0d14';
let grainPatternCanvas = null;

/** A small tiled noise canvas, reused for the film-grain effect. */
function grainTile() {
  if (grainPatternCanvas) return grainPatternCanvas;
  const tile = document.createElement('canvas');
  tile.width = 160;
  tile.height = 160;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(160, 160);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 96 + Math.floor(Math.random() * 64);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainPatternCanvas = tile;
  return tile;
}

/** Draws one photo into a panel rect, honouring zoom, pan and fit/fill. */
function drawPanelPhoto(ctx, img, rect, placement, grade, intensity) {
  const { x, y, w, h } = rect;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  if (img && img.naturalWidth) {
    const base = placement.fit === 'fit'
      ? Math.min(w / img.naturalWidth, h / img.naturalHeight)
      : Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const scale = base * placement.zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = x + (w - dw) / 2 + placement.panX * w;
    const dy = y + (h - dh) / 2 + placement.panY * h;
    ctx.filter = grade.filter;
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
    // Grade overlay: sunset/neon gradient in 'overlay', then a soft tint.
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, grade.shadow);
    grad.addColorStop(1, grade.highlight);
    ctx.globalAlpha = intensity * 0.5;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = intensity * 0.3;
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = grade.tint;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  } else {
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#2a2a3a');
    grad.addColorStop(1, '#101018');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

/** The inked poster border every panel wears: white rule, dark hairline. */
function drawPanelBorder(ctx, rect) {
  ctx.save();
  ctx.lineWidth = Math.max(3, rect.w * 0.004);
  ctx.strokeStyle = '#fff8ef';
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(13,13,20,0.7)';
  ctx.strokeRect(rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8);
  ctx.restore();
}

/** Rows of dots whose size swells across the band — the halftone title block. */
function drawHalftoneBand(ctx, x, y, w, h, dotColor) {
  const gap = Math.max(9, w / 34);
  ctx.save();
  ctx.fillStyle = dotColor;
  for (let row = 0; row * gap < h; row++) {
    for (let col = 0; col * gap < w; col++) {
      const swell = 0.45 + 0.55 * Math.abs(Math.sin((col / (w / gap)) * Math.PI));
      const r = (gap * 0.32) * swell;
      ctx.beginPath();
      ctx.arc(x + col * gap + gap / 2, y + row * gap + gap / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Shrinks a font until the text fits the width; returns the size used. */
function fitFontSize(ctx, text, family, maxWidth, startSize) {
  let size = startSize;
  while (size > 12) {
    ctx.font = `${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) return size;
    size -= Math.max(2, Math.floor(size * 0.06));
  }
  return size;
}

/** The bold display title with outline, drop shadow and optional sunset gradient. */
function drawTitleLettering(ctx, rect, state) {
  const title = (state.title || 'UNTITLED').toUpperCase();
  const subtitle = state.subtitle || '';
  const pad = rect.w * 0.04;
  const maxW = rect.w - pad * 2;
  const titleSize = fitFontSize(ctx, title, 'Anton, sans-serif', maxW, rect.h * 0.52);
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h * (subtitle ? 0.36 : 0.5);
  ctx.font = `${titleSize}px Anton, sans-serif`;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = titleSize * 0.08;
  ctx.shadowOffsetY = titleSize * 0.05;
  ctx.lineWidth = Math.max(2, titleSize * 0.13);
  ctx.strokeStyle = 'rgba(10,8,16,0.92)';
  ctx.strokeText(title, cx, cy);
  if (state.gradientText) {
    const grad = ctx.createLinearGradient(cx - maxW / 2, cy, cx + maxW / 2, cy);
    grad.addColorStop(0, '#ff5e8a');
    grad.addColorStop(0.5, '#ffb347');
    grad.addColorStop(1, '#ffe9a8');
    ctx.fillStyle = grad;
  } else {
    ctx.fillStyle = '#fff8ef';
  }
  ctx.fillText(title, cx, cy);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (subtitle) {
    const subSize = fitFontSize(ctx, subtitle, 'Pacifico, cursive', maxW * 0.9, rect.h * 0.26);
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.shadowColor = '#ff2ea6';
    ctx.shadowBlur = subSize * 0.5;
    ctx.fillStyle = '#8ef7ff';
    ctx.fillText(subtitle, cx, rect.y + rect.h * 0.78);
  }
  ctx.restore();
}

/** A diagonal ribbon across the top-right corner carrying the badge text. */
function drawBadgeRibbon(ctx, w, text) {
  const d = Math.max(56, w * 0.045);
  const bandH = Math.max(26, w * 0.016);
  const bandLen = Math.max(300, w * 0.24);
  ctx.save();
  ctx.translate(w - d, d);
  ctx.rotate(Math.PI / 4);
  const grad = ctx.createLinearGradient(-bandLen / 2, 0, bandLen / 2, 0);
  grad.addColorStop(0, '#ff2e88');
  grad.addColorStop(1, '#ff8a3d');
  ctx.fillStyle = grad;
  ctx.fillRect(-bandLen / 2, -bandH / 2, bandLen, bandH);
  ctx.fillStyle = '#fff8ef';
  ctx.font = `${Math.max(13, w * 0.013)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText((text || '').toUpperCase(), 0, 1);
  ctx.restore();
}

function drawStar(ctx, cx, cy, r, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(ang) * rad;
    const py = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? '#ffc93d' : 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(13,13,20,0.85)';
  ctx.stroke();
}

/** The five-star heat meter on a dark chip in the bottom-right corner. */
function drawStarHeatMeter(ctx, w, h, heat) {
  const starR = Math.max(11, w * 0.016);
  const gap = starR * 2.4;
  const chipW = gap * 5 + starR * 1.6 + w * 0.045;
  const chipH = starR * 2.6;
  const x = w - chipW - w * 0.02;
  const y = h - chipH - h * 0.02;
  ctx.save();
  ctx.fillStyle = 'rgba(13,13,20,0.82)';
  ctx.beginPath();
  ctx.roundRect(x, y, chipW, chipH, chipH * 0.3);
  ctx.fill();
  ctx.fillStyle = '#fff8ef';
  ctx.font = `${Math.max(11, w * 0.013)}px Anton, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('HEAT', x + chipW * 0.07, y + chipH / 2 + 1);
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, x + chipW * 0.30 + i * gap + starR, y + chipH / 2, starR, i < heat);
  }
  ctx.restore();
}

function drawFilmGrain(ctx, w, h) {
  ctx.save();
  ctx.globalAlpha = 0.08;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function drawVignette(ctx, w, h) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.72);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.save();
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * Draws the whole cover onto a canvas at the state's size.
 * Returns the panel rects in canvas pixels for hit-testing.
 */
export function drawCover(canvas, state, photos, sizeKey, highlightPanel = -1) {
  const size = EXPORT_SIZES[sizeKey ?? state.sizeKey];
  const w = size.w;
  const h = size.h;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const layout = findLayout(state.layoutId);
  const grade = findGrade(state.gradeId);
  const intensity = state.gradeIntensity;
  const panelDefs = layout.panels(w, h);

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = INK;
  ctx.fillRect(0, 0, w, h);

  // Sunset backdrop behind the tilted snapshot collage.
  if (state.layoutId === 'tilted') {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#2b0f3a');
    bg.addColorStop(0.5, '#ff5e8a');
    bg.addColorStop(1, '#ffb347');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }

  const panelRects = panelDefs.map((def, i) => {
    const rect = { x: def.x * w, y: def.y * h, w: def.w * w, h: def.h * h };
    const placement = state.panels[i] ?? { photoIndex: 0, zoom: 1, panX: 0, panY: 0, fit: 'fill' };
    const photo = photos[placement.photoIndex];
    ctx.save();
    if (def.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(def.rot);
      ctx.translate(-rect.w / 2, -rect.h / 2);
      // Polaroid frame for tilted snapshots.
      ctx.fillStyle = '#fff8ef';
      ctx.fillRect(-w * 0.012, -h * 0.012, rect.w + w * 0.024, rect.h + h * 0.03);
      drawPanelPhoto(ctx, photo?.img, { x: 0, y: 0, w: rect.w, h: rect.h }, placement, grade, intensity);
      ctx.restore();
    } else {
      drawPanelPhoto(ctx, photo?.img, rect, placement, grade, intensity);
      ctx.restore();
      drawPanelBorder(ctx, rect);
    }
    if (i === highlightPanel) {
      ctx.save();
      ctx.setLineDash([10, 8]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#ff5e8a';
      ctx.strokeRect(rect.x + 2, rect.y + 2, rect.w - 4, rect.h - 4);
      ctx.restore();
    }
    return rect;
  });

  // Title block: band position follows the preset, except the nine-panel grid,
  // whose centre cell is always the title block.
  const zone = layout.titleZone;
  let titleRect;
  if (state.layoutId === 'grid9') {
    titleRect = { x: zone.x * w, y: zone.y * h, w: zone.w * w, h: zone.h * h };
  } else if (state.titlePosition === 'top') {
    titleRect = { x: zone.x * w, y: 0, w: zone.w * w, h: zone.h * h };
  } else {
    titleRect = { x: zone.x * w, y: zone.y * h, w: zone.w * w, h: zone.h * h };
  }
  ctx.save();
  if (state.titlePosition === 'diagonal' && state.layoutId !== 'grid9') {
    ctx.translate(titleRect.x + titleRect.w / 2, titleRect.y + titleRect.h / 2);
    ctx.rotate(-0.06);
    ctx.translate(-titleRect.w / 2, -titleRect.h / 2);
    titleRect = { x: -titleRect.w * 0.08, y: 0, w: titleRect.w * 1.16, h: titleRect.h };
  }
  ctx.fillStyle = 'rgba(13,13,20,0.94)';
  ctx.fillRect(titleRect.x, titleRect.y, titleRect.w, titleRect.h);
  if (state.effects.halftone) {
    drawHalftoneBand(ctx, titleRect.x, titleRect.y, titleRect.w, titleRect.h * 0.4, 'rgba(255,94,138,0.35)');
  }
  ctx.fillStyle = '#ff5e8a';
  ctx.fillRect(titleRect.x, titleRect.y, titleRect.w, Math.max(3, h * 0.004));
  drawTitleLettering(ctx, titleRect, state);
  ctx.restore();

  if (state.effects.badge && state.badgeText) drawBadgeRibbon(ctx, w, state.badgeText);
  if (state.effects.heat) drawStarHeatMeter(ctx, w, h, state.heat);
  if (state.effects.grain) drawFilmGrain(ctx, w, h);
  if (state.effects.vignette) drawVignette(ctx, w, h);

  return { panels: panelRects, titleRect };
}

/** Renders a cover offscreen at an export size and downloads it as a PNG. */
export function exportCoverPng(state, photos, sizeKey) {
  const offscreen = document.createElement('canvas');
  drawCover(offscreen, state, photos, sizeKey, -1);
  const size = EXPORT_SIZES[sizeKey];
  return new Promise((resolve) => {
    offscreen.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vice-coast-cover-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      resolve({ bytes: blob?.size ?? 0, name: a.download });
    }, 'image/png');
  });
}
