"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Todo, Tag, TodoStatus } from "@/app/types";
import { TodoInput } from "./TodoInput";
import { TodoItem } from "./TodoItem";
import { TodoFilter } from "./TodoFilter";
import { EmptyState } from "@/app/components/ui/EmptyState";
import { Button } from "@/app/components/ui/Button";
import { useTodos } from "@/lib/hooks/useTodos";
import { useTaskAnalyzer, TaskAnalysisResult } from "@/lib/hooks/useTaskAnalyzer";
import { TaskAnalysisModal } from "./TaskAnalysisModal";

const EMPTY_MESSAGES: Record<TodoStatus, { title: string; description: string }> = {
  all: { title: "还没有任务", description: "添加一个开始管理吧！" },
  active: { title: "没有进行中的任务", description: "所有任务都已完成！" },
  completed: { title: "没有已完成的任务", description: "加油完成一些任务吧！" },
};

/**
 * 任务列表主组件
 * 使用 useTodos Hook 与后端数据库交互
 */
export function TodoList() {
  const {
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
    refetch,
  } = useTodos();

  const [statusFilter, setStatusFilter] = useState<TodoStatus>("all");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  
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

  // 加载所有任务的子任务
  useEffect(() => {
    if (todos.length > 0) {
      todos.forEach((todo) => {
        loadSubTasks(todo.id).catch(console.error);
      });
    }
  }, [todos, loadSubTasks]);

  // 筛选逻辑
  const filteredTodos = useMemo(() => {
    let result = todos;

    switch (statusFilter) {
      case "active":
        result = result.filter((todo) => !todo.completed);
        break;
      case "completed":
        result = result.filter((todo) => todo.completed);
        break;
    }

    if (tagFilter.length > 0) {
      result = result.filter((todo) =>
        todo.tagIds.some((tagId) => tagFilter.includes(tagId))
      );
    }

    return result;
  }, [todos, statusFilter, tagFilter]);

  const statusCounts = useMemo(
    () => ({
      all: todos.length,
      active: todos.filter((t) => !t.completed).length,
      completed: todos.filter((t) => t.completed).length,
    }),
    [todos]
  );

  // 点击标签快速筛选
  const handleTagClick = useCallback((tagId: string) => {
    setTagFilter((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }, []);

  // 分析任务
  const handleAnalyze = useCallback(async (todo: Todo) => {
    setAnalyzingTodo(todo);
    setIsAnalysisModalOpen(true);
    await analyzeTask(todo.text, todo.id);
  }, [analyzeTask]);

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

  const emptyMessage = EMPTY_MESSAGES[statusFilter];
  const hasFilters = tagFilter.length > 0;

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
        <Button onClick={refetch}>重试</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TodoInput
        availableTags={tags}
        onAdd={addTodo}
        onCreateTag={createTag}
      />

      <TodoFilter
        currentStatus={statusFilter}
        onStatusChange={setStatusFilter}
        statusCounts={statusCounts}
        selectedTagIds={tagFilter}
        onTagFilterChange={setTagFilter}
        availableTags={tags}
      />

      <div className="space-y-3">
        {filteredTodos.length === 0 ? (
          <EmptyState
            title={hasFilters ? "没有符合条件的任务" : emptyMessage.title}
            description={hasFilters ? "尝试调整筛选条件" : emptyMessage.description}
          />
        ) : (
          filteredTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              tags={tags}
              subTasks={subTasks[todo.id] || []}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onUpdateTags={updateTodoTags}
              onCreateTag={createTag}
              onTagClick={handleTagClick}
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

      {statusCounts.completed > 0 && (
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
          <span className="text-sm text-gray-400">
            {statusCounts.completed} 个已完成任务
          </span>
          <Button variant="ghost" size="sm" onClick={clearCompleted}>
            清除已完成
          </Button>
        </div>
      )}

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
