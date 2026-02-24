import { useState } from "react";

const STATS = ["STR", "AGI", "INT", "VIT", "LUCK"] as const;

interface ManageTabProps {
  player: any;
  gold: number;
  prestigeUpgrades: Record<string, number>;
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  onAllocateStat: (stat: string) => void;
  onTrain: (type: string) => void;
  onBuyItem: (itemId: string) => void;
  onSave: () => void;
  onLoad: () => void;
  onRebirth: () => void;
  onReset: () => void;
  onSetSoundEnabled: (v: boolean) => void;
  onSetMusicEnabled: (v: boolean) => void;
  onSetVolume: (v: number) => void;
}

function Accordion({ title, badge, defaultOpen = false, children }: {
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 bg-zinc-900 text-sm font-semibold text-zinc-200"
      >
        <span className="flex items-center gap-2">{title}{badge}</span>
        <span className="text-zinc-500 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="bg-zinc-950 p-4">{children}</div>}
    </div>
  );
}

export function ManageTab({
  player, gold, prestigeUpgrades,
  soundEnabled, musicEnabled, volume,
  onAllocateStat, onTrain, onBuyItem,
  onSave, onLoad, onRebirth, onReset,
  onSetSoundEnabled, onSetMusicEnabled, onSetVolume,
}: ManageTabProps) {
  const hasPoints = (player.points ?? 0) > 0;
  const level = player.level ?? 1;

  // Match real game cost formulas from HuntersPath.tsx
  const shopItems = [
    { id: "potion",    label: "Health Potion",   effect: "Restore HP in combat",   cost: 25 },
    { id: "weapon",    label: "Weapon Upgrade",  effect: "+STR",                    cost: 100 + level * 25 },
    { id: "armor",     label: "Armor Upgrade",   effect: "+VIT",                    cost: 80 + level * 20 },
    { id: "accessory", label: "Accessory Upgrade", effect: "+LUCK",                 cost: 120 + level * 30 },
  ];

  return (
    <div className="p-3 space-y-2 pb-4">
      {/* Stat points banner */}
      {hasPoints && (
        <div className="bg-violet-900/40 border border-violet-700 rounded-xl px-4 py-2.5 text-sm text-violet-300 font-semibold">
          ● {player.points} stat point{player.points !== 1 ? "s" : ""} available — allocate below
        </div>
      )}

      {/* Stats */}
      <Accordion
        title="Stats"
        defaultOpen={hasPoints}
        badge={hasPoints ? <span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> : undefined}
      >
        <div className="grid grid-cols-2 gap-2">
          {STATS.map(stat => (
            <div key={stat} className="flex items-center justify-between bg-zinc-900 rounded-lg px-3 py-2.5">
              <div>
                <div className="text-xs text-zinc-500 uppercase tracking-wide">{stat}</div>
                <div className="text-lg font-bold text-zinc-100">
                  {player.stats?.[stat] ?? 0}
                </div>
              </div>
              <button
                onClick={() => onAllocateStat(stat)}
                disabled={!hasPoints}
                className="w-10 h-10 rounded-lg bg-violet-600 text-white text-xl font-bold disabled:bg-zinc-800 disabled:text-zinc-600 flex items-center justify-center active:bg-violet-500"
                aria-label={`Allocate point to ${stat}`}
              >
                +
              </button>
            </div>
          ))}
        </div>
        <div className="mt-2 text-xs text-zinc-600 text-center">
          {player.points ?? 0} point{(player.points ?? 0) !== 1 ? "s" : ""} remaining
        </div>
      </Accordion>

      {/* Training */}
      <Accordion title="Training">
        <div className="space-y-2">
          {[
            { id: "physical",   label: "Physical Training", reward: "+8–15 EXP",             color: "text-green-400" },
            { id: "mental",     label: "Mental Training",   reward: "+6–12 EXP",             color: "text-blue-400" },
            { id: "meditation", label: "Meditation",        reward: "–Fatigue · +4–8 EXP",  color: "text-purple-400" },
            { id: "work",       label: "Work Job",          reward: "+15–35₲ · +3–8 EXP",   color: "text-yellow-400" },
          ].map(({ id, label, reward, color }) => (
            <button
              key={id}
              onClick={() => onTrain(id)}
              className="w-full flex items-center justify-between bg-zinc-900 rounded-lg px-4 py-3 active:bg-zinc-800 text-left"
            >
              <span className="text-sm text-zinc-200">{label}</span>
              <span className={`text-xs ${color}`}>{reward}</span>
            </button>
          ))}
        </div>
      </Accordion>

      {/* Hunter Shop */}
      <Accordion title="Hunter Shop">
        <div className="space-y-2">
          {shopItems.map(({ id, label, effect, cost }) => (
            <button
              key={id}
              onClick={() => onBuyItem(id)}
              disabled={gold < cost}
              className="w-full flex items-center justify-between bg-zinc-900 rounded-lg px-4 py-3 disabled:opacity-40 active:bg-zinc-800 text-left"
            >
              <div>
                <div className="text-sm text-zinc-200">{label}</div>
                <div className="text-xs text-zinc-500">{effect}</div>
              </div>
              <span className={`text-sm font-bold ${gold >= cost ? "text-yellow-400" : "text-zinc-600"}`}>
                {cost}₲
              </span>
            </button>
          ))}
        </div>
      </Accordion>

      {/* Prestige Shop — only after first rebirth */}
      {(player.rebirths ?? 0) > 0 && (
        <Accordion title={`Prestige Shop  ⚡${player.prestigePoints ?? 0} PP`}>
          <div className="text-xs text-zinc-500 text-center py-2">
            Prestige upgrades available here. Check desktop view for full details.
          </div>
        </Accordion>
      )}

      {/* Settings */}
      <Accordion title="Settings">
        <div className="space-y-2">
          {/* Audio */}
          <div className="flex gap-2">
            <button
              onClick={() => onSetSoundEnabled(!soundEnabled)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${soundEnabled ? "bg-violet-700 text-white" : "bg-zinc-800 text-zinc-500"}`}
            >
              Sound {soundEnabled ? "ON" : "OFF"}
            </button>
            <button
              onClick={() => onSetMusicEnabled(!musicEnabled)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-medium ${musicEnabled ? "bg-violet-700 text-white" : "bg-zinc-800 text-zinc-500"}`}
            >
              Music {musicEnabled ? "ON" : "OFF"}
            </button>
          </div>
          <input
            type="range" min="0" max="1" step="0.05"
            value={volume}
            onChange={e => onSetVolume(Number(e.target.value))}
            className="w-full accent-violet-500"
            aria-label="Volume"
          />
          {/* Save / Load */}
          <div className="flex gap-2">
            <button onClick={onSave} className="flex-1 bg-zinc-800 rounded-lg py-2.5 text-sm text-zinc-200 active:bg-zinc-700">
              Save Game
            </button>
            <button onClick={onLoad} className="flex-1 bg-zinc-800 rounded-lg py-2.5 text-sm text-zinc-200 active:bg-zinc-700">
              Load Game
            </button>
          </div>
          {/* Rebirth */}
          {(player.level ?? 0) >= 50 && (
            <button
              onClick={onRebirth}
              className="w-full bg-amber-900/50 border border-amber-700 rounded-lg py-3 text-sm text-amber-300 font-semibold active:bg-amber-900"
            >
              ⚡ Rebirth  (Level {player.level})
            </button>
          )}
          {/* Reset */}
          <button
            onClick={onReset}
            className="w-full bg-zinc-900 border border-red-900/60 rounded-lg py-2.5 text-sm text-red-500 active:border-red-700"
          >
            Reset Game
          </button>
        </div>
      </Accordion>
    </div>
  );
}
