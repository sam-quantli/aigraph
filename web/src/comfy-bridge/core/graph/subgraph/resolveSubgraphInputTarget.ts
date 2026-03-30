import type { SubgraphNode } from '@/lib/litegraph/src/subgraph/SubgraphNode'

export function resolveSubgraphInputTarget(
  _subgraphNode: SubgraphNode,
  _widgetName: string
): { nodeId: string; widgetName: string } | undefined {
  return undefined
}
