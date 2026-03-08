"use client";

import { useState, useEffect, useCallback } from "react";
import { Todo, Tag, SubTask, Workspace, ProcessingStatus } from "@/app/types";
import { api } from "@/lib/api/client";

interface UseTodosReturn {
  todos: Todo[];
  tags: Tag[];
  subTasks: Record<string, SubTask[]>;
  isLoading: boolean;
  error: string | null;
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  
  // 操作函数
  addTodo: (text: string, tagIds: string[], workspacePath?: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  updateTodoTags: (id: string, tagIds: string[]) => Promise<void>;
  clearCompleted: () => Promise<void>;
  createTag: (name: string, color: Tag["color"]) => Promise<Tag>;
  
  // 产物操作
  updateTodoArtifact: (todoId: string, artifact: string) => Promise<void>;
  
  // 状态操作
  updateTodoStatus: (todoId: string, status: ProcessingStatus) => Promise<void>;
  
  // 子任务操作
  addSubTask: (todoId: string, text: string) => Promise<void>;
  toggleSubTask: (subTaskId: string, completed: boolean) => Promise<void>;
  deleteSubTask: (subTaskId: string) => Promise<void>;
  updateSubTask: (subTaskId: string, text: string) => Promise<void>;
  updateSubTaskArtifact: (subTaskId: string, artifact: string) => Promise<void>;
  loadSubTasks: (todoId: string) => Promise<void>;
  
  // 工作区操作
  switchWorkspace: (workspace: Workspace) => void;
  createWorkspace: (data: { name: string; color?: string }) => Promise<void>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  
  // 重新加载
  refetch: () => Promise<void>;
}

const ROOT_WORKSPACE: Workspace = {
  id: "root",
  name: "根目录",
  path: "/",
  color: "slate",
  createdAt: new Date(),
};

export function useTodos(): UseTodosReturn {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [subTasks, setSubTasks] = useState<Record<string, SubTask[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(ROOT_WORKSPACE);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([ROOT_WORKSPACE]);

  // 加载工作区列表
  const loadWorkspaces = useCallback(async () => {
    try {
      const workspacesData = await api.workspaces.getAll();
      setWorkspaces(workspacesData.length > 0 ? workspacesData : [ROOT_WORKSPACE]);
      return workspacesData;
    } catch (err) {
      console.error("Failed to load workspaces:", err);
      return [ROOT_WORKSPACE];
    }
  }, []);

  // 加载数据
  const loadData = useCallback(async (workspace?: Workspace) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const targetWorkspace = workspace ?? currentWorkspace;
      
      const [todosData, tagsData] = await Promise.all([
        api.todos.getAll(targetWorkspace.path),
        api.tags.getAll(),
      ]);
      
      setTodos(todosData);
      setTags(tagsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
      console.error("Failed to load todos:", err);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace]);

  // 初始加载
  useEffect(() => {
    loadWorkspaces();
    loadData();
  }, [loadData, loadWorkspaces]);

  // 切换工作区
  const switchWorkspace = useCallback((workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    loadData(workspace);
  }, [loadData]);

  // 创建工作区
  const createWorkspace = useCallback(async (data: { name: string; color?: string }) => {
    await api.workspaces.create(data);
    await loadWorkspaces();
  }, [loadWorkspaces]);

  // 更新工作区
  const updateWorkspace = useCallback(async (id: string, data: Partial<Workspace>) => {
    await api.workspaces.update(id, data);
    await loadWorkspaces();
    // 如果更新的是当前工作区，刷新当前工作区数据
    if (id === currentWorkspace.id) {
      const updated = await api.workspaces.getById(id);
      setCurrentWorkspace(updated);
    }
  }, [loadWorkspaces, currentWorkspace.id]);

  // 删除工作区
  const deleteWorkspace = useCallback(async (id: string) => {
    await api.workspaces.delete(id);
    await loadWorkspaces();
    // 如果删除的是当前工作区，切换到根目录
    if (id === currentWorkspace.id) {
      setCurrentWorkspace(ROOT_WORKSPACE);
      await loadData(ROOT_WORKSPACE);
    }
  }, [loadWorkspaces, currentWorkspace.id, loadData]);

  // 刷新工作区列表
  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces();
  }, [loadWorkspaces]);

  // 添加任务
  const addTodo = useCallback(async (text: string, tagIds: string[], workspacePath?: string) => {
    try {
      const targetPath = workspacePath ?? currentWorkspace.path;
      const newTodo = await api.todos.create({ text, tagIds, workspacePath: targetPath });
      
      if (newTodo.workspacePath === currentWorkspace.path) {
        setTodos((prev) => [newTodo, ...prev]);
      }
    } catch (err) {
      console.error("Failed to add todo:", err);
      throw err;
    }
  }, [currentWorkspace.path]);

