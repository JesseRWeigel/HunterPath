export function BossS({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" className={className} aria-label="Void Lord">
      <defs>
        <radialGradient id="bs-eye" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#cc88ff" />
          <stop offset="100%" stopColor="#4400aa" stopOpacity="0" />
        </radialGradient>
        <filter id="bs-void">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="bs-aura" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#1a0030" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Void aura */}
      <ellipse cx="64" cy="72" rx="58" ry="56" fill="url(#bs-aura)" />

      {/* Stars */}
      <circle cx="18" cy="18" r="1.5" fill="#fff" opacity="0.9" />
      <circle cx="110" cy="14" r="1" fill="#cc88ff" opacity="0.8" />
      <circle cx="12" cy="58" r="1" fill="#fff" opacity="0.7" />
      <circle cx="118" cy="48" r="1.5" fill="#fff" opacity="0.6" />
      <circle cx="20" cy="102" r="1" fill="#cc88ff" opacity="0.9" />
      <circle cx="108" cy="98" r="1.5" fill="#fff" opacity="0.8" />
      <circle cx="54" cy="8" r="1" fill="#fff" opacity="0.7" />
      <circle cx="82" cy="12" r="1" fill="#cc88ff" opacity="0.8" />

      {/* Void tendrils */}
      <path d="M64,82 Q28,92 8,80 Q18,100 8,116" stroke="#6600aa" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M64,82 Q100,92 120,80 Q110,100 120,116" stroke="#6600aa" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M50,96 Q34,106 18,120" stroke="#4400aa" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />
      <path d="M78,96 Q94,106 110,120" stroke="#4400aa" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.7" />

      {/* Floating void orbs */}
      <circle cx="18" cy="36" r="5" fill="#6600aa" filter="url(#bs-void)" opacity="0.9" />
      <circle cx="110" cy="36" r="5" fill="#6600aa" filter="url(#bs-void)" opacity="0.9" />
      <circle cx="14" cy="72" r="4" fill="#4400aa" filter="url(#bs-void)" opacity="0.7" />
      <circle cx="114" cy="72" r="4" fill="#4400aa" filter="url(#bs-void)" opacity="0.7" />

      {/* Staff */}
      <rect x="4" y="42" width="6" height="80" rx="3" fill="#1a0028" stroke="#000" strokeWidth="2" />
      <circle cx="7" cy="36" r="10" fill="#2a0044" stroke="#6600aa" strokeWidth="2" />
      <circle cx="7" cy="36" r="6" fill="#4400aa" filter="url(#bs-void)" />
      <circle cx="7" cy="36" r="3" fill="#cc88ff" />
      <circle cx="7" cy="36" r="1" fill="#fff" />

      {/* Robe body */}
      <path d="M32,58 L18,122 L110,122 L96,58 Q64,44 32,58 Z" fill="#080010" stroke="#1a0030" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Robe folds */}
      <path d="M38,65 L26,116" stroke="#150025" strokeWidth="2.5" opacity="0.9" />
      <path d="M54,60 L48,120" stroke="#150025" strokeWidth="2" opacity="0.8" />
      <path d="M74,60 L80,120" stroke="#150025" strokeWidth="2" opacity="0.8" />
      <path d="M90,65 L102,116" stroke="#150025" strokeWidth="2.5" opacity="0.9" />

      {/* Belt void clasp */}
      <rect x="36" y="96" width="56" height="7" rx="2" fill="#0a0018" stroke="#4400aa" strokeWidth="1.5" />
      <circle cx="64" cy="100" r="6" fill="#2a0044" stroke="#6600aa" strokeWidth="1.5" />
      <circle cx="64" cy="100" r="3" fill="#cc88ff" filter="url(#bs-void)" />

      {/* Hood back */}
      <path d="M30,42 Q64,26 98,42 Q94,22 64,16 Q34,22 30,42 Z" fill="#060008" stroke="#1a0030" strokeWidth="2.5" />

      {/* Head */}
      <ellipse cx="64" cy="44" rx="26" ry="24" fill="#080010" stroke="#1a0030" strokeWidth="2.5" />

      {/* Hood drape */}
      <path d="M36,40 Q64,30 92,40 L94,50 Q64,40 34,50 Z" fill="#060008" stroke="#1a0030" strokeWidth="2.5" />

      {/* Face void */}
      <ellipse cx="64" cy="48" rx="20" ry="14" fill="#030006" opacity="0.9" />

      {/* COSMIC EYES — the visual centrepiece */}
      <ellipse cx="50" cy="46" rx="12" ry="8" fill="url(#bs-eye)" filter="url(#bs-void)" />
      <ellipse cx="78" cy="46" rx="12" ry="8" fill="url(#bs-eye)" filter="url(#bs-void)" />
      <ellipse cx="50" cy="46" rx="7" ry="5" fill="#cc88ff" />
      <ellipse cx="78" cy="46" rx="7" ry="5" fill="#cc88ff" />
      <ellipse cx="50" cy="46" rx="3.5" ry="2.5" fill="#fff" />
      <ellipse cx="78" cy="46" rx="3.5" ry="2.5" fill="#fff" />
    </svg>
  );
}
