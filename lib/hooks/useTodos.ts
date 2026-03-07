"use client";

import { useState, useEffect, useCallback } from "react";
import { Todo, Tag, SubTask } from "@/app/types";
import { api } from "@/lib/api/client";

interface UseTodosReturn {
  todos: Todo[];
  tags: Tag[];
  subTasks: Record<string, SubTask[]>;  // 按任务 ID 分组的子任务
  isLoading: boolean;
  error: string | null;
  
  // 操作函数
  addTodo: (text: string, tagIds: string[]) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  updateTodoTags: (id: string, tagIds: string[]) => Promise<void>;
  clearCompleted: () => Promise<void>;
  createTag: (name: string, color: Tag["color"]) => Promise<Tag>;
  
  // 产物操作
  updateTodoArtifact: (todoId: string, artifact: string) => Promise<void>;
  
  // 子任务操作
  addSubTask: (todoId: string, text: string) => Promise<void>;
  toggleSubTask: (subTaskId: string, completed: boolean) => Promise<void>;
  deleteSubTask: (subTaskId: string) => Promise<void>;
  updateSubTask: (subTaskId: string, text: string) => Promise<void>;
  updateSubTaskArtifact: (subTaskId: string, artifact: string) => Promise<void>;
  loadSubTasks: (todoId: string) => Promise<void>;
  
  // 重新加载
  refetch: () => Promise<void>;
}

/**
 * Todo 数据管理 Hook
 * 
 * 通过 API 与后端数据库交互
 */
export function useTodos(): UseTodosReturn {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [subTasks, setSubTasks] = useState<Record<string, SubTask[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载数据
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [todosData, tagsData] = await Promise.all([
        api.todos.getAll(),
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
  }, []);

  // 初始加载
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 添加任务
  const addTodo = useCallback(async (text: string, tagIds: string[]) => {
    try {
      const newTodo = await api.todos.create({ text, tagIds });
      setTodos((prev) => [newTodo, ...prev]);
    } catch (err) {
      console.error("Failed to add todo:", err);
      throw err;
    }
  }, []);

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
      // 同时删除关联的子任务
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

  // 清除已完成
  const clearCompleted = useCallback(async () => {
    try {
      // 获取所有已完成的任务 ID
      const completedIds = todos
        .filter((t) => t.completed)
        .map((t) => t.id);
      
      // 逐个删除
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

  // ==================== 子任务操作 ====================

  // 加载子任务
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

  // 添加子任务
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

  // 切换子任务状态
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

  // 删除子任务
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

  // 更新子任务文本
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

  // 更新子任务产物
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
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodoTags,
    updateTodoArtifact,
    clearCompleted,
    createTag,
    addSubTask,
    toggleSubTask,
    deleteSubTask,
    updateSubTask,
    updateSubTaskArtifact,
    loadSubTasks,
    refetch: loadData,
  };
}
