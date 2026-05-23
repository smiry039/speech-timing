# Speech Timing

Personal tool for calculating text-reveal animation timing for Foodimal 2D animation work in Rive. Calculates exact frame counts for character-by-character text reveals, including punctuation holds and ellipsis-per-dot animation, so the timing can be mirrored 1:1 in Rive keyframes.

Live (installable as a PWA): https://smiry039.github.io/speech-timing/

## Features

- Per-character reveal timing with configurable frames/char and FPS (30 or 60)
- Punctuation holds (comma, period, em-dash, ellipsis, question, exclamation) — folded into the preceding chunk, hold follows
- Ellipsis renders per-dot (3× reveal + hold)
- Three timeline visualizations: bar / keyframes / velocity (cumulative characters over time)
- Cumulative character index column — read off the exact `Offset` value to set in Rive at each event boundary
- Copy-to-clipboard timeline export
- Works fully offline once installed (PWA with service worker)

## Local development

```bash
npm install
npm run dev
```

## Deploy

Push to `main`. GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages automatically.

## Stack

Vite + React 19 · Tailwind v4 (`@tailwindcss/vite`) · `@fontsource` for Fraunces / JetBrains Mono / DM Sans · `vite-plugin-pwa` for manifest + service worker · lucide-react for icons.
