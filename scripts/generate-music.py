#!/usr/bin/env python3
"""Generate looping game music tracks using synthesis."""

import numpy as np
import struct
import os

SAMPLE_RATE = 44100
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "client", "public", "music")

def write_wav(filename: str, samples: np.ndarray, sample_rate: int = SAMPLE_RATE):
    samples = np.clip(samples, -1.0, 1.0)
    pcm = (samples * 32767).astype(np.int16)
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, 'wb') as f:
        data_size = len(pcm) * 2
        f.write(b'RIFF')
        f.write(struct.pack('<I', 36 + data_size))
        f.write(b'WAVE')
        f.write(b'fmt ')
        f.write(struct.pack('<IHHIIHH', 16, 1, 1, sample_rate, sample_rate * 2, 2, 16))
        f.write(b'data')
        f.write(struct.pack('<I', data_size))
        f.write(pcm.tobytes())
    print(f"  Written: {path} ({len(pcm)/sample_rate:.1f}s, {os.path.getsize(path)/1024:.0f}KB)")

def tone(freq, duration, wave="sine", vibrato=0):
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    f = freq + vibrato * np.sin(2 * np.pi * 5 * t) if vibrato else freq
    if wave == "sine": return np.sin(2 * np.pi * f * t)
    if wave == "triangle": return 2 * np.abs(2 * (f * t % 1) - 1) - 1
    if wave == "sawtooth": return 2 * (f * t % 1) - 1
    if wave == "square": return np.sign(np.sin(2 * np.pi * f * t))
    return np.sin(2 * np.pi * f * t)

def noise(duration):
    return np.random.uniform(-1, 1, int(SAMPLE_RATE * duration))

def gen_ambient():
    """Dark atmospheric ambient loop — 30 seconds."""
    dur = 30.0
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))

    # Deep drone
    drone = tone(55, dur, "sine") * 0.15
    drone += tone(82.5, dur, "sine", vibrato=0.5) * 0.08

    # Slow pad chord (Am: A2, C3, E3)
    pad = tone(110, dur, "triangle", vibrato=0.3) * 0.06
    pad += tone(130.8, dur, "sine", vibrato=0.2) * 0.05
    pad += tone(164.8, dur, "sine", vibrato=0.4) * 0.04

    # Slow breathing LFO
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.1 * t)
    pad *= lfo

    # Subtle wind noise
    wind = noise(dur) * 0.03 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.05 * t))

    # Occasional distant chime (every ~10 seconds)
    chimes = np.zeros(len(t))
    for i in range(3):
        start = int((i * 10 + 2) * SAMPLE_RATE)
        chime_dur = 2.0
        chime_t = np.linspace(0, chime_dur, int(SAMPLE_RATE * chime_dur))
        chime = np.sin(2 * np.pi * 880 * chime_t) * 0.04 * np.exp(-2 * chime_t)
        end = min(start + len(chime), len(chimes))
        chimes[start:end] = chime[:end-start]

    result = drone + pad + wind + chimes

    # Crossfade for seamless loop (1 second)
    fade = int(SAMPLE_RATE * 1.0)
    result[:fade] = result[:fade] * np.linspace(0, 1, fade) + result[-fade:] * np.linspace(1, 0, fade)

    return result * 0.8

def gen_combat():
    """Intense combat music loop — 20 seconds."""
    dur = 20.0
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))

    # Driving bass pulse (quarter notes at 140 BPM)
    bpm = 140
    beat_dur = 60.0 / bpm
    bass = np.zeros(len(t))
    for i in range(int(dur / beat_dur)):
        start = int(i * beat_dur * SAMPLE_RATE)
        note_len = int(beat_dur * 0.6 * SAMPLE_RATE)
        note_t = np.linspace(0, beat_dur * 0.6, note_len)
        # Alternate bass notes (E2, G2 for dark feel)
        freq = 82.4 if i % 2 == 0 else 98.0
        note = np.sin(2 * np.pi * freq * note_t) * 0.25 * np.exp(-3 * note_t / (beat_dur * 0.6))
        end = min(start + note_len, len(bass))
        bass[start:end] += note[:end-start]

    # Aggressive rhythm (eighth notes, square wave)
    rhythm = np.zeros(len(t))
    eighth = beat_dur / 2
    for i in range(int(dur / eighth)):
        start = int(i * eighth * SAMPLE_RATE)
        note_len = int(eighth * 0.4 * SAMPLE_RATE)
        note_t = np.linspace(0, eighth * 0.4, note_len)
        freq = [330, 330, 392, 330, 294, 294, 330, 294][i % 8]  # Em riff
        note = np.sign(np.sin(2 * np.pi * freq * note_t)) * 0.08 * np.exp(-5 * note_t / (eighth * 0.4))
        end = min(start + note_len, len(rhythm))
        rhythm[start:end] += note[:end-start]

    # Tension strings (sustained, pulsing)
    strings = tone(165, dur, "sawtooth", vibrato=2) * 0.05
    strings += tone(220, dur, "sawtooth", vibrato=1.5) * 0.04
    pulse = 0.6 + 0.4 * np.sin(2 * np.pi * (bpm / 60) * t)
    strings *= pulse

    # Noise hits on beats
    hits = np.zeros(len(t))
    for i in range(int(dur / beat_dur)):
        if i % 4 == 0:  # Kick on downbeat
            start = int(i * beat_dur * SAMPLE_RATE)
            hit_len = int(0.1 * SAMPLE_RATE)
            hit_t = np.linspace(0, 0.1, hit_len)
            hit = noise(0.1) * 0.15 * np.exp(-20 * hit_t)
            end = min(start + hit_len, len(hits))
            hits[start:end] += hit[:end-start]

    result = bass + rhythm + strings + hits

    # Crossfade loop
    fade = int(SAMPLE_RATE * 0.5)
    result[:fade] = result[:fade] * np.linspace(0, 1, fade) + result[-fade:] * np.linspace(1, 0, fade)

    return result * 0.9

