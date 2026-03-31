/**
 * Dual simple moving average crossover — fast SMA crosses above slow SMA → buy;
 * fast crosses below slow → sell. Classic trend-following baseline.
 *
 * Candle rows: Quantly `{ o,h,l,c,v,t }` or legacy `{ open, high, low, close, ... }`.
 * Chronological order (oldest first). Uses `close` only.
 *
 * @param {{ context: { jobId: string }, payload?: Record<string, unknown> }} input
 */

const FAST_PERIOD = 10;
const SLOW_PERIOD = 30;

const MIN_CANDLES = SLOW_PERIOD + 1;

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
 * @param {number} period
 * @returns {Float64Array}
 */
function smaSeries(closes, period) {
  const n = closes.length;
  const out = new Float64Array(n);
  out.fill(NaN);
  if (n < period) return out;

  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  out[period - 1] = sum / period;
  for (let i = period; i < n; i++) {
    sum += closes[i] - closes[i - period];
    out[i] = sum / period;
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
      "[sma-crossover-strategy] skipped: need at least",
      MIN_CANDLES,
      "candles, got",
      closes.length
    );
    return events;
  }

  debug("[sma-crossover-strategy] running", {
    candles: closes.length,
    fast: FAST_PERIOD,
    slow: SLOW_PERIOD,
  });

  const fast = smaSeries(closes, FAST_PERIOD);
  const slow = smaSeries(closes, SLOW_PERIOD);
  let position = 0;
  const start = SLOW_PERIOD;

  for (let i = start; i < candles.length; i++) {
    const f0 = fast[i - 1];
    const s0 = slow[i - 1];
    const f1 = fast[i];
    const s1 = slow[i];

    if (![f0, s0, f1, s1].every((x) => Number.isFinite(x))) continue;

    const crossUp = f0 <= s0 && f1 > s1;
    const crossDown = f0 >= s0 && f1 < s1;

    const row = candles[i];
    const base = {
      index: i,
      ...(row.date !== undefined ? { date: row.date } : {}),
      price: row.close,
    };

    if (crossUp && position === 0) {
      events.push({ side: "buy", ...base });
      position = 1;
    } else if (crossDown && position === 1) {
      events.push({ side: "sell", ...base });
      position = 0;
    }
  }

  return events;
}

async function execute(input) {
  const jobId = input.context?.jobId ?? "(no jobId)";
  debug("[sma-crossover-strategy] execute start", { jobId });

  const raw = input.payload;
  const payload =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const list = payload.candles;
  const rawCount = Array.isArray(list) ? list.length : 0;
  const candles = Array.isArray(list)
    ? list.map(normalizeCandleRow).filter((x) => x !== null)
    : [];

  if (rawCount !== candles.length) {
    debug("[sma-crossover-strategy] candles normalized", {
      jobId,
      rawRows: rawCount,
      validCandles: candles.length,
      dropped: rawCount - candles.length,
    });
  } else {
    debug("[sma-crossover-strategy] candles", { jobId, count: candles.length });
  }

  const events = runStrategy(candles);

  debug("[sma-crossover-strategy] execute done", {
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
