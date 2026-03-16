#!/usr/bin/env python3
"""Generate game SFX using torchaudio synthesis. No ML models needed."""

import numpy as np
import struct
import os
import io

SAMPLE_RATE = 44100
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "client", "public", "sounds")

def write_wav(filename: str, samples: np.ndarray, sample_rate: int = SAMPLE_RATE):
    """Write samples to WAV file."""
    samples = np.clip(samples, -1.0, 1.0)
    pcm = (samples * 32767).astype(np.int16)

    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, 'wb') as f:
        # WAV header
        data_size = len(pcm) * 2
        f.write(b'RIFF')
        f.write(struct.pack('<I', 36 + data_size))
        f.write(b'WAVE')
        f.write(b'fmt ')
        f.write(struct.pack('<IHHIIHH', 16, 1, 1, sample_rate, sample_rate * 2, 2, 16))
        f.write(b'data')
        f.write(struct.pack('<I', data_size))
        f.write(pcm.tobytes())
    print(f"  Written: {path} ({len(pcm)/sample_rate:.2f}s)")

def envelope(length: int, attack: float = 0.01, decay: float = 0.1, sustain: float = 0.7, release: float = 0.2) -> np.ndarray:
    """ADSR envelope."""
    total = attack + decay + release
    env = np.ones(length)
    a_samples = int(attack * SAMPLE_RATE)
    d_samples = int(decay * SAMPLE_RATE)
    r_samples = int(release * SAMPLE_RATE)

    if a_samples > 0:
        env[:a_samples] = np.linspace(0, 1, a_samples)
    if d_samples > 0:
        env[a_samples:a_samples+d_samples] = np.linspace(1, sustain, d_samples)
    if r_samples > 0:
        env[-r_samples:] = np.linspace(sustain, 0, r_samples)
    return env

def tone(freq: float, duration: float, wave: str = "sine", vibrato: float = 0) -> np.ndarray:
    """Generate a tone."""
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    if vibrato > 0:
        freq_mod = freq + vibrato * np.sin(2 * np.pi * 6 * t)
    else:
        freq_mod = freq

    if wave == "sine":
        return np.sin(2 * np.pi * freq_mod * t)
    elif wave == "square":
        return np.sign(np.sin(2 * np.pi * freq_mod * t))
    elif wave == "sawtooth":
        return 2 * (freq_mod * t % 1) - 1
    elif wave == "triangle":
        return 2 * np.abs(2 * (freq_mod * t % 1) - 1) - 1
    return np.sin(2 * np.pi * freq_mod * t)

def noise(duration: float) -> np.ndarray:
    """White noise."""
    return np.random.uniform(-1, 1, int(SAMPLE_RATE * duration))

def mix(*signals, weights=None) -> np.ndarray:
    """Mix signals to same length."""
    max_len = max(len(s) for s in signals)
    result = np.zeros(max_len)
    if weights is None:
        weights = [1.0 / len(signals)] * len(signals)
    for s, w in zip(signals, weights):
        padded = np.zeros(max_len)
        padded[:len(s)] = s
        result += padded * w
    return result

def fade_out(samples: np.ndarray, duration: float = 0.1) -> np.ndarray:
    """Apply fade out."""
    fade_samples = int(duration * SAMPLE_RATE)
    samples = samples.copy()
    if fade_samples > 0 and fade_samples < len(samples):
        samples[-fade_samples:] *= np.linspace(1, 0, fade_samples)
    return samples

# ── SFX Definitions ──────────────────────────────────────────

def gen_attack():
    """Quick metallic slash sound."""
    dur = 0.25
    s = tone(800, dur, "square") * 0.3
    s += tone(400, dur, "sawtooth") * 0.2
    n = noise(0.05) * 0.4
    result = mix(s, n, weights=[0.7, 0.3])[:int(dur * SAMPLE_RATE)]
    env = envelope(len(result), attack=0.005, decay=0.05, sustain=0.3, release=0.15)
    return fade_out(result * env)

def gen_block():
    """Metallic shield clang."""
    dur = 0.3
    s = tone(300, dur, "square") * 0.4
    s += tone(600, dur, "sine") * 0.2
    n = noise(0.08) * 0.5
    result = mix(s, n, weights=[0.6, 0.4])[:int(dur * SAMPLE_RATE)]
    env = envelope(len(result), attack=0.002, decay=0.08, sustain=0.2, release=0.15)
    return fade_out(result * env)

