export type PreviewContext = {
  runId: string | null
  graphId?: string
  dataVersion: number
  serializeGraph: () => unknown | null
}

let lastRunId: string | null = null
let lastGraphId: string | undefined
let dataVersion = 0
let serializeGraph: (() => unknown | null) | null = null

const listeners = new Set<() => void>()

export function setPreviewGraphSerializer(fn: (() => unknown | null) | null): void {
  serializeGraph = fn
}

/** Call when a graph run completes successfully so chart nodes can pull /preview data. */
export function notifyPreviewRunCompleted(nextRunId: string, nextGraphId?: string): void {
  lastRunId = nextRunId
  lastGraphId = nextGraphId
  dataVersion += 1
  for (const cb of listeners) {
    try {
      cb()
    } catch (e) {
      console.warn('preview listener', e)
    }
  }
}

export function getPreviewContext(): PreviewContext {
  return {
    runId: lastRunId,
    graphId: lastGraphId,
    dataVersion,
    serializeGraph: () => serializeGraph?.() ?? null,
  }
}

export function subscribeChartPreviewRefresh(cb: () => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
