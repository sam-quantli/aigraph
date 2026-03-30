import type { SubgraphNode } from '@/lib/litegraph/src/subgraph/SubgraphNode'
import type { IBaseWidget } from '@/lib/litegraph/src/types/widgets'

import type { PromotedWidgetView as IPromotedWidgetView } from '@/core/graph/subgraph/promotedWidgetTypes'
import { isPromotedWidgetView } from '@/core/graph/subgraph/promotedWidgetTypes'

export type { PromotedWidgetView } from '@/core/graph/subgraph/promotedWidgetTypes'
export { isPromotedWidgetView }

/**
 * Minimal promoted widget view for aigraph — enough for SubgraphNode construction.
 */
class PromotedWidgetViewImpl {
  readonly sourceNodeId: string
  readonly sourceWidgetName: string
  readonly disambiguatingSourceNodeId?: string
  readonly serialize = false

  name: string
  type: IBaseWidget['type'] = 'button'
  options: IBaseWidget['options'] = {}
  y = 0
  value: unknown

  constructor(
    private readonly subgraphNode: SubgraphNode,
    nodeId: string,
    widgetName: string,
    displayName?: string,
    disambiguatingSourceNodeId?: string,
    identityName?: string
  ) {
    this.sourceNodeId = nodeId
    this.sourceWidgetName = widgetName
    this.disambiguatingSourceNodeId = disambiguatingSourceNodeId
    this.name = identityName ?? widgetName
    this.value = undefined
    if (displayName) this.options = { ...this.options, title: displayName }
  }

  get node(): SubgraphNode {
    return this.subgraphNode
  }
}

export function createPromotedWidgetView(
  subgraphNode: SubgraphNode,
  nodeId: string,
  widgetName: string,
  displayName?: string,
  disambiguatingSourceNodeId?: string,
  identityName?: string
): IPromotedWidgetView {
  return new PromotedWidgetViewImpl(
    subgraphNode,
    nodeId,
    widgetName,
    displayName,
    disambiguatingSourceNodeId,
    identityName
  ) as IPromotedWidgetView
}
