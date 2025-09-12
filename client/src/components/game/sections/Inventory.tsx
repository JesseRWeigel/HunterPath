import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Item {
  id: string;
  name: string;
  type: string;
  rarity: string;
  quality: number;
  description: string;
  stats?: Record<string, number>;
}

interface Player {
  inv: Item[];
}

interface InventoryProps {
  player: Player;
  EnhancedInventory: React.ComponentType;
}

export function Inventory({ player, EnhancedInventory }: InventoryProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="inventory">
        <AccordionTrigger className="text-xl font-bold text-zinc-100 hover:no-underline">
          <div className="flex items-center justify-between w-full mr-4">
            <span>Inventory</span>
            {player.inv.length > 0 && (
              <span className="bg-amber-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                {player.inv.length}
              </span>
            )}
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="max-h-96 overflow-y-auto">
            <EnhancedInventory />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
