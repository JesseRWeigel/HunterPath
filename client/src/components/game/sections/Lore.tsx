import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function Lore() {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="lore">
        <AccordionTrigger className="font-semibold hover:no-underline">
          Lore (Mechanics)
        </AccordionTrigger>
        <AccordionContent>
          <ul className="text-xs opacity-80 list-disc pl-5 space-y-1">
            <li>Gates lead to Dungeons. Clear them to gain EXP/loot.</li>
            <li>Daily Quest must be completed or the Penalty Zone triggers.</li>
            <li>
              Level up to gain Stat Points. STR/AGI raise damage; INT/LUCK aid
              extraction.
            </li>
            <li>
              Shadow Extraction after boss defeat may recruit a Shadow ally (25%
              base chance).
            </li>
            <li>Fatigue reduces your total power; Rest lowers it.</li>
            <li>Instant Dungeon Keys open bonus runs with better rewards.</li>
          </ul>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
