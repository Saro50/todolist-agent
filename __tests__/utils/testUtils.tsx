/**
 * 测试工具函数
 * 
 * 提供渲染组件的辅助函数和测试数据工厂
 */

import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Todo, Tag, SubTask, TAG_COLORS } from "@/app/types";

// ==================== 测试数据工厂 ====================

export function createTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: `todo-${Date.now()}`,
    text: "Test Todo",
    completed: false,
    createdAt: new Date(),
    tagIds: [],
    subTasks: [],
    artifact: undefined,
    workspacePath: "/",  // 默认工作目录
    ...overrides,
  };
}

export function createTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: `tag-${Date.now()}`,
    name: "Test Tag",
    color: TAG_COLORS[0].key,
    ...overrides,
  };
}

export function createSubTask(overrides: Partial<SubTask> = {}): SubTask {
  return {
    id: `subtask-${Date.now()}`,
    todoId: `todo-${Date.now()}`,
    text: "Test SubTask",
    completed: false,
    createdAt: new Date(),
    order: 0,
    artifact: undefined,
    ...overrides,
  };
}

export function createTodos(count: number): Todo[] {
  return Array.from({ length: count }, (_, i) =>
    createTodo({
      id: `todo-${i}`,
      text: `Todo ${i + 1}`,
      completed: i % 2 === 0,
    })
  );
}

export function createTags(count: number): Tag[] {
  const colors = TAG_COLORS.map((c) => c.key);
  return Array.from({ length: count }, (_, i) =>
    createTag({
      id: `tag-${i}`,
      name: `Tag ${i + 1}`,
      color: colors[i % colors.length],
    })
  );
}

export function createSubTasks(count: number, todoId: string): SubTask[] {
  return Array.from({ length: count }, (_, i) =>
    createSubTask({
      id: `subtask-${i}`,
      todoId,
      text: `SubTask ${i + 1}`,
      completed: i % 2 === 0,
      order: i,
    })
  );
}

// ==================== 自定义渲染函数 ====================

interface CustomRenderOptions extends Omit<RenderOptions, "wrapper"> {
  // 可以添加额外的 provider 配置
}

function AllTheProviders({ children }: { children: React.ReactNode }) {
  return (
    <div data-testid="test-wrapper">
      {children}
    </div>
  );
}

export function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
) {
  return {
    user: userEvent.setup(),
    ...render(ui, { wrapper: AllTheProviders, ...options }),
  };
}

// 重新导出 RTL 的所有内容
export * from "@testing-library/react";
export { customRender as render };
export { userEvent };

// ==================== 异步工具 ====================

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function actWait(ms: number = 0): Promise<void> {
  await wait(ms);
}

// ==================== Mock 辅助 ====================

export function mockFetchResponse<T>(data: T): void {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

export function mockFetchError(status: number, message: string): void {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    json: async () => ({ error: message }),
  });
}

export function mockFetchNetworkError(message: string): void {
  (global.fetch as jest.Mock).mockRejectedValueOnce(new Error(message));
}
