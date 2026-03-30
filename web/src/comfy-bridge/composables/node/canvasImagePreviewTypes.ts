import type { LGraphNode } from '@/lib/litegraph/src/LGraphNode'

export const CANVAS_IMAGE_PREVIEW_WIDGET = 'canvas_preview'

export function supportsVirtualCanvasImagePreview(
  _node: LGraphNode
): boolean {
  return false
}
