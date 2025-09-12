import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Quest {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  type: string;
  expReward: number;
  goldReward: number;
  bonusRewards?: boolean;
  have: number;
  need: number;
}

interface Daily {
  active: boolean;
  completed: boolean;
  questReputation: number;
  completedQuests: string[];
  availableQuests: Quest[];
}

interface DailyQuestProps {
  daily: Daily;
  getDifficultyBgColor: (difficulty: string) => string;
  getDifficultyColor: (difficulty: string) => string;
}

export function DailyQuest({
  daily,
  getDifficultyBgColor,
  getDifficultyColor,
}: DailyQuestProps) {
  const questIcons = {
    combat: "fas fa-sword",
    exploration: "fas fa-door-open",
    collection: "fas fa-backpack",
    skill: "fas fa-magic",
    challenge: "fas fa-trophy",
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="daily-quest">
        <AccordionTrigger className="text-lg font-bold text-zinc-100 hover:no-underline">
          <div className="flex items-center justify-between w-full mr-4">
            <span>Daily Quest</span>
            <div className="flex items-center space-x-2">
              {daily.active && (
                <>
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-400 font-medium">
                    Active
                  </span>
                </>
              )}
              {/* Next reset timer */}
              <div className="text-xs text-zinc-400">
                <i className="fas fa-clock mr-1"></i>
                Resets at midnight
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="max-h-96 overflow-y-auto">
            {/* Quest Reputation Display */}
            {daily.questReputation > 0 && (
              <div className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-star text-purple-400"></i>
                    <span className="text-purple-200 font-medium">
                      Quest Reputation
                    </span>
                  </div>
                  <span className="text-purple-300 font-bold">
                    {daily.questReputation}
                  </span>
                </div>
                <div className="text-xs text-purple-200/80 mt-1">
                  Higher reputation unlocks epic quests and better rewards
                </div>
              </div>
            )}

            {!daily.active && !daily.completed && (
              <div className="text-sm opacity-80 text-center py-8">
                Start your Daily Quest to earn bonuses. Select 3 quests from 5
                available options. Fail or quit and you face the Penalty Zone.
              </div>
            )}

            {daily.active && !daily.completed && (
              <>
                <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/30 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <i className="fas fa-clock text-yellow-400"></i>
                    <span className="text-yellow-200 font-medium">
                      Complete quests to earn rewards!
                    </span>
                  </div>
                  <p className="text-sm text-yellow-100/80">
                    Progress: {daily.completedQuests.length}/
                    {daily.availableQuests.length} completed
                  </p>
                </div>

                <div className="space-y-3">
                  {daily.availableQuests.map((quest) => {
                    const isCompleted = daily.completedQuests.includes(
                      quest.id
                    );

                    return (
                      <div
                        key={quest.id}
                        className={`relative border-2 rounded-lg p-4 transition-all ${
                          isCompleted
                            ? "border-green-500 bg-green-900/20"
                            : "border-zinc-600 bg-zinc-800/30"
                        }`}
                      >
                        {/* Difficulty Badge */}
                        <div
                          className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${getDifficultyBgColor(
                            quest.difficulty
                          )}`}
                        >
                          {quest.difficulty.toUpperCase()}
                        </div>

                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-10 h-10 ${getDifficultyBgColor(
                              quest.difficulty
                            )} rounded-full flex items-center justify-center`}
                          >
                            <i
                              className={`${
                                questIcons[
                                  quest.type as keyof typeof questIcons
                                ]
                              } text-white`}
                            ></i>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <div
                                className={`font-medium ${getDifficultyColor(
                                  quest.difficulty
                                )}`}
                              >
                                {quest.name}
                              </div>
                              {isCompleted && (
                                <i className="fas fa-check-circle text-green-400"></i>
                              )}
                            </div>
                            <div className="text-sm text-zinc-400 mt-1">
                              {quest.description}
                            </div>
                            <div className="flex items-center space-x-4 mt-2 text-xs">
                              <span className="text-green-400">
                                +{quest.expReward} EXP
                              </span>
                              <span className="text-yellow-400">
                                +{quest.goldReward} Gold
                              </span>
                              {quest.bonusRewards && (
                                <span className="text-purple-400">
                                  +Bonus Rewards
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Progress Bar for All Quests */}
                        <div className="mt-3">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-zinc-400">Progress</span>
                            <span className="text-green-400">
                              {quest.have}/{quest.need}
                            </span>
                          </div>
                          <div className="w-full bg-zinc-700 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{
                                width: `${Math.round(
                                  (quest.have / quest.need) * 100
                                )}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-zinc-400 text-center">
                    Complete quests to earn rewards and reputation!
                  </div>
                  <div className="text-xs text-violet-400 text-center mt-2">
                    <i className="fas fa-crown mr-1"></i>
                    Complete all 5 quests for Daily Master bonus rewards!
                  </div>
                </div>
              </>
            )}

            {daily.completed && (
              <div className="text-emerald-400 text-sm text-center py-8">
                <i className="fas fa-trophy text-2xl mb-2"></i>
                <div>Daily quests completed!</div>
                <div className="text-xs text-emerald-300 mt-1">
                  よくやった (yoku yatta): well done!
                </div>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
