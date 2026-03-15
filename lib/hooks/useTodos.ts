"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Todo, Tag, SubTask, Workspace, ProcessingStatus, TodoFilterStatus } from "@/app/types";
import { api, PaginatedTodos, TodoFilters } from "@/lib/api/client";

// 默认每页数量
const DEFAULT_PAGE_SIZE = 20;

interface UseTodosReturn {
  // 数据
  todos: Todo[];
  tags: Tag[];
  subTasks: Record<string, SubTask[]>;
  loadedSubTaskIds: Set<string>;
  
  // 筛选状态
  filters: {
    status: TodoFilterStatus;
    tagIds: string[];
  };
  
  // 分页状态
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  
  // 加载状态
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  
  // 当前工作区
  currentWorkspace: Workspace;
  workspaces: Workspace[];
  
  // 筛选操作
  setStatusFilter: (status: TodoFilterStatus) => void;
  setTagFilter: (tagIds: string[]) => void;
  clearFilters: () => void;
  
  // 操作函数
  addTodo: (text: string, tagIds: string[], workspaceId?: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  batchDeleteTodos: (ids: string[]) => Promise<void>;
  updateTodoTags: (id: string, tagIds: string[]) => Promise<void>;
  clearCompleted: () => Promise<void>;
  createTag: (name: string, color: Tag["color"]) => Promise<Tag>;
  
  // 产物操作
  updateTodoArtifact: (todoId: string, artifact: string) => Promise<void>;
  
  // 状态操作
  updateTodoStatus: (todoId: string, status: ProcessingStatus) => Promise<void>;
  
  // 审批操作
  approveTodo: (todoId: string, approvalStatus: 'approved' | 'rejected') => Promise<void>;
  batchApproveTodos: (ids: string[], approvalStatus: 'approved' | 'rejected') => Promise<void>;
  
  
  // 子任务操作（懒加载）
  addSubTask: (todoId: string, text: string) => Promise<void>;
  toggleSubTask: (subTaskId: string, completed: boolean) => Promise<void>;
  deleteSubTask: (subTaskId: string) => Promise<void>;
  updateSubTask: (subTaskId: string, text: string) => Promise<void>;
  updateSubTaskArtifact: (subTaskId: string, artifact: string) => Promise<void>;
  loadSubTasks: (todoId: string) => Promise<void>;
  approveSubTask: (subTaskId: string, approvalStatus: 'approved' | 'rejected' | 'pending') => Promise<void>;
  batchApproveSubTasks: (ids: string[], approvalStatus: 'approved' | 'rejected') => Promise<void>;
  
  // 工作区操作
  switchWorkspace: (workspace: Workspace) => void;
  createWorkspace: (data: { name: string; color?: string }) => Promise<void>;
  updateWorkspace: (id: string, data: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
  
  // 默认工作区操作
  defaultWorkspaceId: string | null;
  setDefaultWorkspace: (workspaceId: string) => void;
  clearDefaultWorkspace: () => void;
  
  // 分页操作
  goToPage: (page: number) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

const ROOT_WORKSPACE: Workspace = {
  id: "root",
  name: "根目录",
  path: "/",
  color: "slate",
  createdAt: new Date(),
};

// 将前端筛选状态转换为 API 筛选参数
function convertFilters(status: TodoFilterStatus, tagIds: string[]): TodoFilters {
  const filters: TodoFilters = {};
  
  // 状态筛选
  if (status !== "all") {
    filters.status = status;
  }
  
  // 标签筛选（只支持单个标签，取第一个）
  if (tagIds.length > 0) {
    filters.tagId = tagIds[0];
  }
  
  return filters;
}

export function useTodos(): UseTodosReturn {
  // 数据状态
  const [todos, setTodos] = useState<Todo[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [subTasks, setSubTasks] = useState<Record<string, SubTask[]>>({});
  const [loadedSubTaskIds, setLoadedSubTaskIds] = useState<Set<string>>(new Set());
  
  // 筛选状态
  const [statusFilter, setStatusFilter] = useState<TodoFilterStatus>("all");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  
  // 分页状态
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    total: 0,
    totalPages: 0,
  });
  
  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 工作区状态
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace>(ROOT_WORKSPACE);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([ROOT_WORKSPACE]);
  
  // 默认工作区状态（从 LocalStorage 读取）
  const [defaultWorkspaceId, setDefaultWorkspaceId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem("defaultWorkspaceId");
    } catch {
      return null;
    }
  });
  
