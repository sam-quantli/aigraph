/**
 * RSI swing strategy — Wilder RSI(14). Long when RSI crosses up out of oversold
 * (above oversoldLevel after being at or below it); exit long when RSI crosses down
 * out of overbought (below overboughtLevel after being at or above it).
 *
 * Candle rows: Quantli `{ o,h,l,c,v,t }` or legacy `{ open, high, low, close, ... }`.
 * Chronological order (oldest first). Uses `close` only.
 *
 * @param {{ context: { jobId: string }, payload?: Record<string, unknown> }} input
 */

const RSI_PERIOD = 14;
const OVERSOLD = 30;
const OVERBOUGHT = 70;

/** Need period+1 closes for first RSI + 1 bar for crossover */
const MIN_CANDLES = RSI_PERIOD + 2;

/**
 * @param {unknown} row
 * @returns {{ close: number, open?: number, high?: number, low?: number, volume?: number, date?: string|number } | null}
 */
function normalizeCandleRow(row) {
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;

  /** @type {Record<string, unknown>} */
  const o = row;

  const c = o.c;
  if (typeof c === "number" && Number.isFinite(c)) {
    return {
      ...(typeof o.o === "number" && Number.isFinite(o.o) ? { open: o.o } : {}),
      ...(typeof o.h === "number" && Number.isFinite(o.h) ? { high: o.h } : {}),
      ...(typeof o.l === "number" && Number.isFinite(o.l) ? { low: o.l } : {}),
      close: c,
      ...(typeof o.v === "number" && Number.isFinite(o.v) ? { volume: o.v } : {}),
      ...(typeof o.t === "string" ? { date: o.t } : {}),
    };
  }

  const close = o.close;
  if (typeof close === "number" && Number.isFinite(close)) {
    return {
      ...(typeof o.open === "number" && Number.isFinite(o.open)
        ? { open: o.open }
        : {}),
      ...(typeof o.high === "number" && Number.isFinite(o.high)
        ? { high: o.high }
        : {}),
      ...(typeof o.low === "number" && Number.isFinite(o.low) ? { low: o.low } : {}),
      close,
      ...(typeof o.volume === "number" && Number.isFinite(o.volume)
        ? { volume: o.volume }
        : {}),
      ...(o.date !== undefined &&
      (typeof o.date === "string" || typeof o.date === "number")
        ? { date: o.date }
        : {}),
    };
  }

  return null;
}

/**
 * Wilder-smoothed RSI for each index (NaN until first valid RSI at index period).
 * @param {number[]} closes
 * @returns {Float64Array}
 */
function rsiSeries(closes, period) {
  const n = closes.length;
  const out = new Float64Array(n);
  out.fill(NaN);
  if (n < period + 1) return out;

  let sumGain = 0;
  let sumLoss = 0;
  for (let i = 1; i <= period; i++) {
    const ch = closes[i] - closes[i - 1];
    if (ch >= 0) sumGain += ch;
    else sumLoss += -ch;
  }
  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;

  let rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

  for (let i = period + 1; i < n; i++) {
    const ch = closes[i] - closes[i - 1];
    const gain = ch > 0 ? ch : 0;
    const loss = ch < 0 ? -ch : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
  }
  return out;
}

/**
 * @param {{ close: number, date?: string|number }[]} candles
 * @returns {{ side: 'buy'|'sell', index: number, date?: string|number, price: number }[]}
 */
function runStrategy(candles) {
  const events = [];
  const closes = candles.map((c) => c.close);

  if (closes.length < MIN_CANDLES) {
    debug(
      "[rsi-strategy] skipped: need at least",
      MIN_CANDLES,
      "candles, got",
      closes.length
    );
    return events;
  }

  debug("[rsi-strategy] running", {
    candles: closes.length,
    period: RSI_PERIOD,
    oversold: OVERSOLD,
    overbought: OVERBOUGHT,
  });

  const rsi = rsiSeries(closes, RSI_PERIOD);
  let position = 0;
  const start = RSI_PERIOD + 1;

  for (let i = start; i < candles.length; i++) {
    const r0 = rsi[i - 1];
    const r1 = rsi[i];
    if (![r0, r1].every((x) => Number.isFinite(x))) continue;

    const crossUpOversold = r0 <= OVERSOLD && r1 > OVERSOLD;
    const crossDownOverbought = r0 >= OVERBOUGHT && r1 < OVERBOUGHT;

    const row = candles[i];
    const base = {
      index: i,
      ...(row.date !== undefined ? { date: row.date } : {}),
      price: row.close,
    };

    if (crossUpOversold && position === 0) {
      events.push({ side: "buy", ...base });
      position = 1;
    } else if (crossDownOverbought && position === 1) {
      events.push({ side: "sell", ...base });
      position = 0;
    }
  }

  return events;
}

async function execute(input) {
  const jobId = input.context?.jobId ?? "(no jobId)";
  debug("[rsi-strategy] execute start", { jobId });

  const raw = input.payload;
  const payload =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const list = payload.candles;
  const rawCount = Array.isArray(list) ? list.length : 0;
  const candles = Array.isArray(list)
    ? list.map(normalizeCandleRow).filter((x) => x !== null)
    : [];

  if (rawCount !== candles.length) {
    debug("[rsi-strategy] candles normalized", {
      jobId,
      rawRows: rawCount,
      validCandles: candles.length,
      dropped: rawCount - candles.length,
    });
  } else {
    debug("[rsi-strategy] candles", { jobId, count: candles.length });
  }

  const events = runStrategy(candles);

  debug("[rsi-strategy] execute done", {
    jobId,
    events: events.length,
    ...(events.length <= 20
      ? { sides: events.map((e) => e.side) }
      : { sidesPreview: events.slice(0, 5).map((e) => e.side) }),
  });

  return {
    data: events,
    codes: [0],
    success: true,
  };
}
