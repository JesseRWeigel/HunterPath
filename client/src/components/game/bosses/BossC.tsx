export function BossC({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" className={className} aria-label="Dark Elf Assassin">
      <defs>
        <radialGradient id="bc-purple" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dd44ff" />
          <stop offset="100%" stopColor="#dd44ff" stopOpacity="0" />
        </radialGradient>
        <filter id="bc-glow">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Left dagger */}
      <path d="M26,28 L46,82" stroke="#c0c0cc" strokeWidth="4" strokeLinecap="round" />
      <path d="M22,24 L30,20 L50,78 L42,82 Z" fill="#9090a0" stroke="#000" strokeWidth="2" />
      <rect x="17" y="27" width="16" height="6" rx="2" fill="#5a3a80" stroke="#000" strokeWidth="2"
        transform="rotate(-42,25,30)" />

      {/* Right dagger */}
      <path d="M102,28 L82,82" stroke="#c0c0cc" strokeWidth="4" strokeLinecap="round" />
      <path d="M106,24 L98,20 L78,78 L86,82 Z" fill="#9090a0" stroke="#000" strokeWidth="2" />
      <rect x="95" y="27" width="16" height="6" rx="2" fill="#5a3a80" stroke="#000" strokeWidth="2"
        transform="rotate(42,103,30)" />

      {/* Cloak body */}
      <path d="M36,60 L24,120 L104,120 L92,60 Q64,48 36,60 Z" fill="#1a0a30" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Cloak folds */}
      <path d="M42,65 L30,112" stroke="#2a1040" strokeWidth="2" opacity="0.9" />
      <path d="M64,62 L60,117" stroke="#2a1040" strokeWidth="2" opacity="0.8" />
      <path d="M86,65 L98,112" stroke="#2a1040" strokeWidth="2" opacity="0.9" />

      {/* Belt with rune clasp */}
      <rect x="38" y="96" width="52" height="7" rx="2" fill="#3a1a50" stroke="#000" strokeWidth="2" />
      <polygon points="64,93 70,100 64,107 58,100" fill="#9932cc" stroke="#000" strokeWidth="2" />

      {/* Neck */}
      <rect x="56" y="50" width="16" height="12" fill="#301050" stroke="#000" strokeWidth="2" />

      {/* Hood back */}
      <path d="M32,40 Q64,22 96,40 Q92,20 64,14 Q36,20 32,40 Z" fill="#120820" stroke="#000" strokeWidth="2.5" />

      {/* Head */}
      <ellipse cx="64" cy="42" rx="24" ry="22" fill="#2a1050" stroke="#000" strokeWidth="2.5" />

      {/* Hood drape over forehead */}
      <path d="M38,38 Q64,28 90,38 L92,48 Q64,38 36,48 Z" fill="#120820" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Face shadow */}
      <ellipse cx="64" cy="48" rx="18" ry="14" fill="#1a0838" opacity="0.9" />

      {/* Glowing purple eyes — the visual focus */}
      <ellipse cx="53" cy="44" rx="8" ry="5" fill="url(#bc-purple)" filter="url(#bc-glow)" />
      <ellipse cx="75" cy="44" rx="8" ry="5" fill="url(#bc-purple)" filter="url(#bc-glow)" />
      <ellipse cx="53" cy="44" rx="4.5" ry="3" fill="#dd44ff" />
      <ellipse cx="75" cy="44" rx="4.5" ry="3" fill="#dd44ff" />
      <ellipse cx="53" cy="44" rx="2" ry="1.5" fill="#fff" opacity="0.9" />
      <ellipse cx="75" cy="44" rx="2" ry="1.5" fill="#fff" opacity="0.9" />

      {/* Pointed ears */}
      <path d="M40,38 L30,22 L44,34" fill="#2a1050" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
      <path d="M88,38 L98,22 L84,34" fill="#2a1050" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}
