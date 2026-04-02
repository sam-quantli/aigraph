import type { NodeExecutionArgs, NodeExecutionResult } from "../../types.js";
import type { NodeRegistration } from "../shared.js";

export const quantliCandlesChartNode: NodeRegistration = {
  definition: {
    type: "quantli/candles_chart",
    title: "Quantli · Candles Chart",
    category: "Quantli",
    description: "Render candles data in-node in the editor.",
    inputs: [
      { name: "flow", type: "flow", kind: "flow" },
      { name: "candles", type: "candles", kind: "data" },
    ],
    outputs: [
      { name: "next", type: "flow", kind: "flow" },
      { name: "candles", type: "candles", kind: "data" },
    ],
  },
  execute: async ({
    inputs,
  }: NodeExecutionArgs): Promise<NodeExecutionResult> => {
    console.log("Execute candles chart");
    return {
      route: ["next"],
      outputs: {
        candles: inputs.candles,
      },
    };
  },
  getPreview: (ctx) => ({
    candles: ctx.resolveDataInput("candles"),
  }),
};
