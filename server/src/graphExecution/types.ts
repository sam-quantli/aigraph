export type GraphNodeId = string | number;
export type GraphSlotIndex = number;

export type GraphLink = [
  id: number | string,
  originNodeId: GraphNodeId,
  originSlot: GraphSlotIndex,
  targetNodeId: GraphNodeId,
  targetSlot: GraphSlotIndex,
  type?: string
];

export type GraphNodeInput = {
  name: string;
  type?: string;
};

export type GraphNodeOutput = {
  name: string;
  type?: string;
};

export type GraphNodeInstance = {
  id: GraphNodeId;
  type: string;
  title?: string;
  properties?: Record<string, unknown>;
  inputs?: GraphNodeInput[];
  outputs?: GraphNodeOutput[];
  widgets_values?: unknown[];
  pos?: [number, number];
};

export type GraphDefinition = {
  id?: string;
  version?: number | string;
  nodes: GraphNodeInstance[];
  links: GraphLink[];
};

export type NodeIOSchema = {
  name: string;
  type?: string;
  kind?: "flow" | "data";
};

export type NodeWidgetSchema = {
  type: "text" | "number" | "combo" | "toggle";
  name: string;
  defaultValue?: unknown;
  options?: Record<string, unknown>;
};

export type NodeDefinition = {
  type: string;
  title: string;
  category?: string;
  description?: string;
  inputs: NodeIOSchema[];
  outputs: NodeIOSchema[];
  defaultProperties?: Record<string, unknown>;
  widgets?: NodeWidgetSchema[];
};

export type GraphTraceEntry = {
  nodeId: GraphNodeId;
  nodeType: string;
  route: string[];
};

export type ExecutionContext = {
  runId: string;
  currentNodeId: GraphNodeId | null;
  currentNodeType: string | null;
  input: unknown;
  trace: GraphTraceEntry[];
  logs: string[];
};

export type NodeExecutionArgs = {
  node: GraphNodeInstance;
  inputs: Record<string, unknown>;
  context: ExecutionContext;
};

export type NodeExecutionResult = {
  outputs?: Record<string, unknown>;
  route?: string[];
  logs?: string[];
};

export type NodeExecutor = (
  args: NodeExecutionArgs
) => Promise<NodeExecutionResult> | NodeExecutionResult;

export type RunGraphRequest = {
  jobId?: string;
  graphId?: string;
  graph?: GraphDefinition;
  input?: unknown;
};

/** nodeId string key -> output name -> value (for run artifacts / preview). */
export type NodeOutputsSnapshot = Record<string, Record<string, unknown>>;

export type RunGraphSuccess = {
  runId: string;
  success: true;
  trace: GraphTraceEntry[];
  logs: string[];
  nodeOutputs: NodeOutputsSnapshot;
  context: {
    currentNodeId: GraphNodeId | null;
    currentNodeType: string | null;
  };
};

export type RunGraphFailure = {
  runId: string;
  success: false;
  error: string;
  trace: GraphTraceEntry[];
  logs: string[];
  /** Outputs from nodes that completed before failure, if any. */
  nodeOutputs: NodeOutputsSnapshot;
  context: {
    currentNodeId: GraphNodeId | null;
    currentNodeType: string | null;
  };
};

export type RunGraphResult = RunGraphSuccess | RunGraphFailure;

export type GraphRecord = {
  id: string;
  name: string;
  description?: string;
  graph: GraphDefinition;
  createdAt: string;
  updatedAt: string;
  version: number;
};
