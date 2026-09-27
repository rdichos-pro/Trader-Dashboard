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
  risk: number;
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

  const volatility = symbol === 'XAUUSD' ? 0.00032 : 0.00048;
  const spreadMultiplier = symbol === 'XAUUSD' ? 0.00015 : 0.00032;

  for (let i = 0; i < totalBars; i++) {
    const timestamp = startTime + i * 60 * 1000;
    const date = new Date(timestamp);
    const day = date.getUTCDay();
    if (day === 6 || (day === 0 && date.getUTCHours() < 21) || (day === 5 && date.getUTCHours() >= 21)) {
      continue;
    }

    seed++;
    const r1 = seededRandom(seed);
    const r2 = seededRandom(seed + 1);
    const r3 = seededRandom(seed + 2);

    const macroCycle = Math.sin(i / (barsPerDay * 5.0)) * 0.00012;
    const sessionCycle = Math.sin(i / (barsPerDay * 0.5)) * 0.00007;
    const noise = r1 - 0.499 + macroCycle + sessionCycle;
    momentum = momentum * 0.88 + noise * 0.12;

    const change = momentum * volatility * currentPrice;
    const open = currentPrice;
    const close = Math.max(basePrice * 0.4, currentPrice + change);
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

export type SLMethod = 'TK_CROSSOVER_BAR_EXACT' | 'TK_CROSSOVER_BAR_BUFFER' | 'SWING_LOW_KIJUN';
export type StochFilterMode = 'NO_STOCH_ONLY_CCI' | 'STOCH_OVERBOUGHT_OVERSOLD' | 'STOCH_MOMENTUM_ALIGNMENT' | 'STOCH_PULLBACK_RECOVERY';

interface AssetFrames {
  symbol: string;
  candles1m: Candle[];
  candles5m: Candle[];
  candles15m: Candle[];
  frame1m: ReturnType<typeof computeIndicators>;
  frame5m: ReturnType<typeof computeIndicators>;
  frame15m: ReturnType<typeof computeIndicators>;
  tsToIdx5m: Map<number, number>;
  tsToIdx15m: Map<number, number>;
}

export function runBacktestWithFrames(
  assetData: AssetFrames,
  slMethod: SLMethod,
  stochMode: StochFilterMode,
  rrRatio: number = 2.0
) {
  const { symbol, candles1m, frame1m, frame5m, frame15m, tsToIdx5m, tsToIdx15m } = assetData;
  const spread = symbol === 'XAUUSD' ? 0.25 : 0.02;

  const trades: Trade[] = [];
  let currentPosition: any = null;
  let pendingOrder: { type: 'BUY' | 'SELL'; signalBar: number; crossBarLow: number; crossBarHigh: number } | null = null;
  let prevConfluenceBuy = false;
  let prevConfluenceSell = false;

  let lastBullishCrossBarIdx = -1;
  let lastBullishCrossBarLow = 0;
  let lastBearishCrossBarIdx = -1;
  let lastBearishCrossBarHigh = 0;

  const minWarmup = 15 * 60;

  for (let i = minWarmup; i < candles1m.length - 2; i++) {
    const c1 = candles1m[i];
    const hour = new Date(c1.timestamp).getUTCHours();
    const isLiquid = hour >= 7 && hour <= 19;

    const t1 = frame1m.tenkan[i] ?? 0;
    const kj1 = frame1m.kijun[i] ?? 0;
    const prevT1 = frame1m.tenkan[i - 1] ?? 0;
    const prevKj1 = frame1m.kijun[i - 1] ?? 0;

    // Detect Tenkan-Kijun Crossover event on 1M chart
    if (prevT1 <= prevKj1 && t1 > kj1) {
      lastBullishCrossBarIdx = i;
      lastBullishCrossBarLow = c1.low;
    }
    if (prevT1 >= prevKj1 && t1 < kj1) {
      lastBearishCrossBarIdx = i;
      lastBearishCrossBarHigh = c1.high;
    }

    const ts5 = Math.floor(c1.timestamp / (5 * 60 * 1000)) * (5 * 60 * 1000);
    const ts15 = Math.floor(c1.timestamp / (15 * 60 * 1000)) * (15 * 60 * 1000);
    const idx5 = tsToIdx5m.get(ts5);
    const idx15 = tsToIdx15m.get(ts15);

    if (idx5 === undefined || idx15 === undefined || idx5 < 60 || idx15 < 60) continue;

    // Check open trade exit
    if (currentPosition) {
      const p = currentPosition;
      const barsHeld = i - p.entryIndex;
      let exitPrice = 0;
      let exitReason = '';

      if (p.type === 'BUY') {
        if (c1.low <= p.stopLoss) { exitPrice = p.stopLoss; exitReason = 'SL'; }
        else if (c1.high >= p.takeProfit) { exitPrice = p.takeProfit; exitReason = 'TP'; }
        else if (barsHeld >= 180 && frame1m.tenkan[i]! < frame1m.kijun[i]!) { exitPrice = c1.close; exitReason = 'TK Reversal'; }
      } else {
        if (c1.high >= p.stopLoss) { exitPrice = p.stopLoss; exitReason = 'SL'; }
        else if (c1.low <= p.takeProfit) { exitPrice = p.takeProfit; exitReason = 'TP'; }
        else if (barsHeld >= 180 && frame1m.tenkan[i]! > frame1m.kijun[i]!) { exitPrice = c1.close; exitReason = 'TK Reversal'; }
      }

      if (exitReason) {
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
          risk: p.risk,
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

    if (!isLiquid) continue;

    // Execute pending bar-close confirmed entry at OPEN of current bar
    if (pendingOrder && pendingOrder.signalBar === i - 1) {
      const entryPrice = c1.open;
      const prevBar = candles1m[i - 1];

      if (pendingOrder.type === 'BUY') {
        let stopLoss = 0;
        if (slMethod === 'TK_CROSSOVER_BAR_EXACT') {
          // Bottom of the bar close after the Kijun-Tenkan crossover
          stopLoss = pendingOrder.crossBarLow;
        } else if (slMethod === 'TK_CROSSOVER_BAR_BUFFER') {
          const buffer = symbol === 'XAUUSD' ? 0.60 : 0.05;
          stopLoss = Number((pendingOrder.crossBarLow - buffer).toFixed(2));
        } else {
          // Baseline: 8-bar swing low / Kijun
          let recentMin = prevBar.low;
          for (let k = 1; k <= 8; k++) recentMin = Math.min(recentMin, candles1m[i - 1 - k].low);
          const stopBuffer = symbol === 'XAUUSD' ? 1.5 : 0.12;
          stopLoss = Number((Math.min(recentMin, kj1) - stopBuffer).toFixed(2));
        }

        const risk = entryPrice - stopLoss;
        const minRisk = symbol === 'XAUUSD' ? 0.4 : 0.03;
        const maxRisk = symbol === 'XAUUSD' ? 12 : 0.8;

        if (risk > minRisk && risk < maxRisk) {
          const takeProfit = Number((entryPrice + risk * rrRatio).toFixed(2));
          currentPosition = { type: 'BUY', entryIndex: i, entryPrice, entryTime: c1.time, stopLoss, takeProfit, risk };
        }
      } else {
        let stopLoss = 0;
        if (slMethod === 'TK_CROSSOVER_BAR_EXACT') {
          stopLoss = pendingOrder.crossBarHigh;
        } else if (slMethod === 'TK_CROSSOVER_BAR_BUFFER') {
          const buffer = symbol === 'XAUUSD' ? 0.60 : 0.05;
          stopLoss = Number((pendingOrder.crossBarHigh + buffer).toFixed(2));
        } else {
          let recentMax = prevBar.high;
          for (let k = 1; k <= 8; k++) recentMax = Math.max(recentMax, candles1m[i - 1 - k].high);
          const stopBuffer = symbol === 'XAUUSD' ? 1.5 : 0.12;
          stopLoss = Number((Math.max(recentMax, kj1) + stopBuffer).toFixed(2));
        }

        const risk = stopLoss - entryPrice;
        const minRisk = symbol === 'XAUUSD' ? 0.4 : 0.03;
        const maxRisk = symbol === 'XAUUSD' ? 12 : 0.8;

        if (risk > minRisk && risk < maxRisk) {
          const takeProfit = Number((entryPrice - risk * rrRatio).toFixed(2));
          currentPosition = { type: 'SELL', entryIndex: i, entryPrice, entryTime: c1.time, stopLoss, takeProfit, risk };
        }
      }
      pendingOrder = null;
      continue;
    }

    // Indicators on Bar i (at close)
    const top1 = frame1m.cloudTop[i] ?? 0;
    const bot1 = frame1m.cloudBottom[i] ?? 0;
    const cci1 = frame1m.cci[i] ?? 0;
    const k1 = frame1m.stochK[i] ?? 0;
    const d1 = frame1m.stochD[i] ?? 0;

    const t5 = frame5m.tenkan[idx5] ?? 0;
    const kj5 = frame5m.kijun[idx5] ?? 0;
    const top5 = frame5m.cloudTop[idx5] ?? 0;
    const bot5 = frame5m.cloudBottom[idx5] ?? 0;
    const cci5 = frame5m.cci[idx5] ?? 0;
    const k5 = frame5m.stochK[idx5] ?? 0;
    const d5 = frame5m.stochD[idx5] ?? 0;

    const t15 = frame15m.tenkan[idx15] ?? 0;
    const kj15 = frame15m.kijun[idx15] ?? 0;
    const top15 = frame15m.cloudTop[idx15] ?? 0;
    const bot15 = frame15m.cloudBottom[idx15] ?? 0;
    const cci15 = frame15m.cci[idx15] ?? 0;
    const k15 = frame15m.stochK[idx15] ?? 0;
    const d15 = frame15m.stochD[idx15] ?? 0;

    let buy1m = false, buy5m = false, buy15m = false;
    let sell1m = false, sell5m = false, sell15m = false;

    if (stochMode === 'STOCH_OVERBOUGHT_OVERSOLD') {
      // Overbought / Oversold Stoch confirms the strong runaway trend
      buy1m = (t1 > kj1) && (t1 > top1) && (kj1 > top1) && (cci1 > 100) && (k1 > d1) && (k1 > 80);
      buy5m = (t5 > kj5) && (t5 > top5) && (kj5 > top5) && (cci5 > 100) && (k5 > d5) && (k5 > 80);
      buy15m = (t15 > kj15) && (t15 > top15) && (kj15 > top15) && (cci15 > 100) && (k15 > d15) && (k15 > 80);

      sell1m = (t1 < kj1) && (t1 < bot1) && (kj1 < bot1) && (cci1 < -100) && (k1 < d1) && (k1 < 20);
      sell5m = (t5 < kj5) && (t5 < bot5) && (kj5 < bot5) && (cci5 < -100) && (k5 < d5) && (k5 < 20);
      sell15m = (t15 < kj15) && (t15 < bot15) && (kj15 < bot15) && (cci15 < -100) && (k15 < d15) && (k15 < 20);
    } else if (stochMode === 'STOCH_MOMENTUM_ALIGNMENT') {
      // Main > Signal (Buy) / Main < Signal (Sell)
      buy1m = (t1 > kj1) && (t1 > top1) && (kj1 > top1) && (cci1 > 100) && (k1 > d1);
      buy5m = (t5 > kj5) && (t5 > top5) && (kj5 > top5) && (cci5 > 100) && (k5 > d5);
      buy15m = (t15 > kj15) && (t15 > top15) && (kj15 > top15) && (cci15 > 100) && (k15 > d15);

      sell1m = (t1 < kj1) && (t1 < bot1) && (kj1 < bot1) && (cci1 < -100) && (k1 < d1);
      sell5m = (t5 < kj5) && (t5 < bot5) && (kj5 < bot5) && (cci5 < -100) && (k5 < d5);
      sell15m = (t15 < kj15) && (t15 < bot15) && (kj15 < bot15) && (cci15 < -100) && (k15 < d15);
    } else if (stochMode === 'STOCH_PULLBACK_RECOVERY') {
      let dippedOversold = false;
      for (let lookback = 1; lookback <= 5; lookback++) {
        if ((frame1m.stochK[i - lookback] ?? 50) < 30) { dippedOversold = true; break; }
      }
      buy1m = (t1 > kj1) && (t1 > top1) && (kj1 > top1) && (cci1 > 0) && (k1 > d1) && dippedOversold;
      buy5m = (t5 > kj5) && (t5 > top5) && (kj5 > top5);
      buy15m = (t15 > kj15) && (t15 > top15) && (kj15 > top15);

      let spikedOverbought = false;
      for (let lookback = 1; lookback <= 5; lookback++) {
        if ((frame1m.stochK[i - lookback] ?? 50) > 70) { spikedOverbought = true; break; }
      }
      sell1m = (t1 < kj1) && (t1 < bot1) && (kj1 < bot1) && (cci1 < 0) && (k1 < d1) && spikedOverbought;
      sell5m = (t5 < kj5) && (t5 < bot5) && (kj5 < bot5);
      sell15m = (t15 < kj15) && (t15 < bot15) && (kj15 < bot15);
    } else {
      // NO STOCH AT ALL - Only Ichimoku and CCI
      buy1m = (t1 > kj1) && (t1 > top1) && (kj1 > top1) && (cci1 > 100);
      buy5m = (t5 > kj5) && (t5 > top5) && (kj5 > top5) && (cci5 > 100);
      buy15m = (t15 > kj15) && (t15 > top15) && (kj15 > top15) && (cci15 > 100);

      sell1m = (t1 < kj1) && (t1 < bot1) && (kj1 < bot1) && (cci1 < -100);
      sell5m = (t5 < kj5) && (t5 < bot5) && (kj5 < bot5) && (cci5 < -100);
      sell15m = (t15 < kj15) && (t15 < bot15) && (kj15 < bot15) && (cci15 < -100);
    }

    const allBuy = buy1m && buy5m && buy15m;
    const allSell = sell1m && sell5m && sell15m;

    const freshBuy = allBuy && !prevConfluenceBuy;
    const freshSell = allSell && !prevConfluenceSell;

    prevConfluenceBuy = allBuy;
    prevConfluenceSell = allSell;

    // Require crossover to have occurred within 60 bars
    if (freshBuy && lastBullishCrossBarIdx > 0 && (i - lastBullishCrossBarIdx) <= 60) {
      pendingOrder = {
        type: 'BUY',
        signalBar: i,
        crossBarLow: lastBullishCrossBarLow,
        crossBarHigh: 0,
      };
    } else if (freshSell && lastBearishCrossBarIdx > 0 && (i - lastBearishCrossBarIdx) <= 60) {
      pendingOrder = {
        type: 'SELL',
        signalBar: i,
        crossBarLow: 0,
        crossBarHigh: lastBearishCrossBarHigh,
      };
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
  const avgRisk = trades.length > 0 ? trades.reduce((a, b) => a + b.risk, 0) / trades.length : 0;

  return {
    symbol,
    slMethod,
    stochMode,
    rrRatio,
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: Number(winRate.toFixed(1)),
    profitFactor: Number(profitFactor.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    totalR: Number(totalR.toFixed(2)),
    avgRisk: Number(avgRisk.toFixed(2)),
    maxDrawdown: Number(maxDD.toFixed(2)),
    avgHold: trades.length > 0 ? Math.round(trades.reduce((a, b) => a + b.barsHeld, 0) / trades.length) : 0,
  };
}

export function prepareAsset(symbol: string, basePrice: number, seed: number): AssetFrames {
  const candles1m = generate6MonthCandles(symbol, basePrice, seed);
  const candles5m = aggregateCandles(candles1m, 5);
  const candles15m = aggregateCandles(candles1m, 15);

  const frame1m = computeIndicators(candles1m);
  const frame5m = computeIndicators(candles5m);
  const frame15m = computeIndicators(candles15m);

  const tsToIdx5m = new Map<number, number>();
  candles5m.forEach((c, i) => tsToIdx5m.set(c.timestamp, i));

  const tsToIdx15m = new Map<number, number>();
  candles15m.forEach((c, i) => tsToIdx15m.set(c.timestamp, i));

  return {
    symbol,
    candles1m,
    candles5m,
    candles15m,
    frame1m,
    frame5m,
    frame15m,
    tsToIdx5m,
    tsToIdx15m,
  };
}

async function main() {
  const xauData = prepareAsset('XAUUSD', 2515.40, 777);
  const xagData = prepareAsset('XAGUSD', 31.25, 888);

  const slMethods: SLMethod[] = ['TK_CROSSOVER_BAR_EXACT', 'TK_CROSSOVER_BAR_BUFFER', 'SWING_LOW_KIJUN'];
  const stochModes: StochFilterMode[] = ['NO_STOCH_ONLY_CCI', 'STOCH_OVERBOUGHT_OVERSOLD', 'STOCH_MOMENTUM_ALIGNMENT', 'STOCH_PULLBACK_RECOVERY'];
  const rrRatios = [1.5, 2.0];

  const results: any[] = [];

  for (const asset of [xauData, xagData]) {
    for (const sm of slMethods) {
      for (const stm of stochModes) {
        for (const rr of rrRatios) {
          results.push(runBacktestWithFrames(asset, sm, stm, rr));
        }
      }
    }
  }

  console.log('MARKDOWN_START');
  console.log('| Symbol | SL Placement | Stochastic Rule | R:R | Trades | Win Rate | Profit Factor | Total PnL | Total R | Avg Risk | Max DD |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const r of results) {
    const slLabel = r.slMethod === 'TK_CROSSOVER_BAR_EXACT' ? 'TK Cross Bar Low/High (Exact)' : r.slMethod === 'TK_CROSSOVER_BAR_BUFFER' ? 'TK Cross Bar Low/High (+Buffer)' : 'Swing Low / Kijun Buffer';
    const stochLabel = r.stochMode === 'NO_STOCH_ONLY_CCI' ? 'No Stoch (CCI Only)' : r.stochMode === 'STOCH_OVERBOUGHT_OVERSOLD' ? 'Stoch Overbought/Oversold (>80/<20)' : r.stochMode === 'STOCH_PULLBACK_RECOVERY' ? 'Stoch Pullback Turn (Oversold Dip + Cross)' : 'Stoch Momentum (Main>Signal)';
    console.log(`| ${r.symbol} | ${slLabel} | ${stochLabel} | 1:${r.rrRatio} | ${r.totalTrades} | ${r.winRate}% | ${r.profitFactor} | $${r.totalProfit} | ${r.totalR > 0 ? '+' : ''}${r.totalR}R | $${r.avgRisk} | $${r.maxDrawdown} |`);
  }
  console.log('MARKDOWN_END');
}

main().catch(console.error);
