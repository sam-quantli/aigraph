import type { LGraphNode } from '@/lib/litegraph/src/LGraphNode'
import type { IBaseWidget } from '@/lib/litegraph/src/types/widgets'

export function useDomWidgetStore() {
  return {
    setPositionOverride(
      _widgetId: string,
      _override: { node: LGraphNode; widget: IBaseWidget }
    ) {
      // no-op (DOM widgets not used in aigraph shell)
    },
    clearPositionOverride(_widgetId: string) {
      // no-op
    }
  }
}
