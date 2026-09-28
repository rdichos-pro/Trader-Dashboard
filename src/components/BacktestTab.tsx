import React, { useState } from 'react';
import { 
  Activity, 
  ArrowDownRight, 
  ArrowUpRight, 
  Award, 
  BarChart3, 
  Check, 
  CheckCircle2, 
  ChevronRight, 
  Cpu, 
  DollarSign, 
  Flame, 
  History, 
  Play, 
  RotateCcw, 
  Sliders, 
  Target, 
  TrendingUp, 
  Zap 
} from 'lucide-react';
import { runBacktest, runStockWalkForwardBacktest } from '../services/backtester';
import { generateExtendedHistoricalCandles } from '../services/mockMarketData';
import { BacktestParams, BacktestResult, TickerQuote } from '../types/trading';
import { formatCompactNumber, formatCurrency, formatDate, formatPercent } from '../utils/formatters';

interface BacktestTabProps {
  universe: TickerQuote[];
  onSelectTicker: (symbol: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export const BacktestTab: React.FC<BacktestTabProps> = ({
  universe,
  onSelectTicker,
  onNavigateToTab,
}) => {
  const [params, setParams] = useState<BacktestParams>({
    strategyId: 'rule-cci-40',
    stopLossPct: 5.0,
    takeProfitPct: 10.0,
    maxHoldDays: 15,
    universeScope: 'ALL',
    specificTicker: 'NVDA',
    commissionPerTrade: 1.0,
    slippagePct: 0.1,
    holdoutDays: 30,
  });

  const runSelectedBacktest = (p: BacktestParams): BacktestResult => {
    if (p.universeScope === 'SINGLE' && p.specificTicker) {
      // Real dual-timeframe (1HR entry + 1D macro) 8-pillar strategy, walk-forward validated.
      const candles1h = generateExtendedHistoricalCandles(p.specificTicker, '60', 365 * 24);
      const candlesD = generateExtendedHistoricalCandles(p.specificTicker, 'D', 400);
      return runStockWalkForwardBacktest(p.specificTicker, candles1h, candlesD, 10000, p.holdoutDays || 30, 25);
    }
    // Legacy single-timeframe (4H) engine for whole-universe scans.
    return runBacktest(p);
  };

  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<BacktestResult | null>(() => runSelectedBacktest(params));

  const handleRunTest = (e: React.FormEvent) => {
    e.preventDefault();
    setIsRunning(true);
    setTimeout(() => {
      const res = runSelectedBacktest(params);
      setResult(res);
      setIsRunning(false);
    }, 250);
  };

  return (
    <div className="space-y-4">
      {/* Overview Banner */}
      <div className="bg-white p-4 rounded-xl border border-[#E6DDCF] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-lg bg-[#FDF4DC] border border-[#F3DA90] flex items-center justify-center text-[#845306]">
            <Cpu className="w-5 h-5 text-[#996515]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#1C1917]">Algorithmic Rule Backtester</h2>
            <p className="text-xs text-[#57534E]">
              Simulate rule triggers against historical price action with stop-loss and profit target execution.
            </p>
          </div>
        </div>

        <div className="text-xs font-mono text-[#845306] bg-[#FDF4DC] px-3 py-1.5 rounded-lg border border-[#F3DA90] font-bold">
          {params.universeScope === 'SINGLE' ? '1HR+1D Walk-Forward (1Yr Dataset)' : '6-Month Lookback Dataset'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Parameters Form */}
        <div className="bg-white p-5 rounded-xl border border-[#E6DDCF] space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-[#1C1917] flex items-center gap-1.5 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-[#D4AF37]" />
            Strategy Parameters
          </h3>

          <form onSubmit={handleRunTest} className="space-y-3.5 text-xs">
            {/* Strategy Selection */}
            {params.universeScope !== 'SINGLE' && (
              <div>
                <label className="text-[#57534E] block mb-1 font-semibold">Strategy Trigger Template</label>
                <select
                  value={params.strategyId}
                  onChange={e => setParams({ ...params, strategyId: e.target.value })}
                  className="w-full bg-[#FDFBF7] border border-[#E6DDCF] rounded-lg p-2.5 text-[#1C1917] font-medium focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
                >
                  <option value="rule-cci-40">CCI (40) Confluence Strategy (&gt; +100) [Active]</option>
                  <option value="rule-breakout-vol">20-Day Breakout + 1.5x Volume Spike</option>
                  <option value="rule-ma-crossover">20 EMA / 50 SMA Golden Cross</option>
                  <option value="rule-rsi-oversold">RSI(14) Oversold Bounce (&lt; 32)</option>
                  <option value="rule-rvol-momentum">RVOL Spike (&gt; 2.0x) + &gt;3.5% Move</option>
                </select>
              </div>
            )}

            {/* Universe Scope */}
            <div>
              <label className="text-[#57534E] block mb-1 font-semibold">Test Scope</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setParams({ ...params, universeScope: 'ALL' })}
                  className={`p-2 rounded-lg border font-medium text-xs transition-colors ${
                    params.universeScope === 'ALL'
                      ? 'gold-gradient-btn text-[#1C1917] border-[#C59B27] shadow-sm font-bold'
                      : 'bg-[#FDFBF7] border-[#E6DDCF] text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  Entire Universe ({universe.length} Stocks)
                </button>
                <button
                  type="button"
                  onClick={() => setParams({ ...params, universeScope: 'SINGLE' })}
                  className={`p-2 rounded-lg border font-medium text-xs transition-colors ${
                    params.universeScope === 'SINGLE'
                      ? 'gold-gradient-btn text-[#1C1917] border-[#C59B27] shadow-sm font-bold'
                      : 'bg-[#FDFBF7] border-[#E6DDCF] text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  Single Ticker
                </button>
              </div>
            </div>

            {params.universeScope === 'SINGLE' && (
              <div>
                <label className="text-[#57534E] block mb-1 font-semibold">Selected Ticker</label>
                <select
                  value={params.specificTicker || 'NVDA'}
                  onChange={e => setParams({ ...params, specificTicker: e.target.value })}
                  className="w-full bg-[#FDFBF7] border border-[#E6DDCF] rounded-lg p-2 text-[#1C1917] font-mono font-bold"
                >
                  {universe.map(u => (
                    <option key={u.symbol} value={u.symbol}>
                      {u.symbol} - {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {params.universeScope === 'SINGLE' ? (
              <div className="bg-[#FDF4DC] border border-[#F3DA90] p-2.5 rounded-lg flex items-start gap-2">
                <Cpu className="w-4 h-4 text-[#845306] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#845306] leading-snug">
                  Tests all 6 real 1D+1HR 8-pillar Ichimoku variants (volume-confirmed) and auto-selects the best performer on in-sample data — exits (stop/target) are managed internally per-strategy, not user-set here.
                </p>
              </div>
            ) : (
              <>
                {/* Risk / Exit Thresholds */}
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div>
                    <label className="text-[#57534E] font-sans block mb-1 font-semibold">Stop-Loss (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={params.stopLossPct}
                      onChange={e => setParams({ ...params, stopLossPct: Number(e.target.value) })}
                      className="w-full bg-[#FDFBF7] border border-[#E6DDCF] rounded-lg p-2 text-rose-700 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[#57534E] font-sans block mb-1 font-semibold">Take-Profit (%)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={params.takeProfitPct}
                      onChange={e => setParams({ ...params, takeProfitPct: Number(e.target.value) })}
                      className="w-full bg-[#FDFBF7] border border-[#E6DDCF] rounded-lg p-2 text-emerald-700 font-bold"
                    />
                  </div>
                </div>

                {/* Max Hold Duration */}
                <div>
                  <label className="text-[#57534E] block mb-1 font-semibold">Max Holding Window</label>
                  <div className="flex items-center space-x-2 font-mono">
                    <input
                      type="number"
                      value={params.maxHoldDays}
                      onChange={e => setParams({ ...params, maxHoldDays: Number(e.target.value) })}
                      className="w-full bg-[#FDFBF7] border border-[#E6DDCF] rounded-lg p-2 text-[#1C1917] font-bold"
                    />
                    <span className="text-[#57534E] font-sans text-xs">Days</span>
                  </div>
                </div>

                {/* Realism Parameters */}
                <div className="grid grid-cols-2 gap-3 font-mono">
                  <div>
                    <label className="text-[#57534E] font-sans block mb-1 font-semibold">Slippage (%)</label>
                    <input
                      type="number"
                      step="0.05"
                      value={params.slippagePct}
                      onChange={e => setParams({ ...params, slippagePct: Number(e.target.value) })}
                      className="w-full bg-[#FDFBF7] border border-[#E6DDCF] rounded-lg p-2 text-[#996515] font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[#57534E] font-sans block mb-1 font-semibold">Commission ($)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={params.commissionPerTrade}
                      onChange={e => setParams({ ...params, commissionPerTrade: Number(e.target.value) })}
                      className="w-full bg-[#FDFBF7] border border-[#E6DDCF] rounded-lg p-2 text-[#1C1917] font-bold"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Out of Sample Holdout */}
            <div>
              <label className="text-[#57534E] block mb-1 font-semibold">
                {params.universeScope === 'SINGLE' ? 'Walk-Forward Holdout Window' : 'OOS Holdout Window (To catch overfitting)'}
              </label>
              <div className="flex items-center space-x-2 font-mono">
                <input
                  type="number"
                  value={params.holdoutDays}
                  onChange={e => setParams({ ...params, holdoutDays: Number(e.target.value) })}
                  className="w-full bg-[#FDFBF7] border border-[#E6DDCF] rounded-lg p-2 text-[#1C1917] font-bold"
                />
                <span className="text-[#57534E] font-sans text-xs">Days (Untouched)</span>
              </div>
              {params.universeScope === 'SINGLE' && (
                <p className="text-[10px] text-[#78716C] mt-1 leading-snug">
                  Strategy is selected on data before this window only, then validated on this window untouched. Results below are the out-of-sample numbers.
                </p>
              )}
            </div>

            {params.universeScope === 'ALL' && (
              <div className="bg-[#FDF4DC] border border-[#F3DA90] p-2.5 rounded-lg flex items-start gap-2">
                <Activity className="w-4 h-4 text-[#845306] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#845306] leading-snug">
                  <strong>Survivorship Bias Flag:</strong> Running against the current active universe may inflate returns, as stocks that delisted or went bankrupt are not included.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isRunning}
              className="w-full py-2.5 gold-gradient-btn text-[#1C1917] font-bold rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-4 h-4 text-[#1C1917]" />
              {isRunning ? 'Simulating Historical Data...' : 'Run Historical Backtest'}
            </button>
          </form>
        </div>

        {/* Backtest Results Display */}
        <div className="lg:col-span-2 space-y-4">
          {result && (
            <>
              {result.isWalkForward && (
                <div className="bg-white p-4 rounded-xl border border-[#E6DDCF] space-y-3 shadow-sm">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h4 className="font-bold text-xs text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
                      <Award className="w-4 h-4 text-[#D4AF37]" />
                      Walk-Forward Validation
                    </h4>
                    {result.strategyName && (
                      <span className="text-[11px] font-mono text-[#845306] bg-[#FDF4DC] border border-[#F3DA90] px-2 py-0.5 rounded font-bold">
                        Selected: {result.strategyName}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#FDFBF7] p-3 rounded-lg border border-[#E6DDCF]">
                      <span className="text-[10px] text-[#78716C] uppercase font-semibold block mb-1">In-Sample (Selection Data)</span>
                      {result.inSample ? (
                        <div className="font-mono space-y-0.5">
                          <div className="text-[#1C1917] font-semibold">{result.inSample.trades} trades</div>
                          <div className="text-[#57534E]">{result.inSample.winRatePct}% WR &middot; {result.inSample.profitFactor}x PF</div>
                          <div className={result.inSample.netReturnPct >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                            {result.inSample.netReturnPct >= 0 ? '+' : ''}{result.inSample.netReturnPct}%
                          </div>
                        </div>
                      ) : <span className="text-[#A8A29E]">N/A</span>}
                    </div>
                    <div className="bg-[#FDFBF7] p-3 rounded-lg border border-[#D4AF37]/50">
                      <span className="text-[10px] text-[#996515] uppercase font-semibold block mb-1">Out-of-Sample (Real Test)</span>
                      {result.outOfSample ? (
                        <div className="font-mono space-y-0.5">
                          <div className="text-[#1C1917] font-semibold">{result.outOfSample.trades} trades</div>
                          <div className="text-[#57534E]">{result.outOfSample.winRatePct}% WR &middot; {result.outOfSample.profitFactor}x PF</div>
                          <div className={result.outOfSample.netReturnPct >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}>
                            {result.outOfSample.netReturnPct >= 0 ? '+' : ''}{result.outOfSample.netReturnPct}%
                          </div>
                        </div>
                      ) : <span className="text-[#A8A29E]">N/A</span>}
                    </div>
                  </div>

                  {result.overfittingWarning && (
                    <div className="bg-[#FDF4DC] border border-[#F3DA90] p-2.5 rounded-lg flex items-start gap-2">
                      <Activity className="w-4 h-4 text-[#845306] shrink-0 mt-0.5" />
                      <p className="text-[11px] text-[#845306] leading-snug">{result.overfittingWarning}</p>
                    </div>
                  )}

                  <p className="text-[10px] text-[#78716C] leading-snug">
                    The KPI cards and trade log below reflect the <strong>out-of-sample</strong> result only — the strategy was picked using the in-sample data above, so its own numbers aren't a fair test of forward performance.
                  </p>
                </div>
              )}

              {/* Top Result KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Win Rate */}
                <div className="bg-white p-3.5 rounded-xl border border-[#E6DDCF] shadow-sm">
                  <span className="text-[11px] text-[#57534E] block font-semibold">Win Rate</span>
                  <div className={`text-xl font-bold font-mono ${result.winRate >= 50 ? 'text-emerald-700' : 'text-[#845306]'}`}>
                    {result.winRate.toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-[#78716C] font-mono">
                    {result.winningTrades}W / {result.losingTrades}L
                  </span>
                </div>

                {/* Net Return */}
                <div className="bg-white p-3.5 rounded-xl border border-[#E6DDCF] shadow-sm">
                  <span className="text-[11px] text-[#57534E] block font-semibold">Cumulative Return</span>
                  <div className={`text-xl font-bold font-mono ${result.totalReturnPct >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {result.totalReturnPct >= 0 ? '+' : ''}{result.totalReturnPct.toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-[#78716C] font-mono">
                    Across {result.totalTrades} signals
                  </span>
                </div>

                {/* Profit Factor */}
                <div className="bg-white p-3.5 rounded-xl border border-[#E6DDCF] shadow-sm">
                  <span className="text-[11px] text-[#57534E] block font-semibold">Profit Factor</span>
                  <div className={`text-xl font-bold font-mono ${result.profitFactor >= 1.5 ? 'text-emerald-700' : 'text-[#1C1917]'}`}>
                    {result.profitFactor.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-[#78716C] font-mono">
                    Gross Win/Loss Ratio
                  </span>
                </div>

                {/* Max Drawdown */}
                <div className="bg-white p-3.5 rounded-xl border border-[#E6DDCF] shadow-sm">
                  <span className="text-[11px] text-[#57534E] block font-semibold">Max Drawdown</span>
                  <div className="text-xl font-bold font-mono text-rose-700">
                    -{result.maxDrawdownPct.toFixed(1)}%
                  </div>
                  <span className="text-[10px] text-[#78716C] font-mono">
                    Peak-to-trough risk
                  </span>
                </div>
              </div>

              {/* Detailed Simulated Trades Table */}
              <div className="bg-white rounded-xl border border-[#E6DDCF] overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-[#E6DDCF] flex items-center justify-between bg-[#F5EFEB]">
                  <h4 className="font-bold text-xs text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-4 h-4 text-[#D4AF37]" />
                    Simulated Historical Trade Log ({result.trades.length})
                  </h4>
                  <span className="text-[11px] text-[#57534E] font-mono">
                    Avg Trade: {result.totalTrades > 0 ? (result.totalReturnPct / result.totalTrades).toFixed(2) : 0}%
                  </span>
                </div>

                <div className="overflow-x-auto max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-sm font-mono">
                    <thead className="bg-[#FDFBF7] border-b border-[#E6DDCF] text-[11px] text-[#57534E] uppercase tracking-wider sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Ticker</th>
                        <th className="py-2.5 px-3">Entry Date</th>
                        <th className="py-2.5 px-3 text-right">Entry $</th>
                        <th className="py-2.5 px-3">Exit Date</th>
                        <th className="py-2.5 px-3 text-right">Exit $</th>
                        <th className="py-2.5 px-3 text-right">Return %</th>
                        <th className="py-2.5 px-3">Exit Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EFE8DC] text-xs">
                      {result.trades.map(trade => {
                        const isWin = trade.returnPct >= 0;
                        return (
                          <tr key={trade.id} className="hover:bg-[#FAF7F2] transition-colors">
                            <td className="py-2.5 px-3 font-bold text-[#1C1917]">
                              {trade.ticker}
                            </td>
                            <td className="py-2.5 px-3 text-[#57534E]">
                              {formatDate(trade.entryDate)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-[#1C1917]">
                              {formatCurrency(trade.entryPrice)}
                            </td>
                            <td className="py-2.5 px-3 text-[#57534E]">
                              {formatDate(trade.exitDate)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-[#1C1917]">
                              {formatCurrency(trade.exitPrice)}
                            </td>
                            <td className={`py-2.5 px-3 text-right font-bold ${isWin ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {isWin ? '+' : ''}{trade.returnPct.toFixed(2)}%
                            </td>
                            <td className="py-2.5 px-3 font-sans text-[11px]">
                              <span className={`px-2 py-0.5 rounded font-medium ${
                                trade.exitReason === 'TAKE_PROFIT'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : trade.exitReason === 'STOP_LOSS'
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                  : 'bg-[#FDFBF7] text-[#57534E] border border-[#E6DDCF]'
                              }`}>
                                {trade.exitReason.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
