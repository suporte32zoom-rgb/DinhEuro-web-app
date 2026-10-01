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
      {/* Visual Vector Icon Mark - Euro (€) + Real (R$) Fusion */}
      <div
        className={`relative ${selectedSize.icon} shrink-0 rounded-xl overflow-hidden flex items-center justify-center p-0.5 shadow-lg shadow-emerald-950/30 border border-white/10 ${
          animate ? "group-hover:scale-105 transition-transform duration-200" : ""
        }`}
      >
        <svg
          viewBox="0 0 512 512"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="logoBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0b0f17" />
              <stop offset="50%" stopColor="#111827" />
              <stop offset="100%" stopColor="#051b14" />
            </linearGradient>
            <linearGradient id="logoEuro" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="logoReal" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="40%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#00c853" />
            </linearGradient>
            <linearGradient id="logoGold" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>
          </defs>

          {/* Background container */}
          <rect width="512" height="512" rx="100" fill="url(#logoBg)" />
          
          {/* Outer border ring */}
          <rect
            x="14"
            y="14"
            width="484"
            height="484"
            rx="90"
            fill="none"
            stroke="url(#logoReal)"
            strokeWidth="12"
            strokeOpacity="0.8"
          />

          {/* Real R vertical pillar */}
          <rect x="144" y="112" width="60" height="288" rx="20" fill="url(#logoReal)" />

          {/* Real R Upper Loop */}
          <path
            d="M190 120 L276 120 C324 120 356 146 356 190 C356 234 324 256 276 256 L190 256"
            fill="none"
            stroke="url(#logoReal)"
            strokeWidth="44"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Euro Main Arc */}
          <path
            d="M376 172 C356 146 318 126 272 126 C196 126 144 182 144 256 C144 330 196 386 272 386 C322 386 360 364 382 336"
            fill="none"
            stroke="url(#logoEuro)"
            strokeWidth="44"
            strokeLinecap="round"
          />

          {/* Real R Diagonal Leg / Growth Vector */}
          <path
            d="M260 242 L344 386 C350 394 360 398 370 398 L394 398 C408 398 416 382 408 370 L328 242 Z"
            fill="url(#logoReal)"
          />

          {/* Dual Currency Crossbars */}
          <rect x="96" y="218" width="226" height="28" rx="14" fill="url(#logoGold)" />
          <rect x="96" y="272" width="226" height="28" rx="14" fill="url(#logoGold)" />

          {/* Shining Star sparks */}
          <circle cx="356" cy="146" r="14" fill="#67e8f9" />
          <circle cx="396" cy="336" r="12" fill="#34d399" />
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
