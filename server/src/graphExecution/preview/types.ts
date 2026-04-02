import type { GraphDefinition, GraphNodeInstance, NodeOutputsSnapshot } from "../types.js";

export type PreviewContext = {
  runId: string;
  node: GraphNodeInstance;
  graph: GraphDefinition;
  nodeOutputs: NodeOutputsSnapshot;
  resolveDataInput(inputName: string): unknown;
};

export type NodePreviewFn = (
  ctx: PreviewContext
) => unknown | Promise<unknown>;
