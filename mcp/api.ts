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
  type: 'task' | 'subtask';
  text: string;
  status: ProcessingStatus;
  completed: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  tagIds: string[];
  subTasks?: SubTask[];
  artifact?: string;
  workspaceId?: string;
};

type Tag = {
  id: string;
  name: string;
  color: string;
};

type SubTask = {
  id: string;
  todoId: string;  // 父任务 ID（同 parentId）
  text: string;
  completed: boolean;
  createdAt: Date;
  order: number;
  artifact?: string;
  parentId?: string;  // 父任务 ID（V3 新增）
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

// API 分页响应类型
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const todoApi = {
  /**
   * 获取任务列表
   * @param workspaceId - 可选的工作区ID，不传则获取所有任务
   * @param filters - 可选的筛选条件
   */
  async getAll(workspaceId?: string, filters?: TodoFilters): Promise<Todo[]> {
    const params = new URLSearchParams();
    if (workspaceId !== undefined) {
      params.append("workspace", workspaceId);
    }
    if (filters?.status) {
      params.append("status", filters.status);
    }
    if (filters?.tagId) {
      params.append("tag", filters.tagId);
    }
    const query = params.toString();
    const result = await fetchJson<PaginatedResponse<Todo>>(`/api/todos${query ? `?${query}` : ""}`);
    return result.data;
  },

  getById(id: string): Promise<Todo> {
    return fetchJson(`/api/todos/${id}`);
  },

  async getByTag(tagId: string, workspaceId?: string): Promise<Todo[]> {
    const params = new URLSearchParams();
    params.append("tag", tagId);
    if (workspaceId !== undefined) {
      params.append("workspace", workspaceId);
    }
    const result = await fetchJson<PaginatedResponse<Todo>>(`/api/todos?${params.toString()}`);
    return result.data;
  },

  async getByStatus(completed: boolean, workspaceId?: string): Promise<Todo[]> {
    const params = new URLSearchParams();
    params.append("completed", String(completed));
    if (workspaceId !== undefined) {
      params.append("workspace", workspaceId);
    }
    const result = await fetchJson<PaginatedResponse<Todo>>(`/api/todos?${params.toString()}`);
    return result.data;
  },

  /**
   * 搜索任务（按标题模糊匹配，支持多标签过滤）
   * @param keyword - 搜索关键词
   * @param workspaceId - 可选的工作区ID
   * @param tagIds - 可选的标签ID数组
   */
  search(keyword: string, workspaceId?: string, tagIds?: string[]): Promise<Todo[]> {
    const params = new URLSearchParams();
    params.append("keyword", keyword);
    if (workspaceId !== undefined) {
      params.append("workspace", workspaceId);
    }
    if (tagIds !== undefined && tagIds.length > 0) {
      tagIds.forEach(tagId => params.append("tag", tagId));
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
    workspaceId?: string;
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

  /**
   * 审批任务（通过或拒绝）
   * @param id - 任务ID
   * @param approvalStatus - 审批状态: 'approved' 或 'rejected'
   */
  approve(id: string, approvalStatus: 'approved' | 'rejected'): Promise<{ success: boolean; data: Todo }> {
    return fetchJson(`/api/todos/${id}/approval`, {
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
    return fetchJson(`/api/todos/batch-approval`, {
      method: "POST",
      body: JSON.stringify({ ids, approvalStatus }),
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