  // 切换任务状态
  const toggleTodo = useCallback(async (id: string) => {
    try {
      const todo = todos.find((t) => t.id === id);
      if (!todo) return;

      const updated = await api.todos.update(id, { completed: !todo.completed });
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? updated : t))
      );
    } catch (err) {
      console.error("Failed to toggle todo:", err);
      throw err;
    }
  }, [todos]);

  // 删除任务
  const deleteTodo = useCallback(async (id: string) => {
    try {
      await api.todos.delete(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
      setSubTasks((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      console.error("Failed to delete todo:", err);
      throw err;
    }
  }, []);

  // 更新任务标签
  const updateTodoTags = useCallback(async (id: string, tagIds: string[]) => {
    try {
      const updated = await api.todos.update(id, { tagIds });
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? updated : t))
      );
    } catch (err) {
      console.error("Failed to update todo tags:", err);
      throw err;
    }
  }, []);

  // 更新任务产物
  const updateTodoArtifact = useCallback(async (id: string, artifact: string) => {
    try {
      const updated = await api.todos.update(id, { artifact });
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? updated : t))
      );
    } catch (err) {
      console.error("Failed to update todo artifact:", err);
      throw err;
    }
  }, []);

  // 更新任务状态
  const updateTodoStatus = useCallback(async (id: string, status: ProcessingStatus) => {
    try {
      const updated = await api.todos.update(id, { status });
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? updated : t))
      );
    } catch (err) {
      console.error("Failed to update todo status:", err);
      throw err;
    }
  }, []);

  // 清除已完成
  const clearCompleted = useCallback(async () => {
    try {
      const completedIds = todos
        .filter((t) => t.completed)
        .map((t) => t.id);
      
      await Promise.all(completedIds.map((id) => api.todos.delete(id)));
      
      setTodos((prev) => prev.filter((t) => !t.completed));
    } catch (err) {
      console.error("Failed to clear completed:", err);
      throw err;
    }
  }, [todos]);

  // 创建标签
  const createTag = useCallback(async (name: string, color: Tag["color"]) => {
    try {
      const newTag = await api.tags.create({ name, color });
      setTags((prev) => [...prev, newTag]);
      return newTag;
    } catch (err) {
      console.error("Failed to create tag:", err);
      throw err;
    }
  }, []);

  // 子任务操作
  const loadSubTasks = useCallback(async (todoId: string) => {
    try {
      const subTasksData = await api.subTasks.getByTodoId(todoId);
      setSubTasks((prev) => ({
        ...prev,
        [todoId]: subTasksData,
      }));
    } catch (err) {
      console.error("Failed to load subtasks:", err);
      throw err;
    }
  }, []);

  const addSubTask = useCallback(async (todoId: string, text: string) => {
    try {
      const newSubTask = await api.subTasks.create(todoId, text);
      setSubTasks((prev) => ({
        ...prev,
        [todoId]: [...(prev[todoId] || []), newSubTask],
      }));
    } catch (err) {
      console.error("Failed to add subtask:", err);
      throw err;
    }
  }, []);

  const toggleSubTask = useCallback(async (subTaskId: string, completed: boolean) => {
    try {
      const updated = await api.subTasks.update(subTaskId, { completed });
      
      setSubTasks((prev) => {
        const next = { ...prev };
        for (const todoId of Object.keys(next)) {
          next[todoId] = next[todoId].map((st) =>
            st.id === subTaskId ? updated : st
          );
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to toggle subtask:", err);
      throw err;
    }
  }, []);

  const deleteSubTask = useCallback(async (subTaskId: string) => {
    try {
      await api.subTasks.delete(subTaskId);
      
      setSubTasks((prev) => {
        const next = { ...prev };
        for (const todoId of Object.keys(next)) {
          next[todoId] = next[todoId].filter((st) => st.id !== subTaskId);
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to delete subtask:", err);
      throw err;
    }
  }, []);

  const updateSubTask = useCallback(async (subTaskId: string, text: string) => {
    try {
      const updated = await api.subTasks.update(subTaskId, { text });
      
      setSubTasks((prev) => {
        const next = { ...prev };
        for (const todoId of Object.keys(next)) {
          next[todoId] = next[todoId].map((st) =>
            st.id === subTaskId ? updated : st
          );
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to update subtask:", err);
      throw err;
    }
  }, []);

  const updateSubTaskArtifact = useCallback(async (subTaskId: string, artifact: string) => {
    try {
      const updated = await api.subTasks.update(subTaskId, { artifact });
      
      setSubTasks((prev) => {
        const next = { ...prev };
        for (const todoId of Object.keys(next)) {
          next[todoId] = next[todoId].map((st) =>
            st.id === subTaskId ? updated : st
          );
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to update subtask artifact:", err);
      throw err;
    }
  }, []);

  return {
    todos,
    tags,
    subTasks,
    isLoading,
    error,
    currentWorkspace,
    workspaces,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodoTags,
    updateTodoArtifact,
    updateTodoStatus,
    clearCompleted,
    createTag,
    addSubTask,
    toggleSubTask,
    deleteSubTask,
    updateSubTask,
    updateSubTaskArtifact,
    loadSubTasks,
    switchWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    refreshWorkspaces,
    refetch: loadData,
  };
}
