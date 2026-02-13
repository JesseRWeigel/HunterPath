import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Player {
  stats: {
    STR: number;
    AGI: number;
    INT: number;
    VIT: number;
    LUCK: number;
  };
  points: number;
}

interface StatsProps {
  player: Player;
  allocateStatWithFeedback: (stat: keyof Player["stats"]) => void;
}

const STAT_ICONS = {
  STR: "fas fa-fist-raised",
  AGI: "fas fa-running",
  INT: "fas fa-brain",
  VIT: "fas fa-heart",
  LUCK: "fas fa-dice",
};

const STAT_COLORS = {
  STR: "bg-red-600",
  AGI: "bg-green-600",
  INT: "bg-blue-600",
  VIT: "bg-orange-600",
  LUCK: "bg-yellow-600",
};

export function Stats({ player, allocateStatWithFeedback }: StatsProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="stats">
        <AccordionTrigger className="text-lg font-bold text-zinc-100 hover:no-underline">
          <div className="flex items-center justify-between w-full mr-4">
            <span>Stats</span>
            {player.points > 0 && (
              <div className="bg-violet-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                {player.points} Points
              </div>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="max-h-96 overflow-y-auto">
            <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <h4 className="text-sm font-bold text-blue-300 mb-2">
                <i className="fas fa-info-circle mr-1"></i>
                Stat Effects
              </h4>
              <div className="text-xs text-blue-200 space-y-1">
                <div>
                  <span className="text-red-400 font-bold">STR:</span> Primary
                  damage (+3 power each)
                </div>
                <div>
                  <span className="text-green-400 font-bold">AGI:</span> Speed &
                  damage (+2 power each)
                </div>
                <div>
                  <span className="text-blue-400 font-bold">INT:</span> Magic
                  damage & spirit binding (+1.5 power each)
                </div>
                <div>
                  <span className="text-orange-400 font-bold">VIT:</span> Health
                  & defense (+0.5 power each)
                </div>
                <div>
                  <span className="text-yellow-400 font-bold">LUCK:</span>{" "}
                  Critical hits & item drops
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(player.stats).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between bg-zinc-800/50 rounded-lg p-3"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 ${
                        STAT_COLORS[k as keyof typeof STAT_COLORS]
                      } rounded-full flex items-center justify-center text-white text-sm font-bold`}
                    >
                      <i
                        className={STAT_ICONS[k as keyof typeof STAT_ICONS]}
                      ></i>
                    </div>
                    <div>
                      <div className="font-bold text-zinc-100">{k}</div>
                      <div className="text-sm text-zinc-400">
                        {k === "STR" && "Strength"}
                        {k === "AGI" && "Agility"}
                        {k === "INT" && "Intelligence"}
                        {k === "VIT" && "Vitality"}
                        {k === "LUCK" && "Luck"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xl">{v}</span>
                    <button
                      className="w-8 h-8 bg-violet-600 hover:bg-violet-500 text-white rounded-full transition-colors disabled:opacity-40"
                      onClick={() =>
                        allocateStatWithFeedback(k as keyof Player["stats"])
                      }
                      disabled={player.points <= 0}
                    >
                      <i className="fas fa-plus text-xs"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
