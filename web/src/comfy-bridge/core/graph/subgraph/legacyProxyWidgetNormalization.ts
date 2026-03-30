import type { SubgraphNode } from '@/lib/litegraph/src/subgraph/SubgraphNode'

import type { PromotedWidgetSource } from '@/core/graph/subgraph/promotedWidgetTypes'

export function normalizeLegacyProxyWidgetEntry(
  _subgraphNode: SubgraphNode,
  nodeId: string,
  widgetName: string,
  sourceNodeId?: string
): PromotedWidgetSource | null {
  return {
    sourceNodeId: sourceNodeId ?? nodeId,
    sourceWidgetName: widgetName
  }
}
