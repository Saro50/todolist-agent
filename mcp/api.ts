/**
 * MCP API 客户端
 * 
 * 复用 lib/api/client 的逻辑，但支持配置基础 URL
 * 用于 MCP 服务器与后端通信
 * 支持多工作目录隔离
 */

// 类型定义内联，避免复杂的路径解析
type ProcessingStatus = "pending" | "in_progress" | "completed";

type Todo = {
  id: string;
  text: string;
  status: ProcessingStatus;
  completed: boolean;
  createdAt: Date;
  tagIds: string[];
  subTasks?: SubTask[];
  artifact?: string;
  workspacePath?: string;
};

type Tag = {
  id: string;
  name: string;
  color: string;
};

type SubTask = {
  id: string;
  todoId: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  order: number;
  artifact?: string;
};

type Workspace = {
  id: string;
  name: string;
  path: string;
  color?: string;
  createdAt: Date;
};

type UpdateSubTaskInput = {
  text?: string;
  completed?: boolean;
  order?: number;
  artifact?: string;
};

// MCP 服务配置 - 使用 4000 端口
const MCP_API_PORT = process.env.MCP_API_PORT || "4000";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || `http://localhost:${MCP_API_PORT}`;

class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
  
  const response = await fetch(fullUrl, {
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

export interface TodoFilters {
  status?: "pending" | "in_progress" | "completed";
  tagId?: string;
}

export const todoApi = {
  /**
   * 获取任务列表
   * @param workspacePath - 可选的工作区路径，不传则获取所有任务
   * @param filters - 可选的筛选条件
   */
  getAll(workspacePath?: string, filters?: TodoFilters): Promise<Todo[]> {
    const params = new URLSearchParams();
    if (workspacePath !== undefined) {
      params.append("workspace", workspacePath);
    }
    if (filters?.status) {
      params.append("status", filters.status);
    }
    if (filters?.tagId) {
      params.append("tag", filters.tagId);
    }
    const query = params.toString();
    return fetchJson(`/api/todos${query ? `?${query}` : ""}`);
  },

  getById(id: string): Promise<Todo> {
    return fetchJson(`/api/todos/${id}`);
  },

  getByTag(tagId: string, workspacePath?: string): Promise<Todo[]> {
    const params = new URLSearchParams();
    params.append("tag", tagId);
    if (workspacePath !== undefined) {
      params.append("workspace", workspacePath);
    }
    return fetchJson(`/api/todos?${params.toString()}`);
  },

  getByStatus(completed: boolean, workspacePath?: string): Promise<Todo[]> {
    const params = new URLSearchParams();
    params.append("completed", String(completed));
    if (workspacePath !== undefined) {
      params.append("workspace", workspacePath);
    }
    return fetchJson(`/api/todos?${params.toString()}`);
  },

  /**
   * 获取所有工作区列表
   */
  getWorkspaces(): Promise<string[]> {
    return fetchJson(`/api/todos/workspaces`);
  },

  create(data: { 
    text: string; 
    status?: ProcessingStatus;
    completed?: boolean; 
    tagIds?: string[]; 
    artifact?: string;
    workspacePath?: string;
  }): Promise<Todo> {
    return fetchJson(`/api/todos`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<Todo>): Promise<Todo> {
    return fetchJson(`/api/todos/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(id: string): Promise<void> {
    return fetchJson(`/api/todos/${id}`, {
      method: "DELETE",
    });
  },
};

// ==================== Tag API ====================

export const tagApi = {
  getAll(): Promise<Tag[]> {
    return fetchJson(`/api/tags`);
  },

  getById(id: string): Promise<Tag> {
    return fetchJson(`/api/tags/${id}`);
  },

  create(data: { name: string; color: Tag["color"] }): Promise<Tag> {
    return fetchJson(`/api/tags`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<Tag>): Promise<Tag> {
    return fetchJson(`/api/tags/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(id: string): Promise<void> {
    return fetchJson(`/api/tags/${id}`, {
      method: "DELETE",
    });
  },
};

// ==================== SubTask API ====================

export const subTaskApi = {
  getByTodoId(todoId: string): Promise<SubTask[]> {
    return fetchJson(`/api/todos/${todoId}/subtasks`);
  },

  getById(id: string): Promise<SubTask> {
    return fetchJson(`/api/subtasks/${id}`);
  },

  create(todoId: string, text: string): Promise<SubTask> {
    return fetchJson(`/api/todos/${todoId}/subtasks`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  update(id: string, data: UpdateSubTaskInput): Promise<SubTask> {
    return fetchJson(`/api/subtasks/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(id: string): Promise<void> {
    return fetchJson(`/api/subtasks/${id}`, {
      method: "DELETE",
    });
  },
};

// ==================== Workspace API ====================

export const workspaceApi = {
  getAll(): Promise<Workspace[]> {
    return fetchJson(`/api/workspaces`);
  },

  getById(id: string): Promise<Workspace> {
    return fetchJson(`/api/workspaces/${id}`);
  },

  create(data: { name: string; path?: string; color?: string; id?: string }): Promise<Workspace> {
    return fetchJson(`/api/workspaces`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<Omit<Workspace, "id">>): Promise<Workspace> {
    return fetchJson(`/api/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  delete(id: string): Promise<void> {
    return fetchJson(`/api/workspaces/${id}`, {
      method: "DELETE",
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
