import { io, type Socket } from 'socket.io-client'

export type RunStartedEvent = {
  runId: string
  graphId?: string
  startedAt: string
}

export type RunNodeStartedEvent = {
  runId: string
  graphId?: string
  nodeId: string | number
  nodeType: string
  step: number
}

export type RunNodeCompletedEvent = {
  runId: string
  graphId?: string
  nodeId: string | number
  nodeType: string
  route: string[]
  step: number
}

export type RunLogsEvent = {
  runId: string
  graphId?: string
  entries: string[]
}

export type RunCompletedEvent = {
  runId: string
  graphId?: string
  success: true
  traceCount: number
  logsCount: number
  endedAt: string
}

export type RunFailedEvent = {
  runId: string
  graphId?: string
  success: false
  error: string
  endedAt: string
}

export type ExecutionQueueEvent = {
  graphId: string
  jobs: Array<{
    runId: string
    status: 'queued' | 'running'
    position: number
  }>
}

export type RealtimeCallbacks = {
  onRunStarted?: (event: RunStartedEvent) => void
  onNodeStarted?: (event: RunNodeStartedEvent) => void
  onNodeCompleted?: (event: RunNodeCompletedEvent) => void
  onLogs?: (event: RunLogsEvent) => void
  onRunCompleted?: (event: RunCompletedEvent) => void
  onRunFailed?: (event: RunFailedEvent) => void
  onExecutionQueue?: (event: ExecutionQueueEvent) => void
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3031'

const EXECUTION_QUEUE = 'execution.queue'

export class RealtimeClient {
  private readonly socket: Socket
  private readonly callbacks: RealtimeCallbacks

  constructor(callbacks: RealtimeCallbacks) {
    this.callbacks = callbacks
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    })

    this.socket.on('run.started', (event: RunStartedEvent) => this.callbacks.onRunStarted?.(event))
    this.socket.on('run.node.started', (event: RunNodeStartedEvent) =>
      this.callbacks.onNodeStarted?.(event)
    )
    this.socket.on('run.node.completed', (event: RunNodeCompletedEvent) =>
      this.callbacks.onNodeCompleted?.(event)
    )
    this.socket.on('run.logs', (event: RunLogsEvent) => this.callbacks.onLogs?.(event))
    this.socket.on('run.completed', (event: RunCompletedEvent) =>
      this.callbacks.onRunCompleted?.(event)
    )
    this.socket.on('run.failed', (event: RunFailedEvent) => this.callbacks.onRunFailed?.(event))
    this.socket.on(EXECUTION_QUEUE, (event: ExecutionQueueEvent) =>
      this.callbacks.onExecutionQueue?.(event)
    )
  }

  joinGraph(graphId: string): void {
    this.socket.emit('session.join_graph', { graphId })
  }

  leaveGraph(graphId: string): void {
    this.socket.emit('session.leave_graph', { graphId })
  }

  joinRun(runId: string): void {
    this.socket.emit('session.join_run', { runId })
  }

  leaveRun(runId: string): void {
    this.socket.emit('session.leave_run', { runId })
  }

  disconnect(): void {
    this.socket.disconnect()
  }
}

