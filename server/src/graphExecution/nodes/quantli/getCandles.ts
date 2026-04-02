import { getIntegrationsV1SymbolsBySymbolCodeCandles } from "../../../quantli/generated/index.js";
import type { GetSymbolCandlesResponseDto } from "../../../quantli/generated/types.gen.js";
import type { NodeExecutionArgs, NodeExecutionResult } from "../../types.js";
import { type NodeRegistration } from "../shared.js";

function extractSymbolCode(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (value && typeof value === "object") {
    const maybeRecord = value as Record<string, unknown>;
    if (typeof maybeRecord.symbol === "string") {
      return maybeRecord.symbol.trim();
    }
    if (typeof maybeRecord.symbolCode === "string") {
      return maybeRecord.symbolCode.trim();
    }
  }
  return String(value ?? "").trim();
}

function formatSdkError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export const quantliGetCandlesNode: NodeRegistration = {
  definition: {
    type: "quantli/get_candles",
    title: "Quantli · Get Candles",
    category: "Quantli",
    description: "Fetch candles for symbol + time range.",
    inputs: [
      { name: "flow", type: "flow", kind: "flow" },
      { name: "symbolCode", type: "string", kind: "data" },
      { name: "timeRange", type: "string", kind: "data" },
    ],
    outputs: [
      { name: "next", type: "flow", kind: "flow" },
      { name: "symbolCode", type: "string", kind: "data" },
      { name: "timeRange", type: "string", kind: "data" },
      { name: "candles", type: "candles", kind: "data" },
    ],
    defaultProperties: {
      symbolCode: "",
      timeRange: "5Y",
    },
    widgets: [
      {
        type: "text",
        name: "symbolCode",
        defaultValue: "",
        options: { placeholder: "AAPL" },
      },
      {
        type: "text",
        name: "timeRange",
        defaultValue: "5Y",
        options: { placeholder: "5Y" },
      },
    ],
  },
  execute: async ({
    node,
    inputs,
  }: NodeExecutionArgs): Promise<NodeExecutionResult> => {
    const symbolCode = extractSymbolCode(
      inputs.symbolCode ?? node.properties?.symbolCode ?? "",
    );
    if (!symbolCode) {
      throw new Error(
        "quantli/get_candles requires symbolCode input (for example: AAPL).",
      );
    }
    const timeRange = String(
      inputs.timeRange ?? node.properties?.timeRange ?? "5Y",
    ).trim();

    let data: GetSymbolCandlesResponseDto | undefined;
    try {
      console.log("Execute get candles");
      const result = await getIntegrationsV1SymbolsBySymbolCodeCandles({
        throwOnError: true,
        path: { symbolCode },
        query: { timeRange },
        headers: { Accept: "application/json" },
      });
      console.log("GOT RESULT: ", JSON.stringify(result, null, 2));
      data = result.data;
    } catch (error) {
      console.error("ERROR: ", error);
      throw new Error(
        `Quantli integration get_candles failed for symbol "${symbolCode}" (timeRange="${timeRange}"): ${formatSdkError(error)}`,
      );
    }

    if (data === undefined) {
      throw new Error(
        `Quantli integration get_candles returned no body for symbol "${symbolCode}" (timeRange="${timeRange}").`,
      );
    }

    const outSymbolCode = data.symbolCode ?? symbolCode;
    const outTimeRange = data.timeRange ?? timeRange;
    const candles = Array.isArray(data.candles) ? data.candles : [];
    return {
      route: ["next"],
      outputs: {
        symbolCode: outSymbolCode,
        timeRange: outTimeRange,
        candles,
      },
    };
  },
};
