import { useCallback, useEffect, useRef, useState } from 'react'

import { LGraph, LGraphCanvas, LiteGraph } from '@/lib/litegraph/src/litegraph'

import {
  createGraph,
  fetchNodeCatalog,
  listGraphs,
  runGraph,
  updateGraph,
  type GraphRecord
} from './api'
import {
  refreshAllCandlesChartPreviews,
  registerServerNodes,
  type GraphWithNodes
} from './serverNodeRegistry'
import {
  setPreviewGraphSerializer,
  subscribeChartPreviewRefresh
} from './previewBridge'
import {
  registerAigraphTestNodes,
  sampleTestNodeLayout
} from './testNodes'

type LiteGraphEditorProps = {
  onStatusChange?: (status: string) => void
  onActiveGraphIdChange?: (graphId: string) => void
  onRunRequested?: (runId: string, graphId?: string) => void
  onRunResult?: (result: Awaited<ReturnType<typeof runGraph>>) => void
  currentNodeId?: string | number | null
}

export function LiteGraphEditor({
  onStatusChange,
  onActiveGraphIdChange,
  onRunRequested,
  onRunResult,
  currentNodeId
}: LiteGraphEditorProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const graphCanvasRef = useRef<LGraphCanvas | null>(null)
  const graphRef = useRef<LGraph | null>(null)
  const [graphs, setGraphs] = useState<GraphRecord[]>([])
  const [activeGraphId, setActiveGraphId] = useState<string>('')
  const [status, setStatus] = useState<string>('Loading nodes...')
  const highlightedNodeIdRef = useRef<string | number | null>(null)

  const setEditorStatus = useCallback(
    (value: string) => {
      setStatus(value)
      onStatusChange?.(value)
    },
    [onStatusChange]
  )

  const refreshGraphs = useCallback(async () => {
    const items = await listGraphs()
    setGraphs(items)
  }, [])

  const graphById = useCallback(
    (id: string) => graphs.find((g) => g.id === id) ?? null,
    [graphs]
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap) return

    let cancelled = false
    const setup = async () => {
      try {
        const catalog = await fetchNodeCatalog()
        registerServerNodes(catalog)
        if (!cancelled) setEditorStatus(`Loaded ${catalog.length} server node types.`)
      } catch (error) {
        registerAigraphTestNodes()
        if (!cancelled) {
          const msg = error instanceof Error ? error.message : String(error)
          setEditorStatus(`Server node catalog unavailable (${msg}); using local fallback.`)
        }
      }

      const graph = new LGraph()
      const graphCanvas = new LGraphCanvas(canvas, graph)
      graphRef.current = graph
      graphCanvasRef.current = graphCanvas
      LGraphCanvas.active_canvas = graphCanvas
      setPreviewGraphSerializer(() => graphRef.current?.serialize() ?? null)

      for (const spec of sampleTestNodeLayout()) {
        const n = LiteGraph.createNode(spec.type)
        if (n) {
          n.pos = spec.pos
          graph.add(n)
        }
      }

      graphCanvas.resize(wrap.clientWidth, wrap.clientHeight)
      graphCanvas.setDirty(true, true)
      graphCanvas.draw(true, true)
    }

    void setup()

    const ro = new ResizeObserver(() => {
      if (!wrapRef.current || !graphCanvasRef.current) return
      const w = wrapRef.current.clientWidth
      const h = wrapRef.current.clientHeight
      graphCanvasRef.current.resize(w, h)
      graphCanvasRef.current.setDirty(true, true)
      graphCanvasRef.current.draw(true, true)
    })
    ro.observe(wrap)

    void refreshGraphs().catch((error) => {
      const msg = error instanceof Error ? error.message : String(error)
      setEditorStatus(`Failed to list saved graphs: ${msg}`)
    })

    return () => {
      cancelled = true
      ro.disconnect()
      setPreviewGraphSerializer(null)
      graphCanvasRef.current?.stopRendering()
      graphCanvasRef.current?.unbindEvents()
      graphCanvasRef.current = null
      graphRef.current?.stop()
      graphRef.current = null
    }
  }, [refreshGraphs, setEditorStatus])

  useEffect(() => {
    return subscribeChartPreviewRefresh(() => {
      const g = graphRef.current
      const c = graphCanvasRef.current
      if (!g || !c) return
      refreshAllCandlesChartPreviews(g as GraphWithNodes)
      c.setDirty(true, true)
      c.draw(true, true)
    })
  }, [])

  useEffect(() => {
    const graph = graphRef.current
    if (!graph) return

    const prevId = highlightedNodeIdRef.current
    if (prevId !== null) {
      const prevNode = graph.getNodeById(prevId)
      if (prevNode) {
        prevNode.boxcolor = undefined
      }
    }

    if (currentNodeId !== null && currentNodeId !== undefined) {
      const node = graph.getNodeById(currentNodeId)
      if (node) {
        node.boxcolor = '#ffcc00'
      }
      highlightedNodeIdRef.current = currentNodeId
    } else {
      highlightedNodeIdRef.current = null
    }

    graphCanvasRef.current?.setDirty(true, true)
    graphCanvasRef.current?.draw(true, true)
  }, [currentNodeId])

  useEffect(() => {
    onActiveGraphIdChange?.(activeGraphId)
  }, [activeGraphId, onActiveGraphIdChange])

  const handleSaveAsNew = useCallback(async () => {
    if (!graphRef.current) return
    const name = window.prompt('Graph name')
    if (!name) return
    const graphData = graphRef.current.serialize()
    const created = await createGraph({ name, graph: graphData })
    setActiveGraphId(created.id)
    await refreshGraphs()
    setEditorStatus(`Saved graph "${created.name}"`)
  }, [refreshGraphs, setEditorStatus])

  const handleSave = useCallback(async () => {
    if (!graphRef.current || !activeGraphId) {
      setEditorStatus('Select a graph first or use "Save As New".')
      return
    }
    const graphData = graphRef.current.serialize()
    const updated = await updateGraph(activeGraphId, { graph: graphData })
    await refreshGraphs()
    setEditorStatus(`Updated graph "${updated.name}" (v${updated.version})`)
  }, [activeGraphId, refreshGraphs, setEditorStatus])

  const handleLoad = useCallback(() => {
    if (!graphRef.current || !activeGraphId) {
      setEditorStatus('Select a graph to load.')
      return
    }
    const selected = graphById(activeGraphId)
    if (!selected) {
      setEditorStatus('Selected graph was not found.')
      return
    }
    graphRef.current.clear()
    graphRef.current.configure(selected.graph)
    graphCanvasRef.current?.setDirty(true, true)
    graphCanvasRef.current?.draw(true, true)
    setEditorStatus(`Loaded graph "${selected.name}"`)
  }, [activeGraphId, graphById, setEditorStatus])

  const handleRun = useCallback(async () => {
    if (!graphRef.current) return
    const runId = crypto.randomUUID()
    onRunRequested?.(runId, activeGraphId || undefined)
    const payload = activeGraphId
      ? { graphId: activeGraphId, input: {}, jobId: runId }
      : { graph: graphRef.current.serialize(), input: {}, jobId: runId }
    const result = await runGraph(payload)
    setEditorStatus(
      `Run ${result.runId} queued (position ${result.queuePosition}). Await realtime for progress.`
    )
    onRunResult?.(result)
  }, [activeGraphId, onRunRequested, onRunResult, setEditorStatus])

  const handleAction = useCallback(
    async (fn: () => Promise<void>) => {
      try {
        await fn()
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        setEditorStatus(msg)
      }
    },
    [setEditorStatus]
  )

  return (
    <div
      ref={wrapRef}
      style={{
        flex: 1,
        minHeight: 0,
        width: '100%',
        height: '100%',
        position: 'relative',
        background: '#1e1e1e'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 8,
          background: 'rgba(0,0,0,0.6)',
          color: '#ddd',
          fontSize: 12
        }}
      >
        <button onClick={() => void handleAction(refreshGraphs)}>Refresh</button>
        <select
          value={activeGraphId}
          onChange={(e) => setActiveGraphId(e.target.value)}
          style={{ minWidth: 180 }}
        >
          <option value="">Unsaved graph</option>
          {graphs.map((graph) => (
            <option key={graph.id} value={graph.id}>
              {graph.name}
            </option>
          ))}
        </select>
        <button onClick={() => void handleAction(handleSaveAsNew)}>Save As New</button>
        <button onClick={() => void handleAction(handleSave)}>Save</button>
        <button onClick={handleLoad}>Load</button>
        <button onClick={() => void handleAction(handleRun)}>Run</button>
        <span>{status}</span>
      </div>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />
    </div>
  )
}
