import React, { useEffect, useMemo, useState } from 'react';
import { 
  Activity, 
  AlertCircle, 
  ArrowDownRight, 
  ArrowUpRight, 
  Award, 
  Bell, 
  BellRing, 
  Check, 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  Cloud, 
  Eye, 
  Flame, 
  HelpCircle, 
  Info, 
  Lock, 
  Plus, 
  RotateCcw, 
  ShieldCheck, 
  Sliders, 
  Target, 
  TrendingDown, 
  TrendingUp, 
  Volume2, 
  X, 
  Zap,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import { evaluateConfluenceDetails } from '../services/signalEngine';
import { marketDataService } from '../services/marketDataService';
import { getTickerConfidenceScore } from '../services/confidenceScoring';
import { SignalAccuracyStats, SignalAlert, SignalRuleConfig, TickerQuote } from '../types/trading';
import { formatCurrency } from '../utils/formatters';
import { 
  getNotificationPermission, 
  playSignalChime, 
  requestBrowserNotificationPermission, 
  sendSystemNotification 
} from '../utils/browserNotifications';

interface EntrySignalsTabProps {
  rules: SignalRuleConfig[];
  onUpdateRules: (newRules: SignalRuleConfig[]) => void;
  alerts: SignalAlert[];
  xauusdSignals: any[];
  onDismissAlert: (id: string) => void;
  accuracyStats: SignalAccuracyStats[];
  maxAlertsPerSession: number;
  onUpdateMaxAlerts: (cap: number) => void;
  onSelectTicker: (symbol: string) => void;
  onOpenNewPositionWithTicker: (symbol: string, currentPrice: number, stopLossPrice?: number) => void;
  onNavigateToTab: (tab: string) => void;
  universe?: TickerQuote[];
}

export const EntrySignalsTab: React.FC<EntrySignalsTabProps> = ({
  rules,
  onUpdateRules,
  alerts,
  xauusdSignals,
  onDismissAlert,
  accuracyStats,
  maxAlertsPerSession,
  onUpdateMaxAlerts,
  onSelectTicker,
  onOpenNewPositionWithTicker,
  onNavigateToTab,
  universe,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'confluence' | 'feed' | 'rules' | 'accuracy'>('confluence');
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'ENTRY' | 'ALMOST_BUY' | 'EXIT' | 'ALMOST_EXIT'>('ALL');
  const [notifPermission, setNotifPermission] = useState<string>(getNotificationPermission());
  const [testedNotif, setTestedNotif] = useState(false);

  // Live universe quotes state with reactivity
  const [liveQuotes, setLiveQuotes] = useState<TickerQuote[]>(() => {
    if (universe && universe.length > 0) return universe;
    return marketDataService.getAllQuotes();
  });
  const [isSyncing4H, setIsSyncing4H] = useState<boolean>(false);
  const [candlesVersion, setCandlesVersion] = useState<number>(0);

  useEffect(() => {
    if (universe && universe.length > 0) {
      setLiveQuotes([...universe]);
    }
  }, [universe]);

  // Subscribe to market data updates to ensure real-time re-evaluations
  useEffect(() => {
    const unsub = marketDataService.subscribe(quotes => {
      setLiveQuotes([...quotes]);
      setCandlesVersion(v => v + 1);
    });
    return unsub;
  }, []);

  // Sync live 1HR candle data from server / Finnhub on mount
  const handleSyncLive1HCandles = async () => {
    setIsSyncing4H(true);
    try {
      const symbols = liveQuotes.map(q => q.symbol);
      await marketDataService.fetchWatchlistHybridData(symbols);
      setCandlesVersion(v => v + 1);
    } catch (err) {
      console.warn('Error syncing live 1HR candles:', err);
    } finally {
      setIsSyncing4H(false);
    }
  };

  useEffect(() => {
    handleSyncLive1HCandles();
  }, []);

  useEffect(() => {
    setNotifPermission(getNotificationPermission());
  }, []);

  const handleRequestPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setNotifPermission(res);
    if (res === 'granted') {
      sendSystemNotification('🚨 1HR Signal Engine: Notifications Enabled', {
        body: 'System-level alerts active for strict 1D TK Cross + 1HR Closed-Candle trend entries and 1HR reversal exits.',
        direction: 'BULLISH',
        playSound: true,
      });
      setTestedNotif(true);
      setTimeout(() => setTestedNotif(false), 4000);
    }
  };

  const handleTestAlert = () => {
    playSignalChime('BULLISH');
    sendSystemNotification('🚨 TEST: 1HR Master Long Entry (XAUUSD)', {
      body: '1D Daily Golden Cross + 1HR Tenkan ($2910) >= Kijun ($2905) > Cloud Top ($2898), Chikou Bullish, Future Cloud Green, Clearance confirmed.',
      direction: 'BULLISH',
      playSound: false,
    });
    setTestedNotif(true);
    setTimeout(() => setTestedNotif(false), 3000);
  };

  const masterRule = rules.find(r => r.category === 'ichimoku_confluence' || r.id.includes('ichimoku')) || rules[0];

  const updateRuleParam = (paramKey: string, value: any) => {
    const updated = rules.map(r => {
      if (r.id === masterRule.id || r.category === 'ichimoku_confluence') {
        return {
          ...r,
          params: {
            ...r.params,
            [paramKey]: value,
          },
        };
      }
      return r;
    });
    onUpdateRules(updated);
  };

  // Live Confluence evaluation across reactive Universe watchlist symbols with live 1HR + 1D candles
  const confluenceTableData = useMemo(() => {
    return liveQuotes.map(q => {
      const candles = marketDataService.getCachedCandles(q.symbol, '60') || marketDataService.getCachedCandles(q.symbol, '1h') || marketDataService.getCachedCandles(q.symbol) || [];
      const macroCandles = marketDataService.getCachedCandles(q.symbol, 'D') || marketDataService.getCachedCandles(q.symbol, '1d') || [];
      const evaluation = evaluateConfluenceDetails(q.symbol, candles, masterRule?.params, macroCandles);
      return {
        quote: q,
        evaluation,
      };
    });
  }, [liveQuotes, masterRule, candlesVersion]);

  const filteredData = useMemo(() => {
    if (directionFilter === 'ENTRY') {
      return confluenceTableData.filter(d => d.evaluation.isMasterEntryTriggered);
    }
    if (directionFilter === 'ALMOST_BUY') {
      return confluenceTableData.filter(d => d.evaluation.isAlmostBuy);
    }
    if (directionFilter === 'EXIT') {
      return confluenceTableData.filter(d => d.evaluation.isMasterExitTriggered);
    }
    if (directionFilter === 'ALMOST_EXIT') {
      return confluenceTableData.filter(d => d.evaluation.isAlmostExit);
    }
    return confluenceTableData;
  }, [confluenceTableData, directionFilter]);

  const totalBuySignals = confluenceTableData.filter(d => d.evaluation.isMasterEntryTriggered).length;
  const totalAlmostBuySignals = confluenceTableData.filter(d => d.evaluation.isAlmostBuy).length;
  const totalSellSignals = confluenceTableData.filter(d => d.evaluation.isMasterExitTriggered).length;
  const totalAlmostSellSignals = confluenceTableData.filter(d => d.evaluation.isAlmostExit).length;

  return (
    <div className="space-y-4">
      {/* Top Overview & Sub-tab navigation */}
      <div className="bg-white p-4 rounded-xl border border-[#E6DDCF] flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Cloud className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold text-[#1C1917] tracking-tight">Multi-Timeframe Confluence Engine</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FDF4DC] text-[#845306] border border-[#F3DA90]">
              STOCKS (1H/4H/1D) • METALS &amp; CRYPTO (1m/5m/15m)
            </span>
          </div>
          <p className="text-xs text-[#57534E] mt-0.5">
            Simultaneous 3-Timeframe Confluence: 1) Tenkan &gt; Kijun &amp; both above cloud, 2) CCI (40) &gt; 100, 3) Stoch (12,3,3) Main &gt; Signal &amp; &gt; 80. Stop loss at bottom of the bar close after TK crossover.
          </p>
        </div>

        {/* Action Controls & Sub Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Notification Permission Toggle */}
          <div className="flex items-center gap-1.5 bg-[#FAF7F2] px-2.5 py-1.5 rounded-lg border border-[#E6DDCF] text-xs">
            {notifPermission === 'granted' ? (
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <BellRing className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline font-bold">Desktop Alerts Active</span>
              </span>
            ) : (
              <button
                onClick={handleRequestPermission}
                className="flex items-center gap-1 text-[#57534E] hover:text-[#1C1917] font-semibold"
                title="Enable browser system notifications"
              >
                <Bell className="w-3.5 h-3.5 text-amber-600" />
                Enable System Alerts
              </button>
            )}
            <button
              onClick={handleTestAlert}
              className="ml-1 px-1.5 py-0.5 rounded bg-white hover:bg-[#F5EFEB] text-[#845306] hover:text-[#59410E] text-[10px] font-mono border border-[#E6DDCF] font-bold"
              title="Test notification and audio chime"
            >
              {testedNotif ? 'Pinged ✓' : 'Test Ping'}
            </button>
          </div>

          <div className="bg-[#FAF7F2] p-1 rounded-lg border border-[#E6DDCF] flex items-center text-xs">
            <button
              id="subtab-confluence-scanner"
              onClick={() => setActiveSubTab('confluence')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'confluence'
                  ? 'bg-[#1C1917] text-white font-bold shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Live Scanner
            </button>
            <button
              id="subtab-signal-feed"
              onClick={() => setActiveSubTab('feed')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'feed'
                  ? 'bg-[#1C1917] text-white font-bold shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              Active Alerts ({alerts.length})
            </button>
            <button
              id="subtab-rule-builder"
              onClick={() => setActiveSubTab('rules')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'rules'
                  ? 'bg-[#1C1917] text-white font-bold shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Parameters
            </button>
            <button
              id="subtab-signal-accuracy"
              onClick={() => setActiveSubTab('accuracy')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                activeSubTab === 'accuracy'
                  ? 'bg-[#1C1917] text-white font-bold shadow-xs'
                  : 'text-[#57534E] hover:text-[#1C1917]'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              Accuracy
            </button>
            <button
              id="subtab-goto-daily-log"
              onClick={() => onNavigateToTab('daily-log')}
              className="px-3 py-1.5 rounded-md font-semibold text-[#57534E] hover:text-[#1C1917] bg-white hover:bg-[#F5EFEB] border border-[#E6DDCF] flex items-center gap-1.5 transition-colors"
              title="View the Daily Log spreadsheet matching your Google Sheets"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Daily Log</span>
            </button>
          </div>
        </div>
      </div>

      {/* SUB-VIEW 1: Live Confluence Scanner Dashboard */}
      {activeSubTab === 'confluence' && (
        <div className="space-y-4">
          {/* Dual Strict Confluence Formula Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 1. Strict Long Entry Logic Box (Bullish) */}
            <div className="bg-[#FFFDF7] p-4 rounded-xl border border-[#E6DDCF] hover:border-emerald-500/40 space-y-3 shadow-xs transition-colors">
              <div className="flex items-center justify-between border-b border-[#E6DDCF] pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
                    <TrendingUp className="w-4 h-4 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1917] flex items-center gap-1.5">
                      8-Pillar Confluence ENTRY
                    </h3>
                    <span className="text-[11px] text-[#57534E] font-mono">Tenkan &gt; Kijun &gt; Cloud • CCI &gt; 100 • Stoch &gt; 80 • Closed Bar</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                  {totalBuySignals} Active BUYs
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="p-2 rounded bg-white border border-[#E6DDCF] flex items-center justify-between font-mono">
                  <span className="text-[#1C1917]">1. 1D Macro Tenkan &gt;= Kijun-sen</span>
                  <span className="text-emerald-700 font-semibold text-[11px]">1D Macro Golden Cross</span>
                </div>
                <div className="p-2 rounded bg-white border border-[#E6DDCF] flex items-center justify-between font-mono">
                  <span className="text-[#1C1917]">2. 1HR Tenkan &gt;= Kijun-sen</span>
                  <span className="text-emerald-700 font-semibold text-[11px]">TK Bullish Alignment</span>
                </div>
                <div className="p-2 rounded bg-white border border-[#E6DDCF] flex items-center justify-between font-mono">
                  <span className="text-[#1C1917]">3. 1HR Tenkan &amp; Kijun &gt; Cloud Top</span>
                  <span className="text-emerald-700 font-semibold text-[11px]">Both Above Active Cloud</span>
                </div>
                <div className="p-2 rounded bg-white border border-[#E6DDCF] flex items-center justify-between font-mono">
                  <span className="text-[#1C1917]">4. 1HR Closed Price &gt; Cloud Top</span>
                  <span className="text-emerald-700 font-semibold text-[11px]">Clean Cloud Breakout</span>
                </div>
                <div className="p-2 rounded bg-white border border-[#E6DDCF] flex items-center justify-between font-mono">
                  <span className="text-[#1C1917]">5. 1HR Chikou: Close &gt; Close[-26]</span>
                  <span className="text-emerald-700 font-semibold text-[11px]">Macro Clearance</span>
                </div>
                <div className="p-2 rounded bg-white border border-[#E6DDCF] flex items-center justify-between font-mono">
                  <span className="text-[#1C1917]">6. 1HR Future Cloud: Span A &gt; Span B</span>
                  <span className="text-emerald-700 font-semibold text-[11px]">Forward Cloud Green</span>
                </div>
                <div className="p-2 rounded bg-white border border-[#E6DDCF] flex items-center justify-between font-mono">
                  <span className="text-[#1C1917] font-bold">7. 📊 CCI (40) &gt; +100</span>
                  <span className="text-emerald-700 font-semibold text-[11px]">Strong Trend Impulse</span>
                </div>
                <div className="p-2 rounded bg-white border border-[#E6DDCF] flex items-center justify-between font-mono">
                  <span className="text-[#1C1917] font-bold">8. ⚡ Stoch (12,3,3) Main &gt; Signal &amp; &gt; 80</span>
                  <span className="text-emerald-700 font-semibold text-[11px]">Breakout Momentum Confirmed</span>
                </div>
              </div>
              <div className="bg-[#FAF7F2] border border-[#E6DDCF] rounded p-2 text-[11px] text-[#57534E] flex items-center gap-1.5 font-mono">
                <span className="font-bold text-emerald-700">🛑 Stop Loss:</span>
                <span>Bottom of the bar close immediately after Tenkan-Kijun crossover</span>
              </div>
            </div>

            {/* 2. Strict Bearish Exit Logic Box (Bearish) */}
            <div className="bg-[#FFFDF7] p-4 rounded-xl border border-[#E6DDCF] hover:border-rose-500/40 space-y-3 shadow-xs transition-colors">
              <div className="flex items-center justify-between border-b border-[#E6DDCF] pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-800">
                    <TrendingDown className="w-4 h-4 text-rose-700" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1C1917] flex items-center gap-1.5">
                      Confluence EXIT / SHORT
                    </h3>
                    <span className="text-[11px] text-[#57534E] font-mono">Strictly on completed bar close • Benchmark level breakdown</span>
                  </div>
                </div>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded">
                  {totalSellSignals} Active SELLs
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="p-2 rounded bg-white border border-[#E6DDCF] flex items-center justify-between font-mono">
                  <span className="text-[#1C1917]">1. 1HR Tenkan-sen &lt; Kijun-sen</span>
                  <span className="text-rose-700 font-semibold text-[11px]">Reversal Cross Event</span>
                </div>
                <div className="p-2 rounded bg-white border border-[#E6DDCF] flex items-center justify-between font-mono">
                  <span className="text-[#1C1917]">2. First Closed 1HR Bar After Cross</span>
                  <span className="text-[#57534E] font-semibold text-[11px]">Benchmark Exit Level ($P_reversal)</span>
                </div>
                <div className="p-2 rounded bg-white border border-[#E6DDCF] flex items-center justify-between font-mono">
                  <span className="text-[#1C1917]">3. Exit Signal: 1HR Price &lt; $P_reversal</span>
                  <span className="text-rose-700 font-bold text-[11px]">Confirmed Breakdown Exit</span>
                </div>
                <div className="p-2 rounded bg-white border border-[#E6DDCF] flex items-center justify-between font-mono">
                  <span className="text-[#1C1917]">4. Hold Protection: Price &gt;= $P_reversal</span>
                  <span className="text-[#57534E] font-semibold text-[11px]">Continues Riding While Above</span>
                </div>
                <div className="p-2 rounded bg-white border border-[#E6DDCF] flex items-center justify-between font-mono">
                  <span className="text-[#1C1917] font-bold">5. 📊 CCI (40) &lt; -100</span>
                  <span className="text-rose-700 font-semibold text-[11px]">Strong Bearish Impulse (Short)</span>
                </div>
                <div className="p-2 rounded bg-white border border-[#E6DDCF] flex items-center justify-between font-mono">
                  <span className="text-[#1C1917] font-bold">6. ⚡ Stoch (12,3,3) Main &lt; Signal &amp; &lt; 20</span>
                  <span className="text-rose-700 font-semibold text-[11px]">Oversold Breakdown Confluence</span>
                </div>
              </div>
              <div className="bg-[#FAF7F2] border border-[#E6DDCF] rounded p-2 text-[11px] text-[#57534E] flex items-center gap-1.5 font-mono">
                <span className="font-bold text-rose-700">🛑 Short Stop Loss:</span>
                <span>Top of the bar close immediately after Tenkan-Kijun bearish crossover</span>
              </div>
            </div>
          </div>

          {/* Execution Integrity Bar */}
          <div className="bg-white border border-[#E6DDCF] rounded-xl p-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 text-[#57534E]">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong className="text-[#1C1917]">Closed-Candle Execution:</strong> Entry evaluated strictly on the completed closed bar (<code className="bg-[#FAF7F2] border border-[#E6DDCF] px-1 py-0.5 rounded text-emerald-800 font-mono">index [length - 2]</code>). Exit signal is strictly below the first closed bar after a reversal cross.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#57534E] font-semibold">Filter View:</span>
              <div className="bg-[#FAF7F2] p-0.5 rounded-lg border border-[#E6DDCF] flex flex-wrap text-[11px]">
                <button
                  onClick={() => setDirectionFilter('ALL')}
                  className={`px-2.5 py-1 rounded transition-colors ${directionFilter === 'ALL' ? 'bg-[#1C1917] text-white font-bold' : 'text-[#57534E] hover:text-[#1C1917]'}`}
                >
                  All ({confluenceTableData.length})
                </button>
                <button
                  onClick={() => setDirectionFilter('ENTRY')}
                  className={`px-2.5 py-1 rounded transition-colors ${directionFilter === 'ENTRY' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold' : 'text-zinc-400 hover:text-emerald-400'}`}
                >
                  Bullish ({totalBuySignals})
                </button>
                <button
                  onClick={() => setDirectionFilter('ALMOST_BUY')}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                    directionFilter === 'ALMOST_BUY'
                      ? 'bg-zinc-800 text-white border border-zinc-600 font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <Zap className="w-3 h-3 text-emerald-400" />
                  Near Buy ({totalAlmostBuySignals})
                </button>
                <button
                  onClick={() => setDirectionFilter('EXIT')}
                  className={`px-2.5 py-1 rounded transition-colors ${directionFilter === 'EXIT' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold' : 'text-zinc-400 hover:text-rose-400'}`}
                >
                  Bearish ({totalSellSignals})
                </button>
                <button
                  onClick={() => setDirectionFilter('ALMOST_EXIT')}
                  className={`px-2.5 py-1 rounded transition-colors ${directionFilter === 'ALMOST_EXIT' ? 'bg-zinc-800 text-white border border-zinc-600 font-bold' : 'text-zinc-400 hover:text-zinc-200'}`}
                >
                  Near Sell ({totalAlmostSellSignals})
                </button>
              </div>
            </div>
          </div>

          {/* Live Scanner Table */}
          <div className="bg-white rounded-xl border border-[#E6DDCF] overflow-hidden shadow-xs">
            <div className="p-3 bg-[#FAF7F2] border-b border-[#E6DDCF] flex items-center justify-between">
              <span className="text-xs font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Live Confluence Matrix (Ichimoku + CCI 40 + Stoch 12,3,3)
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#57534E] font-mono hidden sm:inline">
                  <span className="text-emerald-700 font-bold">{totalBuySignals} BUYs</span> | <span className="text-amber-700 font-bold">{totalAlmostBuySignals} ALMOST BUY</span> | <span className="text-rose-700 font-bold">{totalSellSignals} SELLs</span>
                </span>
                <button
                  onClick={handleSyncLive1HCandles}
                  disabled={isSyncing4H}
                  className="px-2.5 py-1 bg-white hover:bg-[#F5EFEB] disabled:opacity-60 text-[#1C1917] font-semibold rounded border border-[#E6DDCF] flex items-center gap-1.5 text-xs transition-colors cursor-pointer shadow-2xs"
                  title="Force re-fetch of live exchange candles"
                >
                  <RotateCcw className={`w-3.5 h-3.5 text-amber-600 ${isSyncing4H ? 'animate-spin' : ''}`} />
                  <span>{isSyncing4H ? 'Syncing...' : 'Sync Live'}</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#FAF7F2]/60 border-b border-[#E6DDCF] text-[#57534E] uppercase font-bold text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Ticker</th>
                    <th className="py-3 px-3">Live Price</th>
                    <th className="py-3 px-3">Closed Bar</th>
                    <th className="py-3 px-3">Macro TK</th>
                    <th className="py-3 px-3">TK Cross</th>
                    <th className="py-3 px-3">Kumo Cloud</th>
                    <th className="py-3 px-3">Future Cloud</th>
                    <th className="py-3 px-3 text-sky-700 font-bold">📊 CCI (40)</th>
                    <th className="py-3 px-3 text-amber-800 font-bold">⚡ Stoch (12,3,3)</th>
                    <th className="py-3 px-3 text-amber-800 font-bold">🛑 TK Cross SL</th>
                    <th className="py-3 px-3">Reversal Exit</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6DDCF]">
                  {filteredData.map(({ quote, evaluation }) => {
                    const isBuy = evaluation.isMasterEntryTriggered;
                    const isExitTriggered = evaluation.isExitTriggered;
                    const hasReversal = evaluation.hasReversalCross;
                    const isSell = evaluation.isMasterExitTriggered || isExitTriggered;
                    const isAlmostBuy = evaluation.isAlmostBuy;
                    const isAlmostExit = evaluation.isAlmostExit;
                    const inChop = evaluation.isInCloudConsolidation;
                    const isFresh = evaluation.isFreshTrendInception;
                    const isRiding = evaluation.isActivelyRidingTrend;

                    return (
                      <tr
                        key={quote.symbol}
                        className={`transition-colors hover:bg-[#FAF7F2] ${
                          isBuy
                            ? 'bg-emerald-50/50'
                            : isAlmostBuy
                            ? 'bg-amber-50/40'
                            : isExitTriggered
                            ? 'bg-rose-50/50'
                            : hasReversal
                            ? 'bg-amber-50/30'
                            : isSell
                            ? 'bg-rose-50/50'
                            : 'bg-white'
                        }`}
                      >
                        <td className="py-3 px-4 font-bold text-[#1C1917]">
                          <button
                            onClick={() => {
                              onSelectTicker(quote.symbol);
                              onNavigateToTab('charts');
                            }}
                            className="hover:text-amber-700 transition-colors text-left flex items-center gap-1.5"
                          >
                            <span>{quote.symbol}</span>
                            {inChop && (
                              <span className="text-[10px] px-1 py-0.2 bg-amber-100 text-amber-800 border border-amber-300 rounded font-normal">
                                Consolidation
                              </span>
                            )}
                          </button>
                          {(() => {
                            const conf = getTickerConfidenceScore(quote.symbol);
                            const styles: Record<string, string> = {
                              HIGH: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                              MEDIUM: 'bg-amber-100 text-amber-800 border-amber-300',
                              LOW: 'bg-orange-100 text-orange-800 border-orange-300',
                              AVOID: 'bg-rose-100 text-rose-800 border-rose-300',
                              UNKNOWN: 'bg-[#FAF7F2] text-[#57534E] border-[#E6DDCF]',
                            };
                            return (
                              <span
                                title={conf.label}
                                className={`mt-1 inline-block text-[9px] px-1.5 py-0.5 rounded font-mono font-semibold border ${styles[conf.grade]}`}
                              >
                                {conf.grade === 'UNKNOWN' ? 'N/A' : `${conf.grade} (${conf.winRatePct}%)`}
                              </span>
                            );
                          })()}
                        </td>

                        <td className="py-3 px-3 text-[#1C1917] font-semibold">
                          {formatCurrency(quote.price)}
                        </td>

                        <td className="py-3 px-3 text-[#57534E] text-[11px]">
                          ${evaluation.closedCandleClose}
                        </td>

                        {/* 1D TK Macro Crossover */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${evaluation.entryDailyTkCross ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className={`text-[11px] font-semibold ${evaluation.entryDailyTkCross ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {evaluation.entryDailyTkCross ? 'Golden Cross (T≥K)' : 'Bearish (T<K)'}
                            </span>
                          </div>
                        </td>

                        {/* 1HR Tenkan vs Kijun */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${evaluation.entry1hTkBullish ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            <span className={evaluation.entry1hTkBullish ? 'text-emerald-700 font-semibold' : 'text-rose-700'}>
                              T:${evaluation.tenkan} {evaluation.entry1hTkBullish ? '≥' : '<'} K:${evaluation.kijun}
                            </span>
                          </div>
                        </td>

                        {/* 1HR Kumo Cloud */}
                        <td className="py-3 px-3">
                          <div className="text-[11px]">
                            <span className={evaluation.entry1hPriceAboveCloud && evaluation.entry1hTkAboveCloud ? 'text-emerald-700 font-semibold' : 'text-[#78716C]'}>
                              {evaluation.entry1hPriceAboveCloud && evaluation.entry1hTkAboveCloud ? 'Above Kumo' : 'Below/In Kumo'}
                            </span>
                            <div className="text-[10px] text-[#78716C] font-mono">
                              Top: ${evaluation.cloudTop} | Bot: ${evaluation.cloudBottom}
                            </div>
                          </div>
                        </td>

                        {/* Chikou Span Filter */}
                        <td className="py-3 px-3">
                          <span className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
                            evaluation.entry1hChikouBullish
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {evaluation.entry1hChikouBullish ? 'Bullish (C>C[-26])' : 'Bearish (C≤C[-26])'}
                          </span>
                        </td>

                        {/* Future Cloud */}
                        <td className="py-3 px-3">
                          <span className={`text-[11px] px-1.5 py-0.5 rounded font-mono ${
                            evaluation.entry1hFutureCloudBullish
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border border-rose-300'
                          }`}>
                            {evaluation.entry1hFutureCloudBullish ? 'Green (A>B)' : 'Red (A≤B)'}
                          </span>
                        </td>

                        {/* 📊 CCI (40) */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded font-mono ${
                              evaluation.entryCciBullish
                                ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                : evaluation.exitCciBearish
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-[#FAF7F2] text-[#57534E] border border-[#E6DDCF]'
                            }`}>
                              {evaluation.cci.toFixed(1)} {evaluation.entryCciBullish ? '(>100)' : evaluation.exitCciBearish ? '(<-100)' : ''}
                            </span>
                            <span className={`text-[9px] font-mono mt-0.5 ${
                              evaluation.entryCciBullish ? 'text-sky-700' : evaluation.exitCciBearish ? 'text-rose-700' : 'text-[#78716C]'
                            }`}>
                              {evaluation.entryCciBullish ? 'Strong Impulse' : evaluation.exitCciBearish ? 'Bear Impulse' : 'Neutral'}
                            </span>
                          </div>
                        </td>

                        {/* ⚡ Stoch (12,3,3) */}
                        <td className="py-3 px-3">
                          <div className="flex flex-col">
                            <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded font-mono ${
                              evaluation.entryStochBullish
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : evaluation.exitStochBearish
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-[#FAF7F2] text-[#57534E] border border-[#E6DDCF]'
                            }`}>
                              {evaluation.stochK.toFixed(0)} / {evaluation.stochD.toFixed(0)} {evaluation.entryStochBullish ? '(>80)' : evaluation.exitStochBearish ? '(<20)' : ''}
                            </span>
                            <span className={`text-[9px] font-mono mt-0.5 ${
                              evaluation.entryStochBullish ? 'text-amber-700' : evaluation.exitStochBearish ? 'text-rose-700' : 'text-[#78716C]'
                            }`}>
                              {evaluation.entryStochBullish ? 'K>D Momentum' : evaluation.exitStochBearish ? 'K<D Oversold' : evaluation.stochK > evaluation.stochD ? 'K>D' : 'K<D'}
                            </span>
                          </div>
                        </td>

                        {/* 🛑 TK Cross SL */}
                        <td className="py-3 px-3">
                          {evaluation.tkCrossoverStopLoss && evaluation.tkCrossoverStopLoss > 0 ? (
                            <span className="text-[11px] font-mono text-amber-800 font-bold px-1.5 py-0.5 rounded bg-amber-100 border border-amber-300">
                              ${evaluation.tkCrossoverStopLoss.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#78716C] font-mono">
                              —
                            </span>
                          )}
                        </td>

                        {/* 1HR Reversal Exit Status */}
                        <td className="py-3 px-3">
                          {isExitTriggered ? (
                            <div className="flex flex-col">
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-300 font-bold font-mono">
                                EXIT &lt; ${evaluation.reversalCrossBarClose}
                              </span>
                              <span className="text-[9px] text-rose-700 font-mono mt-0.5">
                                Price ${quote.price} &lt; ${evaluation.reversalCrossBarClose}
                              </span>
                            </div>
                          ) : hasReversal ? (
                            <div className="flex flex-col">
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-mono">
                                Watch: Stop &lt; ${evaluation.reversalCrossBarClose}
                              </span>
                              <span className="text-[9px] text-emerald-700 font-mono mt-0.5 font-bold">
                                Holding (${quote.price} ≥ ${evaluation.reversalCrossBarClose})
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[#78716C] font-mono">
                              Holding (No Cross)
                            </span>
                          )}
                        </td>

                        {/* Overall Status Badge */}
                        <td className="py-3 px-3 text-center">
                          {isBuy ? (
                            <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              {isFresh ? '8/8 TREND INCEPTION' : isRiding ? '8/8 RIDING TREND' : '8/8 BUY SIGNAL'}
                            </span>
                          ) : isAlmostBuy ? (
                            <div className="flex flex-col items-center">
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
                                <Zap className="w-3 h-3 text-amber-600" /> ALMOST BUY ({evaluation.totalPillarsPassed ?? evaluation.entryPassedCount}/8)
                              </span>
                              <span className="text-[9px] text-amber-700 font-mono mt-0.5 max-w-[140px] truncate" title={evaluation.almostBuyMissingConditions.join('; ')}>
                                Awaiting: {evaluation.almostBuyMissingConditions[0] || '1 condition'}
                              </span>
                            </div>
                          ) : isExitTriggered ? (
                            <span className="px-2 py-1 rounded bg-rose-100 text-rose-800 border border-rose-300 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs">
                              <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> 1HR EXIT TRIGGERED
                            </span>
                          ) : hasReversal ? (
                            <div className="flex flex-col items-center">
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[11px] inline-flex items-center gap-1 shadow-2xs whitespace-nowrap">
                                <AlertCircle className="w-3 h-3 text-amber-600" /> 1HR REVERSAL WATCH
                              </span>
                              <span className="text-[9px] text-amber-700 font-mono mt-0.5">
                                Stop &lt; ${evaluation.reversalCrossBarClose}
                              </span>
                            </div>
                          ) : inChop ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 text-[10px]">
                              Chop Suppressed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-[#FAF7F2] text-[#57534E] border border-[#E6DDCF] text-[10px]">
                              {evaluation.totalPillarsPassed ?? evaluation.entryPassedCount}/8 Pillars
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                onSelectTicker(quote.symbol);
                                onNavigateToTab('charts');
                              }}
                              className="px-2.5 py-1 bg-white hover:bg-[#F5EFEB] text-[#1C1917] font-semibold border border-[#E6DDCF] rounded text-xs transition-colors flex items-center gap-1 shadow-2xs"
                            >
                              <Eye className="w-3 h-3 text-amber-600" /> Chart
                            </button>
                            <button
                              onClick={() => onOpenNewPositionWithTicker(quote.symbol, quote.price, evaluation.cloudBottom > 0 ? evaluation.cloudBottom : undefined)}
                              className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs ${
                                isBuy
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                  : isAlmostBuy
                                  ? 'bg-amber-600 hover:bg-amber-700 text-white font-bold'
                                  : 'bg-[#FAF7F2] hover:bg-[#F5EFEB] text-[#1C1917] border border-[#E6DDCF]'
                              }`}
                            >
                              <Plus className="w-3 h-3" /> {isAlmostBuy ? 'Prepare' : 'Trade'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Live Alert Feed */}
      {activeSubTab === 'feed' && (
        <div className="space-y-3">
          {/* Alert Session Cap Status */}
          <div className="bg-[#161B22]/60 px-4 py-2.5 rounded-lg border border-slate-800 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center space-x-2 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Session Alerts: <strong className="text-white">{alerts.length}</strong> / {maxAlertsPerSession} cap</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Max Alerts:</span>
              <select
                value={maxAlertsPerSession}
                onChange={e => onUpdateMaxAlerts(Number(e.target.value))}
                className="bg-[#0B0E14] border border-slate-700 text-slate-200 rounded px-2 py-0.5 text-xs font-mono"
              >
                <option value={5}>5 per session</option>
                <option value={10}>10 per session</option>
                <option value={15}>15 per session</option>
                <option value={25}>25 per session</option>
              </select>
            </div>
          </div>

          {alerts.length === 0 ? (
            <div className="bg-[#161B22] p-8 rounded-lg border border-slate-800 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center">
                <Bell className="w-6 h-6 text-slate-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-200">No Active Confluence Alerts</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                The scanner will automatically post a signal when a 4H closed candle satisfies all 5 strict confluence rules and closes definitively outside the Ichimoku Cloud.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Array.from<SignalAlert>(new Map<string, SignalAlert>(alerts.map(a => [a.id, a])).values()).map(alert => {
                const isBullish = alert.direction === 'BULLISH';
                return (
                  <div
                    key={alert.id}
                    className={`bg-[#161B22] rounded-lg border p-4 space-y-3 shadow-md transition-all ${
                      isBullish ? 'border-emerald-900/60 hover:border-emerald-700/80' : 'border-rose-900/60 hover:border-rose-700/80'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-bold text-slate-100">{alert.ticker}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                            isBullish ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}
                        >
                          {alert.signal || (isBullish ? 'BUY' : 'SELL')} CONFLUENCE
                        </span>
                      </div>
                      <button
                        onClick={() => onDismissAlert(alert.id)}
                        className="text-slate-500 hover:text-slate-300 p-1 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-[#0B0E14] p-2.5 rounded border border-slate-800 font-mono">
                      {alert.reason}
                    </p>

                    <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                      <span>Trigger Price: <strong className="text-slate-100">{formatCurrency(alert.triggerPrice)}</strong></span>
                      <span>Time: {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                      <button
                        onClick={() => {
                          onSelectTicker(alert.ticker);
                          onNavigateToTab('charts');
                        }}
                        className="flex-1 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        View in Chart
                      </button>

                      <button
                        onClick={() => onOpenNewPositionWithTicker(alert.ticker, alert.triggerPrice, alert.confluenceStatus?.cloudBottom && alert.confluenceStatus.cloudBottom > 0 ? alert.confluenceStatus.cloudBottom : undefined)}
                        className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1 shadow-sm ${
                          isBullish ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-rose-600 hover:bg-rose-500 text-white'
                        }`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isBullish ? 'Open Long Position' : 'Log Reversal Exit'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: Strategy Parameters Configurator */}
      {activeSubTab === 'rules' && (
        <div className="space-y-4">
          <div className="bg-[#161B22] p-4 rounded-lg border border-slate-800 space-y-4">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Indicator Formula Parameters & Mathematical Settings
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure lookback windows, smoothing, and thresholds for the 4H Ichimoku Cloud, Stochastic Oscillator, and CCI.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Ichimoku Settings */}
              <div className="bg-[#0B0E14] p-4 rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400 text-xs flex items-center gap-1.5">
                    <Cloud className="w-4 h-4" /> Ichimoku Kinko Hyo
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Standard (9, 26, 52, 26)</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Tenkan-sen Period (Conversion Line)</label>
                    <input
                      type="number"
                      value={masterRule.params.tenkanPeriod ?? 9}
                      onChange={e => updateRuleParam('tenkanPeriod', Number(e.target.value))}
                      className="w-full bg-[#161B22] border border-slate-800 rounded p-1.5 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Kijun-sen Period (Base Line)</label>
                    <input
                      type="number"
                      value={masterRule.params.kijunPeriod ?? 26}
                      onChange={e => updateRuleParam('kijunPeriod', Number(e.target.value))}
                      className="w-full bg-[#161B22] border border-slate-800 rounded p-1.5 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Senkou Span B Period (Leading Span B)</label>
                    <input
                      type="number"
                      value={masterRule.params.senkouBPeriod ?? 52}
                      onChange={e => updateRuleParam('senkouBPeriod', Number(e.target.value))}
                      className="w-full bg-[#161B22] border border-slate-800 rounded p-1.5 text-slate-100 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Stochastic Settings */}
              <div className="bg-[#0B0E14] p-4 rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-cyan-400 text-xs flex items-center gap-1.5">
                    <Activity className="w-4 h-4" /> Stochastic Oscillator
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Settings (12, 3, 3)</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-slate-400 block mb-1">%K Period</label>
                      <input
                        type="number"
                        value={masterRule.params.stochPeriodK ?? 12}
                        onChange={e => updateRuleParam('stochPeriodK', Number(e.target.value))}
                        className="w-full bg-[#161B22] border border-slate-800 rounded p-1.5 text-slate-100 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1">Smooth K (SMA)</label>
                      <input
                        type="number"
                        value={masterRule.params.stochSmoothK ?? 3}
                        onChange={e => updateRuleParam('stochSmoothK', Number(e.target.value))}
                        className="w-full bg-[#161B22] border border-slate-800 rounded p-1.5 text-slate-100 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">%D Line Period (SMA of %K)</label>
                    <input
                      type="number"
                      value={masterRule.params.stochPeriodD ?? 3}
                      onChange={e => updateRuleParam('stochPeriodD', Number(e.target.value))}
                      className="w-full bg-[#161B22] border border-slate-800 rounded p-1.5 text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Bullish / Bearish Center Cutoff</label>
                    <input
                      type="number"
                      value={masterRule.params.stochThreshold ?? 50}
                      onChange={e => updateRuleParam('stochThreshold', Number(e.target.value))}
                      className="w-full bg-[#161B22] border border-slate-800 rounded p-1.5 text-cyan-400 font-bold font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* CCI Settings */}
              <div className="bg-[#0B0E14] p-4 rounded-lg border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-400 text-xs flex items-center gap-1.5">
                    <Flame className="w-4 h-4" /> Commodity Channel Index
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Period 40</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">CCI Lookback Period</label>
                    <input
                      type="number"
                      value={masterRule.params.cciPeriod ?? 40}
                      onChange={e => updateRuleParam('cciPeriod', Number(e.target.value))}
                      className="w-full bg-[#161B22] border border-slate-800 rounded p-1.5 text-slate-100 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Bullish / Bearish Cutoff Threshold</label>
                    <input
                      type="number"
                      value={masterRule.params.cciThreshold ?? 50}
                      onChange={e => updateRuleParam('cciThreshold', Number(e.target.value))}
                      className="w-full bg-[#161B22] border border-slate-800 rounded p-1.5 text-amber-400 font-bold font-mono"
                    />
                  </div>

                  <div className="p-2.5 rounded bg-amber-950/20 border border-amber-900/30 text-[11px] text-amber-300/90 font-mono mt-2">
                    ✓ Evaluates Mean Deviation against 40-period typical price SMA.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 4: Accuracy & Win Rates */}
      {activeSubTab === 'accuracy' && (
        <div className="space-y-4">
          <div className="bg-[#161B22]/80 p-4 rounded-lg border border-slate-800">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-400" />
              4H Closed-Candle Trend Confluence Performance
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Historical forward performance and signal win rates (+1D, +3D, and +5D) for the strict 5-pillar confluence system.
            </p>
          </div>

          <div className="bg-[#161B22] rounded-lg border border-slate-800 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-mono">
                <thead className="bg-[#0B0E14]/70 border-b border-slate-800 text-xs text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Strategy Rule Name</th>
                    <th className="py-3 px-3 text-center">Triggers</th>
                    <th className="py-3 px-3 text-right">1D Win Rate</th>
                    <th className="py-3 px-3 text-right">3D Win Rate</th>
                    <th className="py-3 px-3 text-right">5D Win Rate</th>
                    <th className="py-3 px-3 text-right">Avg 3D Return</th>
                    <th className="py-3 px-4 text-center">Confluence Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {accuracyStats.map((stat) => {
                    return (
                      <tr key={stat.ruleId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-sans font-semibold text-slate-100">
                          {stat.ruleName}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-300">
                          {stat.totalTriggers}
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                          {stat.winRate1D.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                          {stat.winRate3D.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right text-emerald-400 font-bold">
                          {stat.winRate5D.toFixed(1)}%
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-emerald-400">
                          +{stat.avgReturnPct3D.toFixed(2)}%
                        </td>
                        <td className="py-3 px-4 text-center font-sans">
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded">
                            ★ High Edge
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
