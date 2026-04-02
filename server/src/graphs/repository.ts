import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { GraphDefinition, GraphRecord } from "../graphExecution/types.js";

type CreateGraphInput = {
  name: string;
  description?: string;
  graph: GraphDefinition;
};

type UpdateGraphInput = {
  name?: string;
  description?: string;
  graph?: GraphDefinition;
};

type GraphStore = {
  graphs: GraphRecord[];
};

const DEFAULT_STORE: GraphStore = { graphs: [] };

export class JsonGraphRepository {
  private readonly dbPath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  async list(): Promise<GraphRecord[]> {
    const store = await this.readStore();
    return store.graphs;
  }

  async get(id: string): Promise<GraphRecord | null> {
    const store = await this.readStore();
    return store.graphs.find((g) => g.id === id) ?? null;
  }

  async create(input: CreateGraphInput): Promise<GraphRecord> {
    const now = new Date().toISOString();
    const record: GraphRecord = {
      id: randomUUID(),
      name: input.name,
      description: input.description,
      graph: input.graph,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };
    await this.withWriteLock(async () => {
      const store = await this.readStore();
      store.graphs.push(record);
      await this.writeStore(store);
    });
    return record;
  }

  async update(id: string, input: UpdateGraphInput): Promise<GraphRecord | null> {
    let updated: GraphRecord | null = null;
    await this.withWriteLock(async () => {
      const store = await this.readStore();
      const idx = store.graphs.findIndex((g) => g.id === id);
      if (idx < 0) return;
      const current = store.graphs[idx];
      updated = {
        ...current,
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(input.graph !== undefined ? { graph: input.graph } : {}),
        version: current.version + 1,
        updatedAt: new Date().toISOString(),
      };
      store.graphs[idx] = updated;
      await this.writeStore(store);
    });
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    let removed = false;
    await this.withWriteLock(async () => {
      const store = await this.readStore();
      const prevLen = store.graphs.length;
      store.graphs = store.graphs.filter((g) => g.id !== id);
      removed = store.graphs.length !== prevLen;
      if (removed) {
        await this.writeStore(store);
      }
    });
    return removed;
  }

  private async withWriteLock(work: () => Promise<void>): Promise<void> {
    const run = this.writeQueue.then(work);
    this.writeQueue = run.catch(() => undefined);
    await run;
  }

  private async ensureDir(): Promise<void> {
    await mkdir(path.dirname(this.dbPath), { recursive: true });
  }

  private async readStore(): Promise<GraphStore> {
    await this.ensureDir();
    try {
      const raw = await readFile(this.dbPath, "utf8");
      if (!raw.trim().length) return { ...DEFAULT_STORE };
      const parsed = JSON.parse(raw) as Partial<GraphStore>;
      return {
        graphs: Array.isArray(parsed.graphs) ? parsed.graphs : [],
      };
    } catch (error) {
      const errno = error as NodeJS.ErrnoException;
      if (errno.code === "ENOENT") {
        return { ...DEFAULT_STORE };
      }
      throw error;
    }
  }

  private async writeStore(store: GraphStore): Promise<void> {
    await this.ensureDir();
    await writeFile(this.dbPath, JSON.stringify(store, null, 2), "utf8");
  }
}

