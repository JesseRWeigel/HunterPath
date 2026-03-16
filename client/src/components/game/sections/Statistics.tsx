import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { GameStats } from "@/lib/game/statsTracker";
import { formatPlayTime } from "@/lib/game/statsTracker";

const fmt = (n: number) => new Intl.NumberFormat().format(Math.floor(n));

interface StatRowProps {
  label: string;
  value: string | number;
}

function StatRow({ label, value }: StatRowProps) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-zinc-800/50 last:border-0">
      <span className="text-zinc-400 text-sm">{label}</span>
      <span className="text-zinc-100 text-sm font-medium">{String(value)}</span>
    </div>
  );
}

interface StatGroupProps {
  title: string;
  icon: string;
  children: React.ReactNode;
}

function StatGroup({ title, icon, children }: StatGroupProps) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="flex items-center space-x-2 mb-2">
        <i className={`${icon} text-zinc-400 text-xs`}></i>
        <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          {title}
        </span>
      </div>
      <div className="bg-zinc-900/50 rounded-lg px-3 py-2">{children}</div>
    </div>
  );
}

interface StatisticsProps {
  stats: GameStats;
}

const RANK_ORDER = ["E", "D", "C", "B", "A", "S"];

export function Statistics({ stats }: StatisticsProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="statistics">
        <AccordionTrigger className="text-lg font-bold text-zinc-100 hover:no-underline">
          <div className="flex items-center space-x-2">
            <i className="fas fa-chart-bar text-zinc-400"></i>
            <span>Statistics</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-2">
            <StatGroup title="Combat" icon="fas fa-swords">
              <StatRow label="Damage Dealt" value={fmt(stats.totalDamageDealt)} />
              <StatRow label="Damage Taken" value={fmt(stats.totalDamageTaken)} />
              <StatRow
                label="Fastest Victory"
                value={stats.fastestVictory > 0 ? `${stats.fastestVictory} ticks` : "--"}
              />
              <StatRow
                label="Longest Combat"
                value={stats.longestCombat > 0 ? `${stats.longestCombat} ticks` : "--"}
              />
            </StatGroup>

            <StatGroup title="Progression" icon="fas fa-trophy">
              <StatRow label="Gates Completed" value={fmt(stats.totalGatesCompleted)} />
              <StatRow label="Gates Failed" value={fmt(stats.totalGatesFailed)} />
              <StatRow label="Highest Rank" value={`${stats.highestGateRank}-Rank`} />
              <StatRow label="EXP Gained" value={fmt(stats.totalExpGained)} />
              <StatRow label="Gold Gained" value={fmt(stats.totalGoldGained)} />
              <StatRow label="Play Time" value={formatPlayTime(stats.totalPlayTime)} />
              {RANK_ORDER.map(
                (rank) =>
                  (stats.gatesPerRank[rank] ?? 0) > 0 && (
                    <StatRow
                      key={rank}
                      label={`${rank}-Rank Gates`}
                      value={fmt(stats.gatesPerRank[rank])}
                    />
                  )
              )}
            </StatGroup>

            <StatGroup title="Collection" icon="fas fa-ghost">
              <StatRow label="Spirits Bound" value={fmt(stats.totalSpiritsBound)} />
            </StatGroup>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