def gen_critical():
    """Powerful impact with rising tone."""
    dur = 0.4
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    freq = 600 + 800 * t / dur  # Rising frequency
    s = np.sin(2 * np.pi * freq * t) * 0.4
    s += tone(200, dur, "square") * 0.3
    n = noise(0.1) * 0.5
    result = mix(s, n, weights=[0.7, 0.3])[:int(dur * SAMPLE_RATE)]
    env = envelope(len(result), attack=0.005, decay=0.1, sustain=0.4, release=0.2)
    return fade_out(result * env)

def gen_damage():
    """Dull thud impact."""
    dur = 0.3
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    freq = 200 * np.exp(-3 * t / dur)  # Decaying frequency
    s = np.sin(2 * np.pi * freq * t) * 0.5
    n = noise(0.15) * 0.3
    result = mix(s, n, weights=[0.7, 0.3])[:int(dur * SAMPLE_RATE)]
    env = envelope(len(result), attack=0.002, decay=0.05, sustain=0.3, release=0.15)
    return fade_out(result * env)

def gen_defeat():
    """Descending sad tones."""
    dur = 1.2
    parts = []
    for i, freq in enumerate([400, 350, 300, 250]):
        t_start = i * 0.3
        s = tone(freq, 0.3, "sine", vibrato=3) * 0.4
        padded = np.zeros(int(dur * SAMPLE_RATE))
        start = int(t_start * SAMPLE_RATE)
        padded[start:start+len(s)] = s
        parts.append(padded)
    result = sum(parts)
    env = envelope(len(result), attack=0.02, decay=0.1, sustain=0.6, release=0.4)
    return fade_out(result * env * 0.6)

def gen_victory():
    """Triumphant ascending fanfare."""
    dur = 1.0
    parts = []
    for i, freq in enumerate([523, 659, 784, 1047]):  # C5, E5, G5, C6
        t_start = i * 0.2
        s = tone(freq, 0.25, "triangle") * 0.4
        s += tone(freq * 0.5, 0.25, "sine") * 0.2  # Sub-octave
        padded = np.zeros(int(dur * SAMPLE_RATE))
        start = int(t_start * SAMPLE_RATE)
        padded[start:start+len(s)] = s
        parts.append(padded)
    result = sum(parts)
    env = envelope(len(result), attack=0.01, decay=0.1, sustain=0.7, release=0.2)
    return fade_out(result * env * 0.7)

def gen_heal():
    """Warm ascending sparkle."""
    dur = 0.6
    parts = []
    for i, freq in enumerate([440, 554, 659]):  # A4, C#5, E5
        t_start = i * 0.15
        s = tone(freq, 0.3, "sine") * 0.3
        padded = np.zeros(int(dur * SAMPLE_RATE))
        start = int(t_start * SAMPLE_RATE)
        padded[start:start+len(s)] = s
        parts.append(padded)
    sparkle = noise(dur) * 0.05
    result = sum(parts) + sparkle[:len(parts[0])]
    env = envelope(len(result), attack=0.02, decay=0.1, sustain=0.5, release=0.2)
    return fade_out(result * env)

def gen_level_up():
    """Exciting ascending arpeggio with shimmer."""
    dur = 1.2
    parts = []
    notes = [262, 330, 392, 523, 659, 784, 1047]  # C major scale up
    for i, freq in enumerate(notes):
        t_start = i * 0.12
        s = tone(freq, 0.2, "triangle") * 0.3
        s += tone(freq * 2, 0.2, "sine") * 0.1  # Shimmer
        padded = np.zeros(int(dur * SAMPLE_RATE))
        start = int(t_start * SAMPLE_RATE)
        padded[start:start+len(s)] = s
        parts.append(padded)
    result = sum(parts)
    env = envelope(len(result), attack=0.01, decay=0.05, sustain=0.8, release=0.3)
    return fade_out(result * env * 0.7)

def gen_gate_enter():
    """Ominous warping/portal sound."""
    dur = 0.8
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    # Low rumble
    s1 = tone(80, dur, "sawtooth") * 0.3
    # Warping sweep
    freq = 200 + 600 * np.sin(np.pi * t / dur)
    s2 = np.sin(2 * np.pi * freq * t) * 0.2
    # Noise burst
    n = noise(dur) * 0.15
    result = s1 + s2 + n[:len(s1)]
    env = envelope(len(result), attack=0.05, decay=0.1, sustain=0.6, release=0.3)
    return fade_out(result * env)

def gen_rest():
    """Soft peaceful chime."""
    dur = 0.8
    parts = []
    for freq in [523, 659, 784]:  # C5, E5, G5 major chord
        s = tone(freq, dur, "sine", vibrato=1) * 0.2
        parts.append(s)
    result = sum(parts) / len(parts)
    env = envelope(len(result), attack=0.05, decay=0.2, sustain=0.4, release=0.3)
    return fade_out(result * env)

