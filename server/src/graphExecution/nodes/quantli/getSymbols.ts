import { getIntegrationsV1Symbols } from "../../../quantli/generated/index.js";
import type { NodeExecutionResult } from "../../types.js";
import { type NodeRegistration } from "../shared.js";

export const quantliGetSymbolsNode: NodeRegistration = {
  definition: {
    type: "quantli/get_symbols",
    title: "Quantli · Get Symbols",
    category: "Quantli",
    description: "Fetch available symbols from Quantli integration API.",
    inputs: [{ name: "flow", type: "flow", kind: "flow" }],
    outputs: [
      { name: "next", type: "flow", kind: "flow" },
      { name: "symbols", type: "array", kind: "data" },
      { name: "count", type: "number", kind: "data" },
    ],
  },
  execute: async (): Promise<NodeExecutionResult> => {
    console.log("Execute get symbols");
    const { data } = await getIntegrationsV1Symbols<true>({
      throwOnError: true,
      headers: { Accept: "application/json" },
    });
    const symbols = Array.isArray(data.symbols) ? data.symbols : [];
    console.dir("GOT SYMBOLS: ", symbols);

    return {
      route: ["next"],
      outputs: {
        symbols,
        count:
          typeof data.totalCount === "number"
            ? data.totalCount
            : symbols.length,
      },
    };
  },
};
