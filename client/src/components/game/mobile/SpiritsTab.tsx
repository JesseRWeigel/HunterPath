const RARITY_BORDER: Record<string, string> = {
  common:    "border-l-zinc-500",
  uncommon:  "border-l-green-500",
  rare:      "border-l-blue-500",
  epic:      "border-l-purple-500",
  legendary: "border-l-yellow-400",
};

const RARITY_LABEL: Record<string, string> = {
  common:    "★",
  uncommon:  "★★",
  rare:      "★★★",
  epic:      "★★★★",
  legendary: "★★★★★",
};

export function SpiritsTab({ player }: { player: any }) {
  const spirits = player.spirits ?? [];
  const totalPower = spirits.reduce((a: number, s: any) => a + (s.power ?? 0), 0);
  const mpUpkeep = Math.floor(
    spirits.length +
    spirits.reduce((a: number, s: any) => a + (s.power ?? 0) * 0.02, 0)
  );

  if (spirits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-500 px-6 text-center gap-3 pt-12">
        <div className="text-5xl">👻</div>
        <div className="text-sm font-semibold text-zinc-400">No spirits yet</div>
        <div className="text-xs">Defeat bosses in gates to bind their spirits to your army.</div>
      </div>
    );
  }

  return (
    <div className="p-3">
      {/* Summary bar */}
      <div className="flex justify-between text-sm mb-3 bg-zinc-900 rounded-xl px-4 py-3 border border-zinc-800">
        <span className="text-zinc-400">
          Army PWR <span className="text-violet-300 font-bold ml-1">{totalPower}</span>
        </span>
        <span className="text-zinc-400">
          MP Upkeep <span className="text-blue-300 font-bold ml-1">{mpUpkeep}/tick</span>
        </span>
      </div>

      {/* Spirit cards */}
      <div className="space-y-2">
        {spirits.map((spirit: any) => (
          <div
            key={spirit.id}
            className={`bg-zinc-900 border-l-4 ${RARITY_BORDER[spirit.rarity] ?? "border-l-zinc-500"} rounded-xl p-3 border border-zinc-800`}
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <span className="text-sm font-semibold text-zinc-100">{spirit.name}</span>
                <span className="ml-2 text-xs text-zinc-500">{spirit.type}</span>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs text-zinc-500">
                  {RARITY_LABEL[spirit.rarity] ?? "★"} {spirit.rarity}
                </div>
                <div className="text-xs text-violet-400 font-semibold">PWR {spirit.power ?? 0}</div>
              </div>
            </div>

            {/* Level + EXP bar */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs bg-zinc-800 rounded px-1.5 py-0.5 text-zinc-400">
                Lv {spirit.level ?? 1}
              </span>
              <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-violet-600 rounded-full"
                  style={{
                    width: `${
                      (spirit.expToNext ?? 0) > 0
                        ? Math.min(100, ((spirit.exp ?? 0) / spirit.expToNext) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
              <span className="text-xs text-zinc-600">
                {spirit.exp ?? 0}/{spirit.expToNext ?? 100}
              </span>
            </div>

            {/* Abilities */}
            {(spirit.abilities ?? []).map((ab: any, i: number) => (
              <div key={ab.id ?? i} className="text-xs text-zinc-500">
                <span className="text-zinc-300 font-medium">{ab.name}:</span> {ab.description}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
