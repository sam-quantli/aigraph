import { getNodeDefinition } from "../nodes/index.js";
import type {
  GraphDefinition,
  GraphLink,
  GraphNodeInstance,
  NodeOutputsSnapshot,
} from "../types.js";

function nodeKey(id: string | number): string {
  return String(id);
}

function linkNodeAndSlotKey(nodeId: string | number, slot: number): string {
  return `${String(nodeId)}:${slot}`;
}

function buildLinkIndexByTarget(links: GraphLink[]): Map<string, GraphLink[]> {
  const byTarget = new Map<string, GraphLink[]>();
  for (const link of links) {
    const targetKey = linkNodeAndSlotKey(link[3], link[4]);
    const list = byTarget.get(targetKey);
    if (list) list.push(link);
    else byTarget.set(targetKey, [link]);
  }
  return byTarget;
}

export function resolveLinkedDataInput(
  graph: GraphDefinition,
  node: GraphNodeInstance,
  inputName: string,
  nodeOutputs: NodeOutputsSnapshot
): unknown {
  const inputs = node.inputs ?? [];
  const targetSlot = inputs.findIndex((i) => i.name === inputName);
  if (targetSlot < 0) return undefined;
  const byTarget = buildLinkIndexByTarget(graph.links);
  const links = byTarget.get(linkNodeAndSlotKey(node.id, targetSlot));
  if (!links?.length) return undefined;
  const [firstLink] = links;
  const sourceId = nodeKey(firstLink[1]);
  const sourceSlot = firstLink[2];
  const named = nodeOutputs[sourceId];
  if (!named) return undefined;
  const sourceNode = graph.nodes.find((n) => String(n.id) === String(firstLink[1]));
  if (!sourceNode) return undefined;
  const def = getNodeDefinition(sourceNode.type);
  if (!def) return undefined;
  const schema = def.outputs[sourceSlot];
  if (!schema) return undefined;
  return named[schema.name];
}
