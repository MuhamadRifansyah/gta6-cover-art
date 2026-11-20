# Vice Coast Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/MuhamadRifansyah/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/MuhamadRifansyah/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

An offline web app that turns any photo and a caption into GTA-style cover art:
the multi-panel poster look with bold display lettering and a Vice City sunset
or neon colour grade, exported as a PNG to share.

Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty, $250 in USDC.
Try make.fun: https://make.fun/r/1fc9hzy4

## What it does

- **Any photo** — upload your own photos from your machine (nothing is uploaded
  anywhere). Click a photo, click a panel to put it there. Fill several panels
  with one photo or several photos.
- **Crop and position per panel** — click a panel to select it, drag to pan,
  scroll or use the slider to zoom, fit/fill toggle, centre button.
- **Five layouts** — Four Panel Grid, Hero + Three, Full Bleed, Snapshot
  Collage (tilted polaroids), and a Nine Panel Grid with a halftone title block
  in the centre cell.
- **Five colour grades** — Vice City Sunset, Neon Pink/Teal, Golden Hour, Noir,
  Teal-Orange, with a grade-intensity slider.
- **Caption** — editable title and subtitle, bold Anton display lettering with
  outline and drop shadow, sunset-gradient text, neon Pacifico script subtitle,
  title position presets (bottom band, top band, diagonal banner).
- **Effects** — film grain, vignette, halftone title block, badge ribbon,
  five-star heat meter. Undo and redo throughout.
- **Fast export** — one click exports a PNG at 1080 × 1080, 1080 × 1350 or
  1920 × 1080.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request at runtime: every script, font and sample
photo is a file under `app/`, and your photos are read on your machine with
FileReader.

## Original art

Everything here is original: no Rockstar Games logo, wordmark, official
artwork, character or font. The lettering uses Anton and Pacifico, vendored
under `app/fonts/` under the SIL Open Font License. The three sample photos
under `app/samples/` were made with an image model for this entry (fictional
people, no real person).

## Files

- `app/index.html`, `app/style.css` — the editor shell and dark theme
- `app/src/state.js` — layouts, grades, state, undo/redo history
- `app/src/render.js` — the cover renderer (panels, grades, lettering, effects)
- `app/src/main.js` — editor wiring: photos, pan/zoom, export, shot mode
- `app/src/shots.js` — fixed `?shot=` scenes for screenshots
- `main.ts` — hands the entry in (copies `app/` + `screenshots/`, writes the dossier)
