"use client";

import { useState, useMemo, useCallback, FormEvent } from "react";
import { createPortal } from "react-dom";
import { Todo, Tag, TodoFilterStatus, Workspace, TagColor } from "@/app/types";
import { cn } from "@/lib/utils";
import { TodoItem } from "./TodoItem";
import { TodoFilter } from "./TodoFilter";
import { TodoMonitor } from "./TodoMonitor";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { Button } from "@/app/components/ui/Button";
import { WorkspaceManager } from "@/app/components/workspace";
import { useTodos } from "@/lib/hooks/useTodos";
import { useTaskAnalyzer, TaskAnalysisResult } from "@/lib/hooks/useTaskAnalyzer";
import { TaskAnalysisModal } from "./TaskAnalysisModal";
import { Folder, ChevronLeft, ChevronRight, Monitor, Plus, X, Trash2, CheckSquare, Square, CheckCircle, XCircle } from "lucide-react";

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
    deleteTodo,
    updateTodoTags,
    updateTodoArtifact,
    updateTodoStatus,
    approveTodo,
    batchApproveTodos,
    clearCompleted,
    createTag,
    addSubTask,
    toggleSubTask,
    deleteSubTask,
    updateSubTask,
    updateSubTaskArtifact,
    loadSubTasks,
    approveSubTask,
    batchApproveSubTasks,
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
    batchDeleteTodos,
  } = useTodos();

  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<TagColor>("emerald");
  
  // 批量选择状态
  const [selectedTodoIds, setSelectedTodoIds] = useState<string[]>([]);
  const [selectedSubTaskIds, setSelectedSubTaskIds] = useState<string[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  
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

  // 处理添加任务
  const handleAddTask = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (newTaskText.trim()) {
      addTodo(newTaskText.trim(), selectedTagIds, currentWorkspace.id);
      setNewTaskText("");
      setSelectedTagIds([]);
      setIsAddModalOpen(false);
    }
  }, [newTaskText, selectedTagIds, currentWorkspace.id, addTodo]);

  // 处理创建标签
  const handleCreateTag = useCallback(() => {
    if (newTagName.trim()) {
      createTag(newTagName.trim(), newTagColor);
      setNewTagName("");
      setIsCreatingTag(false);
    }
  }, [newTagName, newTagColor, createTag]);

  // 切换标签选择
  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  }, []);

  // 批量选择相关函数
  // 选中/取消选中主任务，同时选中/取消选中其所有子任务
  const toggleTodoSelection = useCallback((todoId: string, subTaskIds: string[]) => {
    setSelectedTodoIds(prev => {
      const isSelected = prev.includes(todoId);
      if (isSelected) {
        // 取消选中主任务及其子任务
        setSelectedSubTaskIds(prevSub => prevSub.filter(id => !subTaskIds.includes(id)));
        return prev.filter(id => id !== todoId);
      } else {
        // 选中主任务及其子任务
        setSelectedSubTaskIds(prevSub => [...new Set([...prevSub, ...subTaskIds])]);
        return [...prev, todoId];
      }
    });
  }, []);

  // 选中/取消选中子任务
  const toggleSubTaskSelection = useCallback((subTaskId: string) => {
    setSelectedSubTaskIds(prev =>
      prev.includes(subTaskId)
        ? prev.filter(id => id !== subTaskId)
        : [...prev, subTaskId]
    );
  }, []);

  const selectAllTodos = useCallback(() => {
    if (selectedTodoIds.length === todos.length) {
      // 取消全选
      setSelectedTodoIds([]);
      setSelectedSubTaskIds([]);
    } else {
      // 全选所有主任务和子任务
      setSelectedTodoIds(todos.map(t => t.id));
      const allSubTaskIds = todos.flatMap(t => (subTasks[t.id] || []).map(s => s.id));
      setSelectedSubTaskIds(allSubTaskIds);
    }
  }, [todos, selectedTodoIds.length, subTasks]);

  const clearSelection = useCallback(() => {
    setSelectedTodoIds([]);
    setSelectedSubTaskIds([]);
    setIsBatchMode(false);
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selectedTodoIds.length === 0) return;
    if (!confirm(`确定要删除选中的 ${selectedTodoIds.length} 个任务吗？`)) return;

    try {
      await batchDeleteTodos(selectedTodoIds);
      setSelectedTodoIds([]);
      setSelectedSubTaskIds([]);
      setIsBatchMode(false);
    } catch (err) {
      console.error("Failed to batch delete:", err);
      alert("批量删除失败");
    }
  }, [selectedTodoIds, batchDeleteTodos]);

  // 批量审批
  const handleBatchApprove = useCallback(async (approvalStatus: 'approved' | 'rejected') => {
    const totalSelected = selectedTodoIds.length + selectedSubTaskIds.length;
    if (totalSelected === 0) return;

    try {
      // 批量审批主任务
      if (selectedTodoIds.length > 0) {
        await batchApproveTodos(selectedTodoIds, approvalStatus);
      }
      // 批量审批子任务
      if (selectedSubTaskIds.length > 0) {
        await batchApproveSubTasks(selectedSubTaskIds, approvalStatus);
      }
      setSelectedTodoIds([]);
      setSelectedSubTaskIds([]);
      setIsBatchMode(false);
    } catch (err) {
      console.error("Failed to batch approve:", err);
      alert("批量审批失败");
    }
  }, [selectedTodoIds, selectedSubTaskIds, batchApproveTodos, batchApproveSubTasks]);

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
    // 使用 filters.tagIds 获取当前筛选状态
    setTagFilter(filters.tagIds.includes(tagId) ? [] : [tagId]);
  }, [setTagFilter, filters.tagIds]);

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

      {/* 悬浮添加按钮 (FAB) - 使用 Portal 确保固定在视口右下角 */}
      {createPortal(
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-[9999]"
          style={{ position: 'fixed' }}
          aria-label="添加新任务"
        >
          <Plus className="w-7 h-7" />
        </button>,
        document.body
      )}

      <TodoFilter
        currentStatus={filters.status}
        onStatusChange={setStatusFilter}
        statusCounts={statusCounts}
        selectedTagIds={filters.tagIds}
        onTagFilterChange={setTagFilter}
        availableTags={tags}
      />

      {/* 批量操作工具栏 */}
      {todos.length > 0 && (
        <div className="flex items-center justify-between py-2 px-3 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-3">
            {!isBatchMode ? (
              <button
                onClick={() => setIsBatchMode(true)}
                className="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1.5"
              >
                <CheckSquare className="w-4 h-4" />
                批量选择
              </button>
            ) : (
              <>
                <button
                  onClick={selectAllTodos}
                  className="text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1.5"
                >
                  {selectedTodoIds.length === todos.length ? (
                    <>
                      <Square className="w-4 h-4" />
                      取消全选
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4" />
                      全选 ({todos.length})
                    </>
                  )}
                </button>
                {(selectedTodoIds.length > 0 || selectedSubTaskIds.length > 0) && (
                  <span className="text-sm text-slate-500">
                    已选 {selectedTodoIds.length} 任务{selectedSubTaskIds.length > 0 && ` + ${selectedSubTaskIds.length} 子任务`}
                  </span>
                )}
              </>
            )}
          </div>

          {isBatchMode && (
            <div className="flex items-center gap-2">
              {(selectedTodoIds.length > 0 || selectedSubTaskIds.length > 0) && (
                <>
                  <button
                    onClick={() => handleBatchApprove('approved')}
                    className="text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" />
                    通过
                  </button>
                  <button
                    onClick={() => handleBatchApprove('rejected')}
                    className="text-sm text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                    拒绝
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </>
              )}
              <button
                onClick={clearSelection}
                className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-md transition-colors"
              >
                取消
              </button>
            </div>
          )}
        </div>
      )}

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
              onApproveSubTask={(id, status) => approveSubTask(id, status)}
              onUpdateArtifact={updateTodoArtifact}
              onAnalyze={handleAnalyze}
              onApprove={(id) => approveTodo(id, 'approved')}
              onReject={(id) => approveTodo(id, 'rejected')}
              // 批量选择相关
              isSelectable={isBatchMode}
              isSelected={selectedTodoIds.includes(todo.id)}
              onSelect={(todoId, subTaskIds) => toggleTodoSelection(todoId, subTaskIds)}
              selectedSubTaskIds={selectedSubTaskIds.filter(id =>
                (subTasks[todo.id] || []).some(s => s.id === id)
              )}
              onSubTaskSelect={toggleSubTaskSelection}
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
        defaultWorkspaceId={defaultWorkspaceId}
        onSetDefault={setDefaultWorkspace}
        onClearDefault={clearDefaultWorkspace}
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

      {/* 添加任务弹窗 */}
      {isAddModalOpen && (
        <AddTaskModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setNewTaskText("");
            setSelectedTagIds([]);
            setIsCreatingTag(false);
            setNewTagName("");
          }}
          newTaskText={newTaskText}
          setNewTaskText={setNewTaskText}
          selectedTagIds={selectedTagIds}
          toggleTag={toggleTag}
          availableTags={tags}
          isCreatingTag={isCreatingTag}
          setIsCreatingTag={setIsCreatingTag}
          newTagName={newTagName}
          setNewTagName={setNewTagName}
          newTagColor={newTagColor}
          setNewTagColor={setNewTagColor}
          handleCreateTag={handleCreateTag}
          handleAddTask={handleAddTask}
        />
      )}
    </div>
  );
}

