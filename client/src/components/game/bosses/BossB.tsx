export function BossB({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" className={className} aria-label="Troll Chieftain">
      <defs>
        <filter id="bb-lava">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Massive club handle */}
      <rect x="88" y="42" width="12" height="80" rx="4" fill="#5c3820" stroke="#000" strokeWidth="2.5" />
      {/* Club head — boulder */}
      <ellipse cx="94" cy="34" rx="22" ry="18" fill="#6a6060" stroke="#000" strokeWidth="2.5" />
      {/* Boulder cracks */}
      <path d="M80,26 L88,36 L82,44" stroke="#000" strokeWidth="2" fill="none" opacity="0.5" />
      <path d="M100,22 L108,34 L104,40" stroke="#000" strokeWidth="2" fill="none" opacity="0.5" />
      {/* Studs */}
      <polygon points="78,24 84,16 86,26" fill="#8a8080" stroke="#000" strokeWidth="1.5" />
      <polygon points="94,18 100,10 102,20" fill="#8a8080" stroke="#000" strokeWidth="1.5" />
      <polygon points="110,26 116,18 114,30" fill="#8a8080" stroke="#000" strokeWidth="1.5" />

      {/* Massive hunched body */}
      <path d="M10,70 L8,120 L80,120 L82,70 Q44,54 10,70 Z" fill="#5a5050" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Lava cracks on body */}
      <path d="M22,78 L30,90 L24,102 L32,116" stroke="#ff6600" strokeWidth="2.5" fill="none" strokeLinecap="round" filter="url(#bb-lava)" />
      <path d="M46,74 L42,88 L50,100" stroke="#ff6600" strokeWidth="2" fill="none" strokeLinecap="round" filter="url(#bb-lava)" />
      <path d="M62,80 L70,96 L64,112" stroke="#ff4400" strokeWidth="2" fill="none" strokeLinecap="round" filter="url(#bb-lava)" />

      {/* Rocky bumps on body */}
      <polygon points="16,72 24,62 30,72" fill="#6a6060" stroke="#000" strokeWidth="1.5" />
      <polygon points="34,66 42,56 50,68" fill="#6a6060" stroke="#000" strokeWidth="1.5" />
      <polygon points="52,70 60,60 68,72" fill="#6a6060" stroke="#000" strokeWidth="1.5" />

      {/* Head — massive boulder-like */}
      <ellipse cx="44" cy="46" rx="32" ry="28" fill="#5a5050" stroke="#000" strokeWidth="2.5" />

      {/* Rocky head bumps */}
      <polygon points="20,34 30,24 36,36" fill="#6a6060" stroke="#000" strokeWidth="1.5" />
      <polygon points="46,26 54,16 60,28" fill="#6a6060" stroke="#000" strokeWidth="1.5" />

      {/* Lava crack on head */}
      <path d="M28,32 L38,48 L32,60" stroke="#ff6600" strokeWidth="2" fill="none" strokeLinecap="round" filter="url(#bb-lava)" />

      {/* Heavy brow overhang */}
      <path d="M14,42 Q44,34 74,42 L72,48 Q44,40 16,48 Z" fill="#3a3030" stroke="#000" strokeWidth="2" />

      {/* Beady deep-set eyes */}
      <ellipse cx="30" cy="48" rx="8" ry="6" fill="#1a1010" stroke="#000" strokeWidth="2" />
      <ellipse cx="58" cy="48" rx="8" ry="6" fill="#1a1010" stroke="#000" strokeWidth="2" />
      <circle cx="30" cy="47" r="4" fill="#ff6600" filter="url(#bb-lava)" />
      <circle cx="58" cy="47" r="4" fill="#ff6600" filter="url(#bb-lava)" />
      <circle cx="30" cy="47" r="2" fill="#ff9900" />
      <circle cx="58" cy="47" r="2" fill="#ff9900" />

      {/* Flat nostrils */}
      <circle cx="40" cy="58" r="3" fill="#3a3030" stroke="#000" strokeWidth="1.5" />
      <circle cx="48" cy="58" r="3" fill="#3a3030" stroke="#000" strokeWidth="1.5" />

      {/* Mouth with lower teeth */}
      <path d="M18,64 Q44,72 70,64 L68,70 Q44,78 20,70 Z" fill="#1a1010" stroke="#000" strokeWidth="2" />
      <path d="M24,66 L28,74 L33,66 L38,74 L44,66 L50,74 L56,66 L62,74 L66,66"
        fill="#e8e0c0" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Tiny horns */}
      <path d="M18,30 L12,14 L24,26" fill="#3a3030" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
      <path d="M70,30 L76,14 L64,26" fill="#3a3030" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
