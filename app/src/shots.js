// Fixed scenes for screenshots: ?shot=cover renders the cover alone, full frame,
// at the chosen export size; ?shot=editor shows the editor with photos loaded.
// Query knobs: size (square|portrait|landscape), layout, grade, title, subtitle,
// photo (sample id used for the hero panel). window.__shotReady is set by main.js.

import { findLayout, panelsForLayout } from './state.js';

function photoIndexById(photos, id) {
  const index = photos.findIndex((p) => p.id === id);
  return index === -1 ? 0 : index;
}

export function applyShotScene(shot, query, state, photos) {
  const sizeKey = query.get('size') ?? (shot === 'cover' ? 'landscape' : 'square');
  state.sizeKey = ['square', 'portrait', 'landscape'].includes(sizeKey) ? sizeKey : 'square';
  if (query.get('layout')) state.layoutId = query.get('layout');
  if (query.get('grade')) state.gradeId = query.get('grade');
  if (query.get('title')) state.title = query.get('title');
  if (query.get('subtitle') !== null) state.subtitle = query.get('subtitle') ?? '';
  if (query.get('badge') !== null) state.badgeText = query.get('badge') ?? '';

  const hero = photoIndexById(photos, query.get('photo') ?? 'woman-car');
  const others = [0, 1, 2].filter((i) => i !== hero);
  const count = findLayout(state.layoutId).panels(1, 1).length;
  const assignment = [hero, ...others, hero, ...others, hero, ...others, hero, ...others];
  state.panels = panelsForLayout(state, state.layoutId).map((panel, i) => ({
    ...panel,
    photoIndex: assignment[i] ?? 0,
    zoom: 1,
    panX: 0,
    panY: 0,
    fit: 'fill',
  }));
  state.selectedPanel = 0;

  if (shot === 'cover') {
    // The hero cover: hero + three side panels, sunset grade, gradient title.
    if (!query.get('layout')) state.layoutId = 'hero3';
    if (!query.get('grade')) state.gradeId = 'sunset';
    state.panels = panelsForLayout(state, state.layoutId).map((panel, i) => ({
      ...panel,
      photoIndex: assignment[i] ?? 0,
      zoom: 1,
      panX: 0,
      panY: 0,
      fit: 'fill',
    }));
    return { sizeKey: state.sizeKey, coverOnly: true };
  }
  return { sizeKey: state.sizeKey, coverOnly: false };
}
