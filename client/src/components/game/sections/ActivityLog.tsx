import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ActivityLogProps {
  log: string[];
}

export function ActivityLog({ log }: ActivityLogProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="activity-log">
        <AccordionTrigger className="text-lg font-bold text-zinc-100 hover:no-underline">
          <div className="flex items-center space-x-2">
            <i className="fas fa-scroll text-zinc-400"></i>
            <span>Activity Log</span>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="bg-zinc-900/50 rounded-lg p-4 h-96 overflow-y-auto custom-scrollbar space-y-2 text-sm">
            {log.map((m, i) => (
              <div key={i} className="opacity-90">
                • {m}
              </div>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
