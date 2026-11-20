// Vice Coast Cover Studio — state: layouts, colour grades and the undo/redo history.
// A layout is a function of the cover size (w, h) returning its panels as fractions
// of the cover, plus where the title block sits. A grade is a photo filter plus the
// two colours its overlay gradient runs between.

export const SAMPLE_PHOTOS = [
  { id: 'woman-car', name: 'Boulevard', src: 'samples/woman-car.jpg' },
  { id: 'man-rooftop', name: 'Rooftop', src: 'samples/man-rooftop.jpg' },
  { id: 'friends-neon', name: 'Neon night', src: 'samples/friends-neon.jpg' },
];

export const EXPORT_SIZES = {
  square: { w: 1080, h: 1080, label: '1080 × 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 × 1350' },
  landscape: { w: 1920, h: 1080, label: '1920 × 1080' },
};

export const LAYOUTS = [
  {
    id: 'grid4', name: 'Four Panel Grid',
    panels(w, h) {
      const g = 0.008;
      return [
        { x: 0, y: 0, w: 0.5 - g / 2, h: 0.38, rot: 0 },
        { x: 0.5 + g / 2, y: 0, w: 0.5 - g / 2, h: 0.38, rot: 0 },
        { x: 0, y: 0.38 + g, w: 0.5 - g / 2, h: 0.38, rot: 0 },
        { x: 0.5 + g / 2, y: 0.38 + g, w: 0.5 - g / 2, h: 0.38, rot: 0 },
      ];
    },
    titleZone: { x: 0, y: 0.78, w: 1, h: 0.22 },
  },
  {
    id: 'hero3', name: 'Hero + Three',
    panels(w, h) {
      const g = 0.008;
      return [
        { x: 0, y: 0, w: 0.62 - g / 2, h: 1, rot: 0 },
        { x: 0.62 + g / 2, y: 0, w: 0.38 - g / 2, h: 0.328, rot: 0 },
        { x: 0.62 + g / 2, y: 0.336, w: 0.38 - g / 2, h: 0.328, rot: 0 },
        { x: 0.62 + g / 2, y: 0.672, w: 0.38 - g / 2, h: 0.328, rot: 0 },
      ];
    },
    titleZone: { x: 0, y: 0.74, w: 0.62, h: 0.26 },
  },
  {
    id: 'fullbleed', name: 'Full Bleed',
    panels(w, h) { return [{ x: 0, y: 0, w: 1, h: 1, rot: 0 }]; },
    titleZone: { x: 0, y: 0.72, w: 1, h: 0.28 },
  },
  {
    id: 'tilted', name: 'Snapshot Collage',
    panels(w, h) {
      return [
        { x: 0.05, y: 0.06, w: 0.42, h: 0.52, rot: -0.07 },
        { x: 0.52, y: 0.10, w: 0.42, h: 0.52, rot: 0.05 },
        { x: 0.27, y: 0.44, w: 0.46, h: 0.44, rot: -0.02 },
      ];
    },
    titleZone: { x: 0, y: 0.86, w: 1, h: 0.14 },
  },
  {
    id: 'grid9', name: 'Nine Panel Grid',
    panels(w, h) {
      const g = 0.008;
      const cells = [];
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          if (row === 1 && col === 1) continue; // centre cell is the title block
          cells.push({
            x: col / 3 + (col === 0 ? 0 : g / 2),
            y: row / 3 + (row === 0 ? 0 : g / 2),
            w: 1 / 3 - (col === 2 ? 0 : g / 2) - (col === 0 ? 0 : 0),
            h: 1 / 3 - (row === 2 ? 0 : g / 2),
            rot: 0,
          });
        }
      }
      return cells;
    },
    titleZone: { x: 1 / 3, y: 1 / 3, w: 1 / 3, h: 1 / 3 },
  },
];

export const GRADES = [
  {
    id: 'sunset', name: 'Vice City Sunset',
    filter: 'saturate(1.35) contrast(1.08) brightness(1.04)',
    shadow: '#ff2e88', highlight: '#ffb347', tint: '#ff7a18', swatch: 'linear-gradient(135deg,#ff2e88,#ffb347)',
  },
  {
    id: 'neon', name: 'Neon Pink / Teal',
    filter: 'saturate(1.5) contrast(1.12) brightness(1.02)',
    shadow: '#ff2ea6', highlight: '#2de2c5', tint: '#b14bff', swatch: 'linear-gradient(135deg,#ff2ea6,#2de2c5)',
  },
  {
    id: 'golden', name: 'Golden Hour',
    filter: 'saturate(1.25) contrast(1.05) brightness(1.08)',
    shadow: '#ff8a3d', highlight: '#ffe9a8', tint: '#ffb347', swatch: 'linear-gradient(135deg,#ff8a3d,#ffe9a8)',
  },
  {
    id: 'noir', name: 'Noir',
    filter: 'saturate(0.15) contrast(1.25) brightness(0.95)',
    shadow: '#0a0a12', highlight: '#e8e8f0', tint: '#5a5a78', swatch: 'linear-gradient(135deg,#0a0a12,#e8e8f0)',
  },
  {
    id: 'tealorange', name: 'Teal-Orange',
    filter: 'saturate(1.3) contrast(1.1) brightness(1.03)',
    shadow: '#0e7490', highlight: '#fb923c', tint: '#f97316', swatch: 'linear-gradient(135deg,#0e7490,#fb923c)',
  },
];

export function findLayout(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

export function findGrade(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** A panel's photo placement: which photo, zoom, pan and fit. */
export function defaultPanel(photoIndex) {
  return { photoIndex, zoom: 1, panX: 0, panY: 0, fit: 'fill' };
}

/** The full editable state of a cover. Photos live outside it (Image objects). */
export function createDefaultState() {
  return {
    layoutId: 'grid4',
    gradeId: 'sunset',
    gradeIntensity: 0.8,
    title: 'NEON SHORE',
    subtitle: 'vice coast nights',
    gradientText: true,
    titlePosition: 'bottom',
    badgeText: 'VICE COAST · 2026',
    heat: 4,
    effects: { grain: true, vignette: true, halftone: true, badge: true, heat: true },
    panels: [0, 1, 2, 0].map((photoIndex) => defaultPanel(photoIndex)),
    selectedPanel: 0,
    sizeKey: 'square',
  };
}

/** Resizes the panels array to a layout's panel count, keeping placements by index. */
export function panelsForLayout(state, layoutId) {
  const count = findLayout(layoutId).panels(1, 1).length;
  const panels = [];
  for (let i = 0; i < count; i++) {
    panels.push(state.panels[i] ? { ...state.panels[i] } : defaultPanel(i % 3));
  }
  return panels;
}

function snapshotOf(state) {
  return JSON.parse(JSON.stringify({ ...state, panels: state.panels }));
}

/** Push-button undo/redo over JSON snapshots of the state. */
export function createHistory(state) {
  let past = [];
  let future = [];
  return {
    push() {
      past.push(snapshotOf(state));
      if (past.length > 60) past.shift();
      future = [];
    },
    undo() {
      if (!past.length) return null;
      future.push(snapshotOf(state));
      return past.pop();
    },
    redo() {
      if (!future.length) return null;
      past.push(snapshotOf(state));
      return future.pop();
    },
    canUndo() { return past.length > 0; },
    canRedo() { return future.length > 0; },
  };
}

/** Restores a snapshot into the live state object, keeping its identity. */
export function restoreState(state, snapshot) {
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, JSON.parse(JSON.stringify(snapshot)));
}