def gen_rune_use():
    """Magical activation sparkle."""
    dur = 0.5
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    # Rising magical tone
    freq = 600 + 400 * t / dur
    s = np.sin(2 * np.pi * freq * t) * 0.3
    # Sparkle noise
    sparkle = noise(dur) * 0.1
    # Chime
    s2 = tone(880, dur, "sine") * 0.15
    result = s + sparkle + s2
    env = envelope(len(result), attack=0.01, decay=0.1, sustain=0.4, release=0.2)
    return fade_out(result * env)

def gen_binding_start():
    """Dark energy gathering sound."""
    dur = 1.0
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    # Low pulse
    s1 = tone(100, dur, "sine") * 0.3 * (1 + 0.5 * np.sin(2 * np.pi * 4 * t))
    # Rising dark tone
    freq = 150 + 200 * t / dur
    s2 = np.sin(2 * np.pi * freq * t) * 0.25
    # Whisper noise
    n = noise(dur) * 0.1
    result = s1 + s2 + n
    env = envelope(len(result), attack=0.1, decay=0.1, sustain=0.7, release=0.2)
    return fade_out(result * env)

def gen_binding_loop():
    """Sustained dark energy loop."""
    dur = 2.0
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    # Pulsing low frequency
    s1 = tone(120, dur, "sine") * 0.25 * (1 + 0.3 * np.sin(2 * np.pi * 2 * t))
    # Dark harmonic
    s2 = tone(180, dur, "triangle") * 0.15
    # Ambient whisper
    n = noise(dur) * 0.08
    result = s1 + s2 + n
    env = envelope(len(result), attack=0.1, decay=0.1, sustain=0.7, release=0.3)
    return fade_out(result * env)

def gen_binding_success():
    """Triumphant dark power acquired."""
    dur = 1.0
    parts = []
    # Dark chord ascending
    for i, freq in enumerate([220, 277, 330, 440]):  # Am chord up
        t_start = i * 0.15
        s = tone(freq, 0.3, "sine") * 0.3
        s += tone(freq * 0.5, 0.3, "triangle") * 0.15
        padded = np.zeros(int(dur * SAMPLE_RATE))
        start = int(t_start * SAMPLE_RATE)
        padded[start:start+len(s)] = s
        parts.append(padded)
    # Power burst
    n = noise(0.1) * 0.2
    result = sum(parts)
    result[:len(n)] += n
    env = envelope(len(result), attack=0.02, decay=0.1, sustain=0.7, release=0.3)
    return fade_out(result * env * 0.8)

def gen_binding_failure():
    """Failed binding — energy dissipates."""
    dur = 0.8
    t = np.linspace(0, dur, int(SAMPLE_RATE * dur))
    # Descending tone
    freq = 300 * np.exp(-2 * t / dur)
    s = np.sin(2 * np.pi * freq * t) * 0.3
    # Static/crumble
    n = noise(dur) * 0.15 * np.exp(-3 * t / dur)
    result = s + n
    env = envelope(len(result), attack=0.01, decay=0.1, sustain=0.3, release=0.4)
    return fade_out(result * env)

# ── Generate All SFX ──────────────────────────────────────────

if __name__ == "__main__":
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    sfx = {
        "attack.wav": gen_attack,
        "block.wav": gen_block,
        "critical.wav": gen_critical,
        "damage.wav": gen_damage,
        "defeat.wav": gen_defeat,
        "victory.wav": gen_victory,
        "heal.wav": gen_heal,
        "level_up.wav": gen_level_up,
        "gate_enter.wav": gen_gate_enter,
        "rest.wav": gen_rest,
        "rune_use.wav": gen_rune_use,
        "binding_start.wav": gen_binding_start,
        "binding_loop.wav": gen_binding_loop,
        "binding_success.wav": gen_binding_success,
        "binding_failure.wav": gen_binding_failure,
    }

    print(f"Generating {len(sfx)} SFX files...")
    for filename, generator in sfx.items():
        samples = generator()
        write_wav(filename, samples)

    print(f"\nDone! Generated {len(sfx)} sound effects in {OUTPUT_DIR}")
    print("\nNext step: convert WAV to MP3 with ffmpeg:")
    print("  for f in client/public/sounds/*.wav; do ffmpeg -i \"$f\" -b:a 128k \"${f%.wav}.mp3\" && rm \"$f\"; done")
