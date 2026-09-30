import React, { useState, useEffect, useCallback } from "react";
import {
  Asset,
  RegionalTab,
  AIAccordionTopic,
  PortfolioPosition,
  NewsItem,
  MarketMoverItem,
} from "./types/finance";
import { ALL_ASSETS } from "./data/mockMarketData";
import {
  fetchLiveQuotes,
  fetchLiveNews,
  fetchLiveMovers,
  LiveQuotePayload,
} from "./services/marketDataService";
import { Header } from "./components/Header";
import { NavigationTabs } from "./components/NavigationTabs";
import { DynamicIndicesCarousel } from "./components/DynamicIndicesCarousel";
import { AIMarketSummaryAccordion } from "./components/AIMarketSummaryAccordion";
import { MarketMoversGrid } from "./components/MarketMoversGrid";
import { NewsSection } from "./components/NewsSection";
import { AssetDetailView } from "./components/AssetDetailView";
import { SidebarDrawer } from "./components/SidebarDrawer";
import { GlobalSearchModal } from "./components/GlobalSearchModal";
import { PortfolioModal } from "./components/PortfolioModal";
import { WatchlistModal } from "./components/WatchlistModal";
import { AIDeepDiveModal } from "./components/AIDeepDiveModal";
import { PWAInstallModal } from "./components/PWAInstallModal";
import { PWANotificationBar } from "./components/PWANotificationBar";
import { PWASplashIntro } from "./components/PWASplashIntro";
import { Footer } from "./components/Footer";
import { usePWA } from "./hooks/usePWA";

