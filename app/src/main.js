// Vice Coast Cover Studio — wires the editor: photos, layouts, grades, caption,
// effects, undo/redo, panel pan and zoom, export, and the ?shot= screenshot scenes.
import {
  EXPORT_SIZES, GRADES, LAYOUTS, SAMPLE_PHOTOS,
  createDefaultState, createHistory, findLayout, panelsForLayout, restoreState,
} from './state.js';
import { drawCover, exportCoverPng } from './render.js';
import { applyShotScene } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('coverCanvas');
const state = createDefaultState();
const history = createHistory(state);
const photos = [];
let activePhotoIndex = 0;
let panelRects = [];
let drag = null;
let wheelTimer = null;

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Loads the three bundled sample photos, then renders. */
async function loadSamplePhotos() {
  for (const sample of SAMPLE_PHOTOS) {
    try {
      const img = await loadImage(sample.src);
      photos.push({ id: sample.id, name: sample.name, img, src: sample.src });
    } catch {
      // A missing sample never blocks the editor; uploads still work.
    }
  }
}

/** Redraws the live preview and refreshes the selected-panel label. */
function renderPreview() {
  // A full-frame cover shot shows no editor selection outline.
  const highlight = document.body.classList.contains('shot-cover') ? -1 : state.selectedPanel;
  panelRects = drawCover(canvas, state, photos, state.sizeKey, highlight).panels;
  const label = $('selectedPanelLabel');
  if (label) label.textContent = `Panel ${state.selectedPanel + 1} of ${panelRects.length}`;
  const zoom = $('panelZoom');
  if (zoom && state.panels[state.selectedPanel]) {
    zoom.value = String(Math.round(state.panels[state.selectedPanel].zoom * 100));
  }
  $('undoButton').disabled = !history.canUndo();
  $('redoButton').disabled = !history.canRedo();
}

function commit() {
  history.push();
  renderPreview();
}

function renderPhotoTray() {
  const tray = $('photoTray');
  tray.innerHTML = '';
  photos.forEach((photo, i) => {
    const thumb = document.createElement('img');
    thumb.className = 'photoThumb' + (i === activePhotoIndex ? ' active' : '');
    thumb.src = photo.img.src;
    thumb.alt = photo.name;
    thumb.title = photo.name;
    thumb.addEventListener('click', () => {
      activePhotoIndex = i;
      renderPhotoTray();
    });
    tray.appendChild(thumb);
  });
}

function renderLayoutPicker() {
  const picker = $('layoutPicker');
  picker.innerHTML = '';
  for (const layout of LAYOUTS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'layoutButton' + (layout.id === state.layoutId ? ' active' : '');
    const thumb = document.createElement('canvas');
    thumb.width = 150;
    thumb.height = 150;
    button.appendChild(thumb);
    const label = document.createElement('span');
    label.textContent = layout.name;
    button.appendChild(label);
    button.addEventListener('click', () => {
      history.push();
      state.layoutId = layout.id;
      state.panels = panelsForLayout(state, layout.id);
      state.selectedPanel = 0;
      renderLayoutPicker();
      renderPreview();
    });
    picker.appendChild(button);
    const previewState = { ...state, layoutId: layout.id, panels: panelsForLayout(state, layout.id) };
    drawCover(thumb, previewState, photos, 'square', -1);
  }
}

function renderGradePicker() {
  const picker = $('gradePicker');
  picker.innerHTML = '';
  for (const grade of GRADES) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gradeButton' + (grade.id === state.gradeId ? ' active' : '');
    const swatch = document.createElement('span');
    swatch.className = 'gradeSwatch';
    swatch.style.background = grade.swatch;
    button.appendChild(swatch);
    button.appendChild(document.createTextNode(grade.name));
    button.addEventListener('click', () => {
      history.push();
      state.gradeId = grade.id;
      renderGradePicker();
      renderPreview();
    });
    picker.appendChild(button);
  }
}