def gen_victory_music():
    """Triumphant victory fanfare — 8 seconds."""
    dur = 8.0
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))

    result = np.zeros(len(t))

    # Triumphant melody (C major fanfare)
    melody = [
        (0.0, 523, 0.3), (0.3, 659, 0.3), (0.6, 784, 0.4),
        (1.2, 1047, 0.6),
        (2.0, 784, 0.3), (2.3, 880, 0.3), (2.6, 1047, 0.5),
        (3.3, 1319, 0.8),
        (4.5, 1047, 0.4), (4.9, 1175, 0.4), (5.3, 1319, 0.4),
        (5.7, 1568, 1.5),
    ]
    for start_t, freq, note_dur in melody:
        start = int(start_t * SAMPLE_RATE)
        note_len = int(note_dur * SAMPLE_RATE)
        note_t = np.linspace(0, note_dur, note_len)
        note = np.sin(2 * np.pi * freq * note_t) * 0.2
        note += (2 * np.abs(2 * (freq * note_t % 1) - 1) - 1) * 0.08  # Triangle harmonic
        note *= np.exp(-1.5 * note_t / note_dur)  # Decay
        end = min(start + note_len, len(result))
        result[start:end] += note[:end-start]

    # Warm pad
    pad = tone(262, dur, "sine", vibrato=1) * 0.06
    pad += tone(330, dur, "sine", vibrato=0.5) * 0.05
    pad += tone(392, dur, "sine") * 0.04
    pad_env = np.exp(-0.3 * t / dur)
    result += pad * pad_env

    # Fade out at end
    fade = int(2.0 * SAMPLE_RATE)
    result[-fade:] *= np.linspace(1, 0, fade)

    return result * 0.9

def gen_defeat_music():
    """Somber defeat music — 6 seconds."""
    dur = 6.0
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))

    result = np.zeros(len(t))

    # Descending minor melody
    melody = [
        (0.0, 440, 0.5), (0.6, 392, 0.5), (1.2, 349, 0.5),
        (1.8, 330, 0.8),
        (3.0, 294, 0.5), (3.5, 262, 0.5), (4.0, 247, 1.5),
    ]
    for start_t, freq, note_dur in melody:
        start = int(start_t * SAMPLE_RATE)
        note_len = int(note_dur * SAMPLE_RATE)
        note_t = np.linspace(0, note_dur, note_len)
        note = np.sin(2 * np.pi * freq * note_t) * 0.2 * np.exp(-1.0 * note_t / note_dur)
        note += np.sin(2 * np.pi * freq * 0.5 * note_t) * 0.1 * np.exp(-1.5 * note_t / note_dur)
        end = min(start + note_len, len(result))
        result[start:end] += note[:end-start]

    # Dark drone
    drone = tone(73.4, dur, "sine") * 0.08  # D2
    drone_env = 0.5 + 0.5 * np.sin(2 * np.pi * 0.3 * t)
    result += drone * drone_env

    # Fade out
    fade = int(1.5 * SAMPLE_RATE)
    result[-fade:] *= np.linspace(1, 0, fade)

    return result * 0.8

if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Remove old mp3 stubs
    for f in os.listdir(OUTPUT_DIR):
        if f.endswith('.mp3'):
            os.remove(os.path.join(OUTPUT_DIR, f))

    tracks = {
        "ambient.wav": gen_ambient,
        "combat.wav": gen_combat,
        "victory.wav": gen_victory_music,
        "defeat.wav": gen_defeat_music,
    }

    print(f"Generating {len(tracks)} music tracks...")
    for filename, generator in tracks.items():
        samples = generator()
        write_wav(filename, samples)

    print(f"\nDone! Generated {len(tracks)} music tracks in {OUTPUT_DIR}")
