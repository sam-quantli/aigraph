export const SESSION_JOIN_GRAPH = "session.join_graph";
export const SESSION_LEAVE_GRAPH = "session.leave_graph";
export const SESSION_JOIN_RUN = "session.join_run";
export const SESSION_LEAVE_RUN = "session.leave_run";

export const SESSION_CONNECTED = "session.connected";
export const SESSION_JOINED_GRAPH = "session.joined_graph";
export const SESSION_LEFT_GRAPH = "session.left_graph";
export const SESSION_JOINED_RUN = "session.joined_run";
export const SESSION_LEFT_RUN = "session.left_run";

export const RUN_STARTED = "run.started";
export const RUN_NODE_STARTED = "run.node.started";
export const RUN_NODE_COMPLETED = "run.node.completed";
export const RUN_LOGS = "run.logs";
export const RUN_COMPLETED = "run.completed";
export const RUN_FAILED = "run.failed";

export const EXECUTION_QUEUE = "execution.queue";

export type ExecutionQueueJobEntry = {
  runId: string;
  status: "queued" | "running";
  /** 0 = currently running; 1+ = place among this graph's queued runs. */
  position: number;
};

export type ExecutionQueuePayload = {
  graphId: string;
  jobs: ExecutionQueueJobEntry[];
};

export type JoinGraphPayload = { graphId: string };
export type LeaveGraphPayload = { graphId: string };
export type JoinRunPayload = { runId: string };
export type LeaveRunPayload = { runId: string };

export type RunStartedPayload = {
  runId: string;
  graphId?: string;
  startedAt: string;
};

export type RunNodeStartedPayload = {
  runId: string;
  graphId?: string;
  nodeId: string | number;
  nodeType: string;
  step: number;
};

export type RunNodeCompletedPayload = {
  runId: string;
  graphId?: string;
  nodeId: string | number;
  nodeType: string;
  route: string[];
  step: number;
};

export type RunLogsPayload = {
  runId: string;
  graphId?: string;
  entries: string[];
};

export type RunCompletedPayload = {
  runId: string;
  graphId?: string;
  success: true;
  traceCount: number;
  logsCount: number;
  endedAt: string;
};

export type RunFailedPayload = {
  runId: string;
  graphId?: string;
  success: false;
  error: string;
  endedAt: string;
};
