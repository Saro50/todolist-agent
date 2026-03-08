/**
 * 远程数据库实现
 * 
 * 通过 REST API 与远程服务器通信
 * 支持多工作目录隔离
 */

import { Todo, Tag, SubTask, CreateSubTaskInput, UpdateSubTaskInput } from "@/app/types";
import {
  IDatabase,
  ITodoRepository,
  ITagRepository,
  ISubTaskRepository,
  TransactionContext,
  ISyncable,
  ChangeLog,
  ConnectionError,
  NotFoundError,
  DatabaseError,
} from "./types";

// ==================== Base Repository ====================

abstract class BaseRemoteRepository {
  constructor(
    protected baseUrl: string,
    protected apiKey?: string
  ) {}

  protected async fetch(path: string, options?: RequestInit) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((options?.headers as Record<string, string>) || {}),
    };
    
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new NotFoundError("Resource", path.split("/").pop() || "");
      }
      throw new DatabaseError(
        `API request failed: ${response.statusText}`,
        `HTTP_${response.status}`
      );
    }

    return response.json();
  }
}

// ==================== Remote Todo Repository ====================

class RemoteTodoRepository extends BaseRemoteRepository implements ITodoRepository {
  async findAll(workspacePath?: string): Promise<Todo[]> {
    const params = workspacePath && workspacePath !== "/" 
      ? `?workspace=${encodeURIComponent(workspacePath)}` 
      : "";
    return this.fetch(`/api/todos${params}`);
  }

