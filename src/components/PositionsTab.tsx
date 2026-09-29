import React, { useState } from 'react';
import { 
  Activity, 
  AlertCircle, 
  AlertOctagon, 
  AlertTriangle, 
  ArrowDownRight, 
  ArrowUpRight, 
  CandlestickChart, 
  CheckCircle2, 
  Clock, 
  Cloud, 
  Code, 
  DollarSign, 
  Edit3, 
  Eye, 
  Flame, 
  History, 
  Info, 
  Percent, 
  RotateCcw, 
  Plus, 
  RefreshCw, 
  ShieldAlert, 
  ShieldCheck, 
  Sliders, 
  Target, 
  Trash2, 
  TrendingDown, 
  TrendingUp, 
  Wallet, 
  X, 
  Zap,
  Sparkles,
  Newspaper
} from 'lucide-react';
import { ExitFlag, ExitStrategyConfig, Position, TickerQuote } from '../types/trading';
import { formatCompactNumber, formatCurrency, formatDate, formatPercent } from '../utils/formatters';
import { ExitStrategyDashboard } from './ExitStrategyDashboard';

interface PositionsTabProps {
  positions: Position[];
  closedHistory: Position[];
  onClosePosition: (id: string, exitPrice: number, notes?: string) => void;
  onResetRealizedPnl?: () => void;
  onOpenNewPositionModal: () => void;
  onSelectTicker: (symbol: string) => void;
  onNavigateToTab: (tab: string) => void;
  quotesMap: Map<string, TickerQuote>;
  universe: TickerQuote[];
  exitStrategyConfig: ExitStrategyConfig;
  onUpdateExitStrategyConfig: (newConfig: ExitStrategyConfig) => void;
  onRefreshPrices?: () => Promise<void>;
  onUpdatePosition?: (updatedPos: Position) => void;
}

