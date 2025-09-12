import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface TrainingActivitiesProps {
  inRun: boolean;
  doTraining: (type: "physical" | "mental" | "meditation") => void;
  doWork: () => void;
}

export function TrainingActivities({
  inRun,
  doTraining,
  doWork,
}: TrainingActivitiesProps) {
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value="training">
        <AccordionTrigger className="text-lg font-bold text-violet-300 hover:no-underline">
          <i className="fas fa-dumbbell mr-2"></i>
          Training Activities
        </AccordionTrigger>
        <AccordionContent>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => doTraining("physical")}
                disabled={inRun}
                className="flex items-center justify-start text-left w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <i className="fas fa-fist-raised mr-2 text-red-400"></i>
                Physical Training
                <span className="ml-auto text-xs text-zinc-400">8-15 EXP</span>
              </button>
              <button
                onClick={() => doTraining("mental")}
                disabled={inRun}
                className="flex items-center justify-start text-left w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <i className="fas fa-brain mr-2 text-blue-400"></i>
                Mental Training
                <span className="ml-auto text-xs text-zinc-400">6-12 EXP</span>
              </button>
              <button
                onClick={() => doTraining("meditation")}
                disabled={inRun}
                className="flex items-center justify-start text-left w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <i className="fas fa-leaf mr-2 text-green-400"></i>
                Meditation
                <span className="ml-auto text-xs text-zinc-400">
                  4-8 EXP, -Fatigue
                </span>
              </button>
              <button
                onClick={doWork}
                disabled={inRun}
                className="flex items-center justify-start text-left w-full px-4 py-2 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                <i className="fas fa-hammer mr-2 text-yellow-400"></i>
                Work Job
                <span className="ml-auto text-xs text-zinc-400">
                  15-35₲, 3-8 EXP
                </span>
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-2">
              Train to gain experience when stuck, or work for extra gold. Most
              activities increase fatigue.
            </p>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
