export function BossA({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128" role="img" className={className} aria-label="Dragon Knight">
      <defs>
        <linearGradient id="ba-flame" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#0044ff" />
          <stop offset="50%" stopColor="#4488ff" />
          <stop offset="100%" stopColor="#aaccff" stopOpacity="0.3" />
        </linearGradient>
        <filter id="ba-glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Blue flames on sword */}
      <path d="M96,6 Q88,18 90,34 Q86,26 80,30 Q86,18 84,8 Q90,2 96,6"
        fill="url(#ba-flame)" filter="url(#ba-glow)" opacity="0.9" />
      <path d="M92,12 Q86,22 88,34 Q84,26 80,30 Q84,20 82,12 Q86,6 92,12"
        fill="#88aaff" filter="url(#ba-glow)" opacity="0.7" />

      {/* Sword blade */}
      <path d="M86,30 L80,120 L88,120 L94,30 Z" fill="#c8c8d8" stroke="#000" strokeWidth="2.5" />
      <path d="M88,30 L88,120 L91,30 Z" fill="#e8e8f0" />
      {/* Crossguard */}
      <rect x="76" y="28" width="28" height="8" rx="3" fill="#c0a030" stroke="#000" strokeWidth="2.5" />
      {/* Grip */}
      <rect x="82" y="36" width="8" height="22" rx="3" fill="#3a2810" stroke="#000" strokeWidth="2" />

      {/* Body armour */}
      <path d="M26,60 L20,120 L82,120 L80,60 Q52,50 26,60 Z" fill="#2a2510" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Chest plate — gold */}
      <path d="M32,60 L28,100 L76,100 L74,60 Q52,53 32,60 Z" fill="#8a7020" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      {/* Chest plate highlight */}
      <path d="M38,62 L36,90 L68,90 L66,62 Q52,57 38,62 Z" fill="#c0a030" stroke="#000" strokeWidth="1.5" strokeLinejoin="round" />

      {/* Dragon emblem */}
      <path d="M52,68 Q64,62 76,68 Q70,75 64,72 Q58,75 52,68" fill="#ff6600" stroke="#000" strokeWidth="1.5" />
      <circle cx="64" cy="70" r="4" fill="#ff4400" stroke="#000" strokeWidth="1.5" />

      {/* Belt */}
      <rect x="30" y="98" width="48" height="7" rx="2" fill="#5a4010" stroke="#000" strokeWidth="2" />

      {/* Dragon wing shoulder guard */}
      <path d="M14,50 Q8,34 20,28 Q28,24 36,34 L32,40 Q26,32 20,36 Q14,42 22,52 Z"
        fill="#6a5010" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18,50 Q12,36 22,30 Q26,28 32,36 L30,40 Q24,34 22,38 Q18,44 24,52 Z"
        fill="#8a7020" />
      <path d="M20,36 L28,48" stroke="#c0a030" strokeWidth="1.5" opacity="0.9" />
      <path d="M22,32 L30,44" stroke="#c0a030" strokeWidth="1.5" opacity="0.9" />

      {/* Neck armour */}
      <rect x="44" y="48" width="20" height="14" rx="3" fill="#2a2510" stroke="#000" strokeWidth="2" />
      <rect x="46" y="50" width="16" height="10" rx="2" fill="#8a7020" />

      {/* Helmet */}
      <ellipse cx="54" cy="32" rx="24" ry="22" fill="#2a2510" stroke="#000" strokeWidth="2.5" />
      {/* Gold trim */}
      <path d="M30,32 Q54,20 78,32" stroke="#c0a030" strokeWidth="3" fill="none" />

      {/* Dragon horns */}
      <path d="M38,22 L28,6 L42,18" fill="#8a7020" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
      <path d="M70,22 L80,6 L66,18" fill="#8a7020" stroke="#000" strokeWidth="2" strokeLinejoin="round" />

      {/* Visor */}
      <rect x="34" y="30" width="40" height="9" rx="3" fill="#0a0806" stroke="#000" strokeWidth="2" />

      {/* Blue fire eyes through visor */}
      <ellipse cx="46" cy="35" rx="6" ry="3.5" fill="#4488ff" filter="url(#ba-glow)" opacity="0.9" />
      <ellipse cx="62" cy="35" rx="6" ry="3.5" fill="#4488ff" filter="url(#ba-glow)" opacity="0.9" />

      {/* Chin armour */}
      <path d="M36,44 Q54,52 74,44 L72,50 Q54,58 38,50 Z" fill="#2a2510" stroke="#000" strokeWidth="2" />
    </svg>
  );
}