export const PositionsTab: React.FC<PositionsTabProps> = ({
  positions,
  closedHistory,
  onClosePosition,
  onResetRealizedPnl,
  onOpenNewPositionModal,
  onSelectTicker,
  onNavigateToTab,
  quotesMap,
  universe,
  exitStrategyConfig,
  onUpdateExitStrategyConfig,
  onRefreshPrices,
  onUpdatePosition,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'open' | 'exit_rules' | 'alerts' | 'history'>('open');
  const [closingPosition, setClosingPosition] = useState<Position | null>(null);
  const [exitPriceInput, setExitPriceInput] = useState<number>(0);
  const [exitNotesInput, setExitNotesInput] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Edit Position Modal State
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [editEntryPrice, setEditEntryPrice] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(0);
  const [editStopLossPrice, setEditStopLossPrice] = useState<number>(0);
  const [editTakeProfitPrice, setEditTakeProfitPrice] = useState<number>(0);
  const [editNotes, setEditNotes] = useState<string>('');
  const [isFetchingEditQuote, setIsFetchingEditQuote] = useState(false);

  // Portfolio calculations
  const totalCostBasis = positions.reduce((sum, p) => sum + p.entryPrice * p.quantity, 0);
  const totalMarketValue = positions.reduce((sum, p) => sum + p.currentPrice * p.quantity, 0);
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.unrealizedPnlDollars, 0);
  const totalUnrealizedPnlPct = totalCostBasis > 0 ? (totalUnrealizedPnl / totalCostBasis) * 100 : 0;
  const totalRealizedPnl = closedHistory.reduce((sum, p) => sum + (p.realizedPnlDollars || 0), 0);

  // All triggered exit flags across all positions
  const allExitAlerts = positions.flatMap(p => p.exitFlags.map(f => ({ ...f, position: p })));
  const activeWarningsCount = allExitAlerts.length;

  const handleManualRefresh = async () => {
    if (!onRefreshPrices) return;
    setIsRefreshing(true);
    try {
      await onRefreshPrices();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleStartEdit = (pos: Position) => {
    setEditingPosition(pos);
    setEditEntryPrice(pos.entryPrice);
    setEditQuantity(pos.quantity);
    setEditStopLossPrice(pos.kumoStopPrice || pos.stopLossPrice);
    setEditTakeProfitPrice(pos.takeProfitPrice);
    setEditNotes(pos.notes || '');
  };

  const handleFetchEditLiveQuote = async () => {
    if (!editingPosition) return;
    setIsFetchingEditQuote(true);
    try {
      const res = await fetch(`/api/market/quote/${editingPosition.ticker}`);
      if (res.ok) {
        const q = await res.json();
        if (q && q.price > 0) {
          setEditEntryPrice(q.price);
          const isLong = editingPosition.type === 'LONG';
          const tpPct = editingPosition.takeProfitPct || 10;
          setEditTakeProfitPrice(Number((isLong ? q.price * (1 + tpPct / 100) : q.price * (1 - tpPct / 100)).toFixed(2)));
        }
      }
    } catch (err) {
      console.warn('Fetch edit quote error:', err);
    } finally {
      setIsFetchingEditQuote(false);
    }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPosition || !onUpdatePosition) return;
    const isLong = editingPosition.type === 'LONG';
    const pnlDollars = isLong
      ? (editingPosition.currentPrice - editEntryPrice) * editQuantity
      : (editEntryPrice - editingPosition.currentPrice) * editQuantity;
    const pnlPct = editEntryPrice > 0
      ? (isLong ? (editingPosition.currentPrice - editEntryPrice) / editEntryPrice : (editEntryPrice - editingPosition.currentPrice) / editEntryPrice) * 100
      : 0;

    const updated: Position = {
      ...editingPosition,
      entryPrice: editEntryPrice,
      quantity: editQuantity,
      stopLossPrice: editStopLossPrice,
      kumoStopPrice: editStopLossPrice,
      takeProfitPrice: editTakeProfitPrice,
      notes: editNotes,
      unrealizedPnlDollars: pnlDollars,
      unrealizedPnlPercent: pnlPct,
    };
    onUpdatePosition(updated);
    setEditingPosition(null);
  };

  const handleStartClose = (pos: Position, suggestedReason?: string) => {
    setClosingPosition(pos);
    setExitPriceInput(pos.currentPrice);
    setExitNotesInput(suggestedReason || 'Closed via Exit Dashboard');
  };

  const handleConfirmClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closingPosition) return;
    onClosePosition(closingPosition.id, exitPriceInput, exitNotesInput);
    setClosingPosition(null);
  };

  return (
    <div className="space-y-4">
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Total Market Value */}
        <div className="bg-white p-4 rounded-xl border border-[#E6DDCF] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-1">
            <span className="font-semibold uppercase tracking-wider">Market Value</span>
            <Wallet className="w-4 h-4 text-[#996515]" />
          </div>
          <div className="text-xl font-bold font-mono text-[#1C1917]">
            {formatCurrency(totalMarketValue)}
          </div>
          <div className="text-xs text-[#78716C] mt-1 font-mono">
            Basis: {formatCurrency(totalCostBasis)}
          </div>
        </div>

        {/* Metric 2: Unrealized P&L */}
        <div className="bg-white p-4 rounded-xl border border-[#E6DDCF] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-1">
            <span className="font-semibold uppercase tracking-wider">Unrealized P&L</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className={`text-xl font-bold font-mono ${totalUnrealizedPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {totalUnrealizedPnl >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedPnl)}
          </div>
          <div className={`text-xs mt-1 font-mono font-semibold ${totalUnrealizedPnlPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatPercent(totalUnrealizedPnlPct)} total return
          </div>
        </div>

        {/* Metric 3: Realized P&L */}
        <div className="bg-white p-4 rounded-xl border border-[#E6DDCF] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-1">
            <span className="font-semibold uppercase tracking-wider">Realized P&L</span>
            <div className="flex items-center gap-1.5">
              {onResetRealizedPnl && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset your realized P&L log? This clears your closed-trade history and win/loss record. Open positions and balance are not affected. This cannot be undone.')) {
                      onResetRealizedPnl();
                    }
                  }}
                  title="Reset realized P&L log (clears closed trade history, keeps open positions & balance)"
                  className="text-[#78716C] hover:text-rose-600 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
              <History className="w-4 h-4 text-[#845306]" />
            </div>
          </div>
          <div className={`text-xl font-bold font-mono ${totalRealizedPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {totalRealizedPnl >= 0 ? '+' : ''}{formatCurrency(totalRealizedPnl)}
          </div>
          <div className="text-xs text-[#78716C] mt-1 font-mono">
            {closedHistory.length} closed trades
          </div>
        </div>

        {/* Metric 4: Active Exit Warnings */}
        <div className="bg-white p-4 rounded-xl border border-[#E6DDCF] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#78716C] mb-1">
            <span className="font-semibold uppercase tracking-wider">Risk / Exit Warnings</span>
            <ShieldAlert className={`w-4 h-4 ${activeWarningsCount > 0 ? 'text-rose-600' : 'text-[#78716C]'}`} />
          </div>
          <div className={`text-xl font-bold font-mono ${activeWarningsCount > 0 ? 'text-rose-700' : 'text-[#1C1917]'}`}>
            {activeWarningsCount} Active
          </div>
          <div className="text-xs text-[#78716C] mt-1 font-mono">
            {positions.length} open position{positions.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Action Header & Sub-tab navigation */}
      <div className="bg-white p-3 rounded-xl border border-[#E6DDCF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="bg-[#F5EFEB] p-1 rounded-lg border border-[#E6DDCF] flex items-center text-xs overflow-x-auto">
          <button
            id="view-open-positions-btn"
            onClick={() => setActiveSubTab('open')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'open'
                ? 'gold-gradient-btn text-[#1C1917] font-bold shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-white/60'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Open Positions ({positions.length})
          </button>

          <button
            id="view-exit-strategy-btn"
            onClick={() => setActiveSubTab('exit_rules')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'exit_rules'
                ? 'gold-gradient-btn text-[#1C1917] font-bold shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-white/60'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            Exit Rules & Risk Strategy
          </button>

          <button
            id="view-exit-alerts-btn"
            onClick={() => setActiveSubTab('alerts')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'alerts'
                ? 'bg-rose-600 text-white font-bold shadow-xs'
                : activeWarningsCount > 0
                  ? 'text-rose-700 font-bold bg-rose-50 border border-rose-200'
                  : 'text-[#57534E] hover:text-[#1C1917] hover:bg-white/60'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5" />
            Exit Signals & Alerts ({activeWarningsCount})
          </button>

          <button
            id="view-trade-history-btn"
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'history'
                ? 'gold-gradient-btn text-[#1C1917] font-bold shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917] hover:bg-white/60'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Trade Journal ({closedHistory.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onRefreshPrices && (
            <button
              id="refresh-positions-btn"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3 py-1.5 bg-[#F5EFEB] hover:bg-[#EFE8DC] border border-[#E6DDCF] text-[#57534E] hover:text-[#1C1917] font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs shrink-0 cursor-pointer"
              title="Sync latest market prices for all open positions"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#845306] ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing Live...' : 'Sync Market Prices'}</span>
            </button>
          )}

          <button
            id="log-new-trade-btn"
            onClick={onOpenNewPositionModal}
            className="px-3.5 py-1.5 gold-gradient-btn text-[#1C1917] font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Log New Position
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-VIEW 1: Open Positions Table with Dynamic Kumo & Momentum Status */}
      {/* ========================================================================= */}
      {activeSubTab === 'open' && (
        <div className="bg-white rounded-xl border border-[#E6DDCF] overflow-hidden shadow-sm">
          {/* Desktop Table View (Hidden on mobile < md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm font-mono">
              <thead className="bg-[#FAF7F2] border-b border-[#E6DDCF] text-xs text-[#78716C] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Position</th>
                  <th className="py-3 px-3 text-right">Entry / Qty</th>
                  <th className="py-3 px-3 text-right">Current Price</th>
                  <th className="py-3 px-3 text-right">Unrealized P&L</th>
                  <th className="py-3 px-3">Dynamic Kumo Stop</th>
                  <th className="py-3 px-3">Distance to Floor</th>
                  <th className="py-3 px-3">Exit Status & Warnings</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8DC]">
                {positions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-[#78716C] text-xs font-sans">
                      <Wallet className="w-8 h-8 text-[#A8A29E] mx-auto mb-2" />
                      No open positions logged. Click "Log New Position" above to track your trades with rule-based exits.
                    </td>
                  </tr>
                ) : (
                  positions.map(pos => {
                    const isPositive = pos.unrealizedPnlDollars >= 0;
                    const kumoStop = pos.kumoStopPrice ?? pos.stopLossPrice;
                    const distanceToKumo = pos.distanceToKumoPct ?? ((pos.currentPrice - kumoStop) / pos.currentPrice * 100);
                    const isNearKumo = pos.isNearKumoStop || distanceToKumo <= (exitStrategyConfig.dynamicKumoStop?.nearKumoWarningPct || 1.0);

                    return (
                      <tr 
                        key={pos.id} 
                        className={`hover:bg-[#FAF7F2] transition-colors ${
                          pos.exitFlags.length > 0 || isNearKumo ? 'bg-rose-50/50' : 'bg-white'
                        }`}
                      >
                        {/* Position Ticker & Type */}
                        <td className="py-3.5 px-4 font-sans">
                          <div className="flex items-center space-x-2">
                            <div>
                              <div className="font-bold text-[#1C1917] text-base font-mono flex items-center gap-1.5">
                                <button
                                  onClick={() => {
                                    onSelectTicker(pos.ticker);
                                    onNavigateToTab('charts');
                                  }}
                                  className="hover:text-[#845306] transition-colors cursor-pointer"
                                >
                                  {pos.ticker}
                                </button>
                                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#FDF4DC] text-[#845306] border border-[#F3DA90]">
                                  {pos.type}
                                </span>
                              </div>
                              <div className="text-[11px] text-[#78716C]">
                                {formatDate(pos.entryDate)}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Entry Price & Qty */}
                        <td className="py-3.5 px-3 text-right font-mono">
                          <div className="font-bold text-[#1C1917]">
                            {formatCurrency(pos.entryPrice)}
                          </div>
                          <div className="text-xs text-[#78716C]">
                            {pos.quantity} shares ({formatCurrency(pos.entryPrice * pos.quantity, 0)})
                          </div>
                        </td>

                        {/* Current Price */}
                        <td className="py-3.5 px-3 text-right font-mono">
                          <div className="font-bold text-[#1C1917] text-sm">
                            {formatCurrency(pos.currentPrice)}
                          </div>
                          {pos.trailingPeakPrice && (
                            <div className="text-[10px] text-[#78716C]">
                              Peak: {formatCurrency(pos.trailingPeakPrice)}
                            </div>
                          )}
                        </td>

                        {/* Unrealized P&L */}
                        <td className="py-3.5 px-3 text-right font-mono">
                          <div className={`font-bold text-sm ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {isPositive ? '+' : ''}{formatCurrency(pos.unrealizedPnlDollars)}
                          </div>
                          <div className={`text-xs font-semibold ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {formatPercent(pos.unrealizedPnlPercent)}
                          </div>
                        </td>

                        {/* Dynamic Kumo Stop Floor */}
                        <td className="py-3.5 px-3 font-mono text-xs">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 text-[#1C1917] font-bold">
                              <Cloud className="w-3.5 h-3.5 text-rose-600" />
                              <span>{formatCurrency(kumoStop)}</span>
                            </div>
                            <div className="text-[10px] text-[#78716C]">
                              Target: {formatCurrency(pos.takeProfitPrice)}
                            </div>
                          </div>
                        </td>

                        {/* Distance to Kumo Floor */}
                        <td className="py-3.5 px-3 font-mono text-xs">
                          <span className={`px-2 py-0.5 rounded font-bold ${
                            isNearKumo
                              ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                              : 'bg-[#FDF4DC] text-[#845306] border border-[#F3DA90]'
                          }`}>
                            {distanceToKumo > 0 ? `+${distanceToKumo.toFixed(1)}%` : `${distanceToKumo.toFixed(1)}%`}
                          </span>
                        </td>

                        {/* Exit Status & Warnings */}
                        <td className="py-3.5 px-3 text-xs font-sans">
                          {pos.exitFlags.length === 0 && !isNearKumo ? (
                            <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 text-[11px] font-medium">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Safe (Uptrend)
                            </span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {isNearKumo && (
                                <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px] font-bold">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" /> Near Kumo Floor
                                </span>
                              )}
                              {pos.exitFlags.map(flag => (
                                <span
                                  key={flag.id}
                                  className="inline-flex items-center gap-1 text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px] font-bold"
                                >
                                  <AlertOctagon className="w-3 h-3 text-rose-600" /> {flag.title || (flag as any).label || flag.message}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => {
                                onSelectTicker(pos.ticker);
                                onNavigateToTab('charts');
                              }}
                              className="p-1.5 bg-[#FDFBF7] hover:bg-[#F5EFEB] text-[#1C1917] rounded-lg border border-[#E6DDCF] transition-colors cursor-pointer"
                              title="View Chart"
                            >
                              <CandlestickChart className="w-3.5 h-3.5 text-[#D4AF37]" />
                            </button>

                            <button
                              onClick={() => handleStartEdit(pos)}
                              className="p-1.5 bg-[#FDFBF7] hover:bg-[#F5EFEB] text-[#57534E] hover:text-[#1C1917] rounded-lg border border-[#E6DDCF] transition-colors cursor-pointer"
                              title="Edit Position"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => handleStartClose(pos)}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                            >
                              Close
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Responsive Card View (Visible only on mobile < md) */}
          <div className="block md:hidden divide-y divide-[#EFE8DC] bg-white">
            {positions.length === 0 ? (
              <div className="py-8 px-4 text-center text-[#78716C] text-xs font-sans">
                <Wallet className="w-8 h-8 text-[#A8A29E] mx-auto mb-2" />
                No open positions logged.
              </div>
            ) : (
              positions.map(pos => {
                const isPositive = pos.unrealizedPnlDollars >= 0;
                const kumoStop = pos.kumoStopPrice ?? pos.stopLossPrice;
                const distanceToKumo = pos.distanceToKumoPct ?? ((pos.currentPrice - kumoStop) / pos.currentPrice * 100);
                const isNearKumo = pos.isNearKumoStop || distanceToKumo <= (exitStrategyConfig.dynamicKumoStop?.nearKumoWarningPct || 1.0);

                return (
                  <div key={`mob-pos-${pos.id}`} className="p-3.5 space-y-3">
                    {/* Top Row: Ticker, Type, Date & Action icons */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-base font-bold text-[#1C1917]">
                            {pos.ticker}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#FDF4DC] text-[#845306] border border-[#F3DA90]">
                            {pos.type}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#78716C] font-sans">
                          {formatDate(pos.entryDate)} • {pos.quantity} shares
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onSelectTicker(pos.ticker);
                            onNavigateToTab('charts');
                          }}
                          className="p-1.5 text-[#57534E] hover:text-[#1C1917] bg-[#F5EFEB] border border-[#E6DDCF] rounded-lg"
                          title="View Chart"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStartEdit(pos)}
                          className="p-1.5 text-[#57534E] hover:text-[#1C1917] bg-[#F5EFEB] border border-[#E6DDCF] rounded-lg"
                          title="Edit Position"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStartClose(pos)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold"
                        >
                          Close
                        </button>
                      </div>
                    </div>

                    {/* Price & PnL Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-[#FDFBF7] p-2.5 rounded-lg border border-[#E6DDCF] font-mono">
                      <div>
                        <div className="text-[10px] text-[#78716C] uppercase font-bold">Current / Entry</div>
                        <div className="text-sm font-bold text-[#1C1917]">{formatCurrency(pos.currentPrice)}</div>
                        <div className="text-[11px] text-[#78716C]">Entry: {formatCurrency(pos.entryPrice)}</div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-[#78716C] uppercase font-bold">Unrealized P&L</div>
                        <div className={`text-sm font-bold ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isPositive ? '+' : ''}{formatCurrency(pos.unrealizedPnlDollars)}
                        </div>
                        <div className={`text-xs font-semibold ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatPercent(pos.unrealizedPnlPercent)}
                        </div>
                      </div>
                    </div>

                    {/* Dynamic Kumo Stop Floor & Distance */}
                    <div className="bg-[#FAF7F2] p-2.5 rounded-lg border border-[#E6DDCF] flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-rose-600 shrink-0" />
                        <div>
                          <div className="text-[10px] text-[#78716C]">Kumo Stop Floor</div>
                          <div className="font-bold text-[#1C1917]">{formatCurrency(kumoStop)}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-[#78716C]">Distance to Floor</div>
                        <div className={`font-bold ${isNearKumo ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {distanceToKumo > 0 ? `+${distanceToKumo.toFixed(1)}%` : `${distanceToKumo.toFixed(1)}%`}
                        </div>
                      </div>
                    </div>

                    {/* Exit Warnings */}
                    {(pos.exitFlags.length > 0 || isNearKumo) && (
                      <div className="space-y-1">
                        {isNearKumo && (
                          <div className="px-2 py-1 rounded text-[11px] font-mono border flex items-center gap-1.5 bg-amber-50 border-amber-200 text-amber-800">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Warning: Price is &le; 1% to Kumo Stop floor!</span>
                          </div>
                        )}
                        {pos.exitFlags.map(flag => {
                          const isShield = flag.type === 'NEWS_REVERSAL_SHIELD';
                          return (
                            <div
                              key={flag.id}
                              className={`px-2 py-1 rounded text-[11px] font-mono border flex items-center gap-1.5 ${
                                isShield
                                  ? 'bg-amber-50 border-amber-200 text-[#845306]'
                                  : 'bg-rose-50 border-rose-200 text-rose-700'
                              }`}
                            >
                              {isShield ? (
                                <Sparkles className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              )}
                              <span>{flag.title || (flag as any).label || flag.message}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 2: Exit Rules & Risk Strategy Dashboard */}
      {/* ========================================================================= */}
      {activeSubTab === 'exit_rules' && (
        <ExitStrategyDashboard
          config={exitStrategyConfig}
          onUpdateConfig={onUpdateExitStrategyConfig}
          positions={positions}
          universe={universe}
          onSelectTicker={onSelectTicker}
          onNavigateToTab={onNavigateToTab}
          onQuickSellPosition={pos => handleStartClose(pos, 'Triggered via Quick Sell')}
        />
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 3: Exit Signals & Active Alerts Feed */}
      {/* ========================================================================= */}
      {activeSubTab === 'alerts' && (
        <div className="space-y-3">
          {allExitAlerts.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-[#E6DDCF] text-center space-y-2 shadow-sm">
              <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-semibold text-[#1C1917]">All Positions Currently Safe</h4>
              <p className="text-xs text-[#78716C] max-w-md mx-auto">
                No active positions have violated the Dynamic Kumo Cloud Bottom stop floor or triggered Momentum Loss exits (CCI &lt; 50 or Stoch &lt; 50).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allExitAlerts.map(alert => {
                const isCrit = alert.type === 'CRITICAL';
                return (
                  <div
                    key={`${alert.position.id}-${alert.id}`}
                    className="bg-white border border-rose-300 rounded-xl p-4 space-y-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-bold text-[#1C1917] font-mono">{alert.position.ticker}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200 font-mono">
                          {alert.label}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-[#78716C]">
                        {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="bg-[#FDFBF7] p-2.5 rounded-lg border border-[#E6DDCF] text-xs text-[#1C1917] font-mono leading-relaxed">
                      <p className="text-rose-700 font-semibold">{alert.message}</p>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-[#78716C] pt-2 border-t border-[#EFE8DC]">
                      <div>
                        Entry: <strong className="text-[#1C1917]">{formatCurrency(alert.position.entryPrice)}</strong>
                      </div>
                      <div>
                        P&L: <strong className={alert.position.unrealizedPnlDollars >= 0 ? 'text-emerald-700' : 'text-rose-700'}>
                          {formatCurrency(alert.position.unrealizedPnlDollars)} ({formatPercent(alert.position.unrealizedPnlPercent)})
                        </strong>
                      </div>
                    </div>

                    <button
                      onClick={() => handleStartClose(alert.position, alert.message)}
                      className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Execute Exit Order ({alert.orderAction || 'MARKET SELL'})
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-VIEW 4: Closed Trades History */}
      {/* ========================================================================= */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-xl border border-[#E6DDCF] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-mono">
              <thead className="bg-[#FAF7F2] border-b border-[#E6DDCF] text-xs text-[#78716C] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Ticker</th>
                  <th className="py-3 px-3">Entry Date / Price</th>
                  <th className="py-3 px-3">Exit Date / Price</th>
                  <th className="py-3 px-3 text-right">Shares</th>
                  <th className="py-3 px-3 text-right">Realized P&L ($)</th>
                  <th className="py-3 px-3 text-right">Return (%)</th>
                  <th className="py-3 px-4">Exit Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFE8DC]">
                {closedHistory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-[#78716C] text-xs font-sans">
                      No closed trades logged yet. When you close open positions, they will be archived here in your trade journal.
                    </td>
                  </tr>
                ) : (
                  closedHistory.map(pos => {
                    const pnl = pos.realizedPnlDollars || 0;
                    const pnlPct = pos.realizedPnlPercent || 0;
                    const isWin = pnl >= 0;

                    return (
                      <tr key={pos.id} className="hover:bg-[#FAF7F2] transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-bold text-[#1C1917] text-base">{pos.ticker}</span>
                          <span className={`ml-2 text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                            pos.ticker.toUpperCase() === 'XAUUSD'
                              ? 'bg-[#FDF4DC] text-[#845306] border-[#F3DA90]'
                              : 'bg-[#F5EFEB] text-[#78716C] border-[#E6DDCF]'
                          }`}>
                            {pos.ticker.toUpperCase() === 'XAUUSD' ? '5M/30M' : '1HR/1D'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#57534E] text-xs">
                          {formatDate(pos.entryDate)} @ {formatCurrency(pos.entryPrice)}
                        </td>
                        <td className="py-3 px-3 text-[#57534E] text-xs">
                          {pos.closeDate ? formatDate(pos.closeDate) : 'Recently'} @ {formatCurrency(pos.closePrice || pos.entryPrice)}
                        </td>
                        <td className="py-3 px-3 text-right text-[#1C1917]">
                          {pos.quantity}
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${isWin ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isWin ? '+' : ''}{formatCurrency(pnl)}
                        </td>
                        <td className={`py-3 px-3 text-right font-bold ${isWin ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatPercent(pnlPct)}
                        </td>
                        <td className="py-3 px-4 font-sans text-xs text-[#78716C]">
                          {pos.notes || 'Target / Stop achieved'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Close Position Modal Dialog */}
      {closingPosition && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF7] border border-[#E6DDCF] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6DDCF] pb-3">
              <h3 className="text-base font-bold text-[#1C1917] flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
                Close Position: {closingPosition.ticker}
              </h3>
              <button onClick={() => setClosingPosition(null)} className="text-[#78716C] hover:text-[#1C1917] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmClose} className="space-y-3 text-xs">
              <div className="bg-[#FDFBF7] p-3 rounded-xl border border-[#E6DDCF] space-y-1 font-mono">
                <div className="flex justify-between text-[#78716C]">
                  <span>Entry Price:</span>
                  <span className="text-[#1C1917] font-bold">{formatCurrency(closingPosition.entryPrice)}</span>
                </div>
                <div className="flex justify-between text-[#78716C]">
                  <span>Quantity:</span>
                  <span className="text-[#1C1917] font-bold">{closingPosition.quantity} shares</span>
                </div>
                <div className="flex justify-between text-[#78716C]">
                  <span>Estimated P&L:</span>
                  <span className={exitPriceInput >= closingPosition.entryPrice ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                    {formatCurrency((exitPriceInput - closingPosition.entryPrice) * closingPosition.quantity)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[#57534E] block mb-1 font-semibold">Actual Exit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={exitPriceInput}
                  onChange={e => setExitPriceInput(Number(e.target.value))}
                  className="w-full bg-[#FFFFFF] border border-[#E6DDCF] rounded-lg p-2.5 text-[#1C1917] font-mono text-sm focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[#57534E] block mb-1 font-semibold">Exit Reason & Notes (Journaling)</label>
                <textarea
                  rows={2}
                  value={exitNotesInput}
                  onChange={e => setExitNotesInput(e.target.value)}
                  placeholder="e.g. Hit target, or dynamic Kumo stop floor reached, or CCI dropped < 50..."
                  className="w-full bg-[#FFFFFF] border border-[#E6DDCF] rounded-lg p-2 text-[#1C1917] font-sans focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setClosingPosition(null)}
                  className="px-4 py-2 bg-[#F5EFEB] hover:bg-[#EFE8DC] text-[#78716C] border border-[#E6DDCF] rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow-md cursor-pointer"
                >
                  Confirm Exit & Log to Journal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Position Modal Dialog */}
      {editingPosition && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#FFFDF7] border border-[#E6DDCF] rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E6DDCF] pb-3">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-[#845306]" />
                <h3 className="text-base font-bold text-[#1C1917]">
                  Edit Position: {editingPosition.ticker}
                </h3>
              </div>
              <button onClick={() => setEditingPosition(null)} className="text-[#78716C] hover:text-[#1C1917] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="bg-[#FDFBF7] p-3 rounded-xl border border-[#E6DDCF] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#78716C] uppercase font-sans font-bold block">Current Market Price</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">{formatCurrency(editingPosition.currentPrice)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleFetchEditLiveQuote}
                  disabled={isFetchingEditQuote}
                  className="px-2.5 py-1 bg-[#F5EFEB] hover:bg-[#EFE8DC] border border-[#E6DDCF] text-[#7E5E14] rounded-lg font-semibold text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 text-[#996515] ${isFetchingEditQuote ? 'animate-spin' : ''}`} />
                  Fetch Live Quote
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="text-[#57534E] font-sans block mb-1 font-semibold">Entry Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editEntryPrice}
                    onChange={e => setEditEntryPrice(Number(e.target.value))}
                    className="w-full bg-[#FFFFFF] border border-[#E6DDCF] rounded-lg p-2 text-[#1C1917] font-bold focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#57534E] font-sans block mb-1 font-semibold">Quantity (Shares)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editQuantity}
                    onChange={e => setEditQuantity(Number(e.target.value))}
                    className="w-full bg-[#FFFFFF] border border-[#E6DDCF] rounded-lg p-2 text-[#1C1917] font-bold focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div>
                  <label className="text-[#57534E] font-sans block mb-1 font-semibold">Kumo Stop Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editStopLossPrice}
                    onChange={e => setEditStopLossPrice(Number(e.target.value))}
                    className="w-full bg-[#FFFFFF] border border-[#E6DDCF] rounded-lg p-2 text-rose-700 font-bold focus:border-rose-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[#57534E] font-sans block mb-1 font-semibold">Take Profit Target ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editTakeProfitPrice}
                    onChange={e => setEditTakeProfitPrice(Number(e.target.value))}
                    className="w-full bg-[#FFFFFF] border border-[#E6DDCF] rounded-lg p-2 text-emerald-700 font-bold focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[#57534E] block mb-1 font-semibold font-sans">Notes</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={e => setEditNotes(e.target.value)}
                  placeholder="Notes, trade thesis, entry triggers..."
                  className="w-full bg-[#FFFFFF] border border-[#E6DDCF] rounded-lg p-2 text-[#1C1917] font-sans focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingPosition(null)}
                  className="px-4 py-2 bg-[#F5EFEB] hover:bg-[#EFE8DC] text-[#78716C] border border-[#E6DDCF] rounded-lg font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 gold-gradient-btn text-[#1C1917] font-bold rounded-lg shadow-sm cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
