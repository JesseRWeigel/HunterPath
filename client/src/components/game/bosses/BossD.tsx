export function BossD({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className={className} aria-label="Orc Berserker">
      <defs>
        <filter id="bd-rage">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Axe handle */}
      <rect x="96" y="28" width="8" height="92" rx="3" fill="#5c3820" stroke="#000" strokeWidth="2.5" />
      {/* Axe head - right blade */}
      <path d="M104,26 Q122,16 120,40 Q122,62 104,52 Z" fill="#9a9aa0" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Axe head - left bevel */}
      <path d="M104,26 Q88,16 90,40 Q88,62 104,52 Z" fill="#7a7a80" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Blade edge */}
      <path d="M120,16 Q128,40 120,64" stroke="#c8c8d8" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Body */}
      <path d="M18,62 L14,118 L82,118 L86,62 Q50,50 18,62 Z" fill="#3a4a5a" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Massive pecs */}
      <ellipse cx="38" cy="78" rx="18" ry="16" fill="#4a5a6a" stroke="#000" strokeWidth="2" />
      <ellipse cx="62" cy="78" rx="18" ry="16" fill="#4a5a6a" stroke="#000" strokeWidth="2" />
      {/* Belly armor */}
      <path d="M22,92 L26,114 L78,114 L80,92 Q50,84 22,92 Z" fill="#2a3a4a" stroke="#000" strokeWidth="2" />

      {/* Left spiked shoulder */}
      <ellipse cx="12" cy="68" rx="16" ry="12" fill="#2a3a4a" stroke="#000" strokeWidth="2.5" />
      <polygon points="2,60 12,50 10,64" fill="#8a8a90" stroke="#000" strokeWidth="1.5" />
      <polygon points="12,54 14,44 18,58" fill="#8a8a90" stroke="#000" strokeWidth="1.5" />
      <polygon points="24,60 20,50 26,64" fill="#8a8a90" stroke="#000" strokeWidth="1.5" />

      {/* Head — wide and brutish */}
      <ellipse cx="50" cy="40" rx="30" ry="26" fill="#4a5a6a" stroke="#000" strokeWidth="2.5" />

      {/* Heavy brow ridge */}
      <path d="M22,32 L42,38" stroke="#1a2a3a" strokeWidth="5" strokeLinecap="round" />
      <path d="M78,32 L58,38" stroke="#1a2a3a" strokeWidth="5" strokeLinecap="round" />

      {/* Rage eyes */}
      <ellipse cx="36" cy="40" rx="10" ry="8" fill="#aa8800" stroke="#000" strokeWidth="2" />
      <ellipse cx="64" cy="40" rx="10" ry="8" fill="#aa8800" stroke="#000" strokeWidth="2" />
      <circle cx="36" cy="38" r="4.5" fill="#ffcc00" filter="url(#bd-rage)" />
      <circle cx="64" cy="38" r="4.5" fill="#ffcc00" filter="url(#bd-rage)" />
      <circle cx="37" cy="38" r="2" fill="#000" />
      <circle cx="65" cy="38" r="2" fill="#000" />

      {/* Flat nose */}
      <path d="M44,48 Q50,54 56,48" stroke="#2a3a4a" strokeWidth="3" fill="none" />

      {/* Tusks */}
      <path d="M42,58 L36,76" stroke="#e8e0c0" strokeWidth="5" strokeLinecap="round" />
      <path d="M58,58 L64,76" stroke="#e8e0c0" strokeWidth="5" strokeLinecap="round" />

      {/* Mouth snarl */}
      <path d="M34,60 Q50,68 66,60" fill="#1a2a1a" stroke="#000" strokeWidth="2" />

      {/* Battle scar */}
      <path d="M24,34 L44,52" stroke="#2a3a2a" strokeWidth="3" opacity="0.6" strokeLinecap="round" />

      {/* War paint stripes */}
      <path d="M22,38 L34,34" stroke="#cc3322" strokeWidth="2.5" opacity="0.9" strokeLinecap="round" />
      <path d="M26,44 L36,42" stroke="#cc3322" strokeWidth="2" opacity="0.8" strokeLinecap="round" />
    </svg>
  );
}
