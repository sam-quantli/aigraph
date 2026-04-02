import type { NodeExecutionArgs, NodeExecutionResult } from "../../types.js";
import type { NodeRegistration } from "../shared.js";

export const logNode: NodeRegistration = {
  definition: {
    type: "core/log",
    title: "Log",
    category: "Utility",
    description: "Appends a message to run logs and continues.",
    inputs: [
      { name: "flow", type: "flow", kind: "flow" },
      { name: "message", type: "string", kind: "data" },
    ],
    outputs: [{ name: "next", type: "flow", kind: "flow" }],
    defaultProperties: { message: "" },
    widgets: [{ type: "text", name: "message", defaultValue: "" }],
  },
  execute: ({ node, inputs }: NodeExecutionArgs): NodeExecutionResult => {
    const message = String(inputs.message ?? node.properties?.message ?? "");
    return { route: ["next"], logs: [message] };
  },
};
