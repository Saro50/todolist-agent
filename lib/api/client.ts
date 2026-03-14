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

export interface TodoFilters {
  status?: "pending" | "in_progress" | "completed";  // 状态筛选
  tagId?: string;  // 标签筛选
}

export interface PaginatedTodos {
  data: Todo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const todoApi = {
  /**
   * 获取任务列表
   * @param workspaceId - 可选的工作区 ID，不传则获取所有任务
   */
  getAll(workspaceId?: string): Promise<Todo[]> {
    const params = workspaceId !== undefined 
      ? `?workspace=${encodeURIComponent(workspaceId)}` 
      : "";
    return fetchJson(`${API_BASE}/todos${params}`);
  },

  /**
   * 获取分页任务列表（支持筛选）
   * @param workspaceId - 可选的工作区 ID
   * @param page - 页码，从 1 开始
   * @param pageSize - 每页数量
   * @param filters - 筛选条件（状态、标签）
   */
  getAllPaginated(
    workspaceId?: string, 
    page: number = 1, 
    pageSize: number = 20,
    filters?: TodoFilters
  ): Promise<PaginatedTodos> {
    const params = new URLSearchParams();
    if (workspaceId !== undefined) {
      params.append("workspace", workspaceId);
    }
    params.append("page", String(page));
    params.append("pageSize", String(pageSize));
    
    // 添加筛选参数
    if (filters?.status) {
      params.append("status", filters.status);
    }
    if (filters?.tagId) {
      params.append("tag", filters.tagId);
    }
    
    return fetchJson(`${API_BASE}/todos?${params.toString()}`);
  },

  getById(id: string): Promise<Todo> {
    return fetchJson(`${API_BASE}/todos/${id}`);
  },

  getByTag(tagId: string, workspaceId?: string): Promise<Todo[]> {
    const params = new URLSearchParams();
    params.append("tag", tagId);
    if (workspaceId !== undefined) {
      params.append("workspace", workspaceId);
    }
    return fetchJson(`${API_BASE}/todos?${params.toString()}`);
  },

  getByStatus(completed: boolean, workspaceId?: string): Promise<Todo[]> {
    const params = new URLSearchParams();
    params.append("completed", String(completed));
    if (workspaceId !== undefined) {
      params.append("workspace", workspaceId);
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
  create(data: { text: string; completed?: boolean; tagIds?: string[]; workspaceId?: string }): Promise<Todo> {
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

  /**
   * 批量删除任务
   */
  batchDelete(ids: string[]): Promise<{ deletedCount: number }> {
    return fetchJson(`${API_BASE}/todos/batch-delete`, {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
  },

  /**
   * 审批任务（通过或拒绝）
   * @param id - 任务ID
   * @param approvalStatus - 审批状态: 'approved' 或 'rejected'
   */
  approve(id: string, approvalStatus: 'approved' | 'rejected'): Promise<{ success: boolean; data: Todo }> {
    return fetchJson(`${API_BASE}/todos/${id}/approval`, {
      method: "PATCH",
      body: JSON.stringify({ approvalStatus }),
    });
  },

  /**
   * 批量审批任务
   * @param ids - 任务ID数组
   * @param approvalStatus - 审批状态: 'approved' 或 'rejected'
   */
  batchApprove(ids: string[], approvalStatus: 'approved' | 'rejected'): Promise<{ success: boolean; data: Todo[]; updated: number; failed?: number }> {
    return fetchJson(`${API_BASE}/todos/batch-approval`, {
      method: "POST",
      body: JSON.stringify({ ids, approvalStatus }),
    });
  },
};

// ==================== Tag API ====================

export const tagApi = {
  // V4: 支持按工作区查询标签
  getAll(workspaceId?: string): Promise<Tag[]> {
    const params = workspaceId ? `?workspace=${encodeURIComponent(workspaceId)}` : "";
    return fetchJson(`${API_BASE}/tags${params}`);
  },

  getById(id: string): Promise<Tag> {
    return fetchJson(`${API_BASE}/tags/${id}`);
  },

  // V4: 支持指定工作区创建标签
  create(data: { name: string; color: Tag["color"]; workspaceId?: string }): Promise<Tag> {
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
