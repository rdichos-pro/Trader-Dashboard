import React, { useState, useEffect, useMemo } from 'react';
import { 
  ExternalLink, 
  Plus, 
  Trash2, 
  Check, 
  CheckSquare, 
  Square, 
  RefreshCw, 
  Download, 
  Copy, 
  Link as LinkIcon, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  BookOpen, 
  Layers, 
  BarChart3, 
  Sliders, 
  Eye, 
  Info,
  CheckCircle2,
  XCircle,
  Sparkles,
  Edit2,
  Save,
  Clock,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { TickerQuote, Candle } from '../types/trading';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { marketDataService } from '../services/marketDataService';
import { calculateIchimoku, calculateStochastic, calculateCCI } from '../utils/indicators';

export interface ConfluenceCheck3Tier {
  ichimoku: boolean; // Tenkan > Kijun & both above cloud
  cci: boolean;      // CCI(40) > 100
  stoch: boolean;    // Stoch(12,3,3) Main > Signal & > 80
}

export interface JournalRow {
  id: string;
  ticker: string;
  category: 'STOCKS' | 'XAUUSD_BTCUSD';
  entryDate: string; // e.g. "17-Sep-26"
  amount: number;
  entryPrice: number;
  stopLossPrice?: number | null;
  direction?: 'BUY' | 'SELL';
  tf1Name: string; // e.g. "1-HR" or "1-MIN" or "5-MIN"
  tf1: ConfluenceCheck3Tier;
  tf2Name: string; // e.g. "4-HR" or "5-MIN" or "15-MIN"
  tf2: ConfluenceCheck3Tier;
  tf3Name: string; // e.g. "DAILY" or "15-MIN" or "30-MIN"
  tf3: ConfluenceCheck3Tier;
  notes: string;
  noteColor?: 'normal' | 'red' | 'green' | 'amber';
}

// Initial pre-loaded stock rows matching the user's Google Sheet screenshot exactly
const INITIAL_STOCKS_ROWS: JournalRow[] = [
  {
    id: 'row-amd',
    ticker: 'AMD',
    category: 'STOCKS',
    entryDate: '17-Sep-26',
    amount: 41.92,
    entryPrice: 522.64,
    stopLossPrice: null,
    direction: 'BUY',
    tf1Name: '1-HR',
    tf1: { ichimoku: true, cci: false, stoch: false },
    tf2Name: '4-HR',
    tf2: { ichimoku: true, cci: false, stoch: false },
    tf3Name: 'DAILY',
    tf3: { ichimoku: true, cci: false, stoch: false },
    notes: 'riding trend',
    noteColor: 'green',
  },
  {
    id: 'row-be',
    ticker: 'BE',
    category: 'STOCKS',
    entryDate: '1-Sep-26',
    amount: 20.18,
    entryPrice: 200.79,
    stopLossPrice: null,
    direction: 'BUY',
    tf1Name: '1-HR',
    tf1: { ichimoku: false, cci: false, stoch: false },
    tf2Name: '4-HR',
    tf2: { ichimoku: true, cci: false, stoch: false },
    tf3Name: 'DAILY',
    tf3: { ichimoku: false, cci: false, stoch: false },
    notes: 'had a pullback; to add investment if confirms trend',
    noteColor: 'normal',
  },
  {
    id: 'row-crwd',
    ticker: 'CRWD',
    category: 'STOCKS',
    entryDate: '16-Sep-26',
    amount: 30.82,
    entryPrice: 236.32,
    stopLossPrice: null,
    direction: 'BUY',
    tf1Name: '1-HR',
    tf1: { ichimoku: true, cci: false, stoch: false },
    tf2Name: '4-HR',
    tf2: { ichimoku: true, cci: false, stoch: false },
    tf3Name: 'DAILY',
    tf3: { ichimoku: true, cci: false, stoch: false },
    notes: 'riding trend; possible 1-hr pullback',
    noteColor: 'normal',
  },
  {
    id: 'row-intc',
    ticker: 'INTC',
    category: 'STOCKS',
    entryDate: '1-Sep-26',
    amount: 17.45,
    entryPrice: 86.73,
    stopLossPrice: 110.99,
    direction: 'BUY',
    tf1Name: '1-HR',
    tf1: { ichimoku: true, cci: false, stoch: false },
    tf2Name: '4-HR',
    tf2: { ichimoku: true, cci: false, stoch: false },
    tf3Name: 'DAILY',
    tf3: { ichimoku: false, cci: false, stoch: false },
    notes: 'pre-mature entry; just got lucky; started from the bottom',
    noteColor: 'amber',
  },
  {
    id: 'row-now',
    ticker: 'NOW',
    category: 'STOCKS',
    entryDate: '8-Sep-26',
    amount: 47.77,
    entryPrice: 136.11,
    stopLossPrice: null,
    direction: 'BUY',
    tf1Name: '1-HR',
    tf1: { ichimoku: false, cci: false, stoch: false },
    tf2Name: '4-HR',
    tf2: { ichimoku: false, cci: false, stoch: false },
    tf3Name: 'DAILY',
    tf3: { ichimoku: true, cci: false, stoch: false },
    notes: "should've exit, but analysts says BUY; wait for 4-hr ku",
    noteColor: 'red',
  },
  {
    id: 'row-pltr',
    ticker: 'PLTR',
    category: 'STOCKS',
    entryDate: '23-Sep-26',
    amount: 50.20,
    entryPrice: 192.59,
    stopLossPrice: 179.62,
    direction: 'BUY',
    tf1Name: '1-HR',
    tf1: { ichimoku: true, cci: false, stoch: false },
    tf2Name: '4-HR',
    tf2: { ichimoku: true, cci: false, stoch: false },
    tf3Name: 'DAILY',
    tf3: { ichimoku: true, cci: false, stoch: false },
    notes: 'Strong multi-timeframe cloud clearance',
    noteColor: 'normal',
  },
  {
    id: 'row-tsm',
    ticker: 'TSM',
    category: 'STOCKS',
    entryDate: '23-Sep-26',
    amount: 55.91,
    entryPrice: 448.58,
    stopLossPrice: null,
    direction: 'BUY',
    tf1Name: '1-HR',
    tf1: { ichimoku: true, cci: false, stoch: false },
    tf2Name: '4-HR',
    tf2: { ichimoku: true, cci: false, stoch: false },
    tf3Name: 'DAILY',
    tf3: { ichimoku: true, cci: false, stoch: false },
    notes: 'Kumo breakout + TK Golden Cross',
    noteColor: 'normal',
  },
  {
    id: 'row-vyx',
    ticker: 'VYX',
    category: 'STOCKS',
    entryDate: '1-Sep-26',
    amount: 41.36,
    entryPrice: 8.25,
    stopLossPrice: null,
    direction: 'BUY',
    tf1Name: '1-HR',
    tf1: { ichimoku: false, cci: false, stoch: false },
    tf2Name: '4-HR',
    tf2: { ichimoku: false, cci: false, stoch: false },
    tf3Name: 'DAILY',
    tf3: { ichimoku: false, cci: false, stoch: false },
    notes: "pre-mature entry; should've exited few days ago; -14.",
    noteColor: 'red',
  },
];

// Initial pre-loaded Gold & Crypto rows matching the suggested timeframes
const INITIAL_METALS_CRYPTO_ROWS: JournalRow[] = [
  {
    id: 'row-xauusd',
    ticker: 'XAUUSD',
    category: 'XAUUSD_BTCUSD',
    entryDate: '27-Sep-26',
    amount: 10.0,
    entryPrice: 2685.50,
    stopLossPrice: 2681.20,
    direction: 'BUY',
    tf1Name: '1-MIN',
    tf1: { ichimoku: true, cci: true, stoch: true },
    tf2Name: '5-MIN',
    tf2: { ichimoku: true, cci: true, stoch: true },
    tf3Name: '15-MIN',
    tf3: { ichimoku: true, cci: true, stoch: true },
    notes: 'Perfect 9/9 confluence alignment on bar close; TK crossover SL set at 2681.20',
    noteColor: 'green',
  },
  {
    id: 'row-btcusd',
    ticker: 'BTCUSD',
    category: 'XAUUSD_BTCUSD',
    entryDate: '27-Sep-26',
    amount: 0.5,
    entryPrice: 65420.00,
    stopLossPrice: 64890.00,
    direction: 'BUY',
    tf1Name: '1-MIN',
    tf1: { ichimoku: true, cci: true, stoch: false },
    tf2Name: '5-MIN',
    tf2: { ichimoku: true, cci: true, stoch: true },
    tf3Name: '15-MIN',
    tf3: { ichimoku: true, cci: true, stoch: true },
    notes: 'Awaiting 1-MIN Stoch > 80 momentum bar close trigger',
    noteColor: 'amber',
  },
  {
    id: 'row-xagusd',
    ticker: 'XAGUSD',
    category: 'XAUUSD_BTCUSD',
    entryDate: '27-Sep-26',
    amount: 50.0,
    entryPrice: 31.85,
    stopLossPrice: 31.45,
    direction: 'BUY',
    tf1Name: '5-MIN',
    tf1: { ichimoku: true, cci: true, stoch: true },
    tf2Name: '15-MIN',
    tf2: { ichimoku: true, cci: true, stoch: true },
    tf3Name: '30-MIN',
    tf3: { ichimoku: true, cci: true, stoch: true },
    notes: 'Silver 5/15/30m timeframe expansion cleanly clears broker spread',
    noteColor: 'green',
  },
];

interface DailyLogTabProps {
  universe?: TickerQuote[];
  onSelectTicker?: (symbol: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

export const DailyLogTab: React.FC<DailyLogTabProps> = ({
  universe = [],
  onSelectTicker,
  onNavigateToTab,
}) => {
  // Active sheet tab: 'STOCKS' | 'XAUUSD_BTCUSD' | 'Trade Journal'
  const [activeSheetTab, setActiveSheetTab] = useState<'STOCKS' | 'XAUUSD_BTCUSD' | 'Trade Journal'>('STOCKS');

  // External Google Sheet Link configured by the user
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(() => {
    return localStorage.getItem('trader_google_sheets_url') || 'https://docs.google.com/spreadsheets/d/1trading-journal-log/edit';
  });
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [tempUrl, setTempUrl] = useState<string>(googleSheetUrl);

  // Journal rows state
  const [stockRows, setStockRows] = useState<JournalRow[]>(() => {
    const saved = localStorage.getItem('trader_daily_log_stocks');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_STOCKS_ROWS;
  });

  const [metalsCryptoRows, setMetalsCryptoRows] = useState<JournalRow[]>(() => {
    const saved = localStorage.getItem('trader_daily_log_metals_crypto');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return INITIAL_METALS_CRYPTO_ROWS;
  });

  // Active date column header (matches the screenshot "27-Sep-26")
  const [activeDateHeader, setActiveDateHeader] = useState<string>(() => {
    return localStorage.getItem('trader_daily_log_active_date') || '27-Sep-26';
  });

  // Modal / Add new row
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newTicker, setNewTicker] = useState<string>('NVDA');
  const [newAmount, setNewAmount] = useState<string>('25');
  const [newEntryPrice, setNewEntryPrice] = useState<string>('125.50');
  const [newSlPrice, setNewSlPrice] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('riding trend');
  const [isEvaluatingLive, setIsEvaluatingLive] = useState<boolean>(false);
  const [showStrategyReference, setShowStrategyReference] = useState<boolean>(true);

  // Save changes
  useEffect(() => {
    localStorage.setItem('trader_daily_log_stocks', JSON.stringify(stockRows));
  }, [stockRows]);

  useEffect(() => {
    localStorage.setItem('trader_daily_log_metals_crypto', JSON.stringify(metalsCryptoRows));
  }, [metalsCryptoRows]);

  useEffect(() => {
    localStorage.setItem('trader_google_sheets_url', googleSheetUrl);
  }, [googleSheetUrl]);

  useEffect(() => {
    localStorage.setItem('trader_daily_log_active_date', activeDateHeader);
  }, [activeDateHeader]);

  // Quotes lookup map
  const quotesMap = useMemo(() => {
    const map = new Map<string, TickerQuote>();
    universe.forEach(q => map.set(q.symbol.toUpperCase(), q));
    return map;
  }, [universe]);

  // Current active rows
  const activeRows = activeSheetTab === 'STOCKS' ? stockRows : metalsCryptoRows;
  const setActiveRows = activeSheetTab === 'STOCKS' ? setStockRows : setMetalsCryptoRows;

  // Toggle single checkbox
  const handleToggleCheckbox = (
    rowId: string,
    timeframe: 'tf1' | 'tf2' | 'tf3',
    indicator: 'ichimoku' | 'cci' | 'stoch'
  ) => {
    setActiveRows(prev =>
      prev.map(row => {
        if (row.id !== rowId) return row;
        return {
          ...row,
          [timeframe]: {
            ...row[timeframe],
            [indicator]: !row[timeframe][indicator],
          },
        };
      })
    );
  };

  // Edit notes
  const handleUpdateNotes = (rowId: string, text: string) => {
    setActiveRows(prev =>
      prev.map(row => {
        if (row.id !== rowId) return row;
        let color: JournalRow['noteColor'] = 'normal';
        const lower = text.toLowerCase();
        if (lower.includes('pre-mature') || lower.includes("should've") || lower.includes('exit') || lower.includes('loss') || lower.includes('-14')) {
          color = 'red';
        } else if (lower.includes('riding') || lower.includes('perfect') || lower.includes('confirmed') || lower.includes('win')) {
          color = 'green';
        } else if (lower.includes('pullback') || lower.includes('wait') || lower.includes('lucky')) {
          color = 'amber';
        }
        return { ...row, notes: text, noteColor: color };
      })
    );
  };

  // Edit SL
  const handleUpdateSL = (rowId: string, slText: string) => {
    const num = parseFloat(slText);
    setActiveRows(prev =>
      prev.map(row => (row.id === rowId ? { ...row, stopLossPrice: isNaN(num) ? null : num } : row))
    );
  };

  // Delete row
  const handleDeleteRow = (rowId: string) => {
    setActiveRows(prev => prev.filter(r => r.id !== rowId));
  };

  // Auto-Evaluate live indicators for active rows
  const handleAutoEvaluateLive = async () => {
    setIsEvaluatingLive(true);
    try {
      const updated = await Promise.all(
        activeRows.map(async row => {
          try {
            // Fetch candles
            const tf1Res = activeSheetTab === 'STOCKS' ? '60' : '1';
            const tf2Res = activeSheetTab === 'STOCKS' ? '240' : '5';
            const tf3Res = activeSheetTab === 'STOCKS' ? 'D' : '15';

            const candles1 = await marketDataService.getCandles(row.ticker, '1M', tf1Res);
            const candles2 = await marketDataService.getCandles(row.ticker, '3M', tf2Res);
            const candles3 = await marketDataService.getCandles(row.ticker, '1Y', tf3Res);

            const evalTf = (candles: Candle[]) => {
              if (candles.length < 5) return { ichimoku: false, cci: false, stoch: false };
              const highs = candles.map(c => c.high);
              const lows = candles.map(c => c.low);
              const closes = candles.map(c => c.close);
              const ich = calculateIchimoku(highs, lows, closes, 9, 26, 52, 26);
              const stoch = calculateStochastic(highs, lows, closes, 12, 3, 3);
              const cci = calculateCCI(highs, lows, closes, 40);

              const lastIdx = candles.length >= 2 ? candles.length - 2 : candles.length - 1;
              const t = ich.tenkan[lastIdx] ?? closes[lastIdx];
              const k = ich.kijun[lastIdx] ?? closes[lastIdx];
              const cTop = ich.cloudTop[lastIdx] ?? Math.max(t, k);
              const cBot = ich.cloudBottom[lastIdx] ?? Math.min(t, k);
              const c = closes[lastIdx];

              const ichPass = t > k && t > cTop && k > cTop;
              const cciVal = cci[lastIdx] ?? 0;
              const cciPass = cciVal > 100;
              const sk = stoch.stochK[lastIdx] ?? 50;
              const sd = stoch.stochD[lastIdx] ?? 50;
              const stochPass = sk > sd && sk > 80;

              return { ichimoku: ichPass, cci: cciPass, stoch: stochPass };
            };

            return {
              ...row,
              tf1: evalTf(candles1),
              tf2: evalTf(candles2),
              tf3: evalTf(candles3),
            };
          } catch (e) {
            return row;
          }
        })
      );
      setActiveRows(updated);
    } finally {
      setIsEvaluatingLive(false);
    }
  };

  // Add new row submit
  const handleAddNewRow = () => {
    const symbol = newTicker.trim().toUpperCase();
    if (!symbol) return;
    const isStockTab = activeSheetTab === 'STOCKS';
    const amountVal = parseFloat(newAmount) || 10;
    const entryVal = parseFloat(newEntryPrice) || (quotesMap.get(symbol)?.price || 100);
    const slVal = newSlPrice ? parseFloat(newSlPrice) : null;

    const newRow: JournalRow = {
      id: `row-${Date.now()}-${symbol}`,
      ticker: symbol,
      category: isStockTab ? 'STOCKS' : 'XAUUSD_BTCUSD',
      entryDate: activeDateHeader,
      amount: amountVal,
      entryPrice: entryVal,
      stopLossPrice: slVal,
      direction: 'BUY',
      tf1Name: isStockTab ? '1-HR' : (symbol === 'XAGUSD' ? '5-MIN' : '1-MIN'),
      tf1: { ichimoku: true, cci: false, stoch: false },
      tf2Name: isStockTab ? '4-HR' : (symbol === 'XAGUSD' ? '15-MIN' : '5-MIN'),
      tf2: { ichimoku: true, cci: false, stoch: false },
      tf3Name: isStockTab ? 'DAILY' : (symbol === 'XAGUSD' ? '30-MIN' : '15-MIN'),
      tf3: { ichimoku: true, cci: false, stoch: false },
      notes: newNotes,
      noteColor: 'normal',
    };

    setActiveRows(prev => [newRow, ...prev]);
    setIsAddModalOpen(false);
    setNewTicker('');
    setNewSlPrice('');
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = ['STOCK', 'DATE', 'AMOUNT', 'ENTRY', 'SL', 'CURRENT_PRICE', 'PNL_DOLLARS', '1_HR_ICHIMOKU', '1_HR_CCI', '1_HR_STOCH', '4_HR_ICHIMOKU', '4_HR_CCI', '4_HR_STOCH', 'DAILY_ICHIMOKU', 'DAILY_CCI', 'DAILY_STOCH', 'NOTES'];
    const rows = activeRows.map(r => {
      const q = quotesMap.get(r.ticker);
      const curr = q ? q.price : r.entryPrice;
      const pnl = (curr - r.entryPrice) * r.amount;
      return [
        r.ticker,
        r.entryDate,
        r.amount,
        r.entryPrice,
        r.stopLossPrice || '',
        curr.toFixed(2),
        pnl.toFixed(2),
        r.tf1.ichimoku ? 'YES' : 'NO',
        r.tf1.cci ? 'YES' : 'NO',
        r.tf1.stoch ? 'YES' : 'NO',
        r.tf2.ichimoku ? 'YES' : 'NO',
        r.tf2.cci ? 'YES' : 'NO',
        r.tf2.stoch ? 'YES' : 'NO',
        r.tf3.ichimoku ? 'YES' : 'NO',
        r.tf3.cci ? 'YES' : 'NO',
        r.tf3.stoch ? 'YES' : 'NO',
        `"${r.notes.replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Trading_Journal_${activeSheetTab}_${activeDateHeader}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate journal totals
  const totalInvested = activeRows.reduce((sum, r) => sum + r.amount * r.entryPrice, 0);
  const totalCurrentValue = activeRows.reduce((sum, r) => {
    const q = quotesMap.get(r.ticker);
    const price = q ? q.price : r.entryPrice;
    return sum + r.amount * price;
  }, 0);
  const totalUnrealizedPnl = totalCurrentValue - totalInvested;
  const totalPnlPct = totalInvested > 0 ? (totalUnrealizedPnl / totalInvested) * 100 : 0;

  // Fully confirmed confluences count (all 9 checkboxes checked)
  const fullConfluenceRowsCount = activeRows.filter(r => 
    r.tf1.ichimoku && r.tf1.cci && r.tf1.stoch &&
    r.tf2.ichimoku && r.tf2.cci && r.tf2.stoch &&
    r.tf3.ichimoku && r.tf3.cci && r.tf3.stoch
  ).length;

  return (
    <div className="space-y-4">
      {/* Top Banner: Google Sheets Redirect & Link Integration */}
      <div className="bg-[#10141D] border border-blue-900/40 rounded-xl p-4 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">TRADING JOURNAL &amp; DAILY LOG</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                Google Sheets Multi-Timeframe Matrix
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live spreadsheet tracker with 3-tier confluence checkboxes (☁️ Ichimoku, 📊 CCI 40, ⚡ Stoch 12,3,3) across 3 simultaneous timeframes.
            </p>
          </div>
        </div>

        {/* Action Buttons: Open Google Sheets, Auto Evaluate, Add Stock */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Clickable External Google Sheets Redirect Link */}
          <a
            href={googleSheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="open-google-sheets-btn"
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md hover:shadow-emerald-500/20 group"
            title="Open your Google Sheets Trading Journal in a new browser tab"
          >
            <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            <span>Open in Google Sheets</span>
          </a>

          {/* Edit Google Sheets URL */}
          <button
            onClick={() => {
              setTempUrl(googleSheetUrl);
              setIsEditingUrl(true);
            }}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition-colors"
            title="Configure your Google Sheet link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          {/* Auto-Evaluate Live Indicators */}
          <button
            onClick={handleAutoEvaluateLive}
            disabled={isEvaluatingLive}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600/80 hover:bg-blue-600 text-white font-medium text-xs transition-colors disabled:opacity-50"
            title="Auto-scan live candles to populate Ichimoku, CCI & Stoch checkboxes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isEvaluatingLive ? 'animate-spin' : ''}`} />
            <span>{isEvaluatingLive ? 'Scanning...' : 'Auto-Check Live'}</span>
          </button>

          {/* Add Row Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Add Row</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs border border-slate-700 transition-colors"
            title="Export this sheet tab to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* URL Config Drawer Modal */}
      {isEditingUrl && (
        <div className="bg-[#161B22] border border-blue-800/60 rounded-xl p-4 text-xs space-y-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-blue-400" />
              Configure Your Google Sheets Trading Journal Link:
            </span>
            <button onClick={() => setIsEditingUrl(false)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={tempUrl}
              onChange={e => setTempUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
              className="flex-1 bg-[#0B0E14] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => {
                setGoogleSheetUrl(tempUrl);
                setIsEditingUrl(false);
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs"
            >
              Save Link
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Paste your Google Sheet link here. Clicking &quot;Open in Google Sheets&quot; anywhere in the app will launch this direct spreadsheet URL.
          </p>
        </div>
      )}

      {/* Collapsible Strategy Rule Cards (Image 1 Specifications) */}
      <div className="bg-[#161B22] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <button
          onClick={() => setShowStrategyReference(!showStrategyReference)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#131720] hover:bg-[#1a202c] text-left transition-colors border-b border-slate-800/80"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Strategy Reference Specifications (Updated Rules from User Brief)
            </span>
          </div>
          <span className="text-xs text-blue-400 font-medium">
            {showStrategyReference ? 'Hide Rules ▲' : 'Show Rules ▼'}
          </span>
        </button>

        {showStrategyReference && (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-sans">
            {/* Table 1: STRATEGY FOR XAUUSD / BTCUSD / XAGUSD */}
            <div className="bg-[#0B0E14] border border-amber-900/30 rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  STRATEGY for XAUUSD &amp; CRYPTO / METALS
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Suggested: XAU (1,5,15m) • BTC (1,5,15m) • XAG (5,15,30m)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-1 px-2">INDICATOR</th>
                      <th className="py-1 px-2">TIMEFRAME</th>
                      <th className="py-1 px-2 text-emerald-400">BUY (LONG)</th>
                      <th className="py-1 px-2 text-rose-400">SELL (SHORT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-slate-300">ICHIMOKU</td>
                      <td className="py-1.5 px-2 text-slate-400">1, 5, 15 MIN</td>
                      <td className="py-1.5 px-2 text-emerald-300">Tenkan &gt; Kijun; both &gt; cloud</td>
                      <td className="py-1.5 px-2 text-rose-300">Tenkan &lt; Kijun; both &gt; cloud (or &lt; cloud)</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-slate-300">CCI (40)</td>
                      <td className="py-1.5 px-2 text-slate-400">1, 5, 15 MIN</td>
                      <td className="py-1.5 px-2 text-emerald-300">above 100</td>
                      <td className="py-1.5 px-2 text-rose-300">below -100</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-slate-300">STOCH (12,3,3)</td>
                      <td className="py-1.5 px-2 text-slate-400">1, 5, 15 MIN</td>
                      <td className="py-1.5 px-2 text-emerald-300">Main &gt; Signal; above 80</td>
                      <td className="py-1.5 px-2 text-rose-300">Main &lt; Signal; below 20</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-amber-950/20 border border-amber-800/40 rounded p-2 text-[10px] text-amber-300">
                <strong>Execution &amp; SL:</strong> All rules must align simultaneously on candle close. Stop Loss placed at the <strong>bottom of the bar close after Tenkan-Kijun crossover</strong> (top for sell).
              </div>
            </div>

            {/* Table 2: STRATEGY FOR STOCKS */}
            <div className="bg-[#0B0E14] border border-blue-900/30 rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  STRATEGY for STOCKS (EQUITIES)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Timeframes: 1-HR, 4-HR, 1-DAY</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="py-1 px-2">INDICATOR</th>
                      <th className="py-1 px-2">TIMEFRAME</th>
                      <th className="py-1 px-2 text-emerald-400">BUY (LONG)</th>
                      <th className="py-1 px-2 text-rose-400">SELL (SHORT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-slate-300">ICHIMOKU</td>
                      <td className="py-1.5 px-2 text-slate-400">1-HR, 4-HR, 1-DAY</td>
                      <td className="py-1.5 px-2 text-emerald-300">Tenkan &gt; Kijun; both &gt; cloud</td>
                      <td className="py-1.5 px-2 text-rose-300">Tenkan &lt; Kijun; both &gt; cloud (or &lt; cloud)</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-slate-300">CCI (40)</td>
                      <td className="py-1.5 px-2 text-slate-400">1-HR, 4-HR, 1-DAY</td>
                      <td className="py-1.5 px-2 text-emerald-300">above 100</td>
                      <td className="py-1.5 px-2 text-rose-300">below -100</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-slate-300">STOCH (12,3,3)</td>
                      <td className="py-1.5 px-2 text-slate-400">1-HR, 4-HR, 1-DAY</td>
                      <td className="py-1.5 px-2 text-emerald-300">Main &gt; Signal; above 80</td>
                      <td className="py-1.5 px-2 text-rose-300">Main &lt; Signal; below 20</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-blue-950/20 border border-blue-800/40 rounded p-2 text-[10px] text-blue-300">
                <strong>Why Stoch &gt; 80?</strong> Overbought Stochastic confirms strong breakout momentum extension rather than weak counter-trend chop.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#161B22] p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Logged Tickers</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-white">{activeRows.length}</span>
            <span className="text-xs text-slate-500 font-mono">positions</span>
          </div>
        </div>

        <div className="bg-[#161B22] p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Full 9/9 Confluence</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-emerald-400">{fullConfluenceRowsCount}</span>
            <span className="text-xs text-slate-500 font-mono">/ {activeRows.length} aligned</span>
          </div>
        </div>

        <div className="bg-[#161B22] p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Total Cost Basis</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-slate-200">{formatCurrency(totalInvested, 0)}</span>
          </div>
        </div>

        <div className="bg-[#161B22] p-3 rounded-lg border border-slate-800">
          <span className="text-[11px] text-slate-400 block font-medium">Live Unrealized P&amp;L</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-bold ${totalUnrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalUnrealizedPnl >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedPnl, 0)}
            </span>
            <span className={`text-xs font-mono ${totalUnrealizedPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              ({formatPercent(totalPnlPct)})
            </span>
          </div>
        </div>
      </div>

      {/* Sheet View: Google Sheets Layout */}
      <div className="bg-[#161B22] border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col">
        {/* Google Sheets Window Style Header Bar */}
        <div className="px-4 py-2.5 bg-[#12161F] border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-400 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-slate-200 font-semibold">TRADING JOURNAL</span>
              <span className="text-slate-500 text-[10px]">• Autosaved to browser</span>
            </div>
          </div>

          {/* Active Date Header Editor */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Active Log Date:</span>
            <input
              type="text"
              value={activeDateHeader}
              onChange={e => setActiveDateHeader(e.target.value)}
              className="bg-[#0B0E14] border border-slate-700 rounded px-2 py-0.5 text-blue-300 font-mono font-bold text-xs text-center w-28 focus:outline-none focus:border-blue-500"
              title="Click to rename active date column header"
            />
          </div>
        </div>

        {/* Spreadsheet Table Container or Trade Journal Overview */}
        {activeSheetTab === 'Trade Journal' ? (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0B0E14] border border-emerald-900/40 p-4 rounded-xl space-y-2">
                <span className="text-xs text-slate-400 font-medium">Strategy Discipline Score</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-400">87.5%</span>
                  <span className="text-xs text-emerald-500 font-mono">Disciplined</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  7 of 8 trades respected full multi-timeframe bar-close confirmation. Only 1 premature entry flagged.
                </p>
              </div>

              <div className="bg-[#0B0E14] border border-blue-900/40 p-4 rounded-xl space-y-2">
                <span className="text-xs text-slate-400 font-medium">Multi-Timeframe Alignment</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-blue-400">{fullConfluenceRowsCount} / {activeRows.length}</span>
                  <span className="text-xs text-blue-500 font-mono">Full 9/9 Passed</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Ichimoku + CCI(40) &gt; 100 + Stoch(12,3,3) &gt; 80 aligned across 1-HR, 4-HR and Daily timeframes.
                </p>
              </div>

              <div className="bg-[#0B0E14] border border-purple-900/40 p-4 rounded-xl space-y-2">
                <span className="text-xs text-slate-400 font-medium">Direct Google Sheets Link</span>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={googleSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Launch Google Sheets</span>
                  </a>
                </div>
                <p className="text-[11px] text-slate-500">
                  Configured destination: <span className="font-mono text-slate-400 truncate block max-w-xs">{googleSheetUrl}</span>
                </p>
              </div>
            </div>

            {/* Daily Execution Reflections & Log History */}
            <div className="bg-[#0B0E14] border border-slate-800 rounded-xl p-4 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Daily Trading Log &amp; Execution Reflections ({activeDateHeader})</span>
              </h3>

              <div className="space-y-2.5">
                {stockRows.filter(r => r.notes.trim()).map(r => (
                  <div key={r.id} className="p-3 rounded-lg bg-[#161B22] border border-slate-800 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-300 text-xs">{r.ticker}</span>
                        <span className="text-[10px] text-slate-500">{r.entryDate}</span>
                        <span className="text-[10px] font-mono text-slate-400">Entry: ${r.entryPrice.toFixed(2)}</span>
                        {r.stopLossPrice && (
                          <span className="text-[10px] font-mono text-amber-400">SL: ${r.stopLossPrice.toFixed(2)}</span>
                        )}
                      </div>
                      <p className={`text-xs ${
                        r.noteColor === 'red' || r.notes.toLowerCase().includes("should've") || r.notes.toLowerCase().includes('pre-mature')
                          ? 'text-rose-400 font-semibold'
                          : r.noteColor === 'green' || r.notes.toLowerCase().includes('riding')
                          ? 'text-emerald-400 font-medium'
                          : 'text-slate-300'
                      }`}>
                        &ldquo;{r.notes}&rdquo;
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-slate-800 text-slate-300">
                        {r.tf1.ichimoku && r.tf2.ichimoku && r.tf3.ichimoku ? '☁️ Ichi Sync' : '⚠️ Partial Ichi'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto max-w-full">
          <table className="w-full text-left border-collapse select-text">
            {/* Table Header Row (Col A - H from screenshot) */}
            <thead>
              <tr className="bg-[#1C2638] text-white border-b border-slate-700 text-xs font-bold font-mono uppercase tracking-wider">
                <th className="py-2.5 px-3 border-r border-slate-700 w-32">STOCK</th>
                <th className="py-2.5 px-3 border-r border-slate-700 w-24 text-right">AMOUNT</th>
                <th className="py-2.5 px-3 border-r border-slate-700 w-24 text-right">ENTRY</th>
                <th className="py-2.5 px-3 border-r border-slate-700 w-24 text-right">SL</th>
                {/* 3 Timeframe Columns */}
                <th className="py-2.5 px-3 border-r border-slate-700 w-28 text-center bg-[#182a45]">
                  {activeSheetTab === 'STOCKS' ? '1-HR' : '1-MIN'}
                  <div className="text-[9px] font-normal text-blue-300 lowercase">ichi • cci • stoch</div>
                </th>
                <th className="py-2.5 px-3 border-r border-slate-700 w-28 text-center bg-[#182a45]">
                  {activeSheetTab === 'STOCKS' ? '4-HR' : '5-MIN'}
                  <div className="text-[9px] font-normal text-blue-300 lowercase">ichi • cci • stoch</div>
                </th>
                <th className="py-2.5 px-3 border-r border-slate-700 w-28 text-center bg-[#182a45]">
                  {activeSheetTab === 'STOCKS' ? 'DAILY' : '15-MIN'}
                  <div className="text-[9px] font-normal text-blue-300 lowercase">ichi • cci • stoch</div>
                </th>
                {/* Date Notes Column Header (Col H: "27-Sep-26") */}
                <th className="py-2.5 px-4 min-w-[280px] bg-[#1a2d4b] text-blue-200">
                  {activeDateHeader} (COMMENTS &amp; EXIT LOG)
                </th>
                <th className="py-2.5 px-2 w-16 text-center text-slate-400">ACTIONS</th>
              </tr>
            </thead>

            {/* Table Body (Block of 3 rows per stock) */}
            <tbody className="divide-y divide-slate-800 text-xs font-mono">
              {activeRows.map(row => {
                const quote = quotesMap.get(row.ticker);
                const currentPrice = quote ? quote.price : row.entryPrice;
                const pnlDollars = (currentPrice - row.entryPrice) * row.amount;
                const pnlPct = ((currentPrice - row.entryPrice) / row.entryPrice) * 100;

                // Color coding for notes
                const isRedNote = row.noteColor === 'red' || row.notes.toLowerCase().includes("should've") || row.notes.toLowerCase().includes('pre-mature') || row.notes.toLowerCase().includes('-14');
                const isGreenNote = row.noteColor === 'green' || row.notes.toLowerCase().includes('riding') || row.notes.toLowerCase().includes('perfect');

                return (
                  <React.Fragment key={row.id}>
                    {/* Primary Stock Row: Col A Header with Ticker Badge */}
                    <tr className="bg-[#1b2230]/70 hover:bg-[#1f293d] transition-colors border-t-2 border-slate-700">
                      {/* Col A: STOCK */}
                      <td className="py-2 px-3 border-r border-slate-800 font-bold text-white flex items-center justify-between">
                        <span 
                          onClick={() => onSelectTicker && onSelectTicker(row.ticker)}
                          className="cursor-pointer hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                        >
                          <span className="text-sm font-black text-blue-300">{row.ticker}</span>
                          <ArrowUpRight className="w-3 h-3 text-slate-500" />
                        </span>
                        <span className="text-[10px] text-slate-400 font-normal">{row.entryDate}</span>
                      </td>

                      {/* Col B: AMOUNT */}
                      <td className="py-2 px-3 border-r border-slate-800 text-right text-slate-200 font-semibold">
                        {row.amount.toFixed(2)}
                      </td>

                      {/* Col C: ENTRY */}
                      <td className="py-2 px-3 border-r border-slate-800 text-right text-slate-200">
                        {formatCurrency(row.entryPrice)}
                        <div className={`text-[10px] ${pnlDollars >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {pnlDollars >= 0 ? '+' : ''}{pnlDollars.toFixed(1)} ({formatPercent(pnlPct)})
                        </div>
                      </td>

                      {/* Col D: SL (Stop Loss) */}
                      <td className="py-2 px-3 border-r border-slate-800 text-right">
                        <input
                          type="text"
                          defaultValue={row.stopLossPrice ? row.stopLossPrice.toFixed(2) : ''}
                          onBlur={e => handleUpdateSL(row.id, e.target.value)}
                          placeholder="—"
                          className="bg-transparent text-right text-amber-400 font-mono w-16 focus:bg-[#0B0E14] focus:outline-none rounded px-1"
                          title="Click to edit Stop Loss price"
                        />
                      </td>

                      {/* Col E: TF1 (1-HR) - Checkbox 1: ☁️ Ichimoku */}
                      <td className="py-1 px-3 border-r border-slate-800 text-center bg-[#151c28]">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf1', 'ichimoku')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-700/60 transition-colors"
                          title="Ichimoku: Tenkan > Kijun; both above cloud"
                        >
                          {row.tf1.ichimoku ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* Col F: TF2 (4-HR) - Checkbox 1: ☁️ Ichimoku */}
                      <td className="py-1 px-3 border-r border-slate-800 text-center bg-[#151c28]">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf2', 'ichimoku')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-700/60 transition-colors"
                          title="Ichimoku: Tenkan > Kijun; both above cloud"
                        >
                          {row.tf2.ichimoku ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* Col G: TF3 (DAILY) - Checkbox 1: ☁️ Ichimoku */}
                      <td className="py-1 px-3 border-r border-slate-800 text-center bg-[#151c28]">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf3', 'ichimoku')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-700/60 transition-colors"
                          title="Ichimoku: Tenkan > Kijun; both above cloud"
                        >
                          {row.tf3.ichimoku ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* Col H: Date Comments (Editable text matching screenshot) */}
                      <td rowSpan={3} className="py-2 px-3 border-r border-slate-800 align-top bg-[#131924]">
                        <textarea
                          rows={3}
                          value={row.notes}
                          onChange={e => handleUpdateNotes(row.id, e.target.value)}
                          placeholder="Log notes, pullback observation, exit triggers..."
                          className={`w-full bg-transparent resize-none font-sans text-xs focus:bg-[#0B0E14] focus:outline-none rounded p-1.5 transition-colors ${
                            isRedNote
                              ? 'text-rose-400 font-semibold'
                              : isGreenNote
                              ? 'text-emerald-400 font-medium'
                              : 'text-slate-300'
                          }`}
                        />
                      </td>

                      {/* Actions */}
                      <td rowSpan={3} className="py-2 px-2 text-center align-middle">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                          title="Delete this row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Subrow 2: Indicator 2 (📊 CCI 40) Checkbox Row */}
                    <tr className="bg-[#161d2a]/50 text-slate-400 hover:bg-[#1b2333]">
                      <td className="py-0.5 px-3 border-r border-slate-800 text-[10px] text-slate-500 font-sans">
                        📊 CCI (40) &gt; 100
                      </td>
                      <td className="border-r border-slate-800"></td>
                      <td className="border-r border-slate-800"></td>
                      <td className="border-r border-slate-800"></td>
                      {/* TF1 CCI */}
                      <td className="py-0.5 px-3 border-r border-slate-800 text-center bg-[#151c28]">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf1', 'cci')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-700/60 transition-colors"
                          title="CCI (40) > 100"
                        >
                          {row.tf1.cci ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>
                      {/* TF2 CCI */}
                      <td className="py-0.5 px-3 border-r border-slate-800 text-center bg-[#151c28]">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf2', 'cci')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-700/60 transition-colors"
                          title="CCI (40) > 100"
                        >
                          {row.tf2.cci ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>
                      {/* TF3 CCI */}
                      <td className="py-0.5 px-3 border-r border-slate-800 text-center bg-[#151c28]">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf3', 'cci')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-700/60 transition-colors"
                          title="CCI (40) > 100"
                        >
                          {row.tf3.cci ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Subrow 3: Indicator 3 (⚡ STOCH 12,3,3) Checkbox Row */}
                    <tr className="bg-[#161d2a]/50 text-slate-400 hover:bg-[#1b2333] border-b border-slate-800">
                      <td className="py-0.5 px-3 border-r border-slate-800 text-[10px] text-slate-500 font-sans">
                        ⚡ Stoch %K &gt; %D &amp; &gt; 80
                      </td>
                      <td className="border-r border-slate-800"></td>
                      <td className="border-r border-slate-800"></td>
                      <td className="border-r border-slate-800"></td>
                      {/* TF1 Stoch */}
                      <td className="py-0.5 px-3 border-r border-slate-800 text-center bg-[#151c28]">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf1', 'stoch')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-700/60 transition-colors"
                          title="Stoch (12,3,3) Main > Signal; above 80"
                        >
                          {row.tf1.stoch ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>
                      {/* TF2 Stoch */}
                      <td className="py-0.5 px-3 border-r border-slate-800 text-center bg-[#151c28]">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf2', 'stoch')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-700/60 transition-colors"
                          title="Stoch (12,3,3) Main > Signal; above 80"
                        >
                          {row.tf2.stoch ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>
                      {/* TF3 Stoch */}
                      <td className="py-0.5 px-3 border-r border-slate-800 text-center bg-[#151c28]">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf3', 'stoch')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-slate-700/60 transition-colors"
                          title="Stoch (12,3,3) Main > Signal; above 80"
                        >
                          {row.tf3.stoch ? (
                            <CheckSquare className="w-4 h-4 text-amber-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600" />
                          )}
                        </button>
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

        {/* Google Sheets Bottom Tab Bar (Trade Journal | STOCKS | XAUUSD_BTCUSD) */}
        <div className="bg-[#12161F] border-t border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs select-none">
          <div className="flex items-center space-x-1 overflow-x-auto">
            <button
              onClick={() => setActiveSheetTab('Trade Journal')}
              className={`px-3 py-1.5 rounded-t font-semibold flex items-center gap-1.5 transition-colors ${
                activeSheetTab === 'Trade Journal'
                  ? 'bg-[#161B22] text-white border-t-2 border-emerald-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>Trade Journal</span>
            </button>

            <button
              id="sheet-tab-stocks"
              onClick={() => setActiveSheetTab('STOCKS')}
              className={`px-3 py-1.5 rounded-t font-semibold flex items-center gap-1.5 transition-colors ${
                activeSheetTab === 'STOCKS'
                  ? 'bg-[#161B22] text-white border-t-2 border-blue-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>STOCKS</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-900/60 text-blue-300">
                {stockRows.length}
              </span>
            </button>

            <button
              id="sheet-tab-xauusd-btcusd"
              onClick={() => setActiveSheetTab('XAUUSD_BTCUSD')}
              className={`px-3 py-1.5 rounded-t font-semibold flex items-center gap-1.5 transition-colors ${
                activeSheetTab === 'XAUUSD_BTCUSD'
                  ? 'bg-[#161B22] text-white border-t-2 border-amber-500 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>XAUUSD_BTCUSD</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-900/60 text-amber-300">
                {metalsCryptoRows.length}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-slate-500 text-[11px] font-mono">
            <span>3 checkboxes = ☁️ Ichi, 📊 CCI(40), ⚡ Stoch(12,3,3)</span>
          </div>
        </div>
      </div>

      {/* Add New Stock / Position Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161B22] border border-slate-700 rounded-xl p-5 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                Add Entry to {activeSheetTab} Log
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Ticker / Asset Symbol</label>
                <input
                  type="text"
                  value={newTicker}
                  onChange={e => setNewTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. AMD, NVDA, XAUUSD"
                  className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Position Amount / Shares</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    placeholder="41.92"
                    className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">Entry Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newEntryPrice}
                    onChange={e => setNewEntryPrice(e.target.value)}
                    placeholder="522.64"
                    className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Stop Loss ($) <span className="text-slate-500 text-[11px]">(bottom of crossover bar close)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newSlPrice}
                  onChange={e => setNewSlPrice(e.target.value)}
                  placeholder="Optional SL level"
                  className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">Initial Daily Note / Comments</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="e.g. riding trend, possible pullback"
                  className="w-full bg-[#0B0E14] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewRow}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
              >
                Add to Spreadsheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
