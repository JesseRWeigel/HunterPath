import React, { useState, useEffect } from "react";

const TUTORIAL_KEY = "hunters-path-tutorial-complete";

const STEPS = [
  {
    icon: "fas fa-dungeon",
    title: "Welcome, Hunter",
    body: "Welcome to Hunter's Path! You're a new Hunter. Your journey begins here.",
  },
  {
    icon: "fas fa-fist-raised",
    title: "Grow Stronger",
    body: "Allocate stat points to grow stronger. STR for damage, AGI for speed, INT for spirit binding, VIT for defense, LUCK for drops.",
  },
  {
    icon: "fas fa-torii-gate",
    title: "Enter Gates",
    body: "Enter Gates to fight bosses. Start with E-Rank gates and work your way up.",
  },
  {
    icon: "fas fa-scroll",
    title: "Daily Quests",
    body: "Complete Daily Quests for bonus rewards. Missing them triggers the Penalty Zone!",
  },
  {
    icon: "fas fa-ghost",
    title: "Spirit Legion",
    body: "Defeat bosses to bind spirits to your legion. They fight alongside you in combat.",
  },
];

export function Tutorial() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (localStorage.getItem(TUTORIAL_KEY) !== "true") {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(TUTORIAL_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 rounded-2xl border border-violet-500/30 bg-zinc-900 shadow-2xl shadow-violet-500/10">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === step ? "bg-violet-400" : "bg-zinc-700"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex flex-col items-center px-8 py-6 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-violet-500/20">
            <i className={`${current.icon} text-2xl text-violet-400`} />
          </div>
          <h2 className="mb-2 text-xl font-bold text-violet-300">
            {current.title}
          </h2>
          <p className="text-sm leading-relaxed text-zinc-300">
            {current.body}
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between border-t border-zinc-800 px-6 py-4">
          <button
            onClick={dismiss}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Skip Tutorial
          </button>

          <div className="flex gap-2">
            {!isFirst && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
              >
                Back
              </button>
            )}
            {isLast ? (
              <button
                onClick={dismiss}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
              >
                Start Hunting
              </button>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
