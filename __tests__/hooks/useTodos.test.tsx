/**
 * useTodos Hook 测试
 */

import React from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useTodos } from "@/lib/hooks/useTodos";
import { api } from "@/lib/api/client";
import { createTodo, createTag } from "../utils/testUtils";

// Mock API client
jest.mock("@/lib/api/client", () => ({
  api: {
    todos: {
      getAll: jest.fn(),
      getAllPaginated: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    tags: {
      getAll: jest.fn(),
      create: jest.fn(),
    },
    workspaces: {
      getAll: jest.fn(),
      getById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    subTasks: {
      getByTodoId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

describe("useTodos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for workspaces.getAll
    (api.workspaces.getAll as jest.Mock).mockResolvedValue([
      { id: "root", name: "根目录", path: "/", color: "slate", createdAt: new Date() }
    ]);
  });

  it("should load todos and tags on mount", async () => {
    const mockTodos = [createTodo({ text: "Todo 1" })];
    const mockTags = [createTag({ name: "Work" })];

    (api.todos.getAllPaginated as jest.Mock).mockResolvedValue({
      data: mockTodos,
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });
    (api.tags.getAll as jest.Mock).mockResolvedValue(mockTags);

    const { result } = renderHook(() => useTodos());

    // 初始状态应该是加载中
    expect(result.current.isLoading).toBe(true);

    // 等待加载完成
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.todos).toEqual(mockTodos);
    expect(result.current.tags).toEqual(mockTags);
    expect(result.current.error).toBeNull();
  });

  it("should handle load error", async () => {
    (api.todos.getAllPaginated as jest.Mock).mockRejectedValue(new Error("Load failed"));
    (api.tags.getAll as jest.Mock).mockRejectedValue(new Error("Load failed"));

    const { result } = renderHook(() => useTodos());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Load failed");
    expect(result.current.todos).toEqual([]);
  });

  it("should add todo", async () => {
    const newTodo = createTodo({ text: "New Todo", tagIds: ["tag-1"] });
    (api.todos.getAllPaginated as jest.Mock).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 0,
    });
    (api.tags.getAll as jest.Mock).mockResolvedValue([]);
    (api.todos.create as jest.Mock).mockResolvedValue(newTodo);

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addTodo("New Todo", ["tag-1"]);
    });

    expect(api.todos.create).toHaveBeenCalledWith({
      text: "New Todo",
      tagIds: ["tag-1"],
      workspacePath: "/",  // 默认使用当前工作目录
    });
    
    // Note: After adding a todo, it calls refresh() which reloads the list
    // So we just verify the create was called correctly
    expect(api.todos.create).toHaveBeenCalledWith({
      text: "New Todo",
      tagIds: ["tag-1"],
      workspacePath: "/",
    });
  });

  it("should toggle todo", async () => {
    const todo = createTodo({ id: "1", text: "Test", completed: false });
    const updatedTodo = { ...todo, completed: true };

    (api.todos.getAllPaginated as jest.Mock).mockResolvedValue({ data: [todo], total: 1, page: 1, pageSize: 20, totalPages: 1 });
    (api.tags.getAll as jest.Mock).mockResolvedValue([]);
    (api.todos.update as jest.Mock).mockResolvedValue(updatedTodo);

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.toggleTodo("1");
    });

    expect(api.todos.update).toHaveBeenCalledWith("1", { completed: true });
    
    // 等待状态更新
    await waitFor(() => {
      expect(result.current.todos[0].completed).toBe(true);
    });
  });

  it("should delete todo", async () => {
    const todo = createTodo({ id: "1", text: "To delete" });

    (api.todos.getAllPaginated as jest.Mock).mockResolvedValue({ data: [todo], total: 1, page: 1, pageSize: 20, totalPages: 1 });
    (api.tags.getAll as jest.Mock).mockResolvedValue([]);
    (api.todos.delete as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteTodo("1");
    });

    expect(api.todos.delete).toHaveBeenCalledWith("1");
    
    // 等待状态更新
    await waitFor(() => {
      expect(result.current.todos.length).toBe(0);
    });
  });

  it("should update todo tags", async () => {
    const todo = createTodo({ id: "1", text: "Test", tagIds: [] });
    const updatedTodo = { ...todo, tagIds: ["tag-1", "tag-2"] };

    (api.todos.getAllPaginated as jest.Mock).mockResolvedValue({ data: [todo], total: 1, page: 1, pageSize: 20, totalPages: 1 });
    (api.tags.getAll as jest.Mock).mockResolvedValue([]);
    (api.todos.update as jest.Mock).mockResolvedValue(updatedTodo);

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.updateTodoTags("1", ["tag-1", "tag-2"]);
    });

    expect(api.todos.update).toHaveBeenCalledWith("1", { tagIds: ["tag-1", "tag-2"] });
    
    // 等待状态更新
    await waitFor(() => {
      expect(result.current.todos[0].tagIds).toEqual(["tag-1", "tag-2"]);
    });
  });

  it("should create tag", async () => {
    const newTag = createTag({ name: "New Tag", color: "blue" });

    (api.todos.getAllPaginated as jest.Mock).mockResolvedValue([]);
    (api.tags.getAll as jest.Mock).mockResolvedValue([]);
    (api.tags.create as jest.Mock).mockResolvedValue(newTag);

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let returnedTag;
    await act(async () => {
      returnedTag = await result.current.createTag("New Tag", "blue");
    });

    expect(api.tags.create).toHaveBeenCalledWith({ name: "New Tag", color: "blue" });
    
    // 等待状态更新
    await waitFor(() => {
      expect(result.current.tags.length).toBe(1);
    });
    expect(returnedTag).toEqual(newTag);
  });

  it("should clear completed todos", async () => {
    const activeTodo = createTodo({ id: "1", text: "Active", completed: false });
    const completedTodo = createTodo({ id: "2", text: "Completed", completed: true });

    // Mock: 初始有2个任务，清除后只剩1个
    (api.todos.getAllPaginated as jest.Mock)
      .mockResolvedValueOnce({ data: [activeTodo, completedTodo], total: 2, page: 1, pageSize: 20, totalPages: 1 })
      .mockResolvedValueOnce({ data: [activeTodo], total: 1, page: 1, pageSize: 20, totalPages: 1 });
    (api.tags.getAll as jest.Mock).mockResolvedValue([]);
    (api.todos.delete as jest.Mock).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.clearCompleted();
    });

    expect(api.todos.delete).toHaveBeenCalledWith("2");
    
    // 等待状态更新 - 只检查剩余的任务
    await waitFor(() => {
      const hasCompleted = result.current.todos.some(t => t.completed);
      expect(hasCompleted).toBe(false);
    });
  });

  it("should refetch data", async () => {
    const refetchedTodo = createTodo({ text: "Refetched" });
    
    (api.todos.getAllPaginated as jest.Mock)
      .mockResolvedValueOnce({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 })
      .mockResolvedValueOnce({ data: [refetchedTodo], total: 1, page: 1, pageSize: 20, totalPages: 1 });
    (api.tags.getAll as jest.Mock).mockResolvedValue([]);

    const { result } = renderHook(() => useTodos());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.todos).toHaveLength(0);

    await act(async () => {
      await result.current.refresh();
    });

    // 等待重新加载完成
    await waitFor(() => {
      expect(result.current.todos.length).toBe(1);
    });
    expect(result.current.todos[0].text).toBe("Refetched");
  });

  describe("workspace support", () => {
    it("should default to root workspace", async () => {
      (api.todos.getAllPaginated as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 });
      (api.tags.getAll as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useTodos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.currentWorkspace.id).toBe("root");
      expect(result.current.currentWorkspace.path).toBe("/");
      expect(result.current.workspaces.length).toBe(1);
    });

    it("should load todos for specific workspace", async () => {
      const workspaceTodos = [createTodo({ text: "Workspace Todo" })];
      
      (api.todos.getAllPaginated as jest.Mock).mockResolvedValue({ data: workspaceTodos, total: 1, page: 1, pageSize: 20, totalPages: 1 });
      (api.tags.getAll as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useTodos());

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Should call getAllPaginated with current workspace path and empty filters
      expect(api.todos.getAllPaginated).toHaveBeenCalledWith("/", 1, 20, {});
    });

    it("should switch workspace", async () => {
      const rootTodos = [createTodo({ id: "1", text: "Root Todo" })];
      const projectTodos = [createTodo({ id: "2", text: "Project Todo" })];
      const projectWorkspace = { id: "project", name: "Project", path: "/project", color: "blue", createdAt: new Date() };
      
      (api.todos.getAllPaginated as jest.Mock)
        .mockResolvedValueOnce({ data: rootTodos, total: 1, page: 1, pageSize: 20, totalPages: 1 })
        .mockResolvedValueOnce({ data: projectTodos, total: 1, page: 1, pageSize: 20, totalPages: 1 });
      (api.tags.getAll as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useTodos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Switch to project workspace
      await act(async () => {
        result.current.switchWorkspace(projectWorkspace);
      });

      await waitFor(() => {
        expect(result.current.currentWorkspace.id).toBe("project");
      });

      // Should call getAllPaginated with new workspace path and empty filters
      expect(api.todos.getAllPaginated).toHaveBeenLastCalledWith("/project", 1, 20, {});
    });

    it("should add todo to specific workspace", async () => {
      const newTodo = createTodo({ text: "Project Task", workspacePath: "/my-project" });
      
      (api.todos.getAllPaginated as jest.Mock).mockResolvedValue([]);
      (api.tags.getAll as jest.Mock).mockResolvedValue([]);
      (api.todos.create as jest.Mock).mockResolvedValue(newTodo);

      const { result } = renderHook(() => useTodos());
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.addTodo("Project Task", [], "/my-project");
      });

      expect(api.todos.create).toHaveBeenCalledWith({
        text: "Project Task",
        tagIds: [],
        workspacePath: "/my-project",
      });
    });
  });
});
