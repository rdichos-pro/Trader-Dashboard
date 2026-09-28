import React, { useMemo, useState } from 'react';
import { 
  ArrowDownRight, 
  ArrowUpRight, 
  CandlestickChart, 
  Check, 
  Clock, 
  Compass,
  Flame, 
  Plus, 
  Search, 
  Sparkles, 
  Tag, 
  Target,
  Trash2, 
  TrendingUp, 
  Volume2 
} from 'lucide-react';
import { TickerQuote } from '../types/trading';
import { formatCompactNumber, formatCurrency, formatPercent } from '../utils/formatters';
import { Sparkline } from './Sparkline';
import { moverDiscoveryService } from '../services/moverDiscoveryService';

interface WatchlistTabProps {
  watchlistQuotes: TickerQuote[];
  allQuotes: TickerQuote[];
  onSelectTicker: (symbol: string) => void;
  onOpenNewPositionWithTicker: (symbol: string, currentPrice: number) => void;
  onAddToWatchlist: (symbol: string) => void;
  onRemoveFromWatchlist: (symbol: string) => void;
  onNavigateToTab: (tab: string) => void;
  autoAddMovers?: boolean;
  onToggleAutoAddMovers?: (enabled: boolean) => void;
}

export const WatchlistTab: React.FC<WatchlistTabProps> = ({
  watchlistQuotes = [],
  allQuotes = [],
  onSelectTicker,
  onOpenNewPositionWithTicker,
  onAddToWatchlist,
  onRemoveFromWatchlist,
  onNavigateToTab,
  autoAddMovers,
  onToggleAutoAddMovers,
}) => {
  const [newTickerInput, setNewTickerInput] = useState('');
  const [sortBy, setSortBy] = useState<'symbol' | 'price' | 'change' | 'volume' | 'rvol'>('change');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterQuery, setFilterQuery] = useState('');

  const safeWatchlistQuotes = Array.isArray(watchlistQuotes) ? watchlistQuotes : [];
  const safeAllQuotes = Array.isArray(allQuotes) ? allQuotes : [];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTickerInput.trim()) return;
    onAddToWatchlist(newTickerInput.trim().toUpperCase());
    setNewTickerInput('');
  };

  const sortedQuotes = [...safeWatchlistQuotes]
    .filter(q => 
      q.symbol.toLowerCase().includes(filterQuery.toLowerCase()) || 
      q.name.toLowerCase().includes(filterQuery.toLowerCase())
    )
    .sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      if (sortBy === 'symbol') {
        const strA = String(a.symbol);
        const strB = String(b.symbol);
        return sortOrder === 'asc' ? strA.localeCompare(strB) : strB.localeCompare(strA);
      } else if (sortBy === 'price') {
        valA = a.price;
        valB = b.price;
      } else if (sortBy === 'change') {
        valA = a.changePercent;
        valB = b.changePercent;
      } else if (sortBy === 'volume') {
        valA = a.volume;
        valB = b.volume;
      } else if (sortBy === 'rvol') {
        valA = a.rvol;
        valB = b.rvol;
      }

      return sortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

  const toggleSort = (field: 'symbol' | 'price' | 'change' | 'volume' | 'rvol') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Quick suggestions not yet in watchlist
  const watchlistSymbols = new Set(safeWatchlistQuotes.map(q => q.symbol));
  const suggestedQuotes = safeAllQuotes.filter(q => !watchlistSymbols.has(q.symbol)).slice(0, 4);

  // Top non-watchlist Gotrade movers in confluence
  const topGotradeMovers = useMemo(() => {
    return moverDiscoveryService.discoverGotradeMovers({
      watchlistSymbols: Array.from<string>(watchlistSymbols),
      onlyNonWatchlist: true,
      maxPrice: 25,
      minConfluencePct: 60,
    }).slice(0, 3);
  }, [watchlistSymbols]);

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-[#E6DDCF] shadow-sm">
        {/* Add Ticker Form */}
        <form onSubmit={handleAdd} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#78716C]" />
            <input
              type="text"
              placeholder="Add symbol (e.g. AMD, CRWD, SMCI)..."
              value={newTickerInput}
              onChange={e => setNewTickerInput(e.target.value)}
              className="w-full bg-[#FDFBF7] border border-[#E6DDCF] rounded-lg pl-9 pr-3 py-1.5 text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] font-mono uppercase"
            />
          </div>
          <button
            type="submit"
            id="add-ticker-btn"
            className="px-3.5 py-1.5 gold-gradient-btn text-[#1C1917] font-bold text-xs rounded-lg transition-all flex items-center gap-1 shrink-0 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </form>

        {/* Filter & Suggestions */}
        <div className="flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-[#57534E] font-semibold whitespace-nowrap">Suggested:</span>
          {suggestedQuotes.map(sq => (
            <button
              key={sq.symbol}
              onClick={() => onAddToWatchlist(sq.symbol)}
              className="px-2 py-1 bg-[#FDFBF7] hover:bg-[#F5EFEB] text-[#845306] rounded border border-[#E6DDCF] font-mono flex items-center gap-1 transition-colors font-semibold"
              title={`Add ${sq.symbol} (${sq.name})`}
            >
              <Plus className="w-3 h-3 text-[#996515]" />
              {sq.symbol}
            </button>
          ))}
        </div>
      </div>

      {/* Gotrade Mover Opportunities Banner */}
      {topGotradeMovers.length > 0 && (
        <div className="bg-[#FFFDF7] p-3 rounded-xl border border-[#E6DDCF] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-[#FDF4DC] border border-[#F3DA90] rounded-lg text-[#845306]">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-bold text-[#1C1917]">
                <span>Gotrade Mover Opportunities</span>
                <span className="text-[10px] bg-[#FDF4DC] text-[#845306] border border-[#F3DA90] px-1.5 py-0.2 rounded font-sans font-semibold">
                  Cheaper &lt;$25
                </span>
                {autoAddMovers && (
                  <span className="text-[10px] bg-[#F5EFEB] text-[#7E5E14] border border-[#E6DDCF] px-1.5 py-0.2 rounded flex items-center gap-1 font-semibold font-sans">
                    <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" /> Auto-Add Confluence Active
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#57534E]">
                Early momentum stocks meeting &ge;60% technical confluence not yet in your watchlist:
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {topGotradeMovers.map(mover => (
              <div
                key={mover.symbol}
                className="bg-white border border-[#E6DDCF] px-2.5 py-1.5 rounded-lg flex items-center gap-2 shadow-xs"
              >
                <div className="font-mono">
                  <span className="font-bold text-[#1C1917]">{mover.symbol}</span>
                  <span className="text-[#57534E] ml-1 font-semibold">${(mover.price ?? 0).toFixed(2)}</span>
                </div>
                <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[#FDF4DC] text-[#845306] border border-[#F3DA90] font-bold">
                  {mover.confluenceScore}%
                </span>
                <button
                  onClick={() => onAddToWatchlist(mover.symbol)}
                  className="p-1 bg-[#F5EFEB] hover:bg-[#EFE8DC] text-[#7E5E14] rounded text-[10px] flex items-center gap-0.5 font-sans font-bold transition-colors cursor-pointer"
                  title="Add to Watchlist"
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            ))}
            <button
              onClick={() => onNavigateToTab('scanner')}
              className="text-xs text-[#845306] hover:text-[#59410E] underline font-bold ml-1"
            >
              View All &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Watchlist Main Container */}
      <div className="bg-white rounded-xl border border-[#E6DDCF] overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[#E6DDCF] flex items-center justify-between bg-[#F5EFEB]">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="font-bold text-sm text-[#1C1917]">Active Watchlist ({safeWatchlistQuotes.length})</h2>
          </div>
          <div className="text-xs text-[#57534E] font-mono">
            Auto-refreshing live ticks
          </div>
        </div>

        {/* Desktop Table View (Hidden on mobile < md) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#FDFBF7] border-b border-[#E6DDCF] text-xs text-[#57534E] font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 cursor-pointer hover:text-[#1C1917]" onClick={() => toggleSort('symbol')}>
                  Ticker &amp; Company {sortBy === 'symbol' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-3 px-3 text-right cursor-pointer hover:text-[#1C1917]" onClick={() => toggleSort('price')}>
                  Price {sortBy === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-3 px-3 text-right cursor-pointer hover:text-[#1C1917]" onClick={() => toggleSort('change')}>
                  4H Change {sortBy === 'change' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-3 px-3 text-right cursor-pointer hover:text-[#1C1917]" onClick={() => toggleSort('volume')}>
                  Volume / Avg {sortBy === 'volume' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-3 px-3 text-center cursor-pointer hover:text-[#1C1917]" onClick={() => toggleSort('rvol')}>
                  RVOL {sortBy === 'rvol' && (sortOrder === 'asc' ? '↑' : '↓')}
                </th>
                <th className="py-3 px-3 text-center">4H Range (L - H)</th>
                <th className="py-3 px-3 text-center">4H Trend</th>
                <th className="py-3 px-3 text-center">20D Trend</th>
                <th className="py-3 px-3">Catalyst / Sector</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EFE8DC] font-mono">
              {sortedQuotes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-[#78716C] text-xs">
                    Your watchlist is currently empty. Add tickers above to monitor live quotes.
                  </td>
                </tr>
              ) : (
                sortedQuotes.map(quote => {
                  const fourHourChange = quote.fourHourChange ?? quote.change;
                  const fourHourChangePct = quote.fourHourChangePercent ?? quote.changePercent;
                  const isPositive = fourHourChange >= 0;

                  const fourHourLow = quote.fourHourLow ?? quote.low;
                  const fourHourHigh = quote.fourHourHigh ?? quote.high;
                  const range4H = fourHourHigh - fourHourLow;
                  const current4HPos = range4H > 0 
                    ? ((quote.price - fourHourLow) / range4H) * 100 
                    : 50;
                  const clamped4HPos = Math.max(0, Math.min(100, current4HPos));

                  const spark4H = quote.sparkline4H && quote.sparkline4H.length >= 2 
                    ? quote.sparkline4H 
                    : (quote.sparkline || []);

                  return (
                    <tr 
                      key={quote.symbol} 
                      className="hover:bg-[#FAF7F2] transition-colors group cursor-pointer bg-white"
                      onClick={() => onSelectTicker(quote.symbol)}
                    >
                      {/* Ticker & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div>
                            <div className="font-bold text-[#1C1917] text-base tracking-wide flex items-center gap-1.5">
                              {quote.symbol}
                              {quote.rvol >= 2.0 && (
                                <span className="text-[10px] font-sans px-1.5 py-0.2 bg-[#FDF4DC] text-[#845306] border border-[#F3DA90] rounded font-semibold flex items-center gap-0.5" title="Relative Volume Spike > 2.0x">
                                  <Flame className="w-2.5 h-2.5 text-[#D4AF37]" /> High RVOL
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-sans text-[#57534E] truncate max-w-[150px]">
                              {quote.name}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Price */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-[#1C1917] text-sm">
                          {formatCurrency(quote.price)}
                        </div>
                        <div className="text-[11px] text-[#78716C]">
                          Prev 4H: {formatCurrency(quote.previousClose)}
                        </div>
                      </td>

                      {/* 4H Change */}
                      <td className="py-3 px-3 text-right">
                        <div className={`inline-flex items-center font-bold text-sm ${isPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {isPositive ? <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> : <ArrowDownRight className="w-3.5 h-3.5 mr-0.5" />}
                          {formatPercent(fourHourChangePct)}
                        </div>
                        <div className={`text-xs ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isPositive ? '+' : ''}{formatCurrency(fourHourChange)}
                        </div>
                      </td>

                      {/* Volume & 30D Avg */}
                      <td className="py-3 px-3 text-right">
                        <div className="text-[#1C1917] text-xs font-medium">
                          {formatCompactNumber(quote.volume)}
                        </div>
                        <div className="text-[11px] text-[#78716C]">
                          Avg: {formatCompactNumber(quote.avgVolume30D)}
                        </div>
                      </td>

                      {/* Relative Volume (RVOL) */}
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          (quote.rvol ?? 0) >= 2.0
                            ? 'bg-[#FDF4DC] text-[#845306] border border-[#F3DA90]'
                            : (quote.rvol ?? 0) >= 1.3
                            ? 'bg-[#FAF7F2] text-[#7E5E14] border border-[#E6DDCF]'
                            : 'bg-[#FDFBF7] text-[#57534E] border border-[#E6DDCF]'
                        }`}>
                          {(quote.rvol ?? 1.0).toFixed(2)}x
                        </span>
                      </td>

                      {/* 4H Range Bar (L - H) */}
                      <td className="py-3 px-3 text-center">
                        <div className="w-28 mx-auto">
                          <div className="flex justify-between text-[10px] text-[#78716C] mb-1">
                            <span>{formatCurrency(fourHourLow, 1)}</span>
                            <span>{formatCurrency(fourHourHigh, 1)}</span>
                          </div>
                          <div className="h-1.5 bg-[#F5EFEB] rounded-full relative overflow-hidden border border-[#E6DDCF]">
                            <div 
                              className={`h-full rounded-full ${isPositive ? 'bg-gradient-to-r from-amber-400 to-[#D4AF37]' : 'bg-rose-500'}`}
                              style={{ width: `${clamped4HPos}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* 4H Trend Sparkline (Gold/Warm) */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <Sparkline data={spark4H} color="#D4AF37" width={76} height={24} />
                          <span className="text-[9px] text-[#845306] font-mono mt-0.5">4H (20p)</span>
                        </div>
                      </td>

                      {/* 20D Trend Sparkline (Macro) */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex flex-col items-center">
                          <Sparkline data={quote.sparkline} color="#7E5E14" isPositive={isPositive} width={76} height={24} />
                          <span className="text-[9px] text-[#57534E] font-mono mt-0.5">20D Macro</span>
                        </div>
                      </td>

                      {/* Catalyst Tag & Sector */}
                      <td className="py-3 px-3 font-sans">
                        {quote.catalyst ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#845306] bg-[#FDF4DC] px-2 py-0.5 rounded border border-[#F3DA90] w-fit">
                              <Tag className="w-3 h-3 text-[#D4AF37]" />
                              {quote.catalyst.type.replace('_', ' ')}
                            </span>
                            <span className="text-[10px] text-[#78716C] truncate max-w-[170px]" title={quote.catalyst.headline}>
                              {quote.catalyst.headline}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[#57534E]">
                            {quote.sector}
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-right font-sans" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            id={`chart-btn-${quote.symbol}`}
                            onClick={() => {
                              onSelectTicker(quote.symbol);
                              onNavigateToTab('charts');
                            }}
                            className="p-1.5 bg-[#FDFBF7] hover:bg-[#F5EFEB] text-[#1C1917] rounded-lg transition-colors border border-[#E6DDCF] cursor-pointer"
                            title="Open Candlestick Chart"
                          >
                            <CandlestickChart className="w-3.5 h-3.5 text-[#D4AF37]" />
                          </button>
                          <button
                            id={`trade-btn-${quote.symbol}`}
                            onClick={() => onOpenNewPositionWithTicker(quote.symbol, quote.price)}
                            className="p-1.5 gold-gradient-btn text-[#1C1917] rounded-lg transition-all shadow-sm cursor-pointer"
                            title="Log Position / Order"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            id={`remove-wl-${quote.symbol}`}
                            onClick={() => onRemoveFromWatchlist(quote.symbol)}
                            className="p-1.5 bg-[#FDFBF7] hover:bg-rose-50 text-[#78716C] hover:text-rose-700 rounded-lg border border-[#E6DDCF] transition-colors cursor-pointer"
                            title="Remove from Watchlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
          {sortedQuotes.length === 0 ? (
            <div className="py-8 px-4 text-center text-[#78716C] text-xs font-mono">
              Your watchlist is empty. Search and add tickers above.
            </div>
          ) : (
            sortedQuotes.map(quote => {
              const fourHourChange = quote.fourHourChange ?? quote.change;
              const fourHourChangePct = quote.fourHourChangePercent ?? quote.changePercent;
              const isPositive = fourHourChange >= 0;
              const spark4H = quote.sparkline4H && quote.sparkline4H.length >= 2 
                ? quote.sparkline4H 
                : (quote.sparkline || []);

              return (
                <div 
                  key={`mobile-${quote.symbol}`}
                  className="p-3.5 hover:bg-[#FAF7F2] transition-colors space-y-3 cursor-pointer"
                  onClick={() => onSelectTicker(quote.symbol)}
                >
                  {/* Top Row: Symbol, Name, RVOL & Catalyst */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-[#1C1917] font-mono tracking-wide">
                          {quote.symbol}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#FAF7F2] text-[#845306] rounded border border-[#E6DDCF]">
                          {quote.marketCapCategory || 'EQUITY'}
                        </span>
                        {(quote.rvol ?? 0) >= 1.5 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 bg-[#FDF4DC] text-[#845306] border border-[#F3DA90] rounded font-semibold flex items-center gap-0.5">
                            <Flame className="w-2.5 h-2.5 text-[#D4AF37]" /> {(quote.rvol ?? 1.0).toFixed(1)}x
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#57534E] font-sans truncate max-w-[200px]">
                        {quote.name}
                      </div>
                    </div>

                    {/* Price & 4H Change */}
                    <div className="text-right font-mono">
                      <div className="text-base font-bold text-[#1C1917]">
                        {formatCurrency(quote.price)}
                      </div>
                      <div className={`text-xs font-semibold inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded ${
                        isPositive 
                          ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' 
                          : 'text-rose-700 bg-rose-50 border border-rose-200'
                      }`}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {formatPercent(fourHourChangePct)}
                      </div>
                    </div>
                  </div>

                  {/* Catalyst if present */}
                  {quote.catalyst && (
                    <div className="text-xs bg-[#FDF4DC] p-2 rounded-lg border border-[#F3DA90] flex items-center gap-1.5 text-[#845306] font-sans">
                      <Tag className="w-3 h-3 text-[#D4AF37] shrink-0" />
                      <span className="truncate">{quote.catalyst.headline}</span>
                    </div>
                  )}

                  {/* Sparklines Grid: 4H Trend (Gold) & 20D Trend (Macro) */}
                  <div className="grid grid-cols-2 gap-2 bg-[#FDFBF7] p-2.5 rounded-xl border border-[#E6DDCF]">
                    {/* 4H Sparkline */}
                    <div className="flex flex-col items-center justify-center p-1 bg-white rounded-lg border border-[#E6DDCF]">
                      <div className="text-[10px] text-[#845306] font-mono font-medium mb-1">
                        4H TREND (20 Periods)
                      </div>
                      <Sparkline data={spark4H} color="#D4AF37" width={110} height={26} />
                    </div>

                    {/* 20D Sparkline */}
                    <div className="flex flex-col items-center justify-center p-1 bg-white rounded-lg border border-[#E6DDCF]">
                      <div className="text-[10px] text-[#57534E] font-mono font-medium mb-1">
                        20D TREND (Daily)
                      </div>
                      <Sparkline data={quote.sparkline} color="#7E5E14" isPositive={isPositive} width={110} height={26} />
                    </div>
                  </div>

                  {/* Mobile Action Buttons Bar */}
                  <div className="flex items-center justify-between pt-1 font-sans" onClick={e => e.stopPropagation()}>
                    <div className="text-[11px] text-[#78716C] font-mono">
                      Vol: {formatCompactNumber(quote.volume)}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        id={`mob-chart-btn-${quote.symbol}`}
                        onClick={() => {
                          onSelectTicker(quote.symbol);
                          onNavigateToTab('charts');
                        }}
                        className="px-2.5 py-1.5 bg-[#FDFBF7] hover:bg-[#F5EFEB] text-[#1C1917] text-xs rounded-lg border border-[#E6DDCF] font-medium flex items-center gap-1 transition-colors"
                      >
                        <CandlestickChart className="w-3.5 h-3.5 text-[#D4AF37]" />
                        Chart
                      </button>
                      <button
                        id={`mob-trade-btn-${quote.symbol}`}
                        onClick={() => onOpenNewPositionWithTicker(quote.symbol, quote.price)}
                        className="px-2.5 py-1.5 gold-gradient-btn text-[#1C1917] text-xs rounded-lg font-bold flex items-center gap-1 transition-all shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Trade
                      </button>
                      <button
                        id={`mob-remove-wl-${quote.symbol}`}
                        onClick={() => onRemoveFromWatchlist(quote.symbol)}
                        className="p-1.5 bg-[#FDFBF7] hover:bg-rose-50 text-[#78716C] hover:text-rose-700 rounded-lg border border-[#E6DDCF] transition-colors"
                        title="Remove from Watchlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
