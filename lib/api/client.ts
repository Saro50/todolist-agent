/**
 * 客户端 API 服务
 * 
 * 封装对后端 API 的调用
 * 提供类型安全的数据访问
 * 支持多工作目录隔离
 */

import { Todo, Tag, SubTask, Workspace, UpdateSubTaskInput } from "@/app/types";

const API_BASE = "/api";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new ApiError(response.status, error.error || "Request failed");
  }

  return response.json();
}

// ==================== Todo API ====================

export const todoApi = {
  /**
   * 获取任务列表
   * @param workspacePath - 可选的工作目录路径，不传则获取所有任务
   */
  getAll(workspacePath?: string): Promise<Todo[]> {
    const params = workspacePath && workspacePath !== "/" 
      ? `?workspace=${encodeURIComponent(workspacePath)}` 
      : "";
    return fetchJson(`${API_BASE}/todos${params}`);
  },

  getById(id: string): Promise<Todo> {
    return fetchJson(`${API_BASE}/todos/${id}`);
  },

  getByTag(tagId: string, workspacePath?: string): Promise<Todo[]> {
    const params = new URLSearchParams();
    params.append("tag", tagId);
    if (workspacePath && workspacePath !== "/") {
      params.append("workspace", workspacePath);
    }
    return fetchJson(`${API_BASE}/todos?${params.toString()}`);
  },

  getByStatus(completed: boolean, workspacePath?: string): Promise<Todo[]> {
    const params = new URLSearchParams();
    params.append("completed", String(completed));
    if (workspacePath && workspacePath !== "/") {
      params.append("workspace", workspacePath);
    }
    return fetchJson(`${API_BASE}/todos?${params.toString()}`);
  },

  /**
   * 获取所有工作目录列表
   */
  getWorkspaces(): Promise<string[]> {
    return fetchJson(`${API_BASE}/todos/workspaces`);
  },

  /**
   * 创建任务
   */
  create(data: { text: string; completed?: boolean; tagIds?: string[]; workspacePath?: string }): Promise<Todo> {
    return fetchJson(`${API_BASE}/todos`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<Todo>): Promise<Todo> {
    return fetchJson(`${API_BASE}/todos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(id: string): Promise<void> {
    return fetchJson(`${API_BASE}/todos/${id}`, {
      method: "DELETE",
    });
  },

  clearCompleted(): Promise<{ deletedCount: number }> {
    return fetchJson(`${API_BASE}/todos/clear-completed`, {
      method: "POST",
    });
  },
};

// ==================== Tag API ====================

export const tagApi = {
  getAll(): Promise<Tag[]> {
    return fetchJson(`${API_BASE}/tags`);
  },

  getById(id: string): Promise<Tag> {
    return fetchJson(`${API_BASE}/tags/${id}`);
  },

  create(data: { name: string; color: Tag["color"] }): Promise<Tag> {
    return fetchJson(`${API_BASE}/tags`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<Tag>): Promise<Tag> {
    return fetchJson(`${API_BASE}/tags/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(id: string): Promise<void> {
    return fetchJson(`${API_BASE}/tags/${id}`, {
      method: "DELETE",
    });
  },
};

// ==================== Workspace API ====================

export const workspaceApi = {
  getAll(): Promise<Workspace[]> {
    return fetchJson(`${API_BASE}/workspaces`);
  },

  getById(id: string): Promise<Workspace> {
    return fetchJson(`${API_BASE}/workspaces/${id}`);
  },

  create(data: { name: string; path?: string; color?: string; id?: string }): Promise<Workspace> {
    return fetchJson(`${API_BASE}/workspaces`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<Omit<Workspace, "id">>): Promise<Workspace> {
    return fetchJson(`${API_BASE}/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(id: string): Promise<void> {
    return fetchJson(`${API_BASE}/workspaces/${id}`, {
      method: "DELETE",
    });
  },
};

// ==================== SubTask API ====================

export const subTaskApi = {
  getByTodoId(todoId: string): Promise<SubTask[]> {
    return fetchJson(`${API_BASE}/todos/${todoId}/subtasks`);
  },

  getById(id: string): Promise<SubTask> {
    return fetchJson(`${API_BASE}/subtasks/${id}`);
  },

  create(todoId: string, text: string): Promise<SubTask> {
    return fetchJson(`${API_BASE}/todos/${todoId}/subtasks`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  update(id: string, data: UpdateSubTaskInput): Promise<SubTask> {
    return fetchJson(`${API_BASE}/subtasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(id: string): Promise<void> {
    return fetchJson(`${API_BASE}/subtasks/${id}`, {
      method: "DELETE",
    });
  },

  toggle(id: string, completed: boolean): Promise<SubTask> {
    return fetchJson(`${API_BASE}/subtasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
  },

  reorder(todoId: string, subTaskIds: string[]): Promise<void> {
    return fetchJson(`${API_BASE}/todos/${todoId}/subtasks/reorder`, {
      method: "POST",
      body: JSON.stringify({ subTaskIds }),
    });
  },
};

// ==================== 统一导出 ====================

export const api = {
  todos: todoApi,
  tags: tagApi,
  subTasks: subTaskApi,
  workspaces: workspaceApi,
};

export default api;
