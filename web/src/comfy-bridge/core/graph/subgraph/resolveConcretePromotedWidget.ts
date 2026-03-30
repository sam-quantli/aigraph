import type { LGraphNode } from '@/lib/litegraph/src/LGraphNode'
import type { SubgraphNode } from '@/lib/litegraph/src/subgraph/SubgraphNode'
import type { IBaseWidget } from '@/lib/litegraph/src/types/widgets'

export type ResolveConcreteResult =
  | {
      status: 'resolved'
      resolved: { node: LGraphNode; widget: IBaseWidget }
    }
  | { status: 'unresolved' }

export function resolveConcretePromotedWidget(
  _host: SubgraphNode,
  _sourceNodeId: string,
  _sourceWidgetName: string,
  _disambiguatingSourceNodeId?: string
): ResolveConcreteResult {
  return { status: 'unresolved' }
}

export function resolvePromotedWidgetAtHost(
  _host: SubgraphNode,
  _sourceNodeId: string,
  _sourceWidgetName: string,
  _disambiguatingSourceNodeId?: string
): { node: LGraphNode; widget: IBaseWidget } | undefined {
  return undefined
}
