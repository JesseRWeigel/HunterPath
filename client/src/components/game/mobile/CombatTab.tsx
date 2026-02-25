import React from "react";
import { PlayerAvatar, BossE, BossD, BossC, BossB, BossA, BossS } from "../bosses";
import { RANK_COLORS } from "../HuntersPath";

const BOSS_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  E: BossE, D: BossD, C: BossC, B: BossB, A: BossA, S: BossS,
};


interface CombatTabProps {
  player: any;
  playerPower: number;
  gates: any[];
  running: any;
  combatResult: any;
  combatLog: string[];
  autoDungeon: boolean;
  onToggleAuto: () => void;
  onStartGate: (gate: any) => void;
  onRest: () => void;
  onUseKey: () => void;
  onRefreshGates: () => void;
  onUsePotion: (itemId: string) => void;
  onDismissResult: () => void;
}

function HpBar({ current, max, color }: { current: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  return (
    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function CombatTab({
  player, playerPower, gates, running, combatResult, combatLog,
  autoDungeon, onToggleAuto, onStartGate, onRest, onUseKey,
  onRefreshGates, onUsePotion, onDismissResult,
}: CombatTabProps) {
  const inRun = Boolean(running);
  const potions = (player.inv ?? []).filter((i: any) => i.type === "potion" || i.id?.includes("potion"));

  return (
    <div className="flex flex-col min-h-full">
      {/* Player strip */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <PlayerAvatar className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-zinc-100">Hunter  Lv{player.level}</span>
              <span className="text-xs text-zinc-400">PWR {Math.floor(playerPower)}</span>
            </div>
            <div className="flex gap-1 mt-1">
              <div className="flex-1">
                <HpBar current={player.hp} max={player.maxHp} color="bg-red-500" />
              </div>
              <div className="flex-1">
                <HpBar current={player.mp} max={player.maxMp} color="bg-blue-500" />
              </div>
            </div>
          </div>
        </div>
        {(player.fatigue ?? 0) > 5 && (
          <div className="text-xs text-amber-400 mt-0.5">Fatigue {Math.round(player.fatigue)}%</div>
        )}
      </div>

      {/* Main area */}
      <div className="flex-1">
        {inRun ? (
          <ActiveCombat
            running={running}
            combatResult={combatResult}
            player={player}
            combatLog={combatLog}
            onDismissResult={onDismissResult}
          />
        ) : (
          <GateList gates={gates} playerPower={playerPower} onStartGate={onStartGate} />
        )}
      </div>

      {/* Action strip */}
      <div className="shrink-0 border-t border-zinc-800 bg-zinc-900 px-2 py-2">
        <div className="flex gap-1.5">
          <button
            onClick={onToggleAuto}
            className={`flex-1 rounded-lg py-2.5 text-xs font-semibold transition-colors ${
              autoDungeon ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400"
            }`}
          >
            Auto {autoDungeon ? "ON" : "OFF"}
          </button>
          <button
            onClick={onRest}
            disabled={inRun}
            className="flex-1 rounded-lg py-2.5 text-xs font-semibold bg-zinc-800 text-zinc-300 disabled:opacity-40"
          >
            Rest
          </button>
          <button
            onClick={onUseKey}
            disabled={(player.keys ?? 0) <= 0 || inRun}
            className="flex-1 rounded-lg py-2.5 text-xs font-semibold bg-zinc-800 text-zinc-300 disabled:opacity-40"
          >
            Key ({player.keys ?? 0})
          </button>
          <button
            onClick={onRefreshGates}
            disabled={inRun}
            className="flex-1 rounded-lg py-2.5 text-xs font-semibold bg-zinc-800 text-zinc-300 disabled:opacity-40"
          >
            Refresh
          </button>
          {potions.length > 0 && (
            <button
              onClick={() => onUsePotion(potions[0].id)}
              className="flex-1 rounded-lg py-2.5 text-xs font-semibold bg-emerald-900 text-emerald-300"
            >
              Potion ({potions.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GateList({
  gates,
  playerPower,
  onStartGate,
}: {
  gates: any[];
  playerPower: number;
  onStartGate: (g: any) => void;
}) {
  return (
    <div className="p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-semibold text-zinc-300">Gates ({gates.length})</span>
        <span className="text-xs text-zinc-500">Your PWR {Math.floor(playerPower)}</span>
      </div>
      {gates.map((gate) => {
        // recommended is the difficulty baseline; power is the boss's actual power
        const rec = gate.recommended ?? gate.power;
        const danger = playerPower < rec * 0.8;
        const rankBg = RANK_COLORS[gate.rank as keyof typeof RANK_COLORS] ?? "bg-zinc-600";
        // EXP is computed dynamically on completion; show an estimate from recommended
        const estExp = Math.floor(rec * 1.1 + 25);
        return (
          <button
            key={gate.id}
            onClick={() => onStartGate(gate)}
            className="w-full text-left rounded-xl bg-zinc-900 border border-zinc-800 active:border-violet-600 p-3"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span
                  className={`${rankBg} text-white text-xs font-bold w-6 h-6 rounded flex items-center justify-center`}
                >
                  {gate.rank}
                </span>
                <span className="text-sm text-zinc-200">{gate.name ?? `${gate.rank}-Rank Gate`}</span>
                {gate.modifiers?.length > 0 && (
                  <span className="text-xs text-zinc-500">
                    {gate.modifiers.length} mod{gate.modifiers.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <span className={`text-xs font-bold ${danger ? "text-red-400" : "text-emerald-400"}`}>
                PWR {Math.round(gate.power)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>{gate.rank}-Rank</span>
              <span className="text-violet-400">~{estExp} EXP</span>
            </div>
            {danger && <div className="text-xs text-red-400 mt-1">Too Dangerous!</div>}
          </button>
        );
      })}
    </div>
  );
}

function ActiveCombat({
  running,
  combatResult,
  player,
  combatLog,
  onDismissResult,
}: {
  running: any;
  combatResult: any;
  player: any;
  combatLog: string[];
  onDismissResult: () => void;
}) {
  const BossComp = running ? BOSS_COMPONENTS[running.gate?.rank] : null;
  // RunningState uses hpEnemy for current boss HP; boss.maxHp for the ceiling
  const bossHp = running?.hpEnemy ?? 0;
  const bossMaxHp = running?.boss?.maxHp ?? 1;

  return (
    <div className="p-3 space-y-3">
      {/* VS layout */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-800">
          <PlayerAvatar className="w-14 h-14 mx-auto mb-1" />
          <div className="text-xs font-semibold text-violet-300 mb-1">Hunter</div>
          <HpBar current={player.hp} max={player.maxHp} color="bg-red-500" />
          <div className="text-xs text-zinc-500 mt-0.5">
            {player.hp}/{player.maxHp}
          </div>
          <HpBar current={player.mp} max={player.maxMp} color="bg-blue-500" />
        </div>
        <div className="bg-zinc-900 rounded-xl p-3 text-center border border-zinc-800">
          {BossComp ? (
            <BossComp className="w-14 h-14 mx-auto mb-1" />
          ) : (
            <div className="w-14 h-14 mx-auto mb-1 bg-zinc-800 rounded-full" />
          )}
          <div className="text-xs font-semibold text-red-400 mb-1">
            {running?.boss?.name ?? "Boss"}
          </div>
          <div className="text-[10px] text-zinc-500">
            {running?.gate?.rank}-Rank Boss
          </div>
          <HpBar current={bossHp} max={bossMaxHp} color="bg-orange-500" />
          <div className="text-xs text-zinc-500 mt-0.5">
            {bossHp}/{bossMaxHp}
          </div>
        </div>
      </div>

      {/* Gate info */}
      <div className="text-xs text-zinc-500 text-center">
        {running?.gate?.name ?? `${running?.gate?.rank}-Rank Gate`}
        {running?.tick != null && <span className="ml-2">Tick {running.tick}</span>}
      </div>

      {/* Combat log */}
      <div className="bg-zinc-950 rounded-xl p-2 h-40 overflow-y-auto text-xs space-y-0.5 border border-zinc-800">
        {combatLog.length === 0 ? (
          <div className="text-zinc-600 text-center pt-6">Combat in progress...</div>
        ) : (
          combatLog.slice(-30).map((entry: string, i: number) => (
            <div key={i} className="text-zinc-400 leading-relaxed">
              {entry}
            </div>
          ))
        )}
      </div>

      {/* Result */}
      {combatResult && (
        <div
          className={`rounded-xl p-4 text-center border ${
            combatResult.victory
              ? "bg-emerald-900/30 border-emerald-700"
              : "bg-red-900/30 border-red-800"
          }`}
        >
          <div className="text-xl font-bold mb-1">
            {combatResult.victory ? "Victory!" : "Defeated"}
          </div>
          {combatResult.victory && (
            <div className="text-sm text-zinc-300 mb-2">
              +{combatResult.expGained ?? 0} EXP · +{combatResult.goldGained ?? 0}
            </div>
          )}
          <button
            onClick={onDismissResult}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white rounded-lg py-3 font-semibold"
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
