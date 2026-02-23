export function PlayerAvatar({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 128 128"
      className={className}
      aria-label="Hunter"
    >
      <defs>
        <radialGradient id="pa-cyan" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00ffcc" />
          <stop offset="100%" stopColor="#00ffcc" stopOpacity="0" />
        </radialGradient>
        <filter id="pa-glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Cloak/Cape */}
      <path d="M32,55 L22,120 L106,120 L96,55 Z" fill="#0f0a2a" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Body armor */}
      <path d="M40,55 L34,108 L94,108 L88,55 Q64,46 40,55 Z" fill="#1a1240" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />

      {/* Chest plate */}
      <path d="M48,58 L44,90 L84,90 L80,58 Q64,53 48,58 Z" fill="#22185a" stroke="#000" strokeWidth="2" />

      {/* Armor accent lines */}
      <path d="M56,65 L72,65" stroke="#7c3aed" strokeWidth="1.5" opacity="0.9" />
      <path d="M54,72 L74,72" stroke="#7c3aed" strokeWidth="1.5" opacity="0.9" />
      <path d="M56,79 L72,79" stroke="#7c3aed" strokeWidth="1.5" opacity="0.9" />

      {/* Chest emblem */}
      <circle cx="64" cy="73" r="6" fill="#7c3aed" stroke="#000" strokeWidth="2" />
      <circle cx="64" cy="73" r="3" fill="#a855f7" filter="url(#pa-glow)" />

      {/* Belt */}
      <rect x="38" y="96" width="52" height="8" rx="2" fill="#3a2810" stroke="#000" strokeWidth="2.5" />
      <rect x="59" y="95" width="10" height="10" rx="1" fill="#c0a030" stroke="#000" strokeWidth="2" />

      {/* Left shoulder pauldron */}
      <ellipse cx="30" cy="65" rx="16" ry="11" fill="#1a1240" stroke="#000" strokeWidth="2.5" />
      <ellipse cx="30" cy="63" rx="11" ry="8" fill="#22185a" />
      <path d="M18,60 Q30,54 42,60" stroke="#7c3aed" strokeWidth="1.5" fill="none" />

      {/* Right shoulder pauldron */}
      <ellipse cx="98" cy="65" rx="16" ry="11" fill="#1a1240" stroke="#000" strokeWidth="2.5" />
      <ellipse cx="98" cy="63" rx="11" ry="8" fill="#22185a" />
      <path d="M86,60 Q98,54 110,60" stroke="#7c3aed" strokeWidth="1.5" fill="none" />

      {/* Neck guard */}
      <rect x="52" y="48" width="24" height="12" rx="3" fill="#1a1240" stroke="#000" strokeWidth="2" />

      {/* Helmet */}
      <ellipse cx="64" cy="34" rx="26" ry="24" fill="#1a1240" stroke="#000" strokeWidth="2.5" />

      {/* Helmet crest */}
      <path d="M56,10 Q64,4 72,10 L70,20 Q64,16 58,20 Z" fill="#7c3aed" stroke="#000" strokeWidth="2" />

      {/* Visor */}
      <rect x="42" y="30" width="44" height="10" rx="4" fill="#080614" stroke="#000" strokeWidth="2" />

      {/* Glowing cyan eyes through visor */}
      <ellipse cx="52" cy="35" rx="6" ry="4" fill="url(#pa-cyan)" filter="url(#pa-glow)" opacity="0.9" />
      <ellipse cx="76" cy="35" rx="6" ry="4" fill="url(#pa-cyan)" filter="url(#pa-glow)" opacity="0.9" />
      <ellipse cx="52" cy="35" rx="3" ry="2" fill="#00ffcc" />
      <ellipse cx="76" cy="35" rx="3" ry="2" fill="#00ffcc" />

      {/* Chin guard */}
      <path d="M44,44 Q64,52 84,44 L82,52 Q64,60 46,52 Z" fill="#1a1240" stroke="#000" strokeWidth="2" />
    </svg>
  );
}