  async findById(id: string): Promise<Todo | null> {
    try {
      return await this.fetch(`/api/todos/${id}`);
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }

  async findByTag(tagId: string, workspacePath?: string): Promise<Todo[]> {
    const params = new URLSearchParams();
    params.append("tag", tagId);
    if (workspacePath && workspacePath !== "/") {
      params.append("workspace", workspacePath);
    }
    return this.fetch(`/api/todos?${params.toString()}`);
  }

  async findByStatus(completed: boolean, workspacePath?: string): Promise<Todo[]> {
    const params = new URLSearchParams();
    params.append("completed", String(completed));
    if (workspacePath && workspacePath !== "/") {
      params.append("workspace", workspacePath);
    }
    return this.fetch(`/api/todos?${params.toString()}`);
  }

  async findByWorkspace(workspacePath: string): Promise<Todo[]> {
    return this.fetch(`/api/todos?workspace=${encodeURIComponent(workspacePath)}`);
  }

  async create(todo: Omit<Todo, "id" | "createdAt" | "subTasks">): Promise<Todo> {
    return this.fetch("/api/todos", {
      method: "POST",
      body: JSON.stringify(todo),
    });
  }

  async update(id: string, data: Partial<Omit<Todo, "subTasks">>): Promise<Todo | null> {
    try {
      return await this.fetch(`/api/todos/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.fetch(`/api/todos/${id}`, { method: "DELETE" });
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) return false;
      throw error;
    }
  }

  async batchDelete(ids: string[]): Promise<number> {
    const result = await this.fetch("/api/todos/batch-delete", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
    return result.deletedCount;
  }

  async clearCompleted(workspacePath?: string): Promise<number> {
    const params = workspacePath && workspacePath !== "/"
      ? `?workspace=${encodeURIComponent(workspacePath)}`
      : "";
    const result = await this.fetch(`/api/todos/clear-completed${params}`, {
      method: "POST",
    });
    return result.deletedCount;
  }

  async getAllWorkspaces(): Promise<string[]> {
    return this.fetch("/api/todos/workspaces");
  }

  async addTag(todoId: string, tagId: string): Promise<boolean> {
    try {
      await this.fetch(`/api/todos/${todoId}/tags`, {
        method: "POST",
        body: JSON.stringify({ tagId }),
      });
      return true;
    } catch {
      return false;
    }
  }

  async removeTag(todoId: string, tagId: string): Promise<boolean> {
    try {
      await this.fetch(`/api/todos/${todoId}/tags/${tagId}`, {
        method: "DELETE",
      });
      return true;
    } catch {
      return false;
    }
  }

  async setTags(todoId: string, tagIds: string[]): Promise<boolean> {
    try {
      await this.fetch(`/api/todos/${todoId}/tags`, {
        method: "PUT",
        body: JSON.stringify({ tagIds }),
      });
      return true;
    } catch {
      return false;
    }
  }

  async updateArtifact(todoId: string, artifact: string | null): Promise<boolean> {
    try {
      await this.fetch(`/api/todos/${todoId}/artifact`, {
        method: "PUT",
        body: JSON.stringify({ artifact }),
      });
      return true;
    } catch {
      return false;
    }
  }
}

// ==================== Remote Tag Repository ====================

class RemoteTagRepository extends BaseRemoteRepository implements ITagRepository {
  async findAll(): Promise<Tag[]> {
    return this.fetch("/api/tags");
  }

  async findById(id: string): Promise<Tag | null> {
    try {
      return await this.fetch(`/api/tags/${id}`);
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }

  async findByIds(ids: string[]): Promise<Tag[]> {
    return this.fetch(`/api/tags?ids=${ids.join(",")}`);
  }

  async create(tag: Omit<Tag, "id">): Promise<Tag> {
    return this.fetch("/api/tags", {
      method: "POST",
      body: JSON.stringify(tag),
    });
  }

  async update(id: string, data: Partial<Tag>): Promise<Tag | null> {
    try {
      return await this.fetch(`/api/tags/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.fetch(`/api/tags/${id}`, { method: "DELETE" });
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) return false;
      throw error;
    }
  }

  async getTodoCount(tagId: string): Promise<number> {
    const result = await this.fetch(`/api/tags/${tagId}/count`);
    return result.count;
  }
}

// ==================== Remote SubTask Repository ====================

class RemoteSubTaskRepository extends BaseRemoteRepository implements ISubTaskRepository {
  async findById(id: string): Promise<SubTask | null> {
    try {
      return await this.fetch(`/api/subtasks/${id}`);
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }

  async findByTodoId(todoId: string): Promise<SubTask[]> {
    return this.fetch(`/api/todos/${todoId}/subtasks`);
  }

  async create(input: CreateSubTaskInput): Promise<SubTask> {
    return this.fetch(`/api/todos/${input.todoId}/subtasks`, {
      method: "POST",
      body: JSON.stringify({ text: input.text }),
    });
  }

  async update(id: string, data: UpdateSubTaskInput): Promise<SubTask | null> {
    try {
      return await this.fetch(`/api/subtasks/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      });
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      await this.fetch(`/api/subtasks/${id}`, { method: "DELETE" });
      return true;
    } catch (error) {
      if (error instanceof NotFoundError) return false;
      throw error;
    }
  }

  async deleteByTodoId(todoId: string): Promise<number> {
    const result = await this.fetch(`/api/todos/${todoId}/subtasks`, {
      method: "DELETE",
    });
    return result.deletedCount;
  }

  async reorder(todoId: string, subTaskIds: string[]): Promise<boolean> {
    try {
      await this.fetch(`/api/todos/${todoId}/subtasks/reorder`, {
        method: "POST",
        body: JSON.stringify({ subTaskIds }),
      });
      return true;
    } catch {
      return false;
    }
  }

  async getCompletedCount(todoId: string): Promise<number> {
    const result = await this.fetch(`/api/todos/${todoId}/subtasks/count?completed=true`);
    return result.count;
  }

  async getTotalCount(todoId: string): Promise<number> {
    const result = await this.fetch(`/api/todos/${todoId}/subtasks/count`);
    return result.count;
  }

  async updateArtifact(subTaskId: string, artifact: string | null): Promise<boolean> {
    try {
      await this.fetch(`/api/subtasks/${subTaskId}/artifact`, {
        method: "PUT",
        body: JSON.stringify({ artifact }),
      });
      return true;
    } catch {
      return false;
    }
  }
}

// ==================== Remote Database ====================

export class RemoteDatabase implements IDatabase, ISyncable {
  private _isConnected = false;
  public todos!: ITodoRepository;
  public tags!: ITagRepository;
  public subTasks!: ISubTaskRepository;

  constructor(private config: { remoteUrl: string; apiKey?: string }) {}

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(): Promise<void> {
    try {
      // 验证连接
      const response = await fetch(`${this.config.remoteUrl}/api/health`);
      if (!response.ok) {
        throw new Error("Remote server not available");
      }

      // 初始化仓库
      this.todos = new RemoteTodoRepository(
        this.config.remoteUrl,
        this.config.apiKey
      );
      this.tags = new RemoteTagRepository(
        this.config.remoteUrl,
        this.config.apiKey
      );
      this.subTasks = new RemoteSubTaskRepository(
        this.config.remoteUrl,
        this.config.apiKey
      );

      this._isConnected = true;
    } catch (error) {
      throw new ConnectionError("Failed to connect to remote database", error);
    }
  }

  async disconnect(): Promise<void> {
    this._isConnected = false;
  }

  async migrate(): Promise<void> {
    // 远程数据库的迁移由服务器端管理
    console.log("Remote database migration is handled by server");
  }

  async reset(): Promise<void> {
    await fetch(`${this.config.remoteUrl}/api/reset`, {
      method: "POST",
      headers: this.config.apiKey
        ? { Authorization: `Bearer ${this.config.apiKey}` }
        : undefined,
    });
  }

  async transaction<T>(callback: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const tx: TransactionContext = {
      commit: async () => {},
      rollback: async () => {},
    };
    return callback(tx);
  }

  // ==================== 同步功能 ====================

  async getPendingChanges(): Promise<ChangeLog[]> {
    return fetch(`${this.config.remoteUrl}/api/sync/pending`, {
      headers: this.config.apiKey
        ? { Authorization: `Bearer ${this.config.apiKey}` }
        : undefined,
    }).then((r) => r.json());
  }

  async markAsSynced(changeIds: string[]): Promise<void> {
    await fetch(`${this.config.remoteUrl}/api/sync/mark-synced`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey
          ? { Authorization: `Bearer ${this.config.apiKey}` }
          : {}),
      },
      body: JSON.stringify({ changeIds }),
    });
  }

  async applyRemoteChanges(changes: ChangeLog[]): Promise<void> {
    await fetch(`${this.config.remoteUrl}/api/sync/apply`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey
          ? { Authorization: `Bearer ${this.config.apiKey}` }
          : {}),
      },
      body: JSON.stringify({ changes }),
    });
  }

  async fullSync(): Promise<{ uploaded: number; downloaded: number }> {
    const result = await fetch(`${this.config.remoteUrl}/api/sync/full`, {
      method: "POST",
      headers: this.config.apiKey
        ? { Authorization: `Bearer ${this.config.apiKey}` }
        : undefined,
    }).then((r) => r.json());
    
    return { uploaded: result.uploaded, downloaded: result.downloaded };
  }
}
