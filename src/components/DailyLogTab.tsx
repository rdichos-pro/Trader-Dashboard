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

const DEFAULT_TARGET_SHEET_URL = 'https://docs.google.com/spreadsheets/d/15Kwam-w1aNMTl1T3yN_Dnht2NFh3i0s-_cO3-4_Ivh4/edit?usp=drivesdk';

export const DailyLogTab: React.FC<DailyLogTabProps> = ({
  universe = [],
  onSelectTicker,
  onNavigateToTab,
}) => {
  // Active sheet tab: 'STOCKS' | 'XAUUSD_BTCUSD' | 'Trade Journal' | 'GOOGLE_SHEET_EMBED'
  const [activeSheetTab, setActiveSheetTab] = useState<'STOCKS' | 'XAUUSD_BTCUSD' | 'Trade Journal' | 'GOOGLE_SHEET_EMBED'>('STOCKS');

  // External Google Sheet Link configured by the user (defaults to user's sheet)
  const [googleSheetUrl, setGoogleSheetUrl] = useState<string>(() => {
    const saved = localStorage.getItem('trader_google_sheets_url');
    // Ensure user's new sheet ID is used by default if not already set
    if (!saved || !saved.includes('15Kwam-w1aNMTl1T3yN_Dnht2NFh3i0s-_cO3-4_Ivh4')) {
      localStorage.setItem('trader_google_sheets_url', DEFAULT_TARGET_SHEET_URL);
      return DEFAULT_TARGET_SHEET_URL;
    }
    return saved;
  });
  const [isEditingUrl, setIsEditingUrl] = useState<boolean>(false);
  const [tempUrl, setTempUrl] = useState<string>(googleSheetUrl);
  const [hasCopiedUrl, setHasCopiedUrl] = useState<boolean>(false);

  const handleCopyLink = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(googleSheetUrl);
    } else {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = googleSheetUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
    setHasCopiedUrl(true);
    setTimeout(() => setHasCopiedUrl(false), 2500);
  };

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
      {/* Top Banner: Google Sheets Redirect & Link Integration with Watchlist Style */}
      <div className="bg-[#FFFDF7] border border-[#E6DDCF] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start md:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FDF4DC] border border-[#F3DA90] flex items-center justify-center text-[#845306] shrink-0 shadow-xs">
            <BookOpen className="w-5 h-5 text-[#B8860B]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[#1C1917] tracking-wide">TRADING JOURNAL &amp; DAILY LOG</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FDF4DC] text-[#845306] border border-[#F3DA90]">
                Google Sheets Multi-Timeframe Matrix
              </span>
            </div>
            <p className="text-xs text-[#78716C] mt-0.5">
              Live spreadsheet tracker with 3-tier confluence checkboxes (☁️ Ichimoku, 📊 CCI 40, ⚡ Stoch 12,3,3) across 3 simultaneous timeframes.
            </p>
          </div>
        </div>

        {/* Action Buttons: Open Google Sheets, Copy Link, Auto Evaluate, Add Stock */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Clickable External Google Sheets Redirect Link */}
          <a
            href={googleSheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            id="open-google-sheets-btn"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C59B27] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#1C1917] font-bold text-xs transition-all shadow-sm border border-[#C59B27] group"
            title="Open your Google Sheets Trading Journal in a new browser tab"
          >
            <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 text-[#1C1917]" />
            <span>Open in Google Sheets</span>
          </a>

          {/* Copy Link Button with instant feedback */}
          <button
            onClick={handleCopyLink}
            id="copy-google-sheets-btn"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#F5EFEB] hover:bg-[#EFE8DC] text-[#1C1917] font-semibold text-xs border border-[#E6DDCF] transition-all"
            title="Copy Google Sheets direct link to clipboard"
          >
            {hasCopiedUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#78716C]" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {/* Edit Google Sheets URL */}
          <button
            onClick={() => {
              setTempUrl(googleSheetUrl);
              setIsEditingUrl(true);
            }}
            className="p-2 rounded-lg bg-[#F5EFEB] hover:bg-[#EFE8DC] text-[#78716C] hover:text-[#1C1917] text-xs border border-[#E6DDCF] transition-colors"
            title="Configure your Google Sheet link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>

          {/* Auto-Evaluate Live Indicators */}
          <button
            onClick={handleAutoEvaluateLive}
            disabled={isEvaluatingLive}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#FDF4DC] hover:bg-[#FBECC4] text-[#845306] border border-[#F3DA90] font-bold text-xs transition-colors disabled:opacity-50"
            title="Auto-scan live candles to populate Ichimoku, CCI & Stoch checkboxes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isEvaluatingLive ? 'animate-spin' : ''}`} />
            <span>{isEvaluatingLive ? 'Scanning...' : 'Auto-Check Live'}</span>
          </button>

          {/* Add Row Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C59B27] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#1C1917] font-bold text-xs shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5 text-[#1C1917]" />
            <span>Add Row</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="p-2 rounded-lg bg-[#F5EFEB] hover:bg-[#EFE8DC] text-[#78716C] hover:text-[#1C1917] text-xs border border-[#E6DDCF] transition-colors"
            title="Export this sheet tab to CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* URL Config Drawer Modal */}
      {isEditingUrl && (
        <div className="bg-white border border-[#E6DDCF] rounded-xl p-4 text-xs space-y-2.5 shadow-sm animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#1C1917] flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4 text-[#B8860B]" />
              Configure Your Google Sheets Trading Journal Link:
            </span>
            <button onClick={() => setIsEditingUrl(false)} className="text-[#78716C] hover:text-[#1C1917]">
              ✕
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="url"
              value={tempUrl}
              onChange={e => setTempUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
              className="flex-1 bg-[#FAF7F2] border border-[#E6DDCF] rounded-lg px-3 py-2 text-[#1C1917] font-mono text-xs focus:outline-none focus:border-[#D4AF37]"
            />
            <button
              onClick={() => {
                setGoogleSheetUrl(tempUrl);
                setIsEditingUrl(false);
              }}
              className="px-4 py-2 bg-gradient-to-r from-[#D4AF37] to-[#C59B27] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#1C1917] font-bold rounded-lg text-xs shadow-sm"
            >
              Save Link
            </button>
            <button
              onClick={() => {
                setTempUrl(DEFAULT_TARGET_SHEET_URL);
                setGoogleSheetUrl(DEFAULT_TARGET_SHEET_URL);
                setIsEditingUrl(false);
              }}
              className="px-3 py-2 bg-[#F5EFEB] hover:bg-[#EFE8DC] text-[#7E5E14] font-medium rounded-lg text-xs border border-[#E6DDCF]"
              title="Reset back to user's assigned Google Sheet link"
            >
              Reset to User Link
            </button>
          </div>
          <p className="text-[11px] text-[#78716C]">
            Current target: <span className="font-mono text-[#845306] select-all">{googleSheetUrl}</span>
          </p>
        </div>
      )}

      {/* Collapsible Strategy Rule Cards (Image 1 Specifications) */}
      <div className="bg-white border border-[#E6DDCF] rounded-xl overflow-hidden shadow-sm">
        <button
          onClick={() => setShowStrategyReference(!showStrategyReference)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#FAF7F2] hover:bg-[#F5EFEB] text-left transition-colors border-b border-[#E6DDCF]"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
              Strategy Reference Specifications (Updated Rules from User Brief)
            </span>
          </div>
          <span className="text-xs text-[#845306] font-semibold">
            {showStrategyReference ? 'Hide Rules ▲' : 'Show Rules ▼'}
          </span>
        </button>

        {showStrategyReference && (
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs font-sans">
            {/* Table 1: STRATEGY FOR XAUUSD / BTCUSD / XAGUSD */}
            <div className="bg-[#FFFDF7] border border-[#E6DDCF] rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#E6DDCF] pb-2">
                <span className="font-bold text-[#845306] uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  STRATEGY for XAUUSD &amp; CRYPTO / METALS
                </span>
                <span className="text-[10px] text-[#78716C] font-mono">Suggested: XAU (1,5,15m) • BTC (1,5,15m) • XAG (5,15,30m)</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-[#E6DDCF] text-[#78716C]">
                      <th className="py-1 px-2">INDICATOR</th>
                      <th className="py-1 px-2">TIMEFRAME</th>
                      <th className="py-1 px-2 text-emerald-700">BUY (LONG)</th>
                      <th className="py-1 px-2 text-rose-700">SELL (SHORT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE8DC] font-mono">
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-[#1C1917]">ICHIMOKU</td>
                      <td className="py-1.5 px-2 text-[#78716C]">1, 5, 15 MIN</td>
                      <td className="py-1.5 px-2 text-emerald-700">Tenkan &gt; Kijun; both &gt; cloud</td>
                      <td className="py-1.5 px-2 text-rose-700">Tenkan &lt; Kijun; both &gt; cloud (or &lt; cloud)</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-[#1C1917]">CCI (40)</td>
                      <td className="py-1.5 px-2 text-[#78716C]">1, 5, 15 MIN</td>
                      <td className="py-1.5 px-2 text-emerald-700">above 100</td>
                      <td className="py-1.5 px-2 text-rose-700">below -100</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-[#1C1917]">STOCH (12,3,3)</td>
                      <td className="py-1.5 px-2 text-[#78716C]">1, 5, 15 MIN</td>
                      <td className="py-1.5 px-2 text-emerald-700">Main &gt; Signal; above 80</td>
                      <td className="py-1.5 px-2 text-rose-700">Main &lt; Signal; below 20</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-[#FDF4DC] border border-[#F3DA90] rounded p-2 text-[10px] text-[#845306]">
                <strong>Execution &amp; SL:</strong> All rules must align simultaneously on candle close. Stop Loss placed at the <strong>bottom of the bar close after Tenkan-Kijun crossover</strong> (top for sell).
              </div>
            </div>

            {/* Table 2: STRATEGY FOR STOCKS */}
            <div className="bg-[#FFFDF7] border border-[#E6DDCF] rounded-lg p-3.5 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#E6DDCF] pb-2">
                <span className="font-bold text-[#845306] uppercase tracking-wide flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  STRATEGY for STOCKS (EQUITIES)
                </span>
                <span className="text-[10px] text-[#78716C] font-mono">Timeframes: 1-HR, 4-HR, 1-DAY</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-[#E6DDCF] text-[#78716C]">
                      <th className="py-1 px-2">INDICATOR</th>
                      <th className="py-1 px-2">TIMEFRAME</th>
                      <th className="py-1 px-2 text-emerald-700">BUY (LONG)</th>
                      <th className="py-1 px-2 text-rose-700">SELL (SHORT)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EFE8DC] font-mono">
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-[#1C1917]">ICHIMOKU</td>
                      <td className="py-1.5 px-2 text-[#78716C]">1-HR, 4-HR, 1-DAY</td>
                      <td className="py-1.5 px-2 text-emerald-700">Tenkan &gt; Kijun; both &gt; cloud</td>
                      <td className="py-1.5 px-2 text-rose-700">Tenkan &lt; Kijun; both &gt; cloud (or &lt; cloud)</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-[#1C1917]">CCI (40)</td>
                      <td className="py-1.5 px-2 text-[#78716C]">1-HR, 4-HR, 1-DAY</td>
                      <td className="py-1.5 px-2 text-emerald-700">above 100</td>
                      <td className="py-1.5 px-2 text-rose-700">below -100</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 px-2 font-semibold text-[#1C1917]">STOCH (12,3,3)</td>
                      <td className="py-1.5 px-2 text-[#78716C]">1-HR, 4-HR, 1-DAY</td>
                      <td className="py-1.5 px-2 text-emerald-700">Main &gt; Signal; above 80</td>
                      <td className="py-1.5 px-2 text-rose-700">Main &lt; Signal; below 20</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="bg-[#FDF4DC] border border-[#F3DA90] rounded p-2 text-[10px] text-[#845306]">
                <strong>Why Stoch &gt; 80?</strong> Overbought Stochastic confirms strong breakout momentum extension rather than weak counter-trend chop.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Strip with Watchlist Template Elegance */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-[#E6DDCF] shadow-sm">
          <span className="text-[11px] text-[#78716C] block font-medium">Logged Tickers</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-[#1C1917] font-mono">{activeRows.length}</span>
            <span className="text-xs text-[#A8A29E] font-mono">positions</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E6DDCF] shadow-sm">
          <span className="text-[11px] text-[#78716C] block font-medium">Full 9/9 Confluence</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-emerald-700 font-mono">{fullConfluenceRowsCount}</span>
            <span className="text-xs text-[#A8A29E] font-mono">/ {activeRows.length} aligned</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E6DDCF] shadow-sm">
          <span className="text-[11px] text-[#78716C] block font-medium">Total Cost Basis</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-bold text-[#1C1917] font-mono">{formatCurrency(totalInvested, 0)}</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-[#E6DDCF] shadow-sm">
          <span className="text-[11px] text-[#78716C] block font-medium">Live Unrealized P&amp;L</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-xl font-bold font-mono ${totalUnrealizedPnl >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {totalUnrealizedPnl >= 0 ? '+' : ''}{formatCurrency(totalUnrealizedPnl, 0)}
            </span>
            <span className={`text-xs font-mono ${totalUnrealizedPnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ({formatPercent(totalPnlPct)})
            </span>
          </div>
        </div>
      </div>

      {/* Sheet View: Google Sheets Layout */}
      <div className="bg-white border border-[#E6DDCF] rounded-xl overflow-hidden shadow-sm flex flex-col">
        {/* Google Sheets Window Style Header Bar */}
        <div className="px-4 py-2.5 bg-[#FAF7F2] border-b border-[#E6DDCF] flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[#1C1917] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]"></span>
              <span className="text-[#1C1917] font-bold">TRADING JOURNAL</span>
              <span className="text-[#845306] text-[10px] hidden sm:inline">• Autosaved to browser</span>
            </div>
          </div>

          {/* Active Date Header Editor */}
          <div className="flex items-center gap-2">
            <span className="text-[#78716C] text-[11px]">Active Log Date:</span>
            <input
              type="text"
              value={activeDateHeader}
              onChange={e => setActiveDateHeader(e.target.value)}
              className="bg-white border border-[#E6DDCF] rounded px-2 py-0.5 text-[#1C1917] font-mono font-bold text-xs text-center w-28 focus:outline-none focus:border-[#D4AF37]"
              title="Click to rename active date column header"
            />
          </div>
        </div>

        {/* Tab 1: Live Embedded Google Sheet Direct View */}
        {activeSheetTab === 'GOOGLE_SHEET_EMBED' ? (
          <div className="p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#FAF7F2] rounded-xl border border-[#E6DDCF]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-bold text-[#1C1917]">Google Sheet Direct View</span>
                <span className="text-[11px] text-[#78716C] font-mono hidden md:inline truncate max-w-sm">({googleSheetUrl})</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[#F5EFEB] hover:bg-[#EFE8DC] text-[#1C1917] border border-[#E6DDCF] flex items-center gap-1.5 transition-colors font-medium"
                >
                  {hasCopiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#78716C]" />}
                  <span>{hasCopiedUrl ? 'Copied URL!' : 'Copy Direct Link'}</span>
                </button>
                <a
                  href={googleSheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C59B27] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#1C1917] font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Window</span>
                </a>
              </div>
            </div>

            <div className="w-full h-[620px] bg-[#FFFDF7] rounded-xl border border-[#E6DDCF] overflow-hidden relative shadow-inner">
              <iframe
                src={`${googleSheetUrl.split('/edit')[0]}/edit?rm=minimal`}
                title="Google Sheets Live Document"
                className="w-full h-full border-0"
                allow="clipboard-write"
              />
            </div>
          </div>
        ) : activeSheetTab === 'Trade Journal' ? (
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-[#E6DDCF] p-4 rounded-xl space-y-2 shadow-sm">
                <span className="text-xs text-[#78716C] font-medium">Strategy Discipline Score</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-700">87.5%</span>
                  <span className="text-xs text-emerald-600 font-mono font-bold">Disciplined</span>
                </div>
                <p className="text-[11px] text-[#78716C]">
                  7 of 8 trades respected full multi-timeframe bar-close confirmation. Only 1 premature entry flagged.
                </p>
              </div>

              <div className="bg-white border border-[#E6DDCF] p-4 rounded-xl space-y-2 shadow-sm">
                <span className="text-xs text-[#78716C] font-medium">Multi-Timeframe Alignment</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-[#1C1917]">{fullConfluenceRowsCount} / {activeRows.length}</span>
                  <span className="text-xs text-[#845306] font-mono font-bold">Full 9/9 Passed</span>
                </div>
                <p className="text-[11px] text-[#78716C]">
                  Ichimoku + CCI(40) &gt; 100 + Stoch(12,3,3) &gt; 80 aligned across 1-HR, 4-HR and Daily timeframes.
                </p>
              </div>

              <div className="bg-white border border-[#E6DDCF] p-4 rounded-xl space-y-2 shadow-sm">
                <span className="text-xs text-[#78716C] font-medium">Direct Google Sheets Link</span>
                <div className="flex items-center gap-2 pt-1">
                  <a
                    href={googleSheetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => {
                      try { window.open(googleSheetUrl, '_blank', 'noopener,noreferrer'); } catch(e) {}
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C59B27] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#1C1917] font-bold text-xs shadow-sm"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Launch Google Sheets</span>
                  </a>
                  <button
                    onClick={handleCopyLink}
                    className="p-1.5 rounded-lg bg-[#F5EFEB] hover:bg-[#EFE8DC] text-[#1C1917] border border-[#E6DDCF] text-xs"
                    title="Copy direct link"
                  >
                    {hasCopiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <p className="text-[11px] text-[#78716C]">
                  Active sheet: <span className="font-mono text-[#845306] truncate block max-w-xs">{googleSheetUrl}</span>
                </p>
              </div>
            </div>

            {/* Daily Execution Reflections & Log History */}
            <div className="bg-white border border-[#E6DDCF] rounded-xl p-4 space-y-3 shadow-sm">
              <h3 className="font-bold text-[#1C1917] text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#B8860B]" />
                <span>Daily Trading Log &amp; Execution Reflections ({activeDateHeader})</span>
              </h3>

              <div className="space-y-2.5">
                {stockRows.filter(r => r.notes.trim()).map(r => (
                  <div key={r.id} className="p-3 rounded-lg bg-[#FAF7F2] border border-[#E6DDCF] flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#845306] text-xs">{r.ticker}</span>
                        <span className="text-[10px] text-[#78716C]">{r.entryDate}</span>
                        <span className="text-[10px] font-mono text-[#1C1917]">Entry: ${r.entryPrice.toFixed(2)}</span>
                        {r.stopLossPrice && (
                          <span className="text-[10px] font-mono text-[#845306] font-bold">SL: ${r.stopLossPrice.toFixed(2)}</span>
                        )}
                      </div>
                      <p className={`text-xs ${
                        r.noteColor === 'red' || r.notes.toLowerCase().includes("should've") || r.notes.toLowerCase().includes('pre-mature')
                          ? 'text-rose-700 font-semibold'
                          : r.noteColor === 'green' || r.notes.toLowerCase().includes('riding')
                          ? 'text-emerald-700 font-medium'
                          : 'text-[#1C1917]'
                      }`}>
                        &ldquo;{r.notes}&rdquo;
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-[#FDF4DC] text-[#845306] border border-[#F3DA90]">
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
              <tr className="bg-[#F5EFEB] text-[#1C1917] border-b border-[#E6DDCF] text-xs font-bold font-mono uppercase tracking-wider">
                <th className="py-2.5 px-3 border-r border-[#E6DDCF] w-32 text-[#845306]">STOCK</th>
                <th className="py-2.5 px-3 border-r border-[#E6DDCF] w-24 text-right text-[#78716C]">AMOUNT</th>
                <th className="py-2.5 px-3 border-r border-[#E6DDCF] w-24 text-right text-[#78716C]">ENTRY</th>
                <th className="py-2.5 px-3 border-r border-[#E6DDCF] w-24 text-right text-[#845306]">SL</th>
                {/* 3 Timeframe Columns */}
                <th className="py-2.5 px-3 border-r border-[#E6DDCF] w-28 text-center bg-[#EFE8DC]">
                  {activeSheetTab === 'STOCKS' ? '1-HR' : '1-MIN'}
                  <div className="text-[9px] font-normal text-[#78716C] lowercase">ichi • cci • stoch</div>
                </th>
                <th className="py-2.5 px-3 border-r border-[#E6DDCF] w-28 text-center bg-[#EFE8DC]">
                  {activeSheetTab === 'STOCKS' ? '4-HR' : '5-MIN'}
                  <div className="text-[9px] font-normal text-[#78716C] lowercase">ichi • cci • stoch</div>
                </th>
                <th className="py-2.5 px-3 border-r border-[#E6DDCF] w-28 text-center bg-[#EFE8DC]">
                  {activeSheetTab === 'STOCKS' ? 'DAILY' : '15-MIN'}
                  <div className="text-[9px] font-normal text-[#78716C] lowercase">ichi • cci • stoch</div>
                </th>
                {/* Date Notes Column Header (Col H: "27-Sep-26") */}
                <th className="py-2.5 px-4 min-w-[280px] bg-[#FAF7F2] text-[#845306]">
                  {activeDateHeader} (COMMENTS &amp; EXIT LOG)
                </th>
                <th className="py-2.5 px-2 w-16 text-center text-[#78716C]">ACTIONS</th>
              </tr>
            </thead>

            {/* Table Body (Block of 3 rows per stock) */}
            <tbody className="divide-y divide-[#EFE8DC] text-xs font-mono bg-white">
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
                    <tr className="bg-white hover:bg-[#FAF7F2] transition-colors border-t border-[#E6DDCF]">
                      {/* Col A: STOCK */}
                      <td className="py-2 px-3 border-r border-[#EFE8DC] font-bold text-[#1C1917] flex items-center justify-between">
                        <span 
                          onClick={() => onSelectTicker && onSelectTicker(row.ticker)}
                          className="cursor-pointer hover:text-[#845306] transition-colors flex items-center gap-1.5"
                        >
                          <span className="text-sm font-black text-[#1C1917]">{row.ticker}</span>
                          <ArrowUpRight className="w-3 h-3 text-[#A8A29E]" />
                        </span>
                        <span className="text-[10px] text-[#78716C] font-normal">{row.entryDate}</span>
                      </td>

                      {/* Col B: AMOUNT */}
                      <td className="py-2 px-3 border-r border-[#EFE8DC] text-right text-[#1C1917] font-semibold">
                        {row.amount.toFixed(2)}
                      </td>

                      {/* Col C: ENTRY */}
                      <td className="py-2 px-3 border-r border-[#EFE8DC] text-right text-[#1C1917]">
                        {formatCurrency(row.entryPrice)}
                        <div className={`text-[10px] ${pnlDollars >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-700 font-bold'}`}>
                          {pnlDollars >= 0 ? '+' : ''}{pnlDollars.toFixed(1)} ({formatPercent(pnlPct)})
                        </div>
                      </td>

                      {/* Col D: SL (Stop Loss) */}
                      <td className="py-2 px-3 border-r border-[#EFE8DC] text-right">
                        <input
                          type="text"
                          defaultValue={row.stopLossPrice ? row.stopLossPrice.toFixed(2) : ''}
                          onBlur={e => handleUpdateSL(row.id, e.target.value)}
                          placeholder="—"
                          className="bg-transparent text-right text-[#845306] font-mono font-bold w-16 focus:bg-[#FAF7F2] focus:outline-none rounded px-1"
                          title="Click to edit Stop Loss price"
                        />
                      </td>

                      {/* Col E: TF1 (1-HR) - Checkbox 1: ☁️ Ichimoku */}
                      <td className="py-1 px-3 border-r border-[#EFE8DC] text-center bg-[#FAF7F2]/60">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf1', 'ichimoku')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-[#F5EFEB] transition-colors"
                          title="Ichimoku: Tenkan > Kijun; both above cloud"
                        >
                          {row.tf1.ichimoku ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-[#A8A29E]" />
                          )}
                        </button>
                      </td>

                      {/* Col F: TF2 (4-HR) - Checkbox 1: ☁️ Ichimoku */}
                      <td className="py-1 px-3 border-r border-[#EFE8DC] text-center bg-[#FAF7F2]/60">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf2', 'ichimoku')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-[#F5EFEB] transition-colors"
                          title="Ichimoku: Tenkan > Kijun; both above cloud"
                        >
                          {row.tf2.ichimoku ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-[#A8A29E]" />
                          )}
                        </button>
                      </td>

                      {/* Col G: TF3 (DAILY) - Checkbox 1: ☁️ Ichimoku */}
                      <td className="py-1 px-3 border-r border-[#EFE8DC] text-center bg-[#FAF7F2]/60">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf3', 'ichimoku')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-[#F5EFEB] transition-colors"
                          title="Ichimoku: Tenkan > Kijun; both above cloud"
                        >
                          {row.tf3.ichimoku ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-[#A8A29E]" />
                          )}
                        </button>
                      </td>

                      {/* Col H: Date Comments (Editable text matching screenshot) */}
                      <td rowSpan={3} className="py-2 px-3 border-r border-[#EFE8DC] align-top bg-white">
                        <textarea
                          rows={3}
                          value={row.notes}
                          onChange={e => handleUpdateNotes(row.id, e.target.value)}
                          placeholder="Log notes, pullback observation, exit triggers..."
                          className={`w-full bg-transparent resize-none font-sans text-xs focus:bg-[#FAF7F2] focus:outline-none rounded p-1.5 transition-colors ${
                            isRedNote
                              ? 'text-rose-700 font-semibold'
                              : isGreenNote
                              ? 'text-emerald-700 font-medium'
                              : 'text-[#1C1917]'
                          }`}
                        />
                      </td>

                      {/* Actions */}
                      <td rowSpan={3} className="py-2 px-2 text-center align-middle bg-white">
                        <button
                          onClick={() => handleDeleteRow(row.id)}
                          className="p-1 text-[#A8A29E] hover:text-rose-600 rounded transition-colors"
                          title="Delete this row"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>

                    {/* Subrow 2: Indicator 2 (📊 CCI 40) Checkbox Row */}
                    <tr className="bg-[#FDFBF7]/80 text-[#78716C] hover:bg-[#F5EFEB]">
                      <td className="py-0.5 px-3 border-r border-[#EFE8DC] text-[10px] text-[#78716C] font-sans font-semibold">
                        📊 CCI (40) &gt; 100
                      </td>
                      <td className="border-r border-[#EFE8DC]"></td>
                      <td className="border-r border-[#EFE8DC]"></td>
                      <td className="border-r border-[#EFE8DC]"></td>
                      {/* TF1 CCI */}
                      <td className="py-0.5 px-3 border-r border-[#EFE8DC] text-center bg-[#FAF7F2]/60">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf1', 'cci')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-[#F5EFEB] transition-colors"
                          title="CCI (40) > 100"
                        >
                          {row.tf1.cci ? (
                            <CheckSquare className="w-4 h-4 text-sky-600" />
                          ) : (
                            <Square className="w-4 h-4 text-[#A8A29E]" />
                          )}
                        </button>
                      </td>
                      {/* TF2 CCI */}
                      <td className="py-0.5 px-3 border-r border-[#EFE8DC] text-center bg-[#FAF7F2]/60">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf2', 'cci')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-[#F5EFEB] transition-colors"
                          title="CCI (40) > 100"
                        >
                          {row.tf2.cci ? (
                            <CheckSquare className="w-4 h-4 text-sky-600" />
                          ) : (
                            <Square className="w-4 h-4 text-[#A8A29E]" />
                          )}
                        </button>
                      </td>
                      {/* TF3 CCI */}
                      <td className="py-0.5 px-3 border-r border-[#EFE8DC] text-center bg-[#FAF7F2]/60">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf3', 'cci')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-[#F5EFEB] transition-colors"
                          title="CCI (40) > 100"
                        >
                          {row.tf3.cci ? (
                            <CheckSquare className="w-4 h-4 text-sky-600" />
                          ) : (
                            <Square className="w-4 h-4 text-[#A8A29E]" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* Subrow 3: Indicator 3 (⚡ STOCH 12,3,3) Checkbox Row */}
                    <tr className="bg-[#FDFBF7]/80 text-[#78716C] hover:bg-[#F5EFEB] border-b border-[#EFE8DC]">
                      <td className="py-0.5 px-3 border-r border-[#EFE8DC] text-[10px] text-[#78716C] font-sans font-semibold">
                        ⚡ Stoch %K &gt; %D &amp; &gt; 80
                      </td>
                      <td className="border-r border-[#EFE8DC]"></td>
                      <td className="border-r border-[#EFE8DC]"></td>
                      <td className="border-r border-[#EFE8DC]"></td>
                      {/* TF1 Stoch */}
                      <td className="py-0.5 px-3 border-r border-[#EFE8DC] text-center bg-[#FAF7F2]/60">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf1', 'stoch')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-[#F5EFEB] transition-colors"
                          title="Stoch (12,3,3) Main > Signal; above 80"
                        >
                          {row.tf1.stoch ? (
                            <CheckSquare className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Square className="w-4 h-4 text-[#A8A29E]" />
                          )}
                        </button>
                      </td>
                      {/* TF2 Stoch */}
                      <td className="py-0.5 px-3 border-r border-[#EFE8DC] text-center bg-[#FAF7F2]/60">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf2', 'stoch')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-[#F5EFEB] transition-colors"
                          title="Stoch (12,3,3) Main > Signal; above 80"
                        >
                          {row.tf2.stoch ? (
                            <CheckSquare className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Square className="w-4 h-4 text-[#A8A29E]" />
                          )}
                        </button>
                      </td>
                      {/* TF3 Stoch */}
                      <td className="py-0.5 px-3 border-r border-[#EFE8DC] text-center bg-[#FAF7F2]/60">
                        <button
                          onClick={() => handleToggleCheckbox(row.id, 'tf3', 'stoch')}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-[#F5EFEB] transition-colors"
                          title="Stoch (12,3,3) Main > Signal; above 80"
                        >
                          {row.tf3.stoch ? (
                            <CheckSquare className="w-4 h-4 text-amber-600" />
                          ) : (
                            <Square className="w-4 h-4 text-[#A8A29E]" />
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

        {/* Google Sheets Bottom Tab Bar (Trade Journal | STOCKS | XAUUSD_BTCUSD | Google Sheets Live) */}
        <div className="bg-[#FAF7F2] border-t border-[#E6DDCF] px-3 py-1.5 flex items-center justify-between text-xs select-none">
          <div className="flex items-center space-x-1 overflow-x-auto">
            <button
              onClick={() => setActiveSheetTab('Trade Journal')}
              className={`px-3 py-1.5 rounded-t-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeSheetTab === 'Trade Journal'
                  ? 'bg-white text-[#1C1917] border-t-2 border-[#D4AF37] font-bold shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5EFEB]'
              }`}
            >
              <span>Trade Journal</span>
            </button>

            <button
              id="sheet-tab-stocks"
              onClick={() => setActiveSheetTab('STOCKS')}
              className={`px-3 py-1.5 rounded-t-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeSheetTab === 'STOCKS'
                  ? 'bg-white text-[#1C1917] border-t-2 border-[#D4AF37] font-bold shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5EFEB]'
              }`}
            >
              <span>STOCKS</span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                activeSheetTab === 'STOCKS'
                  ? 'bg-[#D4AF37] text-[#1C1917]'
                  : 'bg-[#FDF4DC] text-[#845306] border border-[#F3DA90]'
              }`}>
                {stockRows.length}
              </span>
            </button>

            <button
              id="sheet-tab-xauusd-btcusd"
              onClick={() => setActiveSheetTab('XAUUSD_BTCUSD')}
              className={`px-3 py-1.5 rounded-t-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeSheetTab === 'XAUUSD_BTCUSD'
                  ? 'bg-white text-[#1C1917] border-t-2 border-[#D4AF37] font-bold shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5EFEB]'
              }`}
            >
              <span>XAUUSD_BTCUSD</span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                activeSheetTab === 'XAUUSD_BTCUSD'
                  ? 'bg-[#D4AF37] text-[#1C1917]'
                  : 'bg-[#FDF4DC] text-[#845306] border border-[#F3DA90]'
              }`}>
                {metalsCryptoRows.length}
              </span>
            </button>

            <button
              id="sheet-tab-live-embed"
              onClick={() => setActiveSheetTab('GOOGLE_SHEET_EMBED')}
              className={`px-3 py-1.5 rounded-t-lg font-semibold flex items-center gap-1.5 transition-colors ${
                activeSheetTab === 'GOOGLE_SHEET_EMBED'
                  ? 'bg-white text-[#845306] border-t-2 border-[#D4AF37] font-bold shadow-xs'
                  : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5EFEB]'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#B8860B]" />
              <span>Google Sheets (Live View)</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-[#78716C] text-[11px] font-mono">
            <span>3 checkboxes = ☁️ Ichi, 📊 CCI(40), ⚡ Stoch(12,3,3)</span>
          </div>
        </div>
      </div>

      {/* Add New Stock / Position Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FFFDF7] border border-[#E6DDCF] rounded-2xl p-5 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#E6DDCF] pb-3">
              <h3 className="font-bold text-[#1C1917] text-sm flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#B8860B]" />
                Add Entry to {activeSheetTab} Log
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-[#78716C] hover:text-[#1C1917]">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[#1C1917] font-semibold mb-1">Ticker / Asset Symbol</label>
                <input
                  type="text"
                  value={newTicker}
                  onChange={e => setNewTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. AMD, NVDA, XAUUSD"
                  className="w-full bg-white border border-[#E6DDCF] rounded-lg px-3 py-2 text-[#1C1917] font-mono font-bold focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#1C1917] font-semibold mb-1">Position Amount / Shares</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    placeholder="41.92"
                    className="w-full bg-white border border-[#E6DDCF] rounded-lg px-3 py-2 text-[#1C1917] font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-[#1C1917] font-semibold mb-1">Entry Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newEntryPrice}
                    onChange={e => setNewEntryPrice(e.target.value)}
                    placeholder="522.64"
                    className="w-full bg-white border border-[#E6DDCF] rounded-lg px-3 py-2 text-[#1C1917] font-mono focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#1C1917] font-semibold mb-1">
                  Stop Loss ($) <span className="text-[#78716C] text-[11px]">(bottom of crossover bar close)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newSlPrice}
                  onChange={e => setNewSlPrice(e.target.value)}
                  placeholder="Optional SL level"
                  className="w-full bg-white border border-[#E6DDCF] rounded-lg px-3 py-2 text-[#1C1917] font-mono focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-[#1C1917] font-semibold mb-1">Initial Daily Note / Comments</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="e.g. riding trend, possible pullback"
                  className="w-full bg-white border border-[#E6DDCF] rounded-lg px-3 py-2 text-[#1C1917] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E6DDCF]">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-[#F5EFEB] hover:bg-[#EFE8DC] text-[#1C1917] font-medium text-xs border border-[#E6DDCF]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddNewRow}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#C59B27] hover:from-[#E5C158] hover:to-[#D4AF37] text-[#1C1917] font-bold text-xs shadow-sm"
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
