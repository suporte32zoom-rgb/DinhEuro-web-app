import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
  animate?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "md",
  showText = true,
  showSubtitle = true,
  className = "",
  animate = true,
}) => {
  const sizeMap = {
    sm: { icon: "w-7 h-7", title: "text-base", sub: "text-[9px]" },
    md: { icon: "w-9 h-9", title: "text-xl", sub: "text-[10px]" },
    lg: { icon: "w-12 h-12", title: "text-2xl", sub: "text-xs" },
    xl: { icon: "w-16 h-16", title: "text-3xl", sub: "text-sm" },
  };

  const selectedSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Official DinhEuro Vector Logo */}
      <div
        className={`relative ${selectedSize.icon} shrink-0 rounded-full overflow-hidden flex items-center justify-center p-0.5 shadow-lg shadow-emerald-950/30 ${
          animate ? "group-hover:scale-105 transition-transform duration-200" : ""
        }`}
      >
        <svg
          viewBox="0 0 512 512"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Background Inner Gradient */}
            <radialGradient id="dinheuroInnerBg" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#152033" />
              <stop offset="70%" stopColor="#0c121e" />
              <stop offset="100%" stopColor="#080c14" />
            </radialGradient>

            {/* Continuous Circular Border Gradient (Left: Pale Blue -> Right: Light Green) */}
            <linearGradient id="dinheuroBorderGrad" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#93c5fd" />
              <stop offset="35%" stopColor="#60a5fa" />
              <stop offset="65%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#86efac" />
            </linearGradient>

            {/* Conversion Arrows Gradient (Vibrant Gold / Yellow) */}
            <linearGradient id="dinheuroArrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>

            {/* Dark Blue for Euro Symbol */}
            <linearGradient id="euroDarkBlueGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="50%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>

            {/* Green for Real Symbol */}
            <linearGradient id="realGreenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Filter for depth */}
            <filter id="logoDepth" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#000000" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* 1. Base Circular Container */}
          <circle
            cx="256"
            cy="256"
            r="236"
            fill="url(#dinheuroInnerBg)"
            stroke="url(#dinheuroBorderGrad)"
            strokeWidth="18"
          />

          {/* 2. Top Curved Yellow Arrow (pointing to the LEFT) */}
          <g filter="url(#logoDepth)">
            {/* Arc from right to left */}
            <path
              d="M 390 196 A 166 166 0 0 0 134 184"
              fill="none"
              stroke="url(#dinheuroArrowGrad)"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* Arrowhead at upper left pointing left */}
            <path
              d="M 98 194 L 140 162 L 132 188 L 146 216 Z"
              fill="url(#dinheuroArrowGrad)"
            />
          </g>

          {/* 3. Bottom Curved Yellow Arrow (pointing to the RIGHT) */}
          <g filter="url(#logoDepth)">
            {/* Arc from left to right */}
            <path
              d="M 122 316 A 166 166 0 0 0 378 328"
              fill="none"
              stroke="url(#dinheuroArrowGrad)"
              strokeWidth="16"
              strokeLinecap="round"
            />
            {/* Arrowhead at lower right pointing right */}
            <path
              d="M 414 318 L 372 350 L 380 324 L 366 296 Z"
              fill="url(#dinheuroArrowGrad)"
            />
          </g>

          {/* 4. Center Symbols: Euro (€) in Dark Blue followed by Real (R$) in Green */}
          <g filter="url(#logoDepth)">
            {/* Euro Symbol (€) in Dark Blue */}
            <text
              x="180"
              y="288"
              fontFamily="system-ui, -apple-system, sans-serif, 'Segoe UI', Roboto"
              fontSize="148"
              fontWeight="900"
              fill="url(#euroDarkBlueGrad)"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              €
            </text>

            {/* Real Symbol (R$) in Green */}
            <text
              x="320"
              y="288"
              fontFamily="system-ui, -apple-system, sans-serif, 'Segoe UI', Roboto"
              fontSize="122"
              fontWeight="900"
              fill="url(#realGreenGrad)"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              R$
            </text>
          </g>
        </svg>
      </div>

      {/* Typography Label */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span
              className={`${selectedSize.title} font-extrabold tracking-tight text-[#e6edf3] group-hover:text-white transition-colors`}
            >
              Dinh<span className="text-[#00c853]">Euro</span>
            </span>
            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#21262d] text-[#58a6ff] border border-[#30363d] rounded tracking-wide">
              PRO
            </span>
          </div>
          {showSubtitle && (
            <span className={`${selectedSize.sub} text-[#8b949e] font-medium mt-0.5 hidden sm:inline`}>
              Mercados Globais & IA
            </span>
          )}
        </div>
      )}
    </div>
  );
};
