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
    sm: { icon: "w-8 h-8", title: "text-base", sub: "text-[9px]" },
    md: { icon: "w-10 h-10", title: "text-xl", sub: "text-[10px]" },
    lg: { icon: "w-14 h-14", title: "text-2xl", sub: "text-xs" },
    xl: { icon: "w-20 h-20", title: "text-3xl", sub: "text-sm" },
  };

  const selectedSize = sizeMap[size];

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Official Pure White Circular Emblem Container */}
      <div
        className={`relative ${selectedSize.icon} shrink-0 rounded-full bg-white p-0.5 shadow-lg shadow-black/40 ring-2 ring-emerald-500/30 flex items-center justify-center overflow-hidden ${
          animate ? "hover:scale-105 transition-transform duration-200" : ""
        }`}
      >
        <svg
          viewBox="0 0 512 512"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Circular Border Gradient */}
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1f6feb" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#00c853" />
            </linearGradient>

            {/* Euro Symbol Navy Blue Gradient */}
            <linearGradient id="euroNavy" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0f2b5c" />
              <stop offset="100%" stopColor="#1e3a8a" />
            </linearGradient>

            {/* Real Symbol Emerald Green Gradient */}
            <linearGradient id="realGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00875a" />
              <stop offset="100%" stopColor="#00c853" />
            </linearGradient>

            {/* Exchange Gold Flow Arrows Gradient */}
            <linearGradient id="arrowGold" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fbbf24" />
            </linearGradient>
          </defs>

          {/* Pure White Circular Background Base */}
          <circle cx="256" cy="256" r="250" fill="#FFFFFF" />

          {/* Outer Gradient Ring */}
          <circle
            cx="256"
            cy="256"
            r="238"
            fill="none"
            stroke="url(#ringGrad)"
            strokeWidth="18"
          />

          {/* 1. Euro Symbol (€) in Navy Blue on Left */}
          <g transform="translate(40, 20)">
            {/* Main C Arc of Euro */}
            <path
              d="M 230 145 C 195 125 155 130 130 160 C 95 200 95 310 130 350 C 155 380 195 385 230 365"
              fill="none"
              stroke="url(#euroNavy)"
              strokeWidth="38"
              strokeLinecap="round"
            />
            {/* Upper Euro Bar */}
            <rect x="75" y="222" width="125" height="24" rx="12" fill="url(#euroNavy)" />
            {/* Lower Euro Bar */}
            <rect x="75" y="266" width="125" height="24" rx="12" fill="url(#euroNavy)" />
          </g>

          {/* 2. Exchange Center Arrows (Golden Yellow Flow ⇄) */}
          <g fill="url(#arrowGold)" stroke="url(#arrowGold)">
            {/* Upper Arrow (Left to Right Flow) */}
            <path
              d="M 215 190 Q 256 168 295 190"
              fill="none"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <polygon points="305,190 285,178 288,198" fill="url(#arrowGold)" stroke="none" />

            {/* Lower Arrow (Right to Left Flow) */}
            <path
              d="M 295 320 Q 256 342 215 320"
              fill="none"
              strokeWidth="14"
              strokeLinecap="round"
            />
            <polygon points="205,320 225,332 222,312" fill="url(#arrowGold)" stroke="none" />
          </g>

          {/* 3. Brazilian Real Symbol (R$) in Emerald Green on Right */}
          <g transform="translate(230, 80)">
            {/* R Letter Pillar */}
            <rect x="50" y="80" width="34" height="200" rx="14" fill="url(#realGreen)" />
            
            {/* R Letter Loop */}
            <path
              d="M 75 80 L 125 80 C 160 80 180 102 180 135 C 180 168 160 190 125 190 L 75 190"
              fill="none"
              stroke="url(#realGreen)"
              strokeWidth="34"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* R Letter Diagonal Leg */}
            <path
              d="M 120 185 L 175 280"
              fill="none"
              stroke="url(#realGreen)"
              strokeWidth="34"
              strokeLinecap="round"
            />

            {/* $ Sign (S with vertical stroke) */}
            <g transform="translate(160, 50)">
              {/* Vertical Strike */}
              <rect x="42" y="55" width="12" height="150" rx="6" fill="url(#realGreen)" />
              {/* S Curve */}
              <path
                d="M 72 85 C 65 72 48 70 38 76 C 24 84 26 102 42 110 L 52 115 C 72 125 74 148 58 160 C 44 170 24 165 18 150"
                fill="none"
                stroke="url(#realGreen)"
                strokeWidth="18"
                strokeLinecap="round"
              />
            </g>
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
