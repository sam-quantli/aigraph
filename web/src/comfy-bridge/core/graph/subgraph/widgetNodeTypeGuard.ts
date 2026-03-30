import type { IBaseWidget } from '@/lib/litegraph/src/types/widgets'
import type { LGraphNode } from '@/lib/litegraph/src/LGraphNode'

export function hasWidgetNode(
  w: unknown
): w is IBaseWidget & { node: LGraphNode } {
  return (
    typeof w === 'object' &&
    w !== null &&
    'node' in w &&
    typeof (w as { node: unknown }).node === 'object' &&
    (w as { node: LGraphNode }).node !== null
  )
}