function wireEditor() {
  $('photoUpload').addEventListener('change', async (event) => {
    const files = [...event.target.files];
    for (const file of files) {
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      const img = await loadImage(dataUrl);
      photos.push({ id: `upload-${Date.now()}-${photos.length}`, name: file.name, img, src: dataUrl });
    }
    activePhotoIndex = photos.length - 1;
    renderPhotoTray();
    renderPreview();
    event.target.value = '';
  });

  $('fillAllButton').addEventListener('click', () => {
    history.push();
    for (const panel of state.panels) panel.photoIndex = activePhotoIndex;
    renderPreview();
  });

  $('shuffleButton').addEventListener('click', () => {
    history.push();
    for (const panel of state.panels) {
      panel.photoIndex = Math.floor(Math.random() * photos.length);
    }
    renderPreview();
  });

  $('gradeIntensity').addEventListener('input', (e) => {
    state.gradeIntensity = Number(e.target.value) / 100;
    renderPreview();
  });
  $('gradeIntensity').addEventListener('change', () => history.push());

  $('panelZoom').addEventListener('input', (e) => {
    const panel = state.panels[state.selectedPanel];
    if (panel) {
      panel.zoom = Number(e.target.value) / 100;
      renderPreview();
    }
  });
  $('panelZoom').addEventListener('change', () => history.push());

  $('fitFillButton').addEventListener('click', () => {
    const panel = state.panels[state.selectedPanel];
    if (!panel) return;
    history.push();
    panel.fit = panel.fit === 'fill' ? 'fit' : 'fill';
    renderPreview();
  });

  $('centerButton').addEventListener('click', () => {
    const panel = state.panels[state.selectedPanel];
    if (!panel) return;
    history.push();
    panel.panX = 0;
    panel.panY = 0;
    renderPreview();
  });

  $('titleInput').addEventListener('input', (e) => {
    state.title = e.target.value;
    renderPreview();
  });
  $('titleInput').addEventListener('change', () => history.push());
  $('subtitleInput').addEventListener('input', (e) => {
    state.subtitle = e.target.value;
    renderPreview();
  });
  $('subtitleInput').addEventListener('change', () => history.push());
  $('gradientText').addEventListener('change', (e) => {
    history.push();
    state.gradientText = e.target.checked;
    renderPreview();
  });
  $('titlePosition').addEventListener('change', (e) => {
    history.push();
    state.titlePosition = e.target.value;
    renderPreview();
  });
  $('badgeInput').addEventListener('input', (e) => {
    state.badgeText = e.target.value;
    renderPreview();
  });
  $('badgeInput').addEventListener('change', () => history.push());
  $('heatInput').addEventListener('input', (e) => {
    state.heat = Number(e.target.value);
    renderPreview();
  });
  $('heatInput').addEventListener('change', () => history.push());

  for (const [id, key] of [['effectGrain', 'grain'], ['effectVignette', 'vignette'], ['effectHalftone', 'halftone'], ['effectBadge', 'badge'], ['effectHeat', 'heat']]) {
    $(id).addEventListener('change', (e) => {
      history.push();
      state.effects[key] = e.target.checked;
      renderPreview();
    });
  }

  document.querySelectorAll('.sizeButton').forEach((button) => {
    button.addEventListener('click', () => {
      history.push();
      state.sizeKey = button.dataset.size === '1080x1080' ? 'square'
        : button.dataset.size === '1080x1350' ? 'portrait' : 'landscape';
      document.querySelectorAll('.sizeButton').forEach((b) => b.classList.toggle('active', b === button));
      renderPreview();
    });
  });

  $('undoButton').addEventListener('click', () => {
    const snapshot = history.undo();
    if (snapshot) {
      restoreState(state, snapshot);
      syncControlsFromState();
      renderLayoutPicker();
      renderGradePicker();
      renderPreview();
    }
  });
  $('redoButton').addEventListener('click', () => {
    const snapshot = history.redo();
    if (snapshot) {
      restoreState(state, snapshot);
      syncControlsFromState();
      renderLayoutPicker();
      renderGradePicker();
      renderPreview();
    }
  });
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      (e.shiftKey ? $('redoButton') : $('undoButton')).click();
    }
  });

  for (const [id, sizeKey] of [['exportSquare', 'square'], ['exportPortrait', 'portrait'], ['exportLandscape', 'landscape']]) {
    $(id).addEventListener('click', async () => {
      const status = $('exportStatus');
      status.textContent = 'Exporting…';
      const result = await exportCoverPng(state, photos, sizeKey);
      status.textContent = `Saved ${result.name} (${Math.round(result.bytes / 1024)} KB)`;
    });
  }

  wireCanvasPointer();
}

