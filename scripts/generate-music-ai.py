#!/usr/bin/env python3
"""Generate game music using Meta's MusicGen AI model."""

import torch
import soundfile as sf
import numpy as np
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "client", "public", "music")

def generate_tracks():
    from audiocraft.models import MusicGen

    print("Loading MusicGen medium model...")
    model = MusicGen.get_pretrained('facebook/musicgen-medium')
    print("Model loaded!")

    tracks = [
        {
            "name": "ambient",
            "prompt": "dark fantasy ambient music, mysterious dungeon atmosphere, low ethereal drone, subtle reverb chimes, medieval dark orchestral pad, haunting, slow tempo, atmospheric, cinematic",
            "duration": 30,
        },
        {
            "name": "combat",
            "prompt": "intense dark fantasy battle music, epic orchestral combat theme, driving war drums, aggressive strings, minor key, brass hits, fast tempo 140bpm, action RPG boss fight music",
            "duration": 20,
        },
        {
            "name": "victory",
            "prompt": "triumphant fantasy victory fanfare, heroic orchestral brass, major key celebration, uplifting strings, RPG level complete music, glorious achievement",
            "duration": 10,
        },
        {
            "name": "defeat",
            "prompt": "somber dark fantasy defeat theme, melancholic minor key strings, slow mournful cello, ambient sadness, game over music, fading hope",
            "duration": 8,
        },
    ]

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    for track in tracks:
        print(f"\nGenerating {track['name']} ({track['duration']}s)...")
        print(f"  Prompt: {track['prompt']}")

        model.set_generation_params(
            duration=track["duration"],
            top_k=250,
            top_p=0.0,
            temperature=1.0,
        )

        wav = model.generate([track["prompt"]])

        # wav shape: [batch, channels, samples]
        audio = wav[0]  # First (only) batch item

        # Normalize to prevent clipping
        peak = audio.abs().max()
        if peak > 0:
            audio = audio / peak * 0.9

        path = os.path.join(OUTPUT_DIR, f"{track['name']}.wav")

        # Remove old file
        for ext in ['.wav', '.mp3']:
            old = os.path.join(OUTPUT_DIR, f"{track['name']}{ext}")
            if os.path.exists(old):
                os.remove(old)

        audio_np = audio.cpu().numpy().squeeze()
        sf.write(path, audio_np, model.sample_rate)
        size_kb = os.path.getsize(path) / 1024
        print(f"  Saved: {path} ({size_kb:.0f}KB)")

    print("\nAll tracks generated!")

if __name__ == "__main__":
    generate_tracks()
