/**
 * MACD signal-line crossover strategy — exposes async function execute(input).
 *
 * MACD line = EMA(fast) − EMA(slow); signal = EMA(MACD, signalPeriod).
 * Long when MACD crosses above signal; flat/exit when MACD crosses below.
 *
 * Candle rows may be:
 * - Quantli DTO: `{ o?, h?, l?, c?, v?, t? }` (compact keys)
 * - Legacy: `{ open, high, low, close, volume?, date? }`
 *
 * Expects chronological order (oldest first). Strategy uses `close` only (+ optional date).
 *
 * @param {{ context: { jobId: string }, payload?: Record<string, unknown> }} input
 */

const FAST_PERIOD = 12;
const SLOW_PERIOD = 26;
const SIGNAL_PERIOD = 9;

/** First index where signal line is defined + one bar for crossover compare */
const MIN_CANDLES = SLOW_PERIOD - 1 + SIGNAL_PERIOD + 1;

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
function emaSeries(closes, period) {
  const n = closes.length;
  const out = new Float64Array(n);
  out.fill(NaN);
  if (n < period) return out;

  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += closes[i];
  out[period - 1] = sum / period;
  for (let i = period; i < n; i++) {
    out[i] = (closes[i] - out[i - 1]) * k + out[i - 1];
  }
  return out;
}

/**
 * MACD line and signal line (same length as closes; NaN where undefined).
 * @param {number[]} closes
 */
function macdAndSignal(closes) {
  const n = closes.length;
  const macd = new Float64Array(n);
  const signal = new Float64Array(n);
  macd.fill(NaN);
  signal.fill(NaN);

  const emaFast = emaSeries(closes, FAST_PERIOD);
  const emaSlow = emaSeries(closes, SLOW_PERIOD);

  const firstMacd = SLOW_PERIOD - 1;
  for (let i = firstMacd; i < n; i++) {
    macd[i] = emaFast[i] - emaSlow[i];
  }

  if (firstMacd + SIGNAL_PERIOD > n) return { macd, signal };

  let sum = 0;
  for (let j = 0; j < SIGNAL_PERIOD; j++) {
    sum += macd[firstMacd + j];
  }
  const seedIdx = firstMacd + SIGNAL_PERIOD - 1;
  signal[seedIdx] = sum / SIGNAL_PERIOD;

  const kSig = 2 / (SIGNAL_PERIOD + 1);
  for (let i = seedIdx + 1; i < n; i++) {
    signal[i] = (macd[i] - signal[i - 1]) * kSig + signal[i - 1];
  }

  return { macd, signal };
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
      "[macd-strategy] skipped: need at least",
      MIN_CANDLES,
      "candles, got",
      closes.length
    );
    return events;
  }

  debug("[macd-strategy] running", {
    candles: closes.length,
    fast: FAST_PERIOD,
    slow: SLOW_PERIOD,
    signal: SIGNAL_PERIOD,
  });

  const { macd, signal } = macdAndSignal(closes);
  let position = 0;

  const firstTradeIdx = SLOW_PERIOD - 1 + SIGNAL_PERIOD;

  for (let i = firstTradeIdx; i < candles.length; i++) {
    const m0 = macd[i - 1];
    const s0 = signal[i - 1];
    const m1 = macd[i];
    const s1 = signal[i];

    if (![m0, s0, m1, s1].every((x) => Number.isFinite(x))) continue;

    const crossUp = m0 <= s0 && m1 > s1;
    const crossDown = m0 >= s0 && m1 < s1;

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
  debug("[macd-strategy] execute start", { jobId });

  const raw = input.payload;
  const payload =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const list = payload.candles;
  const rawCount = Array.isArray(list) ? list.length : 0;
  const candles = Array.isArray(list)
    ? list.map(normalizeCandleRow).filter((x) => x !== null)
    : [];

  if (rawCount !== candles.length) {
    debug("[macd-strategy] candles normalized", {
      jobId,
      rawRows: rawCount,
      validCandles: candles.length,
      dropped: rawCount - candles.length,
    });
  } else {
    debug("[macd-strategy] candles", { jobId, count: candles.length });
  }

  const events = runStrategy(candles);

  debug("[macd-strategy] execute done", {
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
