import type { NodeExecutionArgs, NodeExecutionResult } from "../../types.js";
import type { NodeRegistration } from "../shared.js";

export const startNode: NodeRegistration = {
  definition: {
    type: "core/start",
    title: "Start",
    category: "Flow",
    description: "Entry point for a graph run.",
    inputs: [],
    outputs: [
      { name: "next", type: "flow", kind: "flow" },
      { name: "payload", type: "any", kind: "data" },
    ],
  },
  execute: ({ context }: NodeExecutionArgs): NodeExecutionResult => ({
    outputs: { payload: context.input },
    route: ["next"],
  }),
};
