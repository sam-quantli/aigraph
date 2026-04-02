/**
 * Bollinger band mean-reversion — SMA(20) ± 2σ. Long on close reclaiming above the
 * lower band after at or below it; exit when close crosses at or above the middle band.
 *
 * Candle rows: Quantli `{ o,h,l,c,v,t }` or legacy `{ open, high, low, close, ... }`.
 * Chronological order (oldest first). Uses `close` only.
 *
 * @param {{ context: { jobId: string }, payload?: Record<string, unknown> }} input
 */

const BB_PERIOD = 20;
const BB_STDDEV_MULT = 2;

const MIN_CANDLES = BB_PERIOD + 1;

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
 * @param {number[]} closes
 * @param {number} i inclusive end index of window
 * @param {number} period
 * @returns {{ middle: number, lower: number, upper: number } | null}
 */
function bandAt(closes, i, period) {
  if (i < period - 1) return null;
  let sum = 0;
  for (let j = i - period + 1; j <= i; j++) sum += closes[j];
  const middle = sum / period;
  let varSum = 0;
  for (let j = i - period + 1; j <= i; j++) {
    const d = closes[j] - middle;
    varSum += d * d;
  }
  const std = Math.sqrt(varSum / period);
  const off = BB_STDDEV_MULT * std;
  return { middle, lower: middle - off, upper: middle + off };
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
      "[bollinger-strategy] skipped: need at least",
      MIN_CANDLES,
      "candles, got",
      closes.length
    );
    return events;
  }

  debug("[bollinger-strategy] running", {
    candles: closes.length,
    period: BB_PERIOD,
    stddevMult: BB_STDDEV_MULT,
  });

  let position = 0;
  const start = BB_PERIOD;

  for (let i = start; i < candles.length; i++) {
    const b0 = bandAt(closes, i - 1, BB_PERIOD);
    const b1 = bandAt(closes, i, BB_PERIOD);
    if (!b0 || !b1) continue;

    const c0 = closes[i - 1];
    const c1 = closes[i];

    const reclaimLower = c0 <= b0.lower && c1 > b1.lower;
    const crossMiddleUp = c0 < b0.middle && c1 >= b1.middle;

    const row = candles[i];
    const base = {
      index: i,
      ...(row.date !== undefined ? { date: row.date } : {}),
      price: row.close,
    };

    if (reclaimLower && position === 0) {
      events.push({ side: "buy", ...base });
      position = 1;
    } else if (crossMiddleUp && position === 1) {
      events.push({ side: "sell", ...base });
      position = 0;
    }
  }

  return events;
}

async function execute(input) {
  const jobId = input.context?.jobId ?? "(no jobId)";
  debug("[bollinger-strategy] execute start", { jobId });

  const raw = input.payload;
  const payload =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const list = payload.candles;
  const rawCount = Array.isArray(list) ? list.length : 0;
  const candles = Array.isArray(list)
    ? list.map(normalizeCandleRow).filter((x) => x !== null)
    : [];

  if (rawCount !== candles.length) {
    debug("[bollinger-strategy] candles normalized", {
      jobId,
      rawRows: rawCount,
      validCandles: candles.length,
      dropped: rawCount - candles.length,
    });
  } else {
    debug("[bollinger-strategy] candles", { jobId, count: candles.length });
  }

  const events = runStrategy(candles);

  debug("[bollinger-strategy] execute done", {
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
