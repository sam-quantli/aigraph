import type { NodeDefinition, NodeExecutor } from "../types.js";
import type { NodePreviewFn } from "../preview/types.js";

export type NodeRegistration = {
  definition: NodeDefinition;
  execute: NodeExecutor;
  getPreview?: NodePreviewFn;
};

export function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value.trim().toLowerCase() === "true";
  return false;
}

export function normalizeCases(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v));
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
  }
  return [];
}
