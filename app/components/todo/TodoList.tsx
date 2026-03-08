"use client";

import { useState, useMemo, useCallback } from "react";
import { Todo, Tag, TodoFilterStatus, Workspace } from "@/app/types";
import { cn } from "@/lib/utils";
import { TodoInput } from "./TodoInput";
import { TodoItem } from "./TodoItem";
import { TodoFilter } from "./TodoFilter";
import { TodoMonitor } from "./TodoMonitor";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { Button } from "@/app/components/ui/Button";
import { WorkspaceSelector, WorkspaceManager } from "@/app/components/workspace";
import { useTodos } from "@/lib/hooks/useTodos";
import { useTaskAnalyzer, TaskAnalysisResult } from "@/lib/hooks/useTaskAnalyzer";
import { TaskAnalysisModal } from "./TaskAnalysisModal";
import { Folder, ChevronLeft, ChevronRight, Monitor } from "lucide-react";

// 监控面板展开状态存储键
const MONITOR_EXPANDED_KEY = "todolist-monitor-expanded";

const EMPTY_MESSAGES: Record<TodoFilterStatus, { title: string; description: string }> = {
  all: { title: "还没有任务", description: "添加一个开始管理吧！" },
  pending: { title: "没有待处理的任务", description: "所有任务都已在进行中或已完成！" },
  in_progress: { title: "没有进行中的任务", description: "开始处理一些任务吧！" },
  completed: { title: "没有已完成的任务", description: "加油完成一些任务吧！" },
};

/**
 * 任务列表主组件
 * 使用 useTodos Hook 与后端数据库交互
 * 支持多工作目录隔离和分页
 */
