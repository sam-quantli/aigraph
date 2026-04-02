import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import {
  EXECUTION_QUEUE,
  RUN_COMPLETED,
  RUN_FAILED,
  RUN_LOGS,
  RUN_NODE_COMPLETED,
  RUN_NODE_STARTED,
  RUN_STARTED,
  SESSION_CONNECTED,
  SESSION_JOINED_GRAPH,
  SESSION_JOINED_RUN,
  SESSION_JOIN_GRAPH,
  SESSION_JOIN_RUN,
  SESSION_LEFT_GRAPH,
  SESSION_LEFT_RUN,
  SESSION_LEAVE_GRAPH,
  SESSION_LEAVE_RUN,
  type ExecutionQueuePayload,
  type JoinGraphPayload,
  type JoinRunPayload,
  type LeaveGraphPayload,
  type LeaveRunPayload,
  type RunCompletedPayload,
  type RunFailedPayload,
  type RunLogsPayload,
  type RunNodeCompletedPayload,
  type RunNodeStartedPayload,
  type RunStartedPayload,
} from "./events.js";

type RoomTarget = {
  runId: string;
  graphId?: string;
};

function graphRoom(graphId: string): string {
  return `graph:${graphId}`;
}

function runRoom(runId: string): string {
  return `run:${runId}`;
}

function emitToTargets<T>(
  io: Server,
  event: string,
  payload: T,
  target: RoomTarget
): void {
  let emitter = io.to(runRoom(target.runId));
  if (target.graphId) {
    emitter = emitter.to(graphRoom(target.graphId));
  }
  emitter.emit(event, payload);
}

export type RealtimePublisher = {
  publishRunStarted(target: RoomTarget, payload: RunStartedPayload): void;
  publishRunNodeStarted(target: RoomTarget, payload: RunNodeStartedPayload): void;
  publishRunNodeCompleted(target: RoomTarget, payload: RunNodeCompletedPayload): void;
  publishRunLogs(target: RoomTarget, payload: RunLogsPayload): void;
  publishRunCompleted(target: RoomTarget, payload: RunCompletedPayload): void;
  publishRunFailed(target: RoomTarget, payload: RunFailedPayload): void;
  publishExecutionQueue(graphId: string, payload: ExecutionQueuePayload): void;
};

export type RealtimeServer = RealtimePublisher & {
  io: Server;
};

export type RealtimeServerOptions = {
  getExecutionQueueSnapshot?: (graphId: string) => ExecutionQueuePayload;
};

export function createRealtimeServer(
  httpServer: HttpServer,
  corsOrigin: string,
  options: RealtimeServerOptions = {}
): RealtimeServer {
  const io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
  });

  io.on("connection", (socket) => {
    socket.emit(SESSION_CONNECTED, { socketId: socket.id });

    socket.on(SESSION_JOIN_GRAPH, (payload: JoinGraphPayload) => {
      if (!payload?.graphId) return;
      socket.join(graphRoom(payload.graphId));
      socket.emit(SESSION_JOINED_GRAPH, payload);
      const snap = options.getExecutionQueueSnapshot?.(payload.graphId);
      if (snap) {
        socket.emit(EXECUTION_QUEUE, snap);
      }
    });

    socket.on(SESSION_LEAVE_GRAPH, (payload: LeaveGraphPayload) => {
      if (!payload?.graphId) return;
      socket.leave(graphRoom(payload.graphId));
      socket.emit(SESSION_LEFT_GRAPH, payload);
    });

    socket.on(SESSION_JOIN_RUN, (payload: JoinRunPayload) => {
      if (!payload?.runId) return;
      socket.join(runRoom(payload.runId));
      socket.emit(SESSION_JOINED_RUN, payload);
    });

    socket.on(SESSION_LEAVE_RUN, (payload: LeaveRunPayload) => {
      if (!payload?.runId) return;
      socket.leave(runRoom(payload.runId));
      socket.emit(SESSION_LEFT_RUN, payload);
    });
  });

  return {
    io,
    publishRunStarted(target, payload) {
      emitToTargets(io, RUN_STARTED, payload, target);
    },
    publishRunNodeStarted(target, payload) {
      emitToTargets(io, RUN_NODE_STARTED, payload, target);
    },
    publishRunNodeCompleted(target, payload) {
      emitToTargets(io, RUN_NODE_COMPLETED, payload, target);
    },
    publishRunLogs(target, payload) {
      emitToTargets(io, RUN_LOGS, payload, target);
    },
    publishRunCompleted(target, payload) {
      emitToTargets(io, RUN_COMPLETED, payload, target);
    },
    publishRunFailed(target, payload) {
      emitToTargets(io, RUN_FAILED, payload, target);
    },
    publishExecutionQueue(graphId, payload) {
      io.to(graphRoom(graphId)).emit(EXECUTION_QUEUE, payload);
    },
  };
}
