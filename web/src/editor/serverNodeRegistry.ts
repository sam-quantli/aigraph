import { LGraphNode, LiteGraph } from '@/lib/litegraph/src/litegraph'
import {
  CandlestickSeries,
  createChart,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts'

import { fetchNodePreview, type GraphDefinition, type GraphNodeDefinition } from './api'
import { getPreviewContext } from './previewBridge'

const registered = new Set<string>()
const CHART_NODE_TYPE = 'quantli/candles_chart'

type CandlePoint = {
  time: Time
  open: number
  high: number
  low: number
  close: number
}

function mapWidgetType(type: string): string {
  switch (type) {
    case 'toggle':
      return 'toggle'
    case 'combo':
      return 'combo'
    case 'number':
      return 'number'
    case 'text':
    default:
      return 'text'
  }
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

/** Quantli-style: `{ o, h, l, c, v?, t }` with `t` ISO string or unix seconds/ms. */
function parseCandleTime(raw: unknown): Time | null {
  if (raw == null) return null
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s.length) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    const ms = Date.parse(s)
    if (!Number.isNaN(ms)) return Math.floor(ms / 1000) as UTCTimestamp
    return null
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const sec = raw > 1e12 ? Math.floor(raw / 1000) : Math.floor(raw)
    return sec as UTCTimestamp
  }
  return null
}

function candleTimeSortKey(t: Time): number {
  if (typeof t === 'number') return t
  if (typeof t === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      const [y, m, d] = t.split('-').map(Number)
      return Date.UTC(y, m - 1, d) / 1000
    }
    const ms = Date.parse(t)
    return Number.isNaN(ms) ? 0 : ms / 1000
  }
  if (typeof t === 'object' && t !== null && 'year' in t) {
    const bd = t as { year: number; month: number; day: number }
    return Date.UTC(bd.year, bd.month - 1, bd.day) / 1000
  }
  return 0
}

function normalizeCandles(input: unknown): CandlePoint[] {
  let rows: unknown[] = []
  if (Array.isArray(input)) {
    rows = input
  } else if (input && typeof input === 'object') {
    const one = input as Record<string, unknown>
    if ('o' in one || 'open' in one) rows = [input]
    else return []
  } else {
    return []
  }

  const out = rows
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null
      const record = item as Record<string, unknown>
      const time = parseCandleTime(record.t ?? record.timestamp)
      const open = toNumber(record.o ?? record.open)
      const high = toNumber(record.h ?? record.high)
      const low = toNumber(record.l ?? record.low)
      const close = toNumber(record.c ?? record.close)
      if (time === null || open === null || high === null || low === null || close === null) {
        return null
      }
      return { time, open, high, low, close }
    })
    .filter((item): item is CandlePoint => item !== null)

  out.sort((a, b) => candleTimeSortKey(a.time) - candleTimeSortKey(b.time))
  return out
}

export type GraphWithNodes = {
  nodes?: Array<{ type?: string; refreshServerPreview?: () => void }>
  _nodes?: Array<{ type?: string; refreshServerPreview?: () => void }>
}

export function refreshAllCandlesChartPreviews(graph: GraphWithNodes): void {
  const nodes = graph.nodes ?? graph._nodes
  if (!nodes) return
  for (const n of nodes) {
    if (n.type === CHART_NODE_TYPE && typeof n.refreshServerPreview === 'function') {
      n.refreshServerPreview()
    }
  }
}

