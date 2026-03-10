/**
 * 测试辅助函数
 */

import { Todo, Tag, Workspace, SubTask } from "@/app/types";

/**
 * 创建测试用的 Todo 对象
 */
export function createTodo(overrides: Partial<Todo> = {}): Todo {
  const now = new Date();
  return {
    id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: "task",
    text: "Test Todo",
    status: "pending",
    completed: false,
    createdAt: now,
    updatedAt: now,
    tagIds: [],
    workspaceId: "root",
    ...overrides,
  };
}

/**
 * 创建测试用的 Tag 对象
 */
export function createTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: "Test Tag",
    color: "blue",
    ...overrides,
  };
}

/**
 * 创建测试用的 Workspace 对象
 */
export function createWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: "Test Workspace",
    path: "/test",
    color: "blue",
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * 创建测试用的 SubTask 对象
 */
export function createSubTask(overrides: Partial<SubTask> = {}): SubTask {
  const now = new Date();
  return {
    id: `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: "subtask",
    text: "Test SubTask",
    status: "pending",
    completed: false,
    createdAt: now,
    updatedAt: now,
    tagIds: [],
    ...overrides,
  };
}

/**
 * Mock fetch 响应
 */
export function mockFetchResponse(data: any) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => data,
  });
}

/**
 * Mock fetch 错误响应
 */
export function mockFetchError(status: number, message: string) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error: message }),
  });
}

/**
 * Mock fetch 网络错误
 */
export function mockFetchNetworkError(message: string) {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(message));
}

/**
 * 等待指定时间
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 创建模拟的 NextRequest
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    headers?: Record<string, string>;
  } = {}
): Request {
  const { method = "GET", body, headers = {} } = options;
  
  return new Request(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });
}
