import type {
  ExecutionContext,
  GraphDefinition,
  GraphLink,
  GraphNodeId,
  GraphNodeInstance,
  GraphTraceEntry,
  NodeOutputsSnapshot,
  RunGraphResult,
} from "./types.js";
import { getNodeDefinition, getNodeExecutor } from "./nodes/index.js";

const START_NODE_TYPE = "core/start";
const MAX_STEPS = 1_000;

export type RunGraphHooks = {
  onRunStarted?: (payload: { runId: string; startedAt: string }) => void;
  onNodeStarted?: (payload: {
    runId: string;
    nodeId: string | number;
    nodeType: string;
    step: number;
  }) => void;
  onNodeCompleted?: (payload: {
    runId: string;
    nodeId: string | number;
    nodeType: string;
    route: string[];
    step: number;
  }) => void;
  onLogs?: (payload: { runId: string; entries: string[] }) => void;
  onRunCompleted?: (payload: {
    runId: string;
    traceCount: number;
    logsCount: number;
    endedAt: string;
  }) => void;
  onRunFailed?: (payload: { runId: string; error: string; endedAt: string }) => void;
};

type LinkIndex = {
  byOrigin: Map<string, GraphLink[]>;
  byTarget: Map<string, GraphLink[]>;
};

type NodeIndex = Map<string, GraphNodeInstance>;
type OutputStore = Map<string, Map<number, unknown>>;

function nodeKey(id: GraphNodeId): string {
  return String(id);
}

function linkNodeAndSlotKey(nodeId: GraphNodeId, slot: number): string {
  return `${String(nodeId)}:${slot}`;
}

function isFlowOutput(nodeType: string, slotIndex: number): boolean {
  const definition = getNodeDefinition(nodeType);
  const slot = definition?.outputs[slotIndex];
  return slot?.kind === "flow" || slot?.type === "flow";
}

function buildNodeIndex(graph: GraphDefinition): NodeIndex {
  const out = new Map<string, GraphNodeInstance>();
  for (const node of graph.nodes) {
    out.set(nodeKey(node.id), node);
  }
  return out;
}

function buildLinkIndex(links: GraphLink[]): LinkIndex {
  const byOrigin = new Map<string, GraphLink[]>();
  const byTarget = new Map<string, GraphLink[]>();
  for (const link of links) {
    const originKey = linkNodeAndSlotKey(link[1], link[2]);
    const targetKey = linkNodeAndSlotKey(link[3], link[4]);
    const originList = byOrigin.get(originKey);
    if (originList) {
      originList.push(link);
    } else {
      byOrigin.set(originKey, [link]);
    }
    const targetList = byTarget.get(targetKey);
    if (targetList) {
      targetList.push(link);
    } else {
      byTarget.set(targetKey, [link]);
    }
  }
  return { byOrigin, byTarget };
}

function collectNodeInputs(
  node: GraphNodeInstance,
  linkIndex: LinkIndex,
  outputStore: OutputStore
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const inputs = node.inputs ?? [];
  for (let targetSlot = 0; targetSlot < inputs.length; targetSlot += 1) {
    const inputName = inputs[targetSlot]?.name;
    if (!inputName) continue;
    const links = linkIndex.byTarget.get(linkNodeAndSlotKey(node.id, targetSlot));
    if (!links || links.length === 0) continue;
    const [firstLink] = links;
    const sourceNodeStore = outputStore.get(nodeKey(firstLink[1]));
    if (!sourceNodeStore) continue;
    out[inputName] = sourceNodeStore.get(firstLink[2]);
  }
  return out;
}

export function validateGraph(graph: GraphDefinition): string | null {
  if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    return "Graph must contain at least one node.";
  }
  if (!Array.isArray(graph.links)) {
    return "Graph links must be an array.";
  }
  const startNodes = graph.nodes.filter((n) => n.type === START_NODE_TYPE);
  if (startNodes.length !== 1) {
    return "Graph must contain exactly one core/start node.";
  }

  for (const node of graph.nodes) {
    if (!getNodeDefinition(node.type)) {
      return `Unsupported node type: ${node.type}`;
    }
  }

  return null;
}

function pushTrace(
  trace: GraphTraceEntry[],
  node: GraphNodeInstance,
  route: string[]
): void {
  trace.push({
    nodeId: node.id,
    nodeType: node.type,
    route,
  });
}

function formatExecutionError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function serializeOutputStore(
  outputStore: OutputStore,
  graph: GraphDefinition
): NodeOutputsSnapshot {
  const out: NodeOutputsSnapshot = {};
  for (const node of graph.nodes) {
    const slotMap = outputStore.get(nodeKey(node.id));
    if (!slotMap || slotMap.size === 0) continue;
    const definition = getNodeDefinition(node.type);
    if (!definition) continue;
    const named: Record<string, unknown> = {};
    definition.outputs.forEach((schema, idx) => {
      if (slotMap.has(idx)) {
        named[schema.name] = slotMap.get(idx)!;
      }
    });
    if (Object.keys(named).length > 0) {
      out[nodeKey(node.id)] = named;
    }
  }
  return out;
}