function registerChartNode(def: GraphNodeDefinition): void {
  class CandlesChartNode extends LGraphNode {
    private chartHost: HTMLDivElement | null = null
    private chart: ReturnType<typeof createChart> | null = null
    private candleSeries: any | null = null
    private hasChartData = false
    private lastChartWidthCss = 0
    private lastChartHeightCss = 0
    private currentKey = ''
    private lastServerPreviewKey = ''
    private previewAbort: AbortController | null = null

    /** Exposed for {@link refreshAllCandlesChartPreviews}. */
    refreshServerPreview = (): void => {
      this.lastServerPreviewKey = ''
      void this.fetchServerPreview(true)
    }

    constructor() {
      super(def.title)
      this.properties = { ...(def.defaultProperties ?? {}) }

      for (const input of def.inputs) {
        this.addInput(input.name, input.type ?? '*')
      }
      for (const output of def.outputs) {
        this.addOutput(output.name, output.type ?? '*')
      }

      ;(this as unknown as { size?: [number, number] }).size = [420, 260]
    }

    onExecute() {
      const candlesInput = this.getInputData(1)
      const candlesLocal = normalizeCandles(candlesInput)
      this.setOutputData(1, candlesInput)

      if (candlesLocal.length) {
        this.lastServerPreviewKey = ''
        const key = JSON.stringify(candlesLocal)
        if (key === this.currentKey) return
        this.currentKey = key
        this.updateChart(candlesLocal)
        return
      }

      void this.fetchServerPreview(false)
    }

    private async fetchServerPreview(force: boolean): Promise<void> {
      const ctx = getPreviewContext()
      if (!ctx.runId) return

      const graph = ctx.serializeGraph()
      if (!graph || typeof graph !== 'object') return

      const fetchKey = `${ctx.runId}:${ctx.dataVersion}:${this.id}`
      if (!force && fetchKey === this.lastServerPreviewKey && this.hasChartData) return

      this.lastServerPreviewKey = fetchKey
      this.previewAbort?.abort()
      const ac = new AbortController()
      this.previewAbort = ac

      try {
        const preview = await fetchNodePreview({
          runId: ctx.runId,
          nodeId: this.id,
          graph: graph as GraphDefinition,
          signal: ac.signal,
        })
        const candles = normalizeCandles(preview.candles)
        if (!candles.length) return

        const key = JSON.stringify(candles)
        if (key === this.currentKey) return
        this.currentKey = key
        this.updateChart(candles)
        const withDirty = this as unknown as {
          setDirtyCanvas: (f: boolean, b?: boolean) => void
        }
        withDirty.setDirtyCanvas(true, true)
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') return
        console.warn('Candles chart preview fetch failed', e)
      }
    }

    onDrawForeground(
      ctx: CanvasRenderingContext2D,
      canvas: { ds: { scale: number }; convertOffsetToCanvas: (pos: [number, number]) => [number, number] },
      canvasElement: HTMLCanvasElement
    ) {
      const nodeSize = (this as unknown as { size?: [number, number] }).size ?? [420, 260]
      const localWidth = Math.max(180, nodeSize[0] - 16)
      const localHeight = Math.max(100, nodeSize[1] - 44)
      const localX = 8
      const localY = 30
      const scale = canvas.ds.scale
      const chartLeftCss = canvasElement.getBoundingClientRect().left
      const chartTopCss = canvasElement.getBoundingClientRect().top
      const [nodeOriginCanvasX, nodeOriginCanvasY] = canvas.convertOffsetToCanvas(this.pos as [number, number])

      // lightweight-charts is rendered in CSS pixels, so we must scale the node-local content area.
      const overlayLeft = chartLeftCss + nodeOriginCanvasX + localX * scale
      const overlayTop = chartTopCss + nodeOriginCanvasY + localY * scale
      const overlayWidth = Math.max(1, localWidth * scale)
      const overlayHeight = Math.max(1, localHeight * scale)

      ctx.save()
      ctx.fillStyle = '#101015'
      ctx.fillRect(localX, localY, localWidth, localHeight)

      if (this.chartHost && this.hasChartData && this.chart) {
        const host = this.chartHost
        host.style.left = `${overlayLeft}px`
        host.style.top = `${overlayTop}px`
        host.style.width = `${overlayWidth}px`
        host.style.height = `${overlayHeight}px`
        host.style.visibility = 'visible'

        // Avoid spamming applyOptions every draw.
        const w = Math.floor(overlayWidth)
        const h = Math.floor(overlayHeight)
        if (w !== this.lastChartWidthCss || h !== this.lastChartHeightCss) {
          this.lastChartWidthCss = w
          this.lastChartHeightCss = h
          this.chart.applyOptions({ width: w, height: h })
        }
      } else {
        this.chartHost && (this.chartHost.style.visibility = 'hidden')
        ctx.fillStyle = '#7c7c85'
        ctx.font = '12px sans-serif'
        ctx.fillText('Run graph or connect candles to preview chart', localX + 10, localY + 22)
      }
      ctx.restore()
    }

    onRemoved(): void {
      this.previewAbort?.abort()
      this.previewAbort = null
      this.chart?.remove()
      this.chart = null
      this.candleSeries = null
      if (this.chartHost) this.chartHost.remove()
      this.chartHost = null
      this.hasChartData = false
      this.lastChartWidthCss = 0
      this.lastChartHeightCss = 0
    }

    private updateChart(candles: CandlePoint[]): void {
      if (typeof window === 'undefined' || candles.length === 0) return

      if (!this.chartHost) {
        const host = document.createElement('div')
        host.style.position = 'fixed'
        host.style.left = '0px'
        host.style.top = '0px'
        host.style.width = '1px'
        host.style.height = '1px'
        host.style.pointerEvents = 'auto'
        host.style.zIndex = '50'
        host.style.visibility = 'hidden'
        host.style.background = '#101015'
        host.style.border = '1px solid #1f2230'
        host.style.boxSizing = 'border-box'

        // Prevent chart interactions from affecting the underlying canvas editor.
        host.addEventListener('mousedown', (e) => e.stopPropagation(), { capture: true })
        host.addEventListener('dblclick', (e) => e.stopPropagation(), { capture: true })
        host.addEventListener('wheel', (e) => e.stopPropagation(), { capture: true })

        document.body.appendChild(host)
        this.chartHost = host
      }

      if (!this.chart) {
        this.chart = createChart(this.chartHost, {
          // Initial size; will be updated on the next draw.
          width: 640,
          height: 320,
          layout: {
            background: { color: '#101015' },
            textColor: '#c8c8cf',
          },
          grid: {
            vertLines: { color: '#1f2230' },
            horzLines: { color: '#1f2230' },
          },
          timeScale: {
            rightOffset: 0,
            lockVisibleTimeRangeOnResize: true,
          },
        })

        this.candleSeries = this.chart.addSeries(CandlestickSeries, {
          upColor: '#26a69a',
          downColor: '#ef5350',
          borderVisible: false,
          wickUpColor: '#26a69a',
          wickDownColor: '#ef5350',
        })
      }

      this.hasChartData = true
      this.candleSeries?.setData(candles)
    }
  }

  ;(CandlesChartNode as unknown as { title?: string; desc?: string }).title = def.title
  ;(CandlesChartNode as unknown as { title?: string; desc?: string }).desc = def.description
  LiteGraph.registerNodeType(def.type, CandlesChartNode)
  registered.add(def.type)
}

export function registerServerNodes(definitions: GraphNodeDefinition[]): void {
  for (const def of definitions) {
    if (registered.has(def.type)) continue
    if (def.type === CHART_NODE_TYPE) {
      registerChartNode(def)
      continue
    }

    class ServerNode extends LGraphNode {
      constructor() {
        super(def.title)
        this.properties = { ...(def.defaultProperties ?? {}) }

        for (const input of def.inputs) {
          this.addInput(input.name, input.type ?? '*')
        }
        for (const output of def.outputs) {
          this.addOutput(output.name, output.type ?? '*')
        }
        for (const widget of def.widgets ?? []) {
          this.addWidget(
            mapWidgetType(widget.type),
            widget.name,
            widget.defaultValue,
            null,
            {
              property: widget.name,
              ...(widget.options ?? {})
            }
          )
        }
      }

      override onExecute() {
        // Server is authoritative for execution; browser node bodies are metadata-only.
      }
    }

    ;(ServerNode as unknown as { title?: string; desc?: string }).title = def.title
    ;(ServerNode as unknown as { title?: string; desc?: string }).desc = def.description
    LiteGraph.registerNodeType(def.type, ServerNode)
    registered.add(def.type)
  }
}

