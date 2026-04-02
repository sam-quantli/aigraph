import { Box } from '@mantine/core'
import { useEffect, useMemo, useRef, useState } from 'react'

import { LiteGraphEditor } from '../editor/LiteGraphEditor'
import { type RunGraphResult } from '../editor/api'
import { notifyPreviewRunCompleted } from '../editor/previewBridge'
import { OutputPanel } from '../editor/panels/OutputPanel'
import { AgentPanel } from '../editor/panels/AgentPanel'
import {
  RealtimeClient,
  type ExecutionQueueEvent,
  type RunCompletedEvent,
  type RunFailedEvent,
  type RunLogsEvent,
  type RunNodeCompletedEvent,
  type RunNodeStartedEvent,
  type RunStartedEvent
} from '../editor/realtime'

export function EditorPage() {
  const [isOutputOpen, setIsOutputOpen] = useState(false)
  const [isAgentOpen, setIsAgentOpen] = useState(false)
  const [activeGraphId, setActiveGraphId] = useState('')
  const [currentNodeId, setCurrentNodeId] = useState<string | number | null>(null)
  const [status, setStatus] = useState('Idle')
  const [timeline, setTimeline] = useState<string[]>([])
  const [logs, setLogs] = useState<string[]>([])
  const [queueSummary, setQueueSummary] = useState<string>('')
  const realtimeRef = useRef<RealtimeClient | null>(null)

  const appendTimeline = (line: string) => {
    setTimeline((prev) => [...prev.slice(-199), line])
  }

  useEffect(() => {
    const onRunStarted = (event: RunStartedEvent) => {
      appendTimeline(`run.started id=${event.runId}`)
      setStatus(`Run ${event.runId} started`)
      setIsOutputOpen(true)
    }
    const onNodeStarted = (event: RunNodeStartedEvent) => {
      appendTimeline(`node.started step=${event.step} ${event.nodeType}#${event.nodeId}`)
      setCurrentNodeId(event.nodeId)
    }
    const onNodeCompleted = (event: RunNodeCompletedEvent) => {
      appendTimeline(
        `node.completed step=${event.step} ${event.nodeType}#${event.nodeId} route=${event.route.join(',')}`
      )
    }
    const onLogs = (event: RunLogsEvent) => {
      setLogs((prev) => [...prev, ...event.entries])
    }
    const onRunCompleted = (event: RunCompletedEvent) => {
      appendTimeline(`run.completed id=${event.runId} traces=${event.traceCount}`)
      setStatus(`Run ${event.runId} completed`)
      setCurrentNodeId(null)
      notifyPreviewRunCompleted(event.runId, event.graphId)
    }
    const onRunFailed = (event: RunFailedEvent) => {
      appendTimeline(`run.failed id=${event.runId} error=${event.error}`)
      setStatus(`Run ${event.runId} failed: ${event.error}`)
      setIsOutputOpen(true)
      setCurrentNodeId(null)
    }
    const onExecutionQueue = (event: ExecutionQueueEvent) => {
      const line = event.jobs
        .map((j) => `${j.runId.slice(0, 8)}…${j.status}@${j.position}`)
        .join(', ')
      appendTimeline(`execution.queue graph=${event.graphId} [${line}]`)
      setQueueSummary(
        event.jobs.length === 0
          ? 'Queue empty'
          : `${event.jobs.length} job(s): ${event.jobs.map((j) => `${j.status}:${j.position}`).join(', ')}`
      )
    }

    const client = new RealtimeClient({
      onRunStarted,
      onNodeStarted,
      onNodeCompleted,
      onLogs,
      onRunCompleted,
      onRunFailed,
      onExecutionQueue
    })
    realtimeRef.current = client
    return () => {
      realtimeRef.current?.disconnect()
      realtimeRef.current = null
    }
  }, [])

  useEffect(() => {
    const client = realtimeRef.current
    if (!client) return
    if (!activeGraphId) return
    client.joinGraph(activeGraphId)
    return () => {
      client.leaveGraph(activeGraphId)
    }
  }, [activeGraphId])

  const handleRunRequested = (runId: string, graphId?: string) => {
    realtimeRef.current?.joinRun(runId)
    if (graphId) setActiveGraphId(graphId)
    setTimeline([])
    setLogs([])
    setCurrentNodeId(null)
    setStatus(`Run ${runId} requested`)
    setIsOutputOpen(true)
  }

  const handleRunResult = (result: RunGraphResult) => {
    setStatus(
      `Run ${result.runId} queued at position ${result.queuePosition}${result.graphId ? ` (graph ${result.graphId})` : ''}`
    )
  }

  const outputStatus = useMemo(() => status, [status])

  return (
    <Box
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Box style={{ flex: 1, minHeight: 0, minWidth: 0, position: 'relative' }}>
        <LiteGraphEditor
          onStatusChange={setStatus}
          onActiveGraphIdChange={setActiveGraphId}
          onRunRequested={handleRunRequested}
          onRunResult={handleRunResult}
          currentNodeId={currentNodeId}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 4
          }}
        >
          <div style={{ height: '100%', pointerEvents: 'auto' }}>
            <AgentPanel isOpen={isAgentOpen} onToggle={() => setIsAgentOpen((v) => !v)} />
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            pointerEvents: 'none',
            zIndex: 4
          }}
        >
          <div style={{ pointerEvents: 'auto' }}>
            <OutputPanel
              isOpen={isOutputOpen}
              onToggle={() => setIsOutputOpen((v) => !v)}
              timeline={timeline}
              logs={logs}
              status={[outputStatus, queueSummary].filter(Boolean).join(' · ')}
            />
          </div>
        </div>
      </Box>
    </Box>
  )
}
