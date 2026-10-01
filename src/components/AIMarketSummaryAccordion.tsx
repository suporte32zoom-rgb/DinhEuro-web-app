import React, { useState } from "react";
import { RegionalTab, AIAccordionTopic } from "../types/finance";
import { AI_MARKET_TOPICS_BY_REGION } from "../data/mockMarketData";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Brain,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  Zap,
} from "lucide-react";

interface AIMarketSummaryAccordionProps {
  activeTab: RegionalTab;
  onOpenDeepDive: (topic: AIAccordionTopic) => void;
}

export const AIMarketSummaryAccordion: React.FC<AIMarketSummaryAccordionProps> = ({
  activeTab,
  onOpenDeepDive,
}) => {
  const topics = AI_MARKET_TOPICS_BY_REGION[activeTab] || AI_MARKET_TOPICS_BY_REGION["EUA"];
  const [expandedId, setExpandedId] = useState<string | null>(topics[0]?.id || null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const toggleAccordion = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 800);
  };

  return (
    <section className="w-full py-4" id="ai-market-summary-section">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-4 sm:p-5 shadow-lg shadow-black/30">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[#21262d] mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1f6feb] to-[#a371f7] flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#e6edf3] tracking-tight">
                    Resumo do Mercado com IA DinhEuro
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#58a6ff]/15 text-[#58a6ff] border border-[#58a6ff]/30">
                    {activeTab}
                  </span>
                </div>
                <p className="text-xs text-[#8b949e]">
                  Síntese analítica em tempo real de macroeconomia, balanços e fluxos setoriais
                </p>
              </div>
            </div>

            <button
              onClick={handleRefresh}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-[#8b949e] hover:text-[#e6edf3] bg-[#0e1117] hover:bg-[#21262d] border border-[#30363d] transition-all cursor-pointer"
              title="Atualizar leituras de IA"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-[#58a6ff]" : ""}`} />
              <span>Atualizar</span>
            </button>
          </div>

          {/* Accordion List */}
          <div className="space-y-2.5">
            {topics.map((topic, index) => {
              const isExpanded = expandedId === topic.id;
              return (
                <div
                  key={topic.id}
                  className={`border rounded-xl transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? "bg-[#0e1117]/80 border-[#58a6ff]/50 shadow-md shadow-[#58a6ff]/5"
                      : "bg-[#0e1117]/40 border-[#30363d]/70 hover:border-[#8b949e]/50"
                  }`}
                >
                  {/* Accordion Bar Header */}
                  <button
                    onClick={() => toggleAccordion(topic.id)}
                    className="w-full text-left p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                    aria-expanded={isExpanded}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-5 h-5 rounded-full bg-[#21262d] text-[#58a6ff] font-bold text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xs sm:text-sm font-semibold text-[#e6edf3] truncate">
                            {topic.title}
                          </h3>
                          <span className="text-[10px] px-2 py-0.2 rounded bg-[#161b22] text-[#8b949e] border border-[#30363d]">
                            {topic.impactTag}
                          </span>
                        </div>
                        {!isExpanded && (
                          <p className="text-xs text-[#8b949e] truncate mt-1">
                            {topic.summary}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {topic.trend === "bullish" ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#00c853] bg-[#00c853]/10 px-2 py-0.5 rounded-md border border-[#00c853]/20">
                          <TrendingUp className="w-3 h-3" />
                          <span className="hidden sm:inline">Otimista</span>
                        </span>
                      ) : topic.trend === "bearish" ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#ff5252] bg-[#ff5252]/10 px-2 py-0.5 rounded-md border border-[#ff5252]/20">
                          <TrendingDown className="w-3 h-3" />
                          <span className="hidden sm:inline">Cautela</span>
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-[#8b949e] bg-[#30363d]/40 px-2 py-0.5 rounded-md">
                          <Minus className="w-3 h-3" />
                          <span className="hidden sm:inline">Neutro</span>
                        </span>
                      )}

                      <div className="p-1 rounded-md text-[#8b949e] hover:text-[#e6edf3]">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5 border-t border-[#21262d]/70 animate-in fade-in duration-200">
                      <div className="space-y-3">
                        <p className="text-xs sm:text-sm text-[#e6edf3] font-medium leading-relaxed">
                          {topic.summary}
                        </p>
                        <div className="p-3 rounded-xl bg-[#161b22] border border-[#30363d]/60 text-xs text-[#8b949e] leading-relaxed">
                          <span className="text-[#58a6ff] font-semibold">Análise de Cenário: </span>
                          {topic.detailedContext}
                        </div>

                        {/* Action CTA Button */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-[11px] text-[#8b949e] flex items-center gap-1">
                            <Zap className="w-3 h-3 text-[#f0883e]" />
                            Atualizado automaticamente com modelos Gemini 3.7
                          </span>

                          <button
                            id={`btn-learn-more-${topic.id}`}
                            onClick={() => onOpenDeepDive(topic)}
                            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#1f6feb] to-[#238636] hover:brightness-110 shadow-sm transition-all cursor-pointer"
                          >
                            <Brain className="w-3.5 h-3.5" />
                            <span>Aprenda mais com a IA do DinhEuro</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
