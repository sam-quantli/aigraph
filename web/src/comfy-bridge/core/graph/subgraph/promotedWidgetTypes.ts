import type { IBaseWidget } from '@/lib/litegraph/src/types/widgets'

export interface PromotedWidgetSource {
  sourceNodeId: string
  sourceWidgetName: string
  disambiguatingSourceNodeId?: string
}

const sym = Symbol('promotedWidgetView')

export interface PromotedWidgetView extends IBaseWidget {
  readonly sourceNodeId: string
  readonly sourceWidgetName: string
  readonly disambiguatingSourceNodeId?: string
  [sym]?: true
}

export function isPromotedWidgetView(
  w: unknown
): w is PromotedWidgetView {
  return (
    typeof w === 'object' &&
    w !== null &&
    'sourceNodeId' in w &&
    'sourceWidgetName' in w &&
    typeof (w as PromotedWidgetView).sourceNodeId === 'string'
  )
}
