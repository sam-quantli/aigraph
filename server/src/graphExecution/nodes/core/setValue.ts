import type { NodeExecutionArgs, NodeExecutionResult } from "../../types.js";
import type { NodeRegistration } from "../shared.js";

export const setValueNode: NodeRegistration = {
  definition: {
    type: "core/set_value",
    title: "Set Value",
    category: "Utility",
    description: "Writes a value to output for downstream nodes.",
    inputs: [
      { name: "flow", type: "flow", kind: "flow" },
      { name: "value", type: "any", kind: "data" },
    ],
    outputs: [
      { name: "next", type: "flow", kind: "flow" },
      { name: "value", type: "any", kind: "data" },
    ],
    defaultProperties: { value: null },
    widgets: [{ type: "text", name: "value", defaultValue: "" }],
  },
  execute: ({ node, inputs }: NodeExecutionArgs): NodeExecutionResult => {
    const value = inputs.value ?? node.properties?.value ?? null;
    return { route: ["next"], outputs: { value } };
  },
};