export default function App() {
  const [activeTab, setActiveTab] = useState<RegionalTab>("América Latina");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Live real-time market feeds state (Single Source of Truth)
  const [liveAssets, setLiveAssets] = useState<Asset[]>(ALL_ASSETS);
  const [liveNews, setLiveNews] = useState<NewsItem[] | null>(null);
  const [liveMovers, setLiveMovers] = useState<{
    mostActive: MarketMoverItem[];
    topGainers: MarketMoverItem[];
    topLosers: MarketMoverItem[];
  } | null>(null);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasInitialLoaded, setHasInitialLoaded] = useState(false);

  // PWA State & Installation Hook
  const {
    isInstallable,
    isInstalled,
    isOffline,
    hasUpdate,
    promptInstall,
    applyUpdate,
  } = usePWA();

  // Modals state
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [portfolioOpen, setPortfolioOpen] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);
  const [pwaModalOpen, setPwaModalOpen] = useState(false);
  const [deepDiveTopic, setDeepDiveTopic] = useState<AIAccordionTopic | null>(null);

  // Helper to merge live quotes into asset objects
  const mergeQuotesIntoAssets = useCallback(
    (quotes: Record<string, LiveQuotePayload>) => {
      setLiveAssets((prevAssets) => {
        return prevAssets.map((asset) => {
          const quote = quotes[asset.id];
          if (!quote) return asset;

          const updated: Asset = {
            ...asset,
            price: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            sparkline:
              quote.sparkline && quote.sparkline.length > 0
                ? quote.sparkline
                : asset.sparkline,
            metrics: {
              ...asset.metrics,
              open: quote.open !== undefined ? quote.open : asset.metrics.open,
              high: quote.high !== undefined ? quote.high : asset.metrics.high,
              low: quote.low !== undefined ? quote.low : asset.metrics.low,
              high52w: quote.high52w !== undefined ? quote.high52w : asset.metrics.high52w,
              low52w: quote.low52w !== undefined ? quote.low52w : asset.metrics.low52w,
              prevClose: quote.price - quote.change,
              volume: quote.volume || asset.metrics.volume,
            },
          };

          return updated;
        });
      });

      // Keep selectedAsset updated in real time if open
      setSelectedAsset((cur) => {
        if (!cur) return null;
        const quote = quotes[cur.id];
        if (!quote) return cur;
        return {
          ...cur,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          sparkline:
            quote.sparkline && quote.sparkline.length > 0
              ? quote.sparkline
              : cur.sparkline,
          metrics: {
            ...cur.metrics,
            open: quote.open !== undefined ? quote.open : cur.metrics.open,
            high: quote.high !== undefined ? quote.high : cur.metrics.high,
            low: quote.low !== undefined ? quote.low : cur.metrics.low,
            high52w: quote.high52w !== undefined ? quote.high52w : cur.metrics.high52w,
            low52w: quote.low52w !== undefined ? quote.low52w : cur.metrics.low52w,
            prevClose: quote.price - quote.change,
            volume: quote.volume || cur.metrics.volume,
          },
        };
      });
    },
    []
  );

  // Master refresh function
  const refreshAllMarketData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [quotes, news, movers] = await Promise.all([
        fetchLiveQuotes(),
        fetchLiveNews(),
        fetchLiveMovers(),
      ]);

      if (quotes) {
        mergeQuotesIntoAssets(quotes);
      }
      if (news && news.length > 0) {
        setLiveNews(news);
      }
      if (movers) {
        setLiveMovers(movers);
      }
      setLastUpdatedTime(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setHasInitialLoaded(true);
    } catch (err) {
      console.warn("Market refresh error:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [mergeQuotesIntoAssets]);

  // Initial load and periodic polling every 15 seconds
  useEffect(() => {
    refreshAllMarketData();
    const interval = setInterval(() => {
      refreshAllMarketData();
    }, 15000);
    return () => clearInterval(interval);
  }, [refreshAllMarketData]);

  // Watchlist state (Local Storage persisted)
  const [watchlistIds, setWatchlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("dinheuro_watchlist");
      return saved ? JSON.parse(saved) : ["ibovespa", "petr4", "sp-500", "usd-brl", "bitcoin"];
    } catch {
      return ["ibovespa", "petr4", "sp-500", "usd-brl", "bitcoin"];
    }
  });

  // Portfolio positions state (Local Storage persisted, starts empty with zero fake numbers)
  const [portfolioPositions, setPortfolioPositions] = useState<PortfolioPosition[]>(() => {
    try {
      const saved = localStorage.getItem("dinheuro_portfolio");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save watchlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("dinheuro_watchlist", JSON.stringify(watchlistIds));
    } catch (e) {
      console.error(e);
    }
  }, [watchlistIds]);

  // Save portfolio to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("dinheuro_portfolio", JSON.stringify(portfolioPositions));
    } catch (e) {
      console.error(e);
    }
  }, [portfolioPositions]);

  // Handle URL hash changes for deep linking (e.g. #asset/petr4)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#asset/")) {
        const tickerOrId = hash.replace("#asset/", "").toLowerCase();
        const found = liveAssets.find(
          (a) => a.id.toLowerCase() === tickerOrId || a.ticker.toLowerCase() === tickerOrId
        );
        if (found) {
          setSelectedAsset(found);
        }
      }
    };

    handleHash();
    window.addEventListener("hashchange", handleHash);
    return () => window.removeEventListener("hashchange", handleHash);
  }, [liveAssets]);

  // Watchlist asset objects
  const watchlistAssets = liveAssets.filter((a) =>
    watchlistIds.includes(a.id) || watchlistIds.includes(a.ticker.toLowerCase())
  );

  const handleSelectAsset = (asset: Asset) => {
    setSelectedAsset(asset);
    window.location.hash = `#asset/${asset.id}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSelectTicker = (ticker: string) => {
    const cleanTicker = ticker.replace("$", "").trim();
    const found = liveAssets.find(
      (a) =>
        a.ticker.toUpperCase() === cleanTicker.toUpperCase() ||
        a.id.toLowerCase() === cleanTicker.toLowerCase()
    );
    if (found) {
      handleSelectAsset(found);
    }
  };

  const handleGoHome = () => {
    setSelectedAsset(null);
    window.location.hash = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleToggleWatchlist = (asset: Asset) => {
    setWatchlistIds((prev) => {
      if (prev.includes(asset.id)) {
        return prev.filter((id) => id !== asset.id);
      } else {
        return [...prev, asset.id];
      }
    });
  };

  const handleAddPosition = (pos: Omit<PortfolioPosition, "id">) => {
    const newPos: PortfolioPosition = {
      ...pos,
      id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };
    setPortfolioPositions((prev) => [...prev, newPos]);
  };

  const handleRemovePosition = (id: string) => {
    setPortfolioPositions((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0e1117] text-[#e6edf3] flex flex-col font-sans selection:bg-[#58a6ff]/30 selection:text-white">
      {/* PWA Splash Screen on Initial Visit */}
      <PWASplashIntro
        onInstallPrompt={promptInstall}
        isInstallable={isInstallable}
      />

      {/* PWA Offline / Update Notification Bar */}
      <PWANotificationBar
        isOffline={isOffline}
        hasUpdate={hasUpdate}
        onUpdate={applyUpdate}
      />

      {/* Global Header & Real-Time Micro-Ticker Bar */}
      <Header
        onOpenSearch={() => setSearchOpen(true)}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenPortfolio={() => setPortfolioOpen(true)}
        onOpenWatchlist={() => setWatchlistOpen(true)}
        onOpenPwaModal={() => setPwaModalOpen(true)}
        isPwaInstallable={isInstallable}
        isPwaInstalled={isInstalled}
        onSelectAsset={handleSelectAsset}
        onGoHome={handleGoHome}
        watchlistCount={watchlistIds.length}
        portfolioCount={portfolioPositions.length}
        liveAssets={liveAssets}
        lastUpdatedTime={lastUpdatedTime}
        isRefreshing={isRefreshing}
        onManualRefresh={refreshAllMarketData}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full flex flex-col">
        {selectedAsset ? (
          /* 2. PÁGINA INTERNA (VISÃO DETALHADA DO ATIVO/ÍNDICE) */
          <AssetDetailView
            asset={selectedAsset}
            onBack={handleGoHome}
            onSelectAsset={handleSelectAsset}
            isWatchlisted={watchlistIds.includes(selectedAsset.id)}
            onToggleWatchlist={handleToggleWatchlist}
            onOpenPortfolio={() => setPortfolioOpen(true)}
            allAssets={liveAssets}
          />
        ) : (
          /* 1. VISÃO GERAL (PÁGINA INICIAL) */
          <div className="flex-1 flex flex-col">
            {/* Category Pills Navigation */}
            <NavigationTabs
              activeTab={activeTab}
              onSelectTab={(tab) => {
                setActiveTab(tab);
              }}
            />

            {/* Dynamic Indices Carousel */}
            <DynamicIndicesCarousel
              assets={liveAssets}
              activeTab={activeTab}
              onSelectAsset={handleSelectAsset}
              isLoading={!hasInitialLoaded && isRefreshing}
            />

            {/* AI Market Summary Accordion */}
            <AIMarketSummaryAccordion
              activeTab={activeTab}
              onOpenDeepDive={(topic) => setDeepDiveTopic(topic)}
              liveNews={liveNews}
              liveAssets={liveAssets}
            />

            {/* Market Movers (Mais ativas, Maiores altas, Maiores quedas) */}
            <MarketMoversGrid
              onSelectTicker={handleSelectTicker}
              liveMovers={liveMovers}
              isLoading={!hasInitialLoaded && isRefreshing}
            />

            {/* Portal News Section */}
            <NewsSection
              onSelectTicker={handleSelectTicker}
              liveNews={liveNews}
              isLoading={!hasInitialLoaded && isRefreshing}
            />
          </div>
        )}
      </main>

      {/* Global Modals & Drawers */}
      <SidebarDrawer
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          if (selectedAsset) setSelectedAsset(null);
        }}
        onOpenPortfolio={() => setPortfolioOpen(true)}
        onOpenWatchlist={() => setWatchlistOpen(true)}
        onOpenPwaModal={() => setPwaModalOpen(true)}
        isPwaInstalled={isInstalled}
        watchlistAssets={watchlistAssets}
        onSelectAsset={handleSelectAsset}
        liveAssets={liveAssets}
      />

      <GlobalSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectAsset={handleSelectAsset}
        liveAssets={liveAssets}
      />

      <PortfolioModal
        isOpen={portfolioOpen}
        onClose={() => setPortfolioOpen(false)}
        positions={portfolioPositions}
        onAddPosition={handleAddPosition}
        onRemovePosition={handleRemovePosition}
        onSelectAsset={handleSelectAsset}
        liveAssets={liveAssets}
      />

      <WatchlistModal
        isOpen={watchlistOpen}
        onClose={() => setWatchlistOpen(false)}
        watchlistAssets={watchlistAssets}
        onRemoveFromWatchlist={handleToggleWatchlist}
        onSelectAsset={handleSelectAsset}
      />

      {deepDiveTopic && (
        <AIDeepDiveModal
          topic={deepDiveTopic}
          isOpen={!!deepDiveTopic}
          onClose={() => setDeepDiveTopic(null)}
          onSelectTicker={handleSelectTicker}
          region={activeTab}
        />
      )}

      {/* PWA Direct Modal */}
      <PWAInstallModal
        isOpen={pwaModalOpen}
        onClose={() => setPwaModalOpen(false)}
        onInstall={promptInstall}
        isInstalled={isInstalled}
      />

      {/* Global High Density Footer */}
      <Footer />
    </div>
  );
}
