import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface HunterShopProps {
  gold: number;
  playerLevel: number;
  buyPotion: () => void;
  buyUpgrade: (type: "weapon" | "armor" | "accessory") => void;
}

export function HunterShop({
  gold,
  playerLevel,
  buyPotion,
  buyUpgrade,
}: HunterShopProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="shop">
        <AccordionTrigger className="text-lg font-bold text-yellow-300 hover:no-underline">
          <i className="fas fa-shopping-cart mr-2"></i>
          Hunter Shop
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={buyPotion}
                disabled={gold < 25}
                className="flex items-center justify-between text-left w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <i className="fas fa-flask mr-2 text-green-400"></i>
                  Health Potion
                </div>
                <span className="text-yellow-400">25₲</span>
              </button>
              <button
                onClick={() => buyUpgrade("weapon")}
                disabled={gold < 100 + playerLevel * 25}
                className="flex items-center justify-between text-left w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <i className="fas fa-hand-fist mr-2 text-red-400"></i>
                  Weapon Upgrade (+STR)
                </div>
                <span className="text-yellow-400">
                  {100 + playerLevel * 25}₲
                </span>
              </button>
              <button
                onClick={() => buyUpgrade("armor")}
                disabled={gold < 80 + playerLevel * 20}
                className="flex items-center justify-between text-left w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <i className="fas fa-shield-alt mr-2 text-orange-400"></i>
                  Armor Upgrade (+VIT)
                </div>
                <span className="text-yellow-400">
                  {80 + playerLevel * 20}₲
                </span>
              </button>
              <button
                onClick={() => buyUpgrade("accessory")}
                disabled={gold < 120 + playerLevel * 30}
                className="flex items-center justify-between text-left w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <div className="flex items-center">
                  <i className="fas fa-ring mr-2 text-purple-400"></i>
                  Lucky Charm (+LUCK)
                </div>
                <span className="text-yellow-400">
                  {120 + playerLevel * 30}₲
                </span>
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Equipment prices scale with your level. Upgrades permanently
              increase stats.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
