import { useEffect, useState } from "react";
import { BottomTabBar, MobileTab } from "./BottomTabBar";
import { CombatTab } from "./CombatTab";
import { ManageTab } from "./ManageTab";
import { SpiritsTab } from "./SpiritsTab";
import { LogTab } from "./LogTab";

// Full props interface — using loose types here so we can build incrementally
// will be tightened in a later task
export interface MobileLayoutProps {
  player: any;
  gates: any[];
  gold: number;
  daily: any;
  log: string[];
  running: any;
  combatResult: any;
  combatLog: string[];
  autoDungeon: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
  // handlers
  onStartGate: (gate: any) => void;
  onRest: () => void;
  onUseKey: () => void;
  onRefreshGates: () => void;
  onUsePotion: (itemId: string) => void;
  onDismissResult: () => void;
  onAllocateStat: (stat: string) => void;
  onForfeitDaily: () => void;
  onRebirth: () => void;
  onReset: () => void;
  onSave: () => void;
  onLoad: () => void;
  onToggleAuto: () => void;
  onTrain: (type: string) => void;
  onBuyItem: (itemId: string) => void;
  onSetSoundEnabled: (v: boolean) => void;
  onSetMusicEnabled: (v: boolean) => void;
  onSetVolume: (v: number) => void;
  // modal state
  spiritBindingState: any;
  levelUpState: any;
  rebirthModalOpen: boolean;
  onSetRebirthModalOpen: (v: boolean) => void;
  // extra
  prestigeUpgrades: Record<string, number>;
}

export function MobileLayout(props: MobileLayoutProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>("combat");

  const isRunning = Boolean(props.running);
  // Auto-switch to Combat when a run starts
  useEffect(() => {
    if (isRunning) setActiveTab("combat");
  }, [isRunning]);

  const statPointBadge = (props.player?.points ?? 0) > 0;
  const dailyCompleteBadge = props.daily?.completed === true;

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Slim header */}
      <header className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
        <span className="text-sm font-bold text-violet-400">Hunter's Path</span>
        <div className="flex items-center gap-3 text-xs text-zinc-300">
          <span>₲{props.gold ?? 0}</span>
          <span>🔑{props.player?.keys ?? 0}</span>
          {(props.player?.prestigePoints ?? 0) > 0 && (
            <span className="text-amber-400">⚡{props.player.prestigePoints}</span>
          )}
        </div>
      </header>

      {/* Tab content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        {activeTab === "combat" && (
          <CombatTab
            player={props.player}
            gates={props.gates}
            running={props.running}
            combatResult={props.combatResult}
            combatLog={props.combatLog}
            autoDungeon={props.autoDungeon}
            onToggleAuto={props.onToggleAuto}
            onStartGate={props.onStartGate}
            onRest={props.onRest}
            onUseKey={props.onUseKey}
            onRefreshGates={props.onRefreshGates}
            onUsePotion={props.onUsePotion}
            onDismissResult={props.onDismissResult}
          />
        )}
        {activeTab === "manage" && (
          <ManageTab
            player={props.player}
            gold={props.gold}
            prestigeUpgrades={props.prestigeUpgrades}
            soundEnabled={props.soundEnabled}
            musicEnabled={props.musicEnabled}
            volume={props.volume}
            onAllocateStat={props.onAllocateStat}
            onTrain={props.onTrain}
            onBuyItem={props.onBuyItem}
            onSave={props.onSave}
            onLoad={props.onLoad}
            onRebirth={props.onRebirth}
            onReset={props.onReset}
            onSetSoundEnabled={props.onSetSoundEnabled}
            onSetMusicEnabled={props.onSetMusicEnabled}
            onSetVolume={props.onSetVolume}
          />
        )}
        {activeTab === "spirits" && <SpiritsTab player={props.player} />}
        {activeTab === "log" && (
          <LogTab
            daily={props.daily}
            log={props.log}
            player={props.player}
            onForfeitDaily={props.onForfeitDaily}
          />
        )}
      </main>

      <BottomTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        statPointBadge={statPointBadge}
        dailyCompleteBadge={dailyCompleteBadge}
      />
    </div>
  );
}
