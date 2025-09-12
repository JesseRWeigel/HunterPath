import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Shadow {
  id: string;
  name: string;
  rarity: string;
  type: string;
  level: number;
  power: number;
  description: string;
  abilities?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  exp: number;
  expToNext: number;
}

interface Player {
  shadows: Shadow[];
}

interface ShadowArmyProps {
  player: Player;
  getRarityBorder: (rarity: string) => string;
  getRarityColor: (rarity: string) => string;
  shadowUpkeep: (player: Player) => number;
}

export function ShadowArmy({
  player,
  getRarityBorder,
  getRarityColor,
  shadowUpkeep,
}: ShadowArmyProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="shadow-army">
        <AccordionTrigger className="text-lg font-bold text-zinc-100 hover:no-underline">
          <div className="flex items-center space-x-2">
            <i className="fas fa-users text-purple-400"></i>
            <span>Shadow Army</span>
            {player.shadows.length > 0 && (
              <span className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                {player.shadows.length}
              </span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="max-h-96 overflow-y-auto">
            {player.shadows.length === 0 && (
              <div className="opacity-70 text-sm text-center py-4">
                No shadows recruited
              </div>
            )}

            <div className="space-y-3 mb-4">
              {player.shadows.map((s) => (
                <div
                  key={s.id}
                  className={`bg-zinc-800/30 border ${getRarityBorder(
                    s.rarity
                  )} rounded-lg p-3`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 bg-gradient-to-br ${getRarityColor(
                          s.rarity
                        )
                          .replace("text-", "from-")
                          .replace(
                            "-400",
                            "-600"
                          )} to-purple-800 rounded-full flex items-center justify-center`}
                      >
                        <i className="fas fa-ghost text-white text-xs"></i>
                      </div>
                      <div>
                        <div
                          className={`font-bold ${getRarityColor(s.rarity)}`}
                        >
                          {s.name}
                        </div>
                        <div className="text-xs text-zinc-400 capitalize">
                          {s.rarity} {s.type} • Level {s.level}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-purple-400">
                        +{s.power}
                      </div>
                      <div className="text-xs text-zinc-500">Power</div>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-400 mb-2">
                    {s.description}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-zinc-300 mb-1">
                      Abilities:
                    </div>
                    {(s.abilities || []).map((ability) => (
                      <div
                        key={ability.id}
                        className="flex items-center space-x-2"
                      >
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            ability.type === "passive"
                              ? "bg-blue-600/20 text-blue-400"
                              : "bg-green-600/20 text-green-400"
                          }`}
                        >
                          {ability.type}
                        </span>
                        <span className="text-xs text-zinc-300 font-medium">
                          {ability.name}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2 pt-2 border-t border-zinc-700">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-zinc-400">
                        EXP: {s.exp}/{s.expToNext}
                      </span>
                      <div className="w-20 bg-zinc-700 rounded-full h-1.5">
                        <div
                          className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${(s.exp / s.expToNext) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {player.shadows.length > 0 && (
              <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-purple-300">Total Army Power:</span>
                  <span className="font-bold text-purple-400">
                    +{player.shadows.reduce((a, s) => a + s.power, 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-purple-300">MP Upkeep/tick:</span>
                  <span className="font-bold text-blue-400">
                    -{shadowUpkeep(player)} MP
                  </span>
                </div>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
