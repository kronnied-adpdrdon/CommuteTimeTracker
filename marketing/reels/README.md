# MYCE promo reels

Vertical (1080 × 1920, 30 fps) reels made with [Remotion](https://www.remotion.dev), which turns React code into video. Separate from the app: its own `package.json`, ignored by the app's TypeScript and ESLint.

## Commands (run inside `marketing/reels`)

- `npm install` once
- `npm run studio` opens a live preview in the browser, with a timeline to scrub
- Render Reel 1:
  `npx remotion render src/index.ts Reel1 out/MYCE-reel-1.mp4 --codec=h264 --crf=18 --color-space=bt709 --pixel-format=yuv420p`
- The end card says "Coming soon to Google Play" (button and voice). After launch, switch both without editing code:
  add `--props='{"launched":true}'`

## Files

- `src/Reel1.tsx` scenes and timing (one bar of music = 60 frames; scenes start on the beat)
- `src/ui.tsx` shared pieces: background, headline, phone frame, highlight ring, brand colours and fonts
- `public/` screenshots and footage copied from `marketing/captures`, plus `music.wav`
- `public/vo/` voiceover clips, one per scene, voice "Marcus" from ElevenLabs. MYCE is pronounced "mice", so the script types "Mice"; the screen always says MYCE
- `voice/generate.py` makes the voiceover clips. It reads the ElevenLabs API key from `~/.elevenlabs_key`, never from this repo. Rebuild all: `python3 voice/generate.py public/vo`; one line: `python3 voice/generate.py public/vo 03-auto`. After regenerating, update that clip's `speech` frames in `src/Reel1.tsx`
- `music/compose.py` the original background track, synthesised in code (no samples, no licence needed). Rebuild: `python music/compose.py public/music.wav` (needs numpy)

## Rules

- Privacy wording must match the store listing: trips stay on the phone; sharing is optional and off unless turned on. Never "your data never leaves your phone".
- Pro features are labelled Pro, on screen and in the voiceover.
- The voice is AI-generated: turn on the "AI info" label when posting to Instagram or Facebook.
- Text stays inside the Reels safe area: nothing important above y = 220 or below y = 1500, and keep clear of the right edge.
