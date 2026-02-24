import { Sword, BarChart2, Ghost, ScrollText } from "lucide-react";

export type MobileTab = "combat" | "manage" | "spirits" | "log";

interface Props {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  statPointBadge: boolean;
  dailyCompleteBadge: boolean;
}

const TABS = [
  { id: "combat"  as MobileTab, label: "Combat",  Icon: Sword },
  { id: "manage"  as MobileTab, label: "Manage",  Icon: BarChart2 },
  { id: "spirits" as MobileTab, label: "Spirits", Icon: Ghost },
  { id: "log"     as MobileTab, label: "Log",     Icon: ScrollText },
];

export function BottomTabBar({ activeTab, onTabChange, statPointBadge, dailyCompleteBadge }: Props) {
  return (
    <nav className="flex border-t border-zinc-800 bg-zinc-950 shrink-0">
      {TABS.map(({ id, label, Icon }) => {
        const active = id === activeTab;
        const badge = (id === "manage" && statPointBadge) || (id === "combat" && dailyCompleteBadge);
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            aria-current={active ? "page" : undefined}
            className={`relative flex flex-1 flex-col items-center justify-center py-3 gap-0.5 text-xs font-medium transition-colors ${
              active ? "text-violet-400" : "text-zinc-500"
            }`}
          >
            <Icon size={20} />
            <span>{label}</span>
            {badge && (
              <span
                aria-label={id === "manage" ? "Stat points available" : "Daily quest complete"}
                className={`absolute top-2 right-1/4 w-2 h-2 rounded-full ${id === "manage" ? "bg-red-500" : "bg-yellow-400"}`}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}