export async function runGraph(
  runId: string,
  graph: GraphDefinition,
  input: unknown,
  hooks?: RunGraphHooks
): Promise<RunGraphResult> {
  const fireFailed = (error: string): void => {
    hooks?.onRunFailed?.({ runId, error, endedAt: new Date().toISOString() });
  };

  const validationError = validateGraph(graph);
  if (validationError) {
    fireFailed(validationError);
    return {
      runId,
      success: false,
      error: validationError,
      trace: [],
      logs: [],
      nodeOutputs: {},
      context: { currentNodeId: null, currentNodeType: null },
    };
  }

  const nodeIndex = buildNodeIndex(graph);
  const linkIndex = buildLinkIndex(graph.links);
  const outputStore: OutputStore = new Map();
  const startNode = graph.nodes.find((n) => n.type === START_NODE_TYPE);
  if (!startNode) {
    fireFailed("Graph start node not found.");
    return {
      runId,
      success: false,
      error: "Graph start node not found.",
      trace: [],
      logs: [],
      nodeOutputs: {},
      context: { currentNodeId: null, currentNodeType: null },
    };
  }

  const executionContext: ExecutionContext = {
    runId,
    currentNodeId: null,
    currentNodeType: null,
    input,
    trace: [],
    logs: [],
  };
  hooks?.onRunStarted?.({ runId, startedAt: new Date().toISOString() });

  const queue: GraphNodeId[] = [startNode.id];
  let steps = 0;
  while (queue.length > 0) {
    if (steps >= MAX_STEPS) {
      const error = `Maximum execution steps (${MAX_STEPS}) reached.`;
      fireFailed(error);
      return {
        runId,
        success: false,
        error,
        trace: executionContext.trace,
        logs: executionContext.logs,
        nodeOutputs: serializeOutputStore(outputStore, graph),
        context: {
          currentNodeId: executionContext.currentNodeId,
          currentNodeType: executionContext.currentNodeType,
        },
      };
    }
    steps += 1;

    const nodeId = queue.shift();
    if (nodeId === undefined) continue;
    const node = nodeIndex.get(nodeKey(nodeId));
    if (!node) {
      const error = `Node ${String(nodeId)} is missing from graph.`;
      fireFailed(error);
      return {
        runId,
        success: false,
        error,
        trace: executionContext.trace,
        logs: executionContext.logs,
        nodeOutputs: serializeOutputStore(outputStore, graph),
        context: {
          currentNodeId: executionContext.currentNodeId,
          currentNodeType: executionContext.currentNodeType,
        },
      };
    }

    const execute = getNodeExecutor(node.type);
    if (!execute) {
      const error = `No executor found for node type ${node.type}.`;
      fireFailed(error);
      return {
        runId,
        success: false,
        error,
        trace: executionContext.trace,
        logs: executionContext.logs,
        nodeOutputs: serializeOutputStore(outputStore, graph),
        context: {
          currentNodeId: executionContext.currentNodeId,
          currentNodeType: executionContext.currentNodeType,
        },
      };
    }

    executionContext.currentNodeId = node.id;
    executionContext.currentNodeType = node.type;
    hooks?.onNodeStarted?.({
      runId,
      nodeId: node.id,
      nodeType: node.type,
      step: steps,
    });
    const inputs = collectNodeInputs(node, linkIndex, outputStore);

    try {
      const result = await execute({ node, inputs, context: executionContext });
      if (result.logs?.length) {
        executionContext.logs.push(...result.logs);
        hooks?.onLogs?.({ runId, entries: result.logs });
      }
      const definition = getNodeDefinition(node.type);
      const outputs = result.outputs ?? {};
      if (definition) {
        const nodeOut = new Map<number, unknown>();
        definition.outputs.forEach((schema, idx) => {
          if (Object.prototype.hasOwnProperty.call(outputs, schema.name)) {
            nodeOut.set(idx, outputs[schema.name]);
          }
        });
        outputStore.set(nodeKey(node.id), nodeOut);
      }

      const selectedRoute = result.route ?? [];
      pushTrace(executionContext.trace, node, selectedRoute);
      hooks?.onNodeCompleted?.({
        runId,
        nodeId: node.id,
        nodeType: node.type,
        route: selectedRoute,
        step: steps,
      });

      if (definition) {
        const routedSlots = new Set<number>();
        selectedRoute.forEach((routeName) => {
          const slotIdx = definition.outputs.findIndex(
            (slot) => slot.name === routeName
          );
          if (slotIdx >= 0) routedSlots.add(slotIdx);
        });
        for (const slotIdx of routedSlots) {
          if (!isFlowOutput(node.type, slotIdx)) continue;
          const outgoing = linkIndex.byOrigin.get(
            linkNodeAndSlotKey(node.id, slotIdx)
          );
          if (!outgoing || outgoing.length === 0) continue;
          outgoing.forEach((link) => queue.push(link[3]));
        }
      }
    } catch (error) {
      const errMsg = formatExecutionError(error);
      fireFailed(errMsg);
      return {
        runId,
        success: false,
        error: errMsg,
        trace: executionContext.trace,
        logs: executionContext.logs,
        nodeOutputs: serializeOutputStore(outputStore, graph),
        context: {
          currentNodeId: executionContext.currentNodeId,
          currentNodeType: executionContext.currentNodeType,
        },
      };
    }
  }

  hooks?.onRunCompleted?.({
    runId,
    traceCount: executionContext.trace.length,
    logsCount: executionContext.logs.length,
    endedAt: new Date().toISOString(),
  });
  return {
    runId,
    success: true,
    trace: executionContext.trace,
    logs: executionContext.logs,
    nodeOutputs: serializeOutputStore(outputStore, graph),
    context: {
      currentNodeId: executionContext.currentNodeId,
      currentNodeType: executionContext.currentNodeType,
    },
  };
}