// 添加任务弹窗组件
interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  newTaskText: string;
  setNewTaskText: (text: string) => void;
  selectedTagIds: string[];
  toggleTag: (tagId: string) => void;
  availableTags: Tag[];
  isCreatingTag: boolean;
  setIsCreatingTag: (value: boolean) => void;
  newTagName: string;
  setNewTagName: (name: string) => void;
  newTagColor: TagColor;
  setNewTagColor: (color: TagColor) => void;
  handleCreateTag: () => void;
  handleAddTask: (e: FormEvent) => void;
}

function AddTaskModal({
  isOpen,
  onClose,
  newTaskText,
  setNewTaskText,
  selectedTagIds,
  toggleTag,
  availableTags,
  isCreatingTag,
  setIsCreatingTag,
  newTagName,
  setNewTagName,
  newTagColor,
  setNewTagColor,
  handleCreateTag,
  handleAddTask,
}: AddTaskModalProps) {
  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      
      {/* 内容层 */}
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800">添加新任务</h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleAddTask} className="p-6 space-y-6">
            {/* 任务输入 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                任务内容
              </label>
              <textarea
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="输入任务描述..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 resize-none"
                rows={3}
                autoFocus
              />
            </div>

            {/* 标签选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                选择标签
              </label>
              
              {/* 已选标签 */}
              {selectedTagIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedTagIds.map((tagId) => {
                    const tag = availableTags.find((t) => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <span
                        key={tagId}
                        className={cn(
                          "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm",
                          getTagColorStyle(tag.color).bg,
                          getTagColorStyle(tag.color).text
                        )}
                      >
                        {tag.name}
                        <button
                          type="button"
                          onClick={() => toggleTag(tagId)}
                          className="ml-1 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* 可选标签 */}
              <div className="flex flex-wrap gap-2">
                {availableTags
                  .filter((tag) => !selectedTagIds.includes(tag.id))
                  .map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className="px-3 py-1.5 rounded-full text-sm border border-gray-200 text-gray-600 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                    >
                      + {tag.name}
                    </button>
                  ))}
              </div>

              {/* 创建新标签 */}
              <div className="mt-4">
                {!isCreatingTag ? (
                  <button
                    type="button"
                    onClick={() => setIsCreatingTag(true)}
                    className="text-sm text-gray-500 hover:text-emerald-600 transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    新建标签
                  </button>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="标签名称"
                      className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      {["emerald", "blue", "violet", "rose", "amber", "cyan"].map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTagColor(color as TagColor)}
                          className={cn(
                            "w-6 h-6 rounded-full transition-all",
                            getTagColorStyle(color as TagColor).bg,
                            newTagColor === color && "ring-2 ring-offset-1 ring-gray-400"
                          )}
                        />
                      ))}
                    </div>
                    <Button type="button" size="sm" onClick={handleCreateTag} disabled={!newTagName.trim()}>
                      创建
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setIsCreatingTag(false)}>
                      取消
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={onClose}
              >
                取消
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={!newTaskText.trim()}
              >
                添加任务
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// 辅助函数
function getTagColorStyle(color: TagColor) {
  const colors: Record<TagColor, { bg: string; text: string }> = {
    emerald: { bg: "bg-emerald-100", text: "text-emerald-700" },
    blue: { bg: "bg-blue-100", text: "text-blue-700" },
    violet: { bg: "bg-violet-100", text: "text-violet-700" },
    rose: { bg: "bg-rose-100", text: "text-rose-700" },
    amber: { bg: "bg-amber-100", text: "text-amber-700" },
    cyan: { bg: "bg-cyan-100", text: "text-cyan-700" },
  };
  return colors[color];
}