  // 用于追踪当前加载的请求，避免竞态条件
  const loadingRef = useRef<number>(0);
  
  // 使用 ref 存储最新筛选状态，避免 loadData 的闭包问题
  const filtersRef = useRef({ statusFilter, tagFilter });
  useEffect(() => {
    filtersRef.current = { statusFilter, tagFilter };
  }, [statusFilter, tagFilter]);

  // 加载工作区列表，并根据默认设置自动切换
  const loadWorkspaces = useCallback(async () => {
    try {
      const workspacesData = await api.workspaces.getAll();
      const validWorkspaces = workspacesData.length > 0 ? workspacesData : [ROOT_WORKSPACE];
      setWorkspaces(validWorkspaces);
      
      // 如果有默认工作区设置，自动切换到该工作区
      const savedDefaultId = localStorage.getItem("defaultWorkspaceId");
      if (savedDefaultId) {
        const defaultWorkspace = validWorkspaces.find(w => w.id === savedDefaultId);
        if (defaultWorkspace) {
          setCurrentWorkspace(defaultWorkspace);
          return { workspaces: validWorkspaces, defaultWorkspace };
        }
      }
      
      return { workspaces: validWorkspaces };
    } catch (err) {
      console.error("Failed to load workspaces:", err);
      return { workspaces: [ROOT_WORKSPACE] };
    }
  }, []);