/** Keeps the form controls in sync after an undo or redo. */
function syncControlsFromState() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('gradientText').checked = state.gradientText;
  $('titlePosition').value = state.titlePosition;
  $('badgeInput').value = state.badgeText;
  $('heatInput').value = String(state.heat);
  $('gradeIntensity').value = String(Math.round(state.gradeIntensity * 100));
  $('effectGrain').checked = state.effects.grain;
  $('effectVignette').checked = state.effects.vignette;
  $('effectHalftone').checked = state.effects.halftone;
  $('effectBadge').checked = state.effects.badge;
  $('effectHeat').checked = state.effects.heat;
  document.querySelectorAll('.sizeButton').forEach((b) => {
    const key = b.dataset.size === '1080x1080' ? 'square' : b.dataset.size === '1080x1350' ? 'portrait' : 'landscape';
    b.classList.toggle('active', key === state.sizeKey);
  });
}

/** Click selects a panel (and assigns the active photo), drag pans it, wheel zooms it. */
function wireCanvasPointer() {
  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }
  function panelAt(point) {
    return panelRects.findIndex((r) => point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h);
  }

  canvas.addEventListener('pointerdown', (event) => {
    const point = canvasPoint(event);
    const index = panelAt(point);
    if (index === -1) return;
    canvas.setPointerCapture(event.pointerId);
    const wasSelected = state.selectedPanel === index;
    drag = { index, startX: point.x, startY: point.y, moved: false, startPanX: state.panels[index].panX, startPanY: state.panels[index].panY };
    if (!wasSelected) {
      // First click on a panel selects it; a second click assigns the active photo.
      state.selectedPanel = index;
      renderPreview();
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const point = canvasPoint(event);
    const rect = panelRects[drag.index];
    const dx = (point.x - drag.startX) / rect.w;
    const dy = (point.y - drag.startY) / rect.h;
    if (Math.abs(dx) > 0.004 || Math.abs(dy) > 0.004) drag.moved = true;
    const panel = state.panels[drag.index];
    panel.panX = Math.max(-0.6, Math.min(0.6, drag.startPanX + dx));
    panel.panY = Math.max(-0.6, Math.min(0.6, drag.startPanY + dy));
    renderPreview();
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!drag) return;
    const finished = drag;
    drag = null;
    if (!finished.moved) {
      // A plain click assigns the active photo to the panel.
      history.push();
      state.panels[finished.index].photoIndex = activePhotoIndex;
      renderPreview();
    } else {
      history.push();
    }
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const panel = state.panels[state.selectedPanel];
    if (!panel) return;
    panel.zoom = Math.max(0.5, Math.min(3, panel.zoom * Math.exp(-event.deltaY * 0.0012)));
    renderPreview();
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => history.push(), 400);
  }, { passive: false });
}

async function start() {
  await loadSamplePhotos();
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.load('40px Pacifico');
    await document.fonts.ready;
  } catch {
    // System fallback fonts still render the cover.
  }
  const query = new URLSearchParams(location.search);
  const shot = query.get('shot');
  if (shot) {
    const scene = applyShotScene(shot, query, state, photos);
    state.sizeKey = scene.sizeKey;
    if (scene.coverOnly) document.body.classList.add('shot-cover');
    renderPhotoTray();
    renderLayoutPicker();
    renderGradePicker();
    syncControlsFromState();
    renderPreview();
    requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
  } else {
    wireEditor();
    renderPhotoTray();
    renderLayoutPicker();
    renderGradePicker();
    renderPreview();
    window.__editorReady = true;
  }
}

start();
