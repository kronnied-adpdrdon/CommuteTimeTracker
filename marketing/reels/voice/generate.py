"""Voiceover clips for the MYCE reels, generated with ElevenLabs.

Reads the API key from ~/.elevenlabs_key (never stored in this repo).
Usage: python3 voice/generate.py public/vo [name ...]   (names regenerate only those clips)
"""
import json, os, sys, urllib.request

VOICE = 'y0s2ExEMuum3muUnA6Zd'  # Marcus - Bright, Upbeat and Clear
KEY = open(os.path.expanduser('~/.elevenlabs_key')).read().strip()
# "Mice" is how MYCE is pronounced; the screen always says MYCE.
LINES = [
    ('01-hook', 'How long is your commute… really?'),
    ('02-guess', 'Most of us just guess. Mice measures it.'),
    ('03-auto', 'Leave home, and your trip starts by itself.'),
    ('04-arrive', 'Arrive, and it saves itself.'),
    ('05-week', 'See where your time goes, every week.'),
    ('06-reports', 'Go Pro for weekly PDF reports. First month free.'),
    ('07-end-soon', 'Mice. No sign-up. Coming soon to Google Play.'),
    ('07-end-free', 'Mice. No sign-up. Free on Google Play.'),
]
out = sys.argv[1]
only = set(sys.argv[2:])
os.makedirs(out, exist_ok=True)
texts = [t for _, t in LINES]
for i, (name, text) in enumerate(LINES):
    if only and name not in only:
        continue
    body = {
        'text': text,
        'model_id': 'eleven_multilingual_v2',
        'voice_settings': {'stability': 0.5, 'similarity_boost': 0.75, 'style': 0.15, 'use_speaker_boost': True},
        # Neighbouring lines keep the tone consistent from clip to clip.
        'previous_text': ' '.join(texts[max(0, i - 2):i]) or None,
        'next_text': texts[i + 1] if i + 1 < len(texts) and not name.startswith('07') else None,
        'seed': 7,
    }
    req = urllib.request.Request(
        f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}?output_format=mp3_44100_128',
        data=json.dumps(body).encode(), headers={'xi-api-key': KEY, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as r:
        data = r.read()
    open(os.path.join(out, f'{name}.mp3'), 'wb').write(data)
    print(name, f'{len(data) * 8 / 128000:.2f}s')
