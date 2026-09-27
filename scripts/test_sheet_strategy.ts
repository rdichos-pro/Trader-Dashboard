import { calculateIchimoku, calculateStochastic, calculateCCI } from '../src/utils/indicators.js';

interface Candle {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Trade {
  id: number;
  symbol: string;
  type: 'BUY' | 'SELL';
  entryTime: string;
  entryPrice: number;
  exitTime: string;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  pnl: number;
  pnlR: number;
  result: 'WIN' | 'LOSS';
  barsHeld: number;
  exitReason: string;
}

function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generate6MonthCandles(symbol: string, basePrice: number, seedOffset: number): Candle[] {
  const candles: Candle[] = [];
  const tradingDays = 130;
  const barsPerDay = 1440;
  const totalBars = tradingDays * barsPerDay;
  
  const startTime = new Date('2026-03-20T00:00:00Z').getTime();
  let currentPrice = basePrice;
  let momentum = 0;
  let seed = seedOffset;

  const volatility = symbol === 'XAUUSD' ? 0.00035 : 0.00045;
  const spreadMultiplier = symbol === 'XAUUSD' ? 0.00015 : 0.0003;

  for (let i = 0; i < totalBars; i++) {
    const timestamp = startTime + i * 60 * 1000;
    const date = new Date(timestamp);
    const day = date.getUTCDay();
    if (day === 6 || (day === 0 && date.getUTCHours() < 21)) continue;

    seed++;
    const r1 = seededRandom(seed);
    const r2 = seededRandom(seed + 1);
    const r3 = seededRandom(seed + 2);

    const regimeCycle = Math.sin(i / (barsPerDay * 3.5)) * 0.00008;
    const noise = r1 - 0.499 + regimeCycle;
    momentum = momentum * 0.85 + noise * 0.15;

    const change = momentum * volatility * currentPrice;
    const open = currentPrice;
    const close = Math.max(basePrice * 0.5, currentPrice + change);
    const high = Math.max(open, close) + r2 * (currentPrice * spreadMultiplier);
    const low = Math.min(open, close) - r3 * (currentPrice * spreadMultiplier);
    const volume = Math.floor(100 + r1 * 500);

    candles.push({
      time: date.toISOString().replace('T', ' ').substring(0, 16),
      timestamp,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
      volume,
    });

    currentPrice = close;
  }
  return candles;
}

function aggregateCandles(candles1m: Candle[], periodMinutes: number): Candle[] {
  const aggregated: Candle[] = [];
  const periodMs = periodMinutes * 60 * 1000;
  let currentBucketTime = 0;
  let curOpen = 0, curHigh = -Infinity, curLow = Infinity, curClose = 0, curVol = 0;
  let bucketOpen = false;

  for (const c of candles1m) {
    const bucketTime = Math.floor(c.timestamp / periodMs) * periodMs;
    if (!bucketOpen || bucketTime !== currentBucketTime) {
      if (bucketOpen) {
        aggregated.push({
          time: new Date(currentBucketTime).toISOString().replace('T', ' ').substring(0, 16),
          timestamp: currentBucketTime,
          open: Number(curOpen.toFixed(2)),
          high: Number(curHigh.toFixed(2)),
          low: Number(curLow.toFixed(2)),
          close: Number(curClose.toFixed(2)),
          volume: curVol,
        });
      }
      currentBucketTime = bucketTime;
      curOpen = c.open; curHigh = c.high; curLow = c.low; curClose = c.close; curVol = c.volume;
      bucketOpen = true;
    } else {
      curHigh = Math.max(curHigh, c.high);
      curLow = Math.min(curLow, c.low);
      curClose = c.close;
      curVol += c.volume;
    }
  }
  if (bucketOpen) {
    aggregated.push({
      time: new Date(currentBucketTime).toISOString().replace('T', ' ').substring(0, 16),
      timestamp: currentBucketTime,
      open: Number(curOpen.toFixed(2)),
      high: Number(curHigh.toFixed(2)),
      low: Number(curLow.toFixed(2)),
      close: Number(curClose.toFixed(2)),
      volume: curVol,
    });
  }
  return aggregated;
}

function computeIndicators(candles: Candle[]) {
  const highs = candles.map(c => c.high);
  const lows = candles.map(c => c.low);
  const closes = candles.map(c => c.close);
  const ichi = calculateIchimoku(highs, lows, closes);
  const stoch = calculateStochastic(highs, lows, closes, 12, 3, 3);
  const cci = calculateCCI(highs, lows, closes, 40);
  return { candles, tenkan: ichi.tenkan, kijun: ichi.kijun, cloudTop: ichi.cloudTop, cloudBottom: ichi.cloudBottom, cci, stochK: stoch.stochK, stochD: stoch.stochD };
}

export function runSheetStrategy(
  symbol: string,
  candles1m: Candle[],
  sellCloudMode: 'BELOW_CLOUD' | 'ABOVE_CLOUD' = 'BELOW_CLOUD'
) {
  const candles5m = aggregateCandles(candles1m, 5);
  const candles15m = aggregateCandles(candles1m, 15);

  const frame1m = computeIndicators(candles1m);
  const frame5m = computeIndicators(candles5m);
  const frame15m = computeIndicators(candles15m);

  const tsToIdx5m = new Map<number, number>();
  candles5m.forEach((c, i) => tsToIdx5m.set(c.timestamp, i));

  const tsToIdx15m = new Map<number, number>();
  candles15m.forEach((c, i) => tsToIdx15m.set(c.timestamp, i));

  const trades: Trade[] = [];
  let currentPosition: any = null;

  for (let i = 15 * 60; i < candles1m.length - 1; i++) {
    const c1 = candles1m[i];
    const hour = new Date(c1.timestamp).getUTCHours();
    // Standard liquid hours 07:00 - 19:00 UTC
    if (hour < 7 || hour > 19) continue;

    const ts5 = Math.floor(c1.timestamp / (5 * 60 * 1000)) * (5 * 60 * 1000);
    const ts15 = Math.floor(c1.timestamp / (15 * 60 * 1000)) * (15 * 60 * 1000);

    const idx5 = tsToIdx5m.get(ts5);
    const idx15 = tsToIdx15m.get(ts15);
    if (idx5 === undefined || idx15 === undefined || idx5 < 60 || idx15 < 60) continue;

    if (currentPosition) {
      const p = currentPosition;
      const barsHeld = i - p.entryIndex;
      let exitPrice = 0;
      let exitReason = '';

      if (p.type === 'BUY') {
        if (c1.low <= p.stopLoss) { exitPrice = p.stopLoss; exitReason = 'SL'; }
        else if (c1.high >= p.takeProfit) { exitPrice = p.takeProfit; exitReason = 'TP'; }
        else if (barsHeld > 120 && frame1m.tenkan[i]! < frame1m.kijun[i]!) { exitPrice = c1.close; exitReason = 'TK Reversal'; }
      } else {
        if (c1.high >= p.stopLoss) { exitPrice = p.stopLoss; exitReason = 'SL'; }
        else if (c1.low <= p.takeProfit) { exitPrice = p.takeProfit; exitReason = 'TP'; }
        else if (barsHeld > 120 && frame1m.tenkan[i]! > frame1m.kijun[i]!) { exitPrice = c1.close; exitReason = 'TK Reversal'; }
      }

      if (exitReason) {
        const spread = symbol === 'XAUUSD' ? 0.25 : 0.02;
        const pnl = p.type === 'BUY' ? (exitPrice - p.entryPrice - spread) : (p.entryPrice - exitPrice - spread);
        const pnlR = p.risk > 0 ? pnl / p.risk : 0;
        trades.push({
          id: trades.length + 1,
          symbol,
          type: p.type,
          entryTime: p.entryTime,
          entryPrice: p.entryPrice,
          exitTime: c1.time,
          exitPrice,
          stopLoss: p.stopLoss,
          takeProfit: p.takeProfit,
          pnl: Number(pnl.toFixed(2)),
          pnlR: Number(pnlR.toFixed(2)),
          result: pnl > 0 ? 'WIN' : 'LOSS',
          barsHeld,
          exitReason,
        });
        currentPosition = null;
      }
      continue;
    }

    // --- EXACT RULES FROM THE SCREENSHOT ---
    
    // BUY RULES:
    // 1-MIN:
    // - Tenkan > Kijun; both above cloud
    // - CCI(40) > 100
    // - Stoch(12,3,3): Main > Signal; above 80 (Main > 80)
    const t1 = frame1m.tenkan[i] ?? 0;
    const kj1 = frame1m.kijun[i] ?? 0;
    const top1 = frame1m.cloudTop[i] ?? 0;
    const bot1 = frame1m.cloudBottom[i] ?? 0;
    const cci1 = frame1m.cci[i] ?? 0;
    const k1 = frame1m.stochK[i] ?? 0;
    const d1 = frame1m.stochD[i] ?? 0;

    const buy1m = (t1 > kj1) && (t1 > top1) && (kj1 > top1) && (cci1 > 100) && (k1 > d1) && (k1 > 80);

    // 5-MIN:
    const t5 = frame5m.tenkan[idx5] ?? 0;
    const kj5 = frame5m.kijun[idx5] ?? 0;
    const top5 = frame5m.cloudTop[idx5] ?? 0;
    const bot5 = frame5m.cloudBottom[idx5] ?? 0;
    const cci5 = frame5m.cci[idx5] ?? 0;
    const k5 = frame5m.stochK[idx5] ?? 0;
    const d5 = frame5m.stochD[idx5] ?? 0;

    const buy5m = (t5 > kj5) && (t5 > top5) && (kj5 > top5) && (cci5 > 100) && (k5 > d5) && (k5 > 80);

    // 15-MIN:
    const t15 = frame15m.tenkan[idx15] ?? 0;
    const kj15 = frame15m.kijun[idx15] ?? 0;
    const top15 = frame15m.cloudTop[idx15] ?? 0;
    const bot15 = frame15m.cloudBottom[idx15] ?? 0;
    const cci15 = frame15m.cci[idx15] ?? 0;
    const k15 = frame15m.stochK[idx15] ?? 0;
    const d15 = frame15m.stochD[idx15] ?? 0;

    const buy15m = (t15 > kj15) && (t15 > top15) && (kj15 > top15) && (cci15 > 100) && (k15 > d15) && (k15 > 80);

    // SELL RULES:
    // 1-MIN:
    // - Tenkan < Kijun;
    // - if below cloud: both < bot1; if literal image "both above cloud": both > top1
    const sellCloudCondition1 = sellCloudMode === 'BELOW_CLOUD' ? (t1 < bot1 && kj1 < bot1) : (t1 > top1 && kj1 > top1);
    const sell1m = (t1 < kj1) && sellCloudCondition1 && (cci1 < -100) && (k1 < d1) && (k1 < 20);

    // 5-MIN:
    const sellCloudCondition5 = sellCloudMode === 'BELOW_CLOUD' ? (t5 < bot5 && kj5 < bot5) : (t5 > top5 && kj5 > top5);
    const sell5m = (t5 < kj5) && sellCloudCondition5 && (cci5 < -100) && (k5 < d5) && (k5 < 20);

    // 15-MIN:
    const sellCloudCondition15 = sellCloudMode === 'BELOW_CLOUD' ? (t15 < bot15 && kj15 < bot15) : (t15 > top15 && kj15 > top15);
    const sell15m = (t15 < kj15) && sellCloudCondition15 && (cci15 < -100) && (k15 < d15) && (k15 < 20);

    // Trigger on transition into confluence
    const allBuy = buy1m && buy5m && buy15m;
    const allSell = sell1m && sell5m && sell15m;

    if (allBuy) {
      const entryPrice = c1.close;
      let recentMin = c1.low;
      for (let k = 1; k <= 8; k++) recentMin = Math.min(recentMin, candles1m[i - k].low);
      const stopBuffer = symbol === 'XAUUSD' ? 1.5 : 0.12;
      const stopLoss = Number((Math.min(recentMin, kj1) - stopBuffer).toFixed(2));
      const risk = entryPrice - stopLoss;
      const minRisk = symbol === 'XAUUSD' ? 0.8 : 0.05;
      const maxRisk = symbol === 'XAUUSD' ? 12 : 0.8;

      if (risk > minRisk && risk < maxRisk) {
        const takeProfit = Number((entryPrice + risk * 2.0).toFixed(2));
        currentPosition = { type: 'BUY', entryIndex: i, entryPrice, entryTime: c1.time, stopLoss, takeProfit, risk };
      }
    } else if (allSell) {
      const entryPrice = c1.close;
      let recentMax = c1.high;
      for (let k = 1; k <= 8; k++) recentMax = Math.max(recentMax, candles1m[i - k].high);
      const stopBuffer = symbol === 'XAUUSD' ? 1.5 : 0.12;
      const stopLoss = Number((Math.max(recentMax, kj1) + stopBuffer).toFixed(2));
      const risk = stopLoss - entryPrice;
      const minRisk = symbol === 'XAUUSD' ? 0.8 : 0.05;
      const maxRisk = symbol === 'XAUUSD' ? 12 : 0.8;

      if (risk > minRisk && risk < maxRisk) {
        const takeProfit = Number((entryPrice - risk * 2.0).toFixed(2));
        currentPosition = { type: 'SELL', entryIndex: i, entryPrice, entryTime: c1.time, stopLoss, takeProfit, risk };
      }
    }
  }

  const wins = trades.filter(t => t.result === 'WIN');
  const losses = trades.filter(t => t.result === 'LOSS');
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const totalProfit = trades.reduce((acc, t) => acc + t.pnl, 0);
  const grossProfit = wins.reduce((acc, t) => acc + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((acc, t) => acc + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;
  let peak = 0, maxDD = 0, running = 0;
  trades.forEach(t => {
    running += t.pnl;
    if (running > peak) peak = running;
    if (peak - running > maxDD) maxDD = peak - running;
  });
  const totalR = trades.reduce((acc, t) => acc + t.pnlR, 0);
  const buys = trades.filter(t => t.type === 'BUY').length;
  const sells = trades.filter(t => t.type === 'SELL').length;

  return {
    symbol,
    sellCloudMode,
    totalTrades: trades.length,
    buys,
    sells,
    wins: wins.length,
    losses: losses.length,
    winRate: Number(winRate.toFixed(1)),
    profitFactor: Number(profitFactor.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    totalR: Number(totalR.toFixed(2)),
    maxDrawdown: Number(maxDD.toFixed(2)),
    avgHold: trades.length > 0 ? Math.round(trades.reduce((a, b) => a + b.barsHeld, 0) / trades.length) : 0,
    sampleTrades: trades.slice(0, 5),
  };
}

async function main() {
  const xauCandles = generate6MonthCandles('XAUUSD', 2515.40, 101);
  const xagCandles = generate6MonthCandles('XAGUSD', 31.25, 202);

  // 1. Standard interpretation (Sell: both below cloud)
  const resXauStandard = runSheetStrategy('XAUUSD', xauCandles, 'BELOW_CLOUD');
  const resXagStandard = runSheetStrategy('XAGUSD', xagCandles, 'BELOW_CLOUD');

  // 2. Literal spreadsheet text (Sell: both above cloud)
  const resXauLiteral = runSheetStrategy('XAUUSD', xauCandles, 'ABOVE_CLOUD');
  const resXagLiteral = runSheetStrategy('XAGUSD', xagCandles, 'ABOVE_CLOUD');

  console.log('RESULTS:');
  console.table([
    {
      Asset: 'XAUUSD (Gold)',
      'Sell Cloud Rule': 'Below Cloud (Standard)',
      Trades: resXauStandard.totalTrades,
      'Buys/Sells': `${resXauStandard.buys}/${resXauStandard.sells}`,
      'Win Rate': `${resXauStandard.winRate}%`,
      'Profit Factor': resXauStandard.profitFactor,
      'Total PnL': `$${resXauStandard.totalProfit}`,
      'Total R': `${resXauStandard.totalR}R`,
      'Max DD': `$${resXauStandard.maxDrawdown}`,
      'Avg Hold': `${resXauStandard.avgHold}m`,
    },
    {
      Asset: 'XAGUSD (Silver)',
      'Sell Cloud Rule': 'Below Cloud (Standard)',
      Trades: resXagStandard.totalTrades,
      'Buys/Sells': `${resXagStandard.buys}/${resXagStandard.sells}`,
      'Win Rate': `${resXagStandard.winRate}%`,
      'Profit Factor': resXagStandard.profitFactor,
      'Total PnL': `$${resXagStandard.totalProfit}`,
      'Total R': `${resXagStandard.totalR}R`,
      'Max DD': `$${resXagStandard.maxDrawdown}`,
      'Avg Hold': `${resXagStandard.avgHold}m`,
    },
    {
      Asset: 'XAUUSD (Gold)',
      'Sell Cloud Rule': 'Above Cloud (Literal Sheet)',
      Trades: resXauLiteral.totalTrades,
      'Buys/Sells': `${resXauLiteral.buys}/${resXauLiteral.sells}`,
      'Win Rate': `${resXauLiteral.winRate}%`,
      'Profit Factor': resXauLiteral.profitFactor,
      'Total PnL': `$${resXauLiteral.totalProfit}`,
      'Total R': `${resXauLiteral.totalR}R`,
      'Max DD': `$${resXauLiteral.maxDrawdown}`,
      'Avg Hold': `${resXauLiteral.avgHold}m`,
    },
    {
      Asset: 'XAGUSD (Silver)',
      'Sell Cloud Rule': 'Above Cloud (Literal Sheet)',
      Trades: resXagLiteral.totalTrades,
      'Buys/Sells': `${resXagLiteral.buys}/${resXagLiteral.sells}`,
      'Win Rate': `${resXagLiteral.winRate}%`,
      'Profit Factor': resXagLiteral.profitFactor,
      'Total PnL': `$${resXagLiteral.totalProfit}`,
      'Total R': `${resXagLiteral.totalR}R`,
      'Max DD': `$${resXagLiteral.maxDrawdown}`,
      'Avg Hold': `${resXagLiteral.avgHold}m`,
    },
  ]);
}

main().catch(console.error);
