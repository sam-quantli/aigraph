import { getIntegrationsV1SymbolsBySymbolCode } from "../../../quantli/generated/index.js";
import type { NodeExecutionArgs, NodeExecutionResult } from "../../types.js";
import type { NodeRegistration } from "../shared.js";

export const quantliGetSymbolNode: NodeRegistration = {
  definition: {
    type: "quantli/get_symbol",
    title: "Quantli · Get Symbol",
    category: "Quantli",
    description: "Fetch details for one symbol code.",
    inputs: [
      { name: "flow", type: "flow", kind: "flow" },
      { name: "symbolCode", type: "string", kind: "data" },
    ],
    outputs: [
      { name: "next", type: "flow", kind: "flow" },
      { name: "symbol", type: "object", kind: "data" },
      { name: "symbolCode", type: "string", kind: "data" },
      { name: "symbolName", type: "string", kind: "data" },
      { name: "exchangeCode", type: "string", kind: "data" },
      { name: "currencyCode", type: "string", kind: "data" },
      { name: "type", type: "string", kind: "data" },
    ],
    defaultProperties: { symbolCode: "" },
    widgets: [
      {
        type: "text",
        name: "symbolCode",
        defaultValue: "",
        options: { placeholder: "AAPL" },
      },
    ],
  },
  execute: async ({
    node,
    inputs,
  }: NodeExecutionArgs): Promise<NodeExecutionResult> => {
    const symbolCode = String(
      inputs.symbolCode ?? node.properties?.symbolCode ?? "",
    ).trim();
    if (!symbolCode) {
      throw new Error("quantli/get_symbol requires symbolCode input.");
    }
    const { data: symbol } = await getIntegrationsV1SymbolsBySymbolCode<true>({
      throwOnError: true,
      path: { symbolCode },
      headers: { Accept: "application/json" },
    });

    return {
      route: ["next"],
      outputs: {
        symbol,
        symbolCode:
          typeof symbol.symbolCode === "string"
            ? symbol.symbolCode
            : symbolCode,
        symbolName: typeof symbol.name === "string" ? symbol.name : "",
        exchangeCode: "",
        currencyCode: "",
        type: "",
      },
    };
  },
};
