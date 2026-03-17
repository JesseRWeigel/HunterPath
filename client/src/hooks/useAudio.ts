import { useCallback, useEffect, useState } from "react";
import { audioManager } from "@/lib/audioManager";
import type { SoundName, MusicName } from "@/lib/audioManager";

/**
 * useAudio — manages sound/music state, syncs with audioManager singleton,
 * and handles first-interaction ambient music autoplay.
 */
export function useAudio() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [volume, setVolume] = useState(0.7);

  // Sync audioManager with React state
  useEffect(() => {
    audioManager.soundEnabled = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    audioManager.musicEnabled = musicEnabled;
  }, [musicEnabled]);

  useEffect(() => {
    audioManager.volume = volume;
  }, [volume]);

  // Map legacy music names to MusicName type
  const playMusic = useCallback((musicName: string, loop: boolean = true) => {
    const nameMap: Record<string, MusicName> = {
      ambient_music: "ambient",
      combat_music: "combat",
      victory_music: "victory_music",
      defeat_music: "defeat_music",
    };
    audioManager.playMusic(nameMap[musicName] ?? (musicName as MusicName), loop);
  }, []);

  const playSound = useCallback((soundName: string, volumeOverride?: number) => {
    audioManager.playSound(soundName as SoundName, volumeOverride);
  }, []);

  const stopMusic = useCallback(() => {
    audioManager.stopMusic(true);
  }, []);

  const updateVolume = useCallback((newVolume: number) => {
    setVolume(newVolume);
  }, []);

  const toggleSound = useCallback(() => {
    setSoundEnabled((prev) => !prev);
  }, []);

  const toggleMusic = useCallback(() => {
    setMusicEnabled((prev) => !prev);
  }, []);

  // Start ambient music after first user interaction (browsers block autoplay)
  useEffect(() => {
    let started = false;
    const startMusic = () => {
      if (started) return;
      started = true;
      playMusic("ambient_music");
      document.removeEventListener("click", startMusic);
      document.removeEventListener("touchstart", startMusic);
      document.removeEventListener("keydown", startMusic);
    };
    document.addEventListener("click", startMusic, { once: false });
    document.addEventListener("touchstart", startMusic, { once: false });
    document.addEventListener("keydown", startMusic, { once: false });
    // Also try immediately in case autoplay is allowed
    setTimeout(() => playMusic("ambient_music"), 2000);
    return () => {
      document.removeEventListener("click", startMusic);
      document.removeEventListener("touchstart", startMusic);
      document.removeEventListener("keydown", startMusic);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    playSound,
    playMusic,
    stopMusic,
    soundEnabled,
    musicEnabled,
    volume,
    setSoundEnabled,
    setMusicEnabled,
    setVolume,
    updateVolume,
    toggleSound,
    toggleMusic,
  };
}
