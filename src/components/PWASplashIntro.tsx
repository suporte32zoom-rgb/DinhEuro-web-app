import React, { useState, useEffect } from "react";
import { BrandLogo } from "./BrandLogo";
import { Sparkles } from "lucide-react";

export const PWASplashIntro: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    // Only show once per session or when explicitly launching standalone
    const alreadyShown = sessionStorage.getItem("dinheuro_splash_shown");
    return !alreadyShown;
  });

  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  useEffect(() => {
    if (isVisible) {
      sessionStorage.setItem("dinheuro_splash_shown", "true");
      const timer = setTimeout(() => {
        setIsFadingOut(true);
        const removeTimer = setTimeout(() => {
          setIsVisible(false);
        }, 400);
        return () => clearTimeout(removeTimer);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      id="pwa-splash-screen"
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0e1117] transition-opacity duration-400 ease-out select-none ${
        isFadingOut ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Background ambient radial gradients */}
      <div className="absolute w-72 h-72 rounded-full bg-[#1f6feb]/20 blur-3xl pointer-events-none -translate-x-12 -translate-y-12" />
      <div className="absolute w-72 h-72 rounded-full bg-[#00c853]/20 blur-3xl pointer-events-none translate-x-12 translate-y-12" />

      {/* Main Center Splash Content */}
      <div className="relative flex flex-col items-center text-center space-y-4 px-6 animate-in zoom-in-95 duration-300">
        <div className="p-4 rounded-full bg-gradient-to-b from-[#21262d] to-[#161b22] border-2 border-white/20 shadow-[0_0_50px_rgba(56,189,248,0.25)] ring-4 ring-white/10">
          <BrandLogo size="xl" showText={false} animate={false} />
        </div>

        <div className="space-y-1.5 pt-2">
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            Dinh<span className="text-[#00c853]">Euro</span>
            <span className="px-2 py-0.5 text-[10px] font-bold bg-[#21262d] text-[#58a6ff] border border-[#30363d] rounded">
              PWA
            </span>
          </h1>
          <p className="text-xs text-[#8b949e] font-medium tracking-wide">
            Cotações em Tempo Real • Inteligência com IA
          </p>
        </div>

        {/* Loading Pulsing Progress Indicator */}
        <div className="w-40 h-1 bg-[#21262d] rounded-full overflow-hidden mt-6 relative">
          <div className="h-full bg-gradient-to-r from-[#1f6feb] via-[#10b981] to-[#00c853] w-full animate-pulse" />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#58a6ff] font-mono pt-2">
          <Sparkles className="w-3.5 h-3.5 text-[#00c853]" />
          <span>Motor Financeiro Conectado</span>
        </div>
      </div>
    </div>
  );
};
