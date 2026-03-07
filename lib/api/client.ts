/**
 * 客户端 API 服务
 * 
 * 封装对后端 API 的调用
 * 提供类型安全的数据访问
 */

import { Todo, Tag, SubTask, CreateSubTaskInput, UpdateSubTaskInput } from "@/app/types";

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
  getAll(): Promise<Todo[]> {
    return fetchJson(`${API_BASE}/todos`);
  },

  getById(id: string): Promise<Todo> {
    return fetchJson(`${API_BASE}/todos/${id}`);
  },

  getByTag(tagId: string): Promise<Todo[]> {
    return fetchJson(`${API_BASE}/todos?tag=${tagId}`);
  },

  getByStatus(completed: boolean): Promise<Todo[]> {
    return fetchJson(`${API_BASE}/todos?completed=${completed}`);
  },

  create(data: { text: string; completed?: boolean; tagIds?: string[] }): Promise<Todo> {
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
};

export default api;
