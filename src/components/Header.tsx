import React, { useState } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Bell, 
  CandlestickChart, 
  CheckCircle, 
  ChevronRight, 
  Flame, 
  HelpCircle, 
  Menu, 
  Plus, 
  Radio, 
  RefreshCw, 
  Search, 
  Settings as SettingsIcon, 
  ShieldCheck, 
  Sliders, 
  TrendingUp, 
  Wallet, 
  X, 
  Zap,
  BookOpen,
  ExternalLink
} from 'lucide-react';
import { SignalAlert, TickerQuote } from '../types/trading';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  activeMode: 'LIVE_TRACKER' | 'PAPER_TRADING';
  isLiveDataConnected?: boolean;
  setActiveMode: (mode: 'LIVE_TRACKER' | 'PAPER_TRADING') => void;
  universe: TickerQuote[];
  alerts: SignalAlert[];
  unreadAlertsCount: number;
  onSelectTicker: (symbol: string) => void;
  onOpenSettings: () => void;
  onOpenNewPosition: () => void;
  onDismissAlert: (id: string) => void;
  onClearCache?: () => void;
  isResettingCache?: boolean;
  paperBalance: number;
  totalPositionsPnl: { dollars: number; percent: number };
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeMode,
  isLiveDataConnected = false,
  setActiveMode,
  universe,
  alerts,
  unreadAlertsCount,
  onSelectTicker,
  onOpenSettings,
  onOpenNewPosition,
  onDismissAlert,
  onClearCache,
  isResettingCache = false,
  paperBalance,
  totalPositionsPnl,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const filteredUniverse = searchQuery.trim()
    ? universe.filter(
        q =>
          q.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const handleSelectSymbol = (symbol: string) => {
    onSelectTicker(symbol);
    setSearchQuery('');
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
  };

  const navTabs = [
    { id: 'watchlist', label: 'Watchlist', badge: universe.length },
    { id: 'scanner', label: 'Scanner' },
    { id: 'signals', label: 'Entry Signals', badge: alerts.length > 0 ? alerts.length : undefined },
    { id: 'daily-log', label: 'Trading Journal / Daily Log', badge: 'Sheet', isSheet: true },
    { id: 'positions', label: 'Positions & Exits', badge: totalPositionsPnl.dollars !== 0 ? (totalPositionsPnl.dollars >= 0 ? `+${formatCurrency(totalPositionsPnl.dollars, 0)}` : formatCurrency(totalPositionsPnl.dollars, 0)) : undefined },
    { id: 'charts', label: 'Charts' },
    { id: 'news', label: 'News & Catalysts' },
    { id: 'backtest', label: 'Backtesting' },
    { id: 'xauusd', label: 'XAUUSD Daytrade', badge: '1m / 5m / 15m', isGold: true },
    { id: 'paper', label: 'Paper Trading' },
  ];

  // Major market indices preview
  const spyQuote = universe.find(u => u.symbol === 'SPY') || { price: 562.80, change: 4.20, changePercent: 0.75 };
  const qqqQuote = universe.find(u => u.symbol === 'QQQ') || { price: 486.20, change: 5.80, changePercent: 1.21 };
  const iwmQuote = universe.find(u => u.symbol === 'IWM') || { price: 221.50, change: -0.65, changePercent: -0.29 };

  const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/15Kwam-w1aNMTl1T3yN_Dnht2NFh3i0s-_cO3-4_Ivh4/edit?usp=drivesdk';

  return (
    <header className="border-b border-[#E6DDCF] bg-[#FDFBF7]/95 backdrop-blur-md shrink-0 z-40 sticky top-0 shadow-sm">
      {/* Top Banner: Market Status & Indices Bar */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 bg-[#F5EFEB] border-b border-[#E6DDCF] text-[11px] font-mono">
        <div className="flex items-center space-x-3 overflow-x-auto no-scrollbar">
          <div
            className={`flex items-center space-x-1.5 whitespace-nowrap ${isLiveDataConnected ? 'text-emerald-700' : 'text-[#996515]'}`}
            title={isLiveDataConnected ? 'Connected to a live Finnhub/Yahoo backend feed' : 'No backend connected — all prices, charts, and signals here are simulated, not real market data'}
          >
            <span className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(212,175,55,0.6)] animate-pulse ${isLiveDataConnected ? 'bg-emerald-600' : 'bg-[#D4AF37]'}`}></span>
            <span className="font-bold tracking-wider">{isLiveDataConnected ? 'FINNHUB LIVE 4H' : 'SIMULATED DATA'}</span>
          </div>

          <div className="h-3 w-px bg-[#E6DDCF] hidden sm:block"></div>

          {/* Indices */}
          <div className="flex items-center space-x-3 text-[#57534E] whitespace-nowrap">
            <div className="flex items-center space-x-1 cursor-pointer hover:text-[#996515] transition-colors" onClick={() => handleSelectSymbol('SPY')}>
              <span className="text-[#1C1917] font-bold">SPY</span>
              <span>{formatCurrency(spyQuote.price)}</span>
              <span className={spyQuote.change >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                {formatPercent(spyQuote.changePercent)}
              </span>
            </div>

            <div className="flex items-center space-x-1 cursor-pointer hover:text-[#996515] transition-colors" onClick={() => handleSelectSymbol('QQQ')}>
              <span className="text-[#1C1917] font-bold">QQQ</span>
              <span>{formatCurrency(qqqQuote.price)}</span>
              <span className={qqqQuote.change >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                {formatPercent(qqqQuote.changePercent)}
              </span>
            </div>

            <div className="hidden md:flex items-center space-x-1 cursor-pointer hover:text-[#996515] transition-colors" onClick={() => handleSelectSymbol('IWM')}>
              <span className="text-[#1C1917] font-bold">IWM</span>
              <span>{formatCurrency(iwmQuote.price)}</span>
              <span className={iwmQuote.change >= 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                {formatPercent(iwmQuote.changePercent)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pl-2">
          <div className="text-right whitespace-nowrap">
            {activeMode === 'PAPER_TRADING' ? (
              <>
                <span className="text-[#78716C] uppercase text-[9px] block sm:inline sm:mr-1">Paper</span>
                <span className="text-[#1C1917] font-bold text-xs sm:text-sm font-mono">{formatCurrency(paperBalance, 0)}</span>
              </>
            ) : (
              <>
                <span className="text-[#78716C] uppercase text-[9px] block sm:inline sm:mr-1">Live P&amp;L</span>
                <span className={`font-bold text-xs sm:text-sm font-mono ${totalPositionsPnl.dollars >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {totalPositionsPnl.dollars >= 0 ? '+' : ''}{formatCurrency(totalPositionsPnl.dollars, 0)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-3">
        {/* Brand & Mode Switcher */}
        <div className="flex items-center space-x-3 sm:space-x-5">
          {/* Hamburger Menu Toggle on Mobile */}
          <button
            id="mobile-menu-toggle-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 md:hidden text-[#44403C] hover:text-[#1C1917] bg-[#F5EFEB] hover:bg-[#EFE8DC] border border-[#E6DDCF] rounded-lg transition-colors"
            title="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-[#E5C158] via-[#D4AF37] to-[#C59B27] rounded-lg flex items-center justify-center text-[#1C1917] font-black text-xs shadow-md shadow-amber-900/15">
              T
            </div>
            <div>
              <span className="font-bold text-[#1C1917] tracking-tight flex items-center gap-1.5 text-sm sm:text-base">
                T-DASH
                <span className="text-[#845306] font-mono text-[10px] uppercase tracking-wider hidden sm:inline px-1.5 py-0.5 rounded bg-[#FDF4DC] border border-[#F3DA90] font-bold">
                  Gold &amp; Cream
                </span>
              </span>
            </div>
          </div>

          {/* Mode Switcher Pill */}
          <div className="bg-[#F5EFEB] p-0.5 rounded-lg border border-[#E6DDCF] flex items-center text-[10px] uppercase font-bold tracking-wider">
            <button
              id="mode-live-tracker"
              onClick={() => setActiveMode('LIVE_TRACKER')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                activeMode === 'LIVE_TRACKER'
                  ? 'bg-gradient-to-r from-[#E5C158] to-[#D4AF37] text-[#1C1917] shadow-sm font-black'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Live
            </button>
            <button
              id="mode-paper-trading"
              onClick={() => setActiveMode('PAPER_TRADING')}
              className={`px-2.5 py-1 rounded-md transition-all flex items-center gap-1 ${
                activeMode === 'PAPER_TRADING'
                  ? 'bg-gradient-to-r from-[#E5C158] to-[#D4AF37] text-[#1C1917] shadow-sm font-black'
                  : 'text-[#78716C] hover:text-[#1C1917]'
              }`}
            >
              Paper
            </button>
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="relative flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#78716C]" />
            <input
              type="text"
              placeholder="Search ticker (e.g. NVDA, TSLA, PLTR, ASTS)..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full bg-[#FFFFFF] border border-[#E6DDCF] rounded-lg pl-9 pr-4 py-1.5 text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
            />
          </div>

          {/* Search Dropdown */}
          {isSearchOpen && filteredUniverse.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-[#FFFFFF] border border-[#E6DDCF] rounded-lg shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
              <div className="p-2 border-b border-[#E6DDCF] text-[11px] font-semibold text-[#845306] uppercase tracking-wider bg-[#FDF4DC]">
                Matching Tickers ({filteredUniverse.length})
              </div>
              {filteredUniverse.map(quote => (
                <div
                  key={quote.symbol}
                  onClick={() => handleSelectSymbol(quote.symbol)}
                  className="px-3 py-2 hover:bg-[#FAF7F2] cursor-pointer flex items-center justify-between text-sm transition-colors border-b border-[#EFE8DC]/60"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-bold text-[#1C1917] font-mono">{quote.symbol}</span>
                    <span className="text-[#78716C] text-xs truncate max-w-[160px]">{quote.name}</span>
                    {quote.catalyst && (
                      <span className="text-[10px] bg-[#FDF4DC] text-[#845306] px-1.5 py-0.5 rounded border border-[#F3DA90]">
                        {quote.catalyst.type}
                      </span>
                    )}
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-[#1C1917] font-semibold">{formatCurrency(quote.price)}</div>
                    <div className={`text-xs ${quote.change >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}`}>
                      {formatPercent(quote.changePercent)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className="p-2 md:hidden bg-[#F5EFEB] hover:bg-[#EFE8DC] border border-[#E6DDCF] text-[#1C1917] rounded-lg transition-colors"
            title="Search Tickers"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Direct Sheets Link Button (Requested by User) */}
          <a
            href={GOOGLE_SHEET_URL}
            target="_blank"
            rel="noopener noreferrer"
            id="header-open-sheets-btn"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#D4AF37] to-[#C59B27] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#1C1917] shadow-sm border border-[#C59B27] transition-all hover:scale-[1.02]"
            title="Open Trading Journal directly in Google Sheets"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#1C1917]" />
            <span>Google Sheets</span>
          </a>

          {/* Quick Daily Log Button */}
          <button
            id="quick-daily-log-btn"
            onClick={() => setActiveTab('daily-log')}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors ${
              activeTab === 'daily-log'
                ? 'bg-[#1C1917] text-[#D4AF37]'
                : 'bg-[#F5EFEB] hover:bg-[#EFE8DC] text-[#7E5E14] border border-[#E6DDCF]'
            }`}
            title="Open Trading Journal / Daily Log"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#B8860B]" />
            <span>Daily Log</span>
          </button>

          {/* Quick Log Position */}
          <button
            id="quick-log-position-btn"
            onClick={onOpenNewPosition}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-[#D4AF37] to-[#C59B27] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#1C1917] text-xs font-bold rounded-lg shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-[#1C1917]" />
            Log Position
          </button>

          {/* Alerts Bell */}
          <div className="relative">
            <button
              id="alerts-bell-btn"
              onClick={() => setIsAlertsOpen(!isAlertsOpen)}
              className="p-2 bg-[#F5EFEB] hover:bg-[#EFE8DC] border border-[#E6DDCF] text-[#1C1917] rounded-lg relative transition-colors"
              title="Signal Alerts"
            >
              <Bell className="w-4 h-4 text-[#57534E]" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-[10px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse font-mono shadow-sm">
                  {unreadAlertsCount}
                </span>
              )}
            </button>

            {/* Alert Drawer Popup */}
            {isAlertsOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 sm:w-96 bg-[#FFFFFF] border border-[#E6DDCF] rounded-xl shadow-2xl z-50 overflow-hidden">
                <div className="p-3 bg-[#F5EFEB] border-b border-[#E6DDCF] flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-[#B8860B]" />
                    <span className="font-bold text-sm text-[#1C1917]">Active Entry Signals</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsAlertsOpen(false);
                      setActiveTab('signals');
                    }}
                    className="text-xs text-[#996515] font-semibold hover:underline flex items-center"
                  >
                    View All <ChevronRight className="w-3 h-3 ml-0.5" />
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#EFE8DC] p-1">
                  {alerts.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#78716C]">
                      No active signals fired yet in this session.
                    </div>
                  ) : (
                    Array.from<SignalAlert>(new Map<string, SignalAlert>(alerts.map(a => [a.id, a])).values()).slice(0, 5).map(alert => (
                      <div key={alert.id} className="p-2.5 hover:bg-[#FAF7F2] rounded-lg transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold font-mono text-[#845306] cursor-pointer hover:underline" onClick={() => {
                            onSelectTicker(alert.ticker);
                            setIsAlertsOpen(false);
                            setActiveTab('charts');
                          }}>
                            {alert.ticker}
                          </span>
                          <span className="text-[10px] text-[#78716C] font-mono">
                            {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="text-xs font-semibold text-[#1C1917] mb-1">{alert.ruleName}</div>
                        <p className="text-[11px] text-[#57534E] leading-snug">{alert.reason}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Clear Cache / Reset Data Button */}
          {onClearCache && (
            <button
              id="header-clear-cache-btn"
              onClick={onClearCache}
              disabled={isResettingCache}
              className="p-2 bg-[#F5EFEB] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-[#78716C] border border-[#E6DDCF] rounded-lg transition-colors flex items-center gap-1.5 text-xs font-mono disabled:opacity-50"
              title="Clear Cache & Refetch Finnhub 4H Data"
            >
              <RefreshCw className={`w-4 h-4 ${isResettingCache ? 'animate-spin text-rose-500' : ''}`} />
              <span className="hidden xl:inline text-[11px] font-sans font-medium text-[#57534E]">Clear Cache</span>
            </button>
          )}

          {/* Settings Button */}
          <button
            id="settings-btn"
            onClick={onOpenSettings}
            className="p-2 bg-[#F5EFEB] hover:bg-[#EFE8DC] border border-[#E6DDCF] text-[#78716C] hover:text-[#1C1917] rounded-lg transition-colors"
            title="Settings & Data Provider"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Search Overlay Input if active on small screen */}
      {isSearchOpen && (
        <div className="px-3 pb-3 md:hidden">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#78716C]" />
            <input
              type="text"
              autoFocus
              placeholder="Search ticker (e.g. NVDA, PLTR)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#FFFFFF] border border-[#E6DDCF] rounded-lg pl-9 pr-4 py-2 text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#D4AF37]"
            />
          </div>
          {filteredUniverse.length > 0 && (
            <div className="mt-1 bg-[#FFFFFF] border border-[#E6DDCF] rounded-lg shadow-xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-[#EFE8DC]">
              {filteredUniverse.slice(0, 6).map(quote => (
                <div
                  key={`mob-search-${quote.symbol}`}
                  onClick={() => handleSelectSymbol(quote.symbol)}
                  className="px-3 py-2.5 hover:bg-[#FAF7F2] flex items-center justify-between text-sm cursor-pointer"
                >
                  <div>
                    <span className="font-bold text-[#1C1917] font-mono">{quote.symbol}</span>
                    <span className="text-[#78716C] text-xs ml-2">{quote.name}</span>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="text-[#1C1917] font-semibold">{formatCurrency(quote.price)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mobile Collapsible Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-[#FFFDF7] border-b border-[#E6DDCF] px-4 py-3 space-y-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="text-xs font-semibold text-[#845306] uppercase tracking-wider pb-1 border-b border-[#E6DDCF]">
            Navigation Menu
          </div>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            {navTabs.map(tab => (
              <button
                key={`mobile-nav-${tab.id}`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`px-3 py-2 rounded-lg text-left text-xs font-medium flex items-center justify-between transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#D4AF37] to-[#C59B27] text-[#1C1917] font-bold shadow-xs'
                    : 'text-[#57534E] hover:bg-[#F5EFEB] hover:text-[#1C1917]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {tab.isGold && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
                  {tab.label}
                </span>
                {tab.badge !== undefined && (
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold shadow-2xs ${
                    activeTab === tab.id 
                      ? 'bg-stone-900 text-white' 
                      : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="pt-2 border-t border-[#E6DDCF] flex items-center justify-between gap-2">
            <button
              onClick={() => {
                onOpenNewPosition();
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-1.5 bg-gradient-to-r from-[#D4AF37] to-[#C59B27] text-[#1C1917] rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Trade
            </button>
            {onClearCache && (
              <button
                onClick={() => {
                  onClearCache();
                  setIsMobileMenuOpen(false);
                }}
                disabled={isResettingCache}
                className="px-2.5 py-1.5 bg-[#F5EFEB] hover:bg-rose-50 text-rose-700 border border-[#E6DDCF] rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isResettingCache ? 'animate-spin' : ''}`} />
                Reset Data
              </button>
            )}
            <button
              onClick={() => {
                onOpenSettings();
                setIsMobileMenuOpen(false);
              }}
              className="px-3 py-1.5 bg-[#F5EFEB] border border-[#E6DDCF] text-[#57534E] rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              Settings
            </button>
          </div>
        </div>
      )}

      {/* Mobile Horizontal Quick-Nav Bar (Visible on mobile < md) */}
      <nav className="md:hidden flex items-center space-x-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar border-t border-[#E6DDCF] bg-[#FAF7F2]">
        {navTabs.map(tab => (
          <button
            key={`mob-strip-${tab.id}`}
            id={`mob-nav-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 min-h-[42px] rounded-lg text-xs whitespace-nowrap transition-all flex items-center gap-1.5 font-bold shrink-0 touch-manipulation ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#C59B27] text-[#1C1917] shadow-sm'
                : 'bg-[#F5EFEB] text-[#78716C] border border-[#E6DDCF] hover:text-[#1C1917]'
            }`}
          >
            {tab.isGold && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
            {tab.label}
            {tab.badge !== undefined && (
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold shadow-2xs ${
                activeTab === tab.id 
                  ? 'bg-stone-900 text-white' 
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Desktop Horizontal Navigation Tabs (Hidden on mobile < md) */}
      <nav className="hidden md:flex items-center space-x-6 px-6 overflow-x-auto text-[10px] uppercase font-bold tracking-widest no-scrollbar pt-2">
        {navTabs.map(tab => (
          <button
            key={tab.id}
            id={`nav-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 whitespace-nowrap transition-colors flex items-center gap-1.5 border-b-2 ${
              activeTab === tab.id
                ? (tab.isGold ? 'text-amber-800 border-amber-600 font-black' : 'text-[#1C1917] border-[#D4AF37] font-black')
                : (tab.isGold ? 'text-amber-700/80 border-transparent hover:text-amber-900 hover:border-amber-500/50' : 'text-[#78716C] border-transparent hover:text-[#1C1917] hover:border-[#D4AF37]/50')
            }`}
          >
            {tab.isGold && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
            {tab.label}
            {tab.badge !== undefined && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold shadow-2xs ${
                tab.isGold
                  ? (activeTab === tab.id ? 'bg-amber-600 text-white font-black' : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white')
                  : typeof tab.badge === 'string' && tab.badge.startsWith('+') 
                  ? 'bg-emerald-600 text-white' 
                  : typeof tab.badge === 'string' && tab.badge.startsWith('-')
                  ? 'bg-rose-600 text-white'
                  : activeTab === tab.id
                  ? 'bg-[#B8860B] text-white font-bold'
                  : 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </nav>
    </header>
  );
};
