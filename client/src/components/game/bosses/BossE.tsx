export function BossE({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" className={className} aria-label="Goblin Warrior">
      <defs>
        <filter id="be-red">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Club handle */}
      <rect x="91" y="52" width="10" height="68" rx="4" fill="#6b4226" stroke="#000" strokeWidth="2.5" />
      {/* Club head */}
      <ellipse cx="96" cy="46" rx="14" ry="11" fill="#8b5226" stroke="#000" strokeWidth="2.5" />
      {/* Club spikes */}
      <polygon points="82,40 90,33 90,47" fill="#a0a0a8" stroke="#000" strokeWidth="1.5" />
      <polygon points="110,40 102,33 102,47" fill="#a0a0a8" stroke="#000" strokeWidth="1.5" />
      <polygon points="96,33 90,42 102,42" fill="#a0a0a8" stroke="#000" strokeWidth="1.5" />

      {/* Body / leather armour */}
      <path d="M36,60 L28,118 L82,118 L88,60 Q62,50 36,60 Z" fill="#2a4a20" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Chest plate */}
      <path d="M42,62 L38,100 L78,100 L82,62 Q62,55 42,62 Z" fill="#3a5a28" stroke="#000" strokeWidth="2" />
      {/* Belt */}
      <rect x="34" y="98" width="46" height="7" rx="2" fill="#5a3a10" stroke="#000" strokeWidth="2" />
      <rect x="57" y="97" width="10" height="9" rx="1" fill="#c8a020" stroke="#000" strokeWidth="2" />

      {/* Left pointed ear */}
      <path d="M30,36 L10,18 L36,32" fill="#5a8c3f" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Right pointed ear */}
      <path d="M98,36 L118,18 L92,32" fill="#5a8c3f" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Head */}
      <ellipse cx="64" cy="42" rx="32" ry="28" fill="#5a8c3f" stroke="#000" strokeWidth="2.5" />

      {/* Angry brow */}
      <path d="M36,32 L52,38" stroke="#1a3a10" strokeWidth="4" strokeLinecap="round" />
      <path d="M92,32 L76,38" stroke="#1a3a10" strokeWidth="4" strokeLinecap="round" />

      {/* Eyes */}
      <ellipse cx="48" cy="42" rx="9" ry="7" fill="#cc1100" stroke="#000" strokeWidth="2" />
      <ellipse cx="80" cy="42" rx="9" ry="7" fill="#cc1100" stroke="#000" strokeWidth="2" />
      <circle cx="50" cy="40" r="4" fill="#ff3311" filter="url(#be-red)" />
      <circle cx="82" cy="40" r="4" fill="#ff3311" filter="url(#be-red)" />
      <circle cx="50" cy="40" r="2" fill="#fff" opacity="0.8" />
      <circle cx="82" cy="40" r="2" fill="#fff" opacity="0.8" />

      {/* Snout / nostrils */}
      <path d="M58,50 Q64,56 70,50" stroke="#3a6028" strokeWidth="3" fill="none" strokeLinecap="round" />
      <circle cx="60" cy="52" r="2" fill="#3a6028" />
      <circle cx="68" cy="52" r="2" fill="#3a6028" />

      {/* Wide grinning mouth */}
      <path d="M40,60 Q64,72 88,60" fill="#1a2a10" stroke="#000" strokeWidth="2" />
      {/* Jagged teeth */}
      <path d="M45,60 L49,68 L54,60 L58,68 L64,60 L70,68 L74,60 L79,68 L83,60"
        fill="#f0e8c0" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Warts */}
      <circle cx="36" cy="28" r="3" fill="#4a7c35" stroke="#000" strokeWidth="1.5" />
      <circle cx="92" cy="26" r="2.5" fill="#4a7c35" stroke="#000" strokeWidth="1.5" />
    </svg>
  );
}
