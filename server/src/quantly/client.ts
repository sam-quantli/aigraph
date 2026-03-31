import type { QuantlyConfig } from "./config.js";
import type { GetSymbolCandlesResponseDTO } from "./types.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * GET /integrations/v1/symbols/{symbolCode}/candles?timeRange=5Y
 */
export async function getCandlesData(
  config: QuantlyConfig,
  symbolCode: string
): Promise<GetSymbolCandlesResponseDTO> {
  const base = config.quantlyUrl.replace(/\/+$/, "");
  const path = `/integrations/v1/symbols/${encodeURIComponent(symbolCode)}/candles?timeRange=5Y`;
  const url = `${base}${path}`;

  const res = await fetch(url, {
    headers: {
      "X-Api-Key": config.quantliApiKey,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Quantly candles request failed (${res.status}): ${text.slice(0, 300)}`
    );
  }

  const json: unknown = await res.json();
  if (!isRecord(json)) {
    throw new Error("Quantly candles response is not a JSON object.");
  }
  const symbolOut =
    typeof json.symbolCode === "string" ? json.symbolCode : symbolCode;
  const timeRange =
    typeof json.timeRange === "string" ? json.timeRange : "5Y";
  if (!Array.isArray(json.candles)) {
    throw new Error("Quantly candles response missing candles array.");
  }

  return {
    symbolCode: symbolOut,
    timeRange,
    candles: json.candles as GetSymbolCandlesResponseDTO["candles"],
  };
}
