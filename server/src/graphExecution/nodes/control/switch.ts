import type { NodeExecutionArgs, NodeExecutionResult } from "../../types.js";
import { normalizeCases, type NodeRegistration } from "../shared.js";

export const switchNode: NodeRegistration = {
  definition: {
    type: "control/switch",
    title: "Switch",
    category: "Control",
    description: "Routes flow to case_0..case_2 or default.",
    inputs: [
      { name: "flow", type: "flow", kind: "flow" },
      { name: "value", type: "any", kind: "data" },
    ],
    outputs: [
      { name: "case_0", type: "flow", kind: "flow" },
      { name: "case_1", type: "flow", kind: "flow" },
      { name: "case_2", type: "flow", kind: "flow" },
      { name: "default", type: "flow", kind: "flow" },
    ],
    defaultProperties: { cases: "A,B,C" },
    widgets: [
      {
        type: "text",
        name: "cases",
        defaultValue: "A,B,C",
        options: { placeholder: "A,B,C" },
      },
    ],
  },
  execute: ({ node, inputs }: NodeExecutionArgs): NodeExecutionResult => {
    const rawValue = inputs.value ?? node.properties?.value;
    const value = String(rawValue ?? "");
    const cases = normalizeCases(node.properties?.cases);
    const idx = cases.findIndex((candidate) => candidate === value);
    if (idx >= 0 && idx <= 2) {
      return { route: [`case_${idx}`] };
    }
    return { route: ["default"] };
  },
};
