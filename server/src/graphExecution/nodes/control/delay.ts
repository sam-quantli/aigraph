import type { NodeExecutionArgs, NodeExecutionResult } from "../../types.js";
import type { NodeRegistration } from "../shared.js";

export const delayNode: NodeRegistration = {
  definition: {
    type: "control/delay",
    title: "Delay",
    category: "Control",
    description: "Waits N seconds before continuing flow.",
    inputs: [
      { name: "flow", type: "flow", kind: "flow" },
      { name: "seconds", type: "number", kind: "data" },
    ],
    outputs: [{ name: "next", type: "flow", kind: "flow" }],
    defaultProperties: { seconds: 1 },
    widgets: [
      {
        type: "number",
        name: "seconds",
        defaultValue: 1,
        options: { min: 0, step: 0.1 },
      },
    ],
  },
  execute: async ({ node, inputs }: NodeExecutionArgs): Promise<NodeExecutionResult> => {
    const raw = inputs.seconds ?? node.properties?.seconds ?? 1;
    const seconds = Math.max(0, Number(raw) || 0);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, seconds * 1000);
    });
    return { route: ["next"] };
  },
};