  // 加载任务数据（分页，支持筛选）
  const loadData = useCallback(async (
    workspace?: Workspace, 
    page: number = 1, 
    append: boolean = false,
    filters?: TodoFilters
  ) => {
    const requestId = ++loadingRef.current;
    
    try {
      if (page === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);
      
      const targetWorkspace = workspace ?? currentWorkspace;
      // 使用 ref 获取最新筛选状态，避免闭包问题
      const effectiveFilters = filters ?? convertFilters(filtersRef.current.statusFilter, filtersRef.current.tagFilter);
      
      // 并行加载任务和标签（V4: 标签按工作区加载）
      const [todosResult, tagsData] = await Promise.all([
        api.todos.getAllPaginated(
          targetWorkspace.id, 
          page, 
          DEFAULT_PAGE_SIZE,
          effectiveFilters
        ),
        api.tags.getAll(targetWorkspace.id),
      ]);
      
      // 检查是否是最新请求
      if (requestId !== loadingRef.current) return;
      
      // 更新任务数据
      if (append) {
        setTodos((prev) => [...prev, ...todosResult.data]);
      } else {
        setTodos(todosResult.data);
        // 切换工作区或刷新时清空已加载的子任务
        setSubTasks({});
        setLoadedSubTaskIds(new Set());
      }
      
      // 更新分页信息
      setPagination({
        page: todosResult.page,
        pageSize: todosResult.pageSize,
        total: todosResult.total,
        totalPages: todosResult.totalPages,
      });
      
      setTags(tagsData);
    } catch (err) {
      if (requestId !== loadingRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load data");
      console.error("Failed to load todos:", err);
    } finally {
      if (requestId === loadingRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }, [currentWorkspace]);

  // 初始加载：先加载工作区，如果有默认工作区则自动切换
  useEffect(() => {
    const init = async () => {
      const result = await loadWorkspaces();
      // 如果有默认工作区，使用它加载数据；否则使用当前工作区
      if (result && "defaultWorkspace" in result && result.defaultWorkspace) {
        await loadData(result.defaultWorkspace, 1, false);
      } else {
        await loadData(undefined, 1, false);
      }
    };
    init();
  }, []);

  // 筛选变化时重新加载
  useEffect(() => {
    // 避免初始渲染时的重复加载
    if (!isLoading || todos.length > 0) {
      loadData(undefined, 1, false);
    }
    // 注意：这里只依赖筛选状态，loadData 使用 ref 获取最新值
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, tagFilter]);

  // 切换工作区
  const switchWorkspace = useCallback(async (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    await loadData(workspace, 1, false);
  }, [loadData]);
  
  // 设置默认工作区
  const setDefaultWorkspace = useCallback((workspaceId: string) => {
    localStorage.setItem("defaultWorkspaceId", workspaceId);
    setDefaultWorkspaceId(workspaceId);
  }, []);
  
  // 清除默认工作区
  const clearDefaultWorkspace = useCallback(() => {
    localStorage.removeItem("defaultWorkspaceId");
    setDefaultWorkspaceId(null);
  }, []);

  // 设置状态筛选
  const handleSetStatusFilter = useCallback((status: TodoFilterStatus) => {
    setStatusFilter(status);
    // 重置到第一页
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // 设置标签筛选
  const handleSetTagFilter = useCallback((tagIds: string[]) => {
    setTagFilter(tagIds);
    // 重置到第一页
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // 清除筛选
  const clearFilters = useCallback(() => {
    setStatusFilter("all");
    setTagFilter([]);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // 分页跳转
  const goToPage = useCallback(async (page: number) => {
    const validPage = Math.max(1, Math.min(page, pagination.totalPages));
    await loadData(undefined, validPage, false);
  }, [loadData, pagination.totalPages]);

  // 加载更多（下一页）
  const loadMore = useCallback(async () => {
    if (pagination.page >= pagination.totalPages || isLoadingMore) return;
    await loadData(undefined, pagination.page + 1, true);
  }, [loadData, pagination.page, pagination.totalPages, isLoadingMore]);

  // 刷新当前页
  const refresh = useCallback(async () => {
    await loadData(undefined, pagination.page, false);
  }, [loadData, pagination.page]);

  // 创建工作区
  const createWorkspace = useCallback(async (data: { name: string; color?: string }) => {
    await api.workspaces.create(data);
    await loadWorkspaces();
  }, [loadWorkspaces]);

  // 更新工作区
  const updateWorkspace = useCallback(async (id: string, data: Partial<Workspace>) => {
    await api.workspaces.update(id, data);
    await loadWorkspaces();
    if (id === currentWorkspace.id) {
      const updated = await api.workspaces.getById(id);
      setCurrentWorkspace(updated);
    }
  }, [loadWorkspaces, currentWorkspace.id]);

  // 删除工作区
  const deleteWorkspace = useCallback(async (id: string) => {
    await api.workspaces.delete(id);
    await loadWorkspaces();
    if (id === currentWorkspace.id) {
      setCurrentWorkspace(ROOT_WORKSPACE);
      await loadData(ROOT_WORKSPACE, 1, false);
    }
  }, [loadWorkspaces, loadData, currentWorkspace.id]);

  // 刷新工作区列表
  const refreshWorkspaces = useCallback(async () => {
    await loadWorkspaces();
  }, [loadWorkspaces]);

  // 添加任务
  const addTodo = useCallback(async (text: string, tagIds: string[], workspaceId?: string) => {
    try {
      const targetId = workspaceId ?? currentWorkspace.id;
      const newTodo = await api.todos.create({ text, tagIds, workspaceId: targetId });
      
      // 如果添加在当前工作区，刷新列表
      if (newTodo.workspaceId === currentWorkspace.id) {
        await refresh();
      }
    } catch (err) {
      console.error("Failed to add todo:", err);
      throw err;
    }
  }, [currentWorkspace.id, refresh]);

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
      setLoadedSubTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      console.error("Failed to delete todo:", err);
      throw err;
    }
  }, []);

  // 批量删除任务
  const batchDeleteTodos = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    try {
      await api.todos.batchDelete(ids);
      setTodos((prev) => prev.filter((t) => !ids.includes(t.id)));
      setSubTasks((prev) => {
        const next = { ...prev };
        ids.forEach((id) => delete next[id]);
        return next;
      });
      setLoadedSubTaskIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    } catch (err) {
      console.error("Failed to batch delete todos:", err);
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

  // 审批任务
  const approveTodo = useCallback(async (id: string, approvalStatus: 'approved' | 'rejected') => {
    try {
      const result = await api.todos.approve(id, approvalStatus);
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? result.data : t))
      );
    } catch (err) {
      console.error("Failed to approve todo:", err);
      throw err;
    }
  }, []);

  // 批量审批任务
  const batchApproveTodos = useCallback(async (ids: string[], approvalStatus: 'approved' | 'rejected') => {
    try {
      await api.todos.batchApprove(ids, approvalStatus);
      // 更新本地状态
      setTodos((prev) =>
        prev.map((t) => {
          if (ids.includes(t.id)) {
            return { ...t, approvalStatus };
          }
          return t;
        })
      );
    } catch (err) {
      console.error("Failed to batch approve todos:", err);
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
      
      // 刷新当前页
      await refresh();
    } catch (err) {
      console.error("Failed to clear completed:", err);
      throw err;
    }
  }, [todos, refresh]);

  // 创建标签
  // V4: 创建标签时关联到当前工作区
  const createTag = useCallback(async (name: string, color: Tag["color"]) => {
    try {
      const newTag = await api.tags.create({ 
        name, 
        color,
        workspaceId: currentWorkspace.id 
      });
      setTags((prev) => [...prev, newTag]);
      return newTag;
    } catch (err) {
      console.error("Failed to create tag:", err);
      throw err;
    }
  }, [currentWorkspace.id]);

  // ============ 子任务操作（懒加载） ============

  // 加载子任务（点击展开时调用）
  const loadSubTasks = useCallback(async (todoId: string) => {
    // 如果已加载，不再重复加载
    if (loadedSubTaskIds.has(todoId)) return;
    
    try {
      const subTasksData = await api.subTasks.getByTodoId(todoId);
      setSubTasks((prev) => ({
        ...prev,
        [todoId]: subTasksData,
      }));
      setLoadedSubTaskIds((prev) => new Set(prev).add(todoId));
    } catch (err) {
      console.error("Failed to load subtasks:", err);
      throw err;
    }
  }, [loadedSubTaskIds]);

  const addSubTask = useCallback(async (todoId: string, text: string) => {
    try {
      const newSubTask = await api.subTasks.create(todoId, text);
      setSubTasks((prev) => ({
        ...prev,
        [todoId]: [...(prev[todoId] || []), newSubTask],
      }));
      // 标记为已加载
      setLoadedSubTaskIds((prev) => new Set(prev).add(todoId));
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

  // 审批子任务
  const approveSubTask = useCallback(async (subTaskId: string, approvalStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      const updated = await api.subTasks.approve(subTaskId, approvalStatus);

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
      console.error("Failed to approve subtask:", err);
      throw err;
    }
  }, []);

  // 批量审批子任务
  const batchApproveSubTasks = useCallback(async (ids: string[], approvalStatus: 'approved' | 'rejected') => {
    try {
      await api.subTasks.batchApprove(ids, approvalStatus);

      // 更新本地状态
      setSubTasks((prev) => {
        const next = { ...prev };
        for (const todoId of Object.keys(next)) {
          next[todoId] = next[todoId].map((st) => {
            if (ids.includes(st.id)) {
              return { ...st, approvalStatus };
            }
            return st;
          });
        }
        return next;
      });
    } catch (err) {
      console.error("Failed to batch approve subtasks:", err);
      throw err;
    }
  }, []);

  return {
    // 数据
    todos,
    tags,
    subTasks,
    loadedSubTaskIds,
    
    // 筛选状态
    filters: {
      status: statusFilter,
      tagIds: tagFilter,
    },
    
    // 分页状态
    pagination,
    
    // 加载状态
    isLoading,
    isLoadingMore,
    error,
    
    // 工作区
    currentWorkspace,
    workspaces,
    
    // 筛选操作
    setStatusFilter: handleSetStatusFilter,
    setTagFilter: handleSetTagFilter,
    clearFilters,
    
    // 操作函数
    addTodo,
    toggleTodo,
    deleteTodo,
    batchDeleteTodos,
    updateTodoTags,
    updateTodoArtifact,
    updateTodoStatus,
    approveTodo,
    batchApproveTodos,
    clearCompleted,
    createTag,
    
    // 子任务操作
    addSubTask,
    toggleSubTask,
    deleteSubTask,
    updateSubTask,
    updateSubTaskArtifact,
    loadSubTasks,
    approveSubTask,
    batchApproveSubTasks,
    
    // 工作区操作
    switchWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    refreshWorkspaces,
    
    // 默认工作区操作
    defaultWorkspaceId,
    setDefaultWorkspace,
    clearDefaultWorkspace,
    
    // 分页操作
    goToPage,
    loadMore,
    refresh,
  };
}
