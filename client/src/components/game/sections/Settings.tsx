import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

const GAME_VERSION = "1.0.0";

interface SettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volume: number;
  onSetVolume: (v: number) => void;
  soundEnabled: boolean;
  onSetSoundEnabled: (v: boolean) => void;
  musicEnabled: boolean;
  onSetMusicEnabled: (v: boolean) => void;
  onExportSave: () => void;
  onImportSave: () => void;
  onDeleteSave: () => void;
}

export function Settings({
  open,
  onOpenChange,
  volume,
  onSetVolume,
  soundEnabled,
  onSetSoundEnabled,
  musicEnabled,
  onSetMusicEnabled,
  onExportSave,
  onImportSave,
  onDeleteSave,
}: SettingsProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  function handleDeleteSave() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDeleteSave();
    setConfirmDelete(false);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); setConfirmDelete(false); }}>
      <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">
            <i className="fas fa-gear mr-2 text-violet-400"></i>
            Settings
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            Adjust audio, manage saves, and more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Audio Section */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Audio
            </h3>
            <div className="space-y-4 bg-zinc-800/50 rounded-lg p-4">
              {/* Volume Slider */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-200 flex items-center gap-2">
                  <i className="fas fa-volume-up text-violet-400 w-4 text-center"></i>
                  Volume
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={(e) => onSetVolume(parseFloat(e.target.value))}
                    className="w-24 h-1 bg-zinc-600 rounded-lg appearance-none cursor-pointer accent-violet-500"
                  />
                  <span className="text-xs text-zinc-400 w-8 text-right">
                    {Math.round(volume * 100)}%
                  </span>
                </div>
              </div>

              {/* Sound Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-200 flex items-center gap-2">
                  <i className="fas fa-volume-up text-green-400 w-4 text-center"></i>
                  Sound Effects
                </label>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={onSetSoundEnabled}
                  className="data-[state=checked]:bg-violet-600"
                />
              </div>

              {/* Music Toggle */}
              <div className="flex items-center justify-between">
                <label className="text-sm text-zinc-200 flex items-center gap-2">
                  <i className="fas fa-music text-blue-400 w-4 text-center"></i>
                  Music
                </label>
                <Switch
                  checked={musicEnabled}
                  onCheckedChange={onSetMusicEnabled}
                  className="data-[state=checked]:bg-violet-600"
                />
              </div>
            </div>
          </section>

          {/* Save Management Section */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Save Data
            </h3>
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={onExportSave}
                  className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <i className="fas fa-download text-violet-400"></i>
                  Export Save
                </button>
                <button
                  onClick={onImportSave}
                  className="flex-1 flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <i className="fas fa-upload text-violet-400"></i>
                  Import Save
                </button>
              </div>
              <button
                onClick={handleDeleteSave}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  confirmDelete
                    ? "bg-red-700 hover:bg-red-600 text-white"
                    : "bg-zinc-800 hover:bg-zinc-700 text-red-400"
                }`}
              >
                <i className="fas fa-trash"></i>
                {confirmDelete
                  ? "Are you sure? Click again to delete ALL data."
                  : "Delete All Save Data"}
              </button>
            </div>
          </section>

          {/* About Section */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              About
            </h3>
            <div className="bg-zinc-800/50 rounded-lg p-4 text-center space-y-1">
              <p className="text-sm text-zinc-300">
                Hunter's Path — A dark-fantasy idle RPG
              </p>
              <p className="text-xs text-zinc-500">
                Version {GAME_VERSION}
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