export function TodoList() {
  const {
    // 数据
    todos,
    tags,
    subTasks,
    loadedSubTaskIds,
    
    // 筛选状态
    filters,
    
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
    setStatusFilter,
    setTagFilter,
    clearFilters,
    
    // 操作函数
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
    
    // 分页操作
    goToPage,
    loadMore,
    refresh,
  } = useTodos();

  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isMonitorExpanded, setIsMonitorExpanded] = useState(() => {
    // 从 localStorage 读取之前的展开状态
    if (typeof window !== "undefined") {
      return localStorage.getItem(MONITOR_EXPANDED_KEY) === "true";
    }
    return false;
  });
  
  // 切换监控面板展开状态
  const toggleMonitor = useCallback(() => {
    setIsMonitorExpanded(prev => {
      const newValue = !prev;
      localStorage.setItem(MONITOR_EXPANDED_KEY, String(newValue));
      return newValue;
    });
  }, []);
  
  // 任务分析相关
  const {
    isAnalyzing,
    error: analyzeError,
    result: analyzeResult,
    analyzeTask,
    clearResult,
  } = useTaskAnalyzer();
  const [analyzingTodo, setAnalyzingTodo] = useState<Todo | null>(null);
  const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);

  // 点击标签快速筛选（切换单个标签）
  const handleTagClick = useCallback((tagId: string) => {
    setTagFilter(
      filters.tagIds.includes(tagId)
        ? [] // 取消筛选
        : [tagId] // 设置为单个标签筛选
    );
  }, [filters.tagIds, setTagFilter]);

  // 分析任务
  const handleAnalyze = useCallback(async (todo: Todo) => {
    setAnalyzingTodo(todo);
    setIsAnalysisModalOpen(true);
    await analyzeTask(todo.text, todo.id);
  }, [analyzeTask]);

  // 切换工作区并关闭弹窗
  const handleSwitchWorkspace = useCallback(async (workspace: Workspace) => {
    await switchWorkspace(workspace);
    setIsManagerOpen(false);
  }, [switchWorkspace]);

  // 应用分析结果的子任务
  const handleApplySubTasks = useCallback(async (subTasks: TaskAnalysisResult["subTasks"]) => {
    if (!analyzingTodo) return;
    
    for (const subTask of subTasks) {
      await addSubTask(analyzingTodo.id, `${subTask.title} (${subTask.estimatedTime})`);
    }
    
    setIsAnalysisModalOpen(false);
    clearResult();
    setAnalyzingTodo(null);
  }, [analyzingTodo, addSubTask, clearResult]);

  // 获取工作区颜色样式
  const getWorkspaceColor = (color?: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      blue: { bg: "bg-blue-100", text: "text-blue-600" },
      emerald: { bg: "bg-emerald-100", text: "text-emerald-600" },
      violet: { bg: "bg-violet-100", text: "text-violet-600" },
      rose: { bg: "bg-rose-100", text: "text-rose-600" },
      amber: { bg: "bg-amber-100", text: "text-amber-600" },
      cyan: { bg: "bg-cyan-100", text: "text-cyan-600" },
      slate: { bg: "bg-slate-100", text: "text-slate-600" },
    };
    return colors[color || "slate"];
  };

  const emptyMessage = EMPTY_MESSAGES[filters.status];
  const hasFilters = filters.tagIds.length > 0 || filters.status !== "all";
  const colorStyle = getWorkspaceColor(currentWorkspace.color);
  
  // 状态数量（简化版，显示当前筛选条件下的总数）
  const statusCounts = {
    all: pagination.total,
    pending: filters.status === "pending" ? pagination.total : 0,
    in_progress: filters.status === "in_progress" ? pagination.total : 0,
    completed: filters.status === "completed" ? pagination.total : 0,
  };

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto mb-4 bg-rose-100 rounded-full flex items-center justify-center">
          <svg className="w-10 h-10 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-gray-500 mb-4">加载失败</p>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        <Button onClick={refresh}>重试</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 工作区选择器 */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${colorStyle.bg} flex items-center justify-center`}>
            <Folder className={`w-4 h-4 ${colorStyle.text}`} />
          </div>
          <div>
            <h2 className="text-sm font-medium text-slate-800">{currentWorkspace.name}</h2>
            <p className="text-xs text-slate-400">{currentWorkspace.path}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">
            共 {pagination.total} 个任务
          </span>
          {/* 监控面板开关 */}
          <button
            onClick={toggleMonitor}
            className={cn(
              "text-xs px-2 py-1 rounded transition-colors flex items-center gap-1",
              isMonitorExpanded 
                ? "bg-emerald-100 text-emerald-600" 
                : "text-gray-500 hover:bg-gray-100"
            )}
            title="任务监控"
          >
            <Monitor className="w-3.5 h-3.5" />
            {isMonitorExpanded ? "关闭监控" : "监控"}
          </button>
          <button
            onClick={() => setIsManagerOpen(true)}
            className="text-xs text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors"
          >
            管理工作区
          </button>
        </div>
      </div>

      {/* 任务监控面板 */}
      {isMonitorExpanded && (
        <TodoMonitor
          currentWorkspace={currentWorkspace}
          onRefresh={refresh}
        />
      )}

      <TodoInput
        availableTags={tags}
        onAdd={(text, tagIds) => addTodo(text, tagIds, currentWorkspace.path)}
        onCreateTag={createTag}
      />

      <TodoFilter
        currentStatus={filters.status}
        onStatusChange={setStatusFilter}
        statusCounts={statusCounts}
        selectedTagIds={filters.tagIds}
        onTagFilterChange={setTagFilter}
        availableTags={tags}
      />

      <div className="space-y-3">
        {todos.length === 0 ? (
          <EmptyState
            title={hasFilters ? "没有符合条件的任务" : emptyMessage.title}
            description={hasFilters ? "尝试调整筛选条件" : emptyMessage.description}
          />
        ) : (
          todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              tags={tags}
              subTasks={subTasks[todo.id] || []}
              isSubTasksLoaded={loadedSubTaskIds.has(todo.id)}
              onLoadSubTasks={loadSubTasks}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onUpdateTags={updateTodoTags}
              onCreateTag={createTag}
              onTagClick={handleTagClick}
              onUpdateStatus={updateTodoStatus}
              onAddSubTask={addSubTask}
              onToggleSubTask={toggleSubTask}
              onDeleteSubTask={deleteSubTask}
              onUpdateSubTask={updateSubTask}
              onUpdateSubTaskArtifact={updateSubTaskArtifact}
              onUpdateArtifact={updateTodoArtifact}
              onAnalyze={handleAnalyze}
            />
          ))
        )}
      </div>

      {/* 分页控件 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-100">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoadingMore}
          >
            <ChevronLeft className="w-4 h-4" />
            上一页
          </Button>
          
          <span className="text-sm text-gray-600">
            第 {pagination.page} / {pagination.totalPages} 页
            <span className="text-gray-400 ml-2">
              (共 {pagination.total} 个)
            </span>
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoadingMore}
          >
            下一页
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 加载更多（适用于大量数据） */}
      {pagination.page < pagination.totalPages && (
        <div className="text-center pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadMore}
            disabled={isLoadingMore}
            className="text-gray-500"
          >
            {isLoadingMore ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mr-2" />
                加载中...
              </>
            ) : (
              `加载更多 (${pagination.total - todos.length} 个)`
            )}
          </Button>
        </div>
      )}

      {/* 工作区管理弹窗 */}
      <WorkspaceManager
        isOpen={isManagerOpen}
        onClose={() => setIsManagerOpen(false)}
        workspaces={workspaces}
        currentWorkspaceId={currentWorkspace.id}
        onSwitch={handleSwitchWorkspace}
        onCreate={createWorkspace}
        onUpdate={updateWorkspace}
        onDelete={deleteWorkspace}
        isLoading={isLoading}
      />

      {/* 任务分析弹窗 */}
      <TaskAnalysisModal
        isOpen={isAnalysisModalOpen}
        onClose={() => {
          setIsAnalysisModalOpen(false);
          clearResult();
          setAnalyzingTodo(null);
        }}
        result={analyzeResult}
        isLoading={isAnalyzing}
        error={analyzeError}
        onApplySubTasks={handleApplySubTasks}
      />
    </div>
  );
}
