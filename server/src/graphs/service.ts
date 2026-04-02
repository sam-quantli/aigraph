import type { GraphDefinition, GraphRecord } from "../graphExecution/types.js";
import { getNodeDefinition } from "../graphExecution/nodes/index.js";
import { JsonGraphRepository } from "./repository.js";

export type GraphCreateRequest = {
  name: string;
  description?: string;
  graph: GraphDefinition;
};

export type GraphUpdateRequest = {
  name?: string;
  description?: string;
  graph?: GraphDefinition;
};

type ValidationResult = { ok: true } | { ok: false; error: string };

export class GraphService {
  constructor(private readonly repository: JsonGraphRepository) {}

  async listGraphs(): Promise<GraphRecord[]> {
    return this.repository.list();
  }

  async getGraph(id: string): Promise<GraphRecord | null> {
    return this.repository.get(id);
  }

  async createGraph(payload: GraphCreateRequest): Promise<GraphRecord> {
    const validation = this.validateGraph(payload.graph);
    if (!validation.ok) {
      throw new Error(validation.error);
    }
    if (!payload.name.trim().length) {
      throw new Error("Graph name is required.");
    }
    return this.repository.create(payload);
  }

  async updateGraph(
    id: string,
    payload: GraphUpdateRequest
  ): Promise<GraphRecord | null> {
    if (payload.graph) {
      const validation = this.validateGraph(payload.graph);
      if (!validation.ok) {
        throw new Error(validation.error);
      }
    }
    if (payload.name !== undefined && !payload.name.trim().length) {
      throw new Error("Graph name cannot be empty.");
    }
    return this.repository.update(id, payload);
  }

  async deleteGraph(id: string): Promise<boolean> {
    return this.repository.delete(id);
  }

  private validateGraph(graph: GraphDefinition): ValidationResult {
    if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
      return { ok: false, error: "Graph must contain nodes." };
    }
    if (!Array.isArray(graph.links)) {
      return { ok: false, error: "Graph links must be an array." };
    }

    const startNodes = graph.nodes.filter((node) => node.type === "core/start");
    if (startNodes.length !== 1) {
      return { ok: false, error: "Graph must contain exactly one core/start node." };
    }

    for (const node of graph.nodes) {
      if (!getNodeDefinition(node.type)) {
        return { ok: false, error: `Unsupported node type: ${node.type}` };
      }
    }

    return { ok: true };
  }
}

