const MOBILE_LORE = [
  { level: 1,  title: "What Are Gates?",            text: "Dimensional rifts that appeared across the world without warning. Inside lie monsters, treasure, and mysteries. Hunters are those brave enough to enter." },
  { level: 5,  title: "The Hunter's Guild",          text: "Formed to organize Hunters and manage gate clearance. They rank both Hunters and gates from E (weakest) to S (catastrophic). Guild support keeps cities safe." },
  { level: 10, title: "Spirit Binding",              text: "Some Hunters develop the ability to bind the essence of defeated bosses, creating spirit allies that fight alongside them. The mechanism is poorly understood." },
  { level: 15, title: "The Fatigue Problem",         text: "Prolonged exposure to gate energy causes fatigue — a dulling of the senses that weakens even the strongest Hunters. Rest is not optional; it is survival." },
  { level: 20, title: "Gate Ranks Explained",        text: "E-Rank gates are manageable. D through C require real skill. B-Rank gates have leveled entire city blocks when left unchecked. A and S-Rank gates are existential threats." },
  { level: 30, title: "The Origin of Gates",         text: "No one knows why gates appeared. Some theories suggest a weakening barrier between dimensions. Others point to an ancient experiment gone wrong. The truth remains buried." },
  { level: 40, title: "Rebirth",                    text: "A handful of Hunters have discovered a way to shed their accumulated power and start anew — emerging stronger each time. They call it Rebirth. The cost is everything you've built." },
  { level: 50, title: "Beyond S-Rank",               text: "Rumors persist of gates beyond S-Rank — tears in reality so vast they could swallow nations. If they exist, only a reborn Hunter could hope to survive them." },
];

const DIFFICULTY_STYLE: Record<string, string> = {
  easy:   "bg-green-900/50 text-green-400 border-green-800",
  medium: "bg-yellow-900/50 text-yellow-400 border-yellow-800",
  hard:   "bg-red-900/50 text-red-400 border-red-800",
  epic:   "bg-purple-900/50 text-purple-400 border-purple-800",
};

interface LogTabProps {
  daily: any;
  log: string[];
  player: any;
  onForfeitDaily: () => void;
}

export function LogTab({ daily, log, player, onForfeitDaily }: LogTabProps) {
  const quests: any[] = daily?.availableQuests ?? [];
  const completedIds: string[] = daily?.completedQuests ?? [];
  const completedCount = quests.filter((q) => completedIds.includes(q.id)).length;
  const allDone = daily?.completed === true;
  const inventory = player.inv ?? [];

  return (
    <div className="p-3 space-y-3 pb-4">
      {/* Daily Quest section */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-200">Daily Quest</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                allDone
                  ? "bg-emerald-900/60 text-emerald-400"
                  : "bg-violet-900/60 text-violet-400"
              }`}
            >
              {allDone ? "Complete ✓" : "Active"}
            </span>
          </div>
          <button
            onClick={onForfeitDaily}
            className="text-xs text-zinc-600 active:text-red-400 py-1 px-2"
          >
            Forfeit
          </button>
        </div>

        {/* Overall progress bar */}
        {daily?.active && !allDone && quests.length > 0 && (
          <div className="px-4 pt-3 pb-1">
            <div className="flex justify-between text-xs text-zinc-500 mb-1">
              <span>
                {completedCount}/{quests.length} completed
              </span>
              {(daily?.questReputation ?? 0) > 0 && (
                <span className="text-amber-400">Rep: {daily.questReputation}</span>
              )}
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-violet-600 rounded-full"
                style={{
                  width: `${
                    quests.length > 0 ? (completedCount / quests.length) * 100 : 0
                  }%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Individual quest cards */}
        {quests.map((quest: any) => {
          const done = completedIds.includes(quest.id);
          return (
            <div
              key={quest.id}
              className={`px-4 py-3 border-t border-zinc-800 ${done ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded border ${
                    DIFFICULTY_STYLE[quest.difficulty] ?? ""
                  }`}
                >
                  {quest.difficulty}
                </span>
                <span className="text-sm text-zinc-200 flex-1 truncate">{quest.name}</span>
                {done && <span className="text-emerald-400 shrink-0">✓</span>}
              </div>
              <div className="text-xs text-zinc-500 mb-1.5">{quest.description}</div>
              <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-1">
                <div
                  className="h-full bg-violet-500 rounded-full"
                  style={{
                    width: `${
                      (quest.need ?? 0) > 0
                        ? Math.min(100, ((quest.have ?? 0) / quest.need) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-zinc-600">
                <span>
                  {quest.have ?? 0}/{quest.need ?? 0}
                </span>
                <span className="text-violet-400">
                  {(quest.expReward ?? 0) > 0 ? `+${quest.expReward} EXP` : ""}
                  {(quest.goldReward ?? 0) > 0 ? ` +${quest.goldReward}₲` : ""}
                </span>
              </div>
            </div>
          );
        })}

        {allDone && (
          <div className="px-4 py-3 text-center text-emerald-400 text-sm font-semibold border-t border-zinc-800">
            All quests complete! Rewards claimed.
          </div>
        )}

        {!daily?.active && quests.length === 0 && (
          <div className="px-4 py-3 text-xs text-zinc-600 text-center">
            No active daily quest. One will appear at the next reset.
          </div>
        )}
      </div>

      {/* Inventory */}
      {inventory.length > 0 && (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3">
          <div className="text-sm font-semibold text-zinc-300 mb-2">
            Inventory ({inventory.length})
          </div>
          <div className="space-y-1">
            {inventory.map((item: any, i: number) => (
              <div
                key={item.id ?? i}
                className="flex justify-between text-xs text-zinc-400 py-1 border-b border-zinc-800 last:border-0"
              >
                <div>
                  <span>{item.name ?? item.type ?? item.id}</span>
                  {item.rarity && (
                    <span className="ml-1.5 text-zinc-600 capitalize">{item.rarity}</span>
                  )}
                </div>
                {item.quality != null && (
                  <span className="text-zinc-600">Q{item.quality}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity log */}
      <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-3">
        <div className="text-sm font-semibold text-zinc-300 mb-2">Activity Log</div>
        <div className="space-y-0.5 max-h-52 overflow-y-auto">
          {log.length === 0 ? (
            <div className="text-xs text-zinc-600">No activity yet.</div>
          ) : (
            [...log]
              .reverse()
              .slice(0, 60)
              .map((entry, i) => (
                <div key={i} className="text-xs text-zinc-500 leading-relaxed">
                  {entry}
                </div>
              ))
          )}
        </div>
      </div>

      {/* Lore & Story */}
      <details className="bg-zinc-900 rounded-xl border border-zinc-800">
        <summary className="px-4 py-3 text-sm font-semibold text-zinc-400 cursor-pointer select-none list-none flex justify-between">
          <span>Lore &amp; Story</span>
          <span className="text-zinc-600 text-xs">tap to expand</span>
        </summary>
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-zinc-800">
          {MOBILE_LORE.filter(e => (player.level ?? 1) >= e.level).map((entry, i) => (
            <div key={i}>
              <div className="text-xs font-semibold text-violet-400 mb-0.5">{entry.title}</div>
              <div className="text-xs text-zinc-500 leading-relaxed">{entry.text}</div>
            </div>
          ))}
          {MOBILE_LORE.some(e => (player.level ?? 1) < e.level) && (
            <div className="text-xs text-zinc-600 italic text-center pt-1">
              More lore unlocks as you level up...
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
