import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ACHIEVEMENTS,
  type AchievementState,
  type AchievementCategory,
} from "@/lib/game/achievementSystem";

interface AchievementsProps {
  achievementStates: AchievementState[];
}

const CATEGORY_LABELS: Record<AchievementCategory, { label: string; icon: string }> = {
  combat: { label: "Combat", icon: "fas fa-crossed-swords" },
  progression: { label: "Progression", icon: "fas fa-chart-line" },
  collection: { label: "Collection", icon: "fas fa-gem" },
  daily: { label: "Daily", icon: "fas fa-calendar-check" },
};

const CATEGORY_ORDER: AchievementCategory[] = ["combat", "progression", "collection", "daily"];

export function Achievements({ achievementStates }: AchievementsProps) {
  const stateMap = new Map(achievementStates.map((s) => [s.id, s]));
  const unlockedCount = achievementStates.filter((a) => a.unlocked).length;

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="achievements">
        <AccordionTrigger className="text-lg font-bold text-zinc-100 hover:no-underline">
          <div className="flex items-center space-x-2">
            <i className="fas fa-medal text-yellow-400"></i>
            <span>Achievements</span>
            <span className="text-sm font-normal text-zinc-400">
              ({unlockedCount}/{ACHIEVEMENTS.length})
            </span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-4">
            {CATEGORY_ORDER.map((cat) => {
              const defs = ACHIEVEMENTS.filter((a) => a.category === cat);
              const { label, icon } = CATEGORY_LABELS[cat];
              return (
                <div key={cat}>
                  <h4 className="text-sm font-semibold text-zinc-300 mb-2 flex items-center space-x-2">
                    <i className={`${icon} text-zinc-400`}></i>
                    <span>{label}</span>
                  </h4>
                  <div className="space-y-2">
                    {defs.map((def) => {
                      const state = stateMap.get(def.id);
                      const progress = state?.progress ?? 0;
                      const unlocked = state?.unlocked ?? false;
                      const pct = Math.min(100, Math.round((progress / def.maxProgress) * 100));

                      return (
                        <div
                          key={def.id}
                          className={`rounded-lg p-3 border ${
                            unlocked
                              ? "bg-violet-950/40 border-yellow-500/40"
                              : "bg-zinc-900/50 border-zinc-700/30"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-2">
                              {unlocked ? (
                                <i className="fas fa-check-circle text-yellow-400"></i>
                              ) : (
                                <i className="fas fa-lock text-zinc-500"></i>
                              )}
                              <span
                                className={`font-bold text-sm ${
                                  unlocked ? "text-yellow-300" : "text-zinc-300"
                                }`}
                              >
                                {def.name}
                              </span>
                            </div>
                            <span className="text-xs tabular-nums text-zinc-400">
                              {Math.min(progress, def.maxProgress)}/{def.maxProgress}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mb-1">{def.description}</p>
                          {unlocked && state?.unlockedAt ? (
                            <p className="text-xs text-violet-400">
                              Unlocked {new Date(state.unlockedAt).toLocaleDateString()}
                            </p>
                          ) : (
                            <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-600 to-purple-500 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
