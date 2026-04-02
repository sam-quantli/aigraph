import type { NodeExecutionArgs, NodeExecutionResult } from "../../types.js";
import { toBoolean, type NodeRegistration } from "../shared.js";

export const ifElseNode: NodeRegistration = {
  definition: {
    type: "control/if_else",
    title: "If / Else",
    category: "Control",
    description: "Routes flow to true/false outputs.",
    inputs: [
      { name: "flow", type: "flow", kind: "flow" },
      { name: "condition", type: "boolean", kind: "data" },
    ],
    outputs: [
      { name: "true", type: "flow", kind: "flow" },
      { name: "false", type: "flow", kind: "flow" },
    ],
    defaultProperties: { condition: false },
    widgets: [{ type: "toggle", name: "condition", defaultValue: false }],
  },
  execute: ({ node, inputs }: NodeExecutionArgs): NodeExecutionResult => {
    const fromInput = inputs.condition;
    const fromProps = node.properties?.condition;
    const condition = toBoolean(fromInput ?? fromProps ?? false);
    return { route: [condition ? "true" : "false"] };
  },
};
