"use client";

import { useState } from "react";
import { SubTask } from "@/app/types";
import { cn } from "@/lib/utils";
import { Checkbox } from "./Checkbox";
import { Button } from "./Button";
import { ArtifactCard } from "./ArtifactCard";
import { ApprovalBadge } from "./ApprovalBadge";
import { ApprovalModal } from "./ApprovalModal";

interface SubTaskListProps {
  todoId: string;
  subTasks: SubTask[];
  onAdd: (todoId: string, text: string) => Promise<void>;
  onToggle: (subTaskId: string, completed: boolean) => Promise<void>;
  onDelete: (subTaskId: string) => Promise<void>;
  onUpdateText: (subTaskId: string, text: string) => Promise<void>;
  onUpdateArtifact: (subTaskId: string, artifact: string) => Promise<void>;
  onApprove?: (subTaskId: string, approvalStatus: 'approved' | 'rejected') => Promise<void>;
  className?: string;
  /** 是否自动进入添加模式 */
  autoFocusAdd?: boolean;
  /** 是否处于批量选择模式 */
  isSelectable?: boolean;
  /** 已选中的子任务 ID 列表 */
  selectedIds?: string[];
  /** 选择子任务的回调 */
  onSelect?: (subTaskId: string) => void;
}

/**
 * 子任务列表组件
 * 支持添加、完成、删除、编辑子任务及产物
 */
export function SubTaskList({
  todoId,
  subTasks,
  onAdd,
  onToggle,
  onDelete,
  onUpdateText,
  onUpdateArtifact,
  onApprove,
  className,
  autoFocusAdd = false,
  isSelectable = false,
  selectedIds = [],
  onSelect,
}: SubTaskListProps) {
  const [isAdding, setIsAdding] = useState(autoFocusAdd);
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [expandedArtifacts, setExpandedArtifacts] = useState<Set<string>>(new Set());
  const [approvalModalSubTask, setApprovalModalSubTask] = useState<SubTask | null>(null);
  const [isReapproving, setIsReapproving] = useState(false);

  const completedCount = subTasks.filter((st) => st.completed).length;
  const progress = subTasks.length > 0 ? (completedCount / subTasks.length) * 100 : 0;
  const MAX_SUBTASKS = 10;

  const handleAdd = async () => {
    if (!newText.trim()) return;

    // 检查子任务数量限制
    if (subTasks.length >= MAX_SUBTASKS) {
      alert(`子任务数量已达上限（${MAX_SUBTASKS}条），建议拆分任务规模或创建新的主任务来管理。`);
      return;
    }

    await onAdd(todoId, newText.trim());
    setNewText("");
    setIsAdding(false);
  };

  const handleStartEdit = (subTask: SubTask) => {
    setEditingId(subTask.id);
    setEditText(subTask.text);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    await onUpdateText(editingId, editText.trim());
    setEditingId(null);
    setEditText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === "Enter") {
      action();
    } else if (e.key === "Escape") {
      setIsAdding(false);
      setEditingId(null);
    }
  };

  const toggleArtifact = (subTaskId: string) => {
    setExpandedArtifacts((prev) => {
      const next = new Set(prev);
      if (next.has(subTaskId)) {
        next.delete(subTaskId);
      } else {
        next.add(subTaskId);
      }
      return next;
    });
  };

  return (
    <div className={cn("pl-9", className)}>
      {/* 进度条 */}
      {subTasks.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>子任务进度</span>
            <span>
              {completedCount}/{subTasks.length}
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* 子任务列表 */}
      <div className="space-y-3">
        {subTasks.map((subTask) => (
          <div
            key={subTask.id}
            className={cn(
              "group rounded-lg border transition-all",
              selectedIds.includes(subTask.id) && "bg-blue-50/50 border-blue-200",
              subTask.completed && !selectedIds.includes(subTask.id) && "bg-gray-50/50 border-gray-100",
              !subTask.completed && !selectedIds.includes(subTask.id) && "bg-white border-gray-200 hover:border-gray-300"
            )}
          >
            {/* 子任务头部 */}
            <div className="flex items-center gap-2 p-2">
              {isSelectable ? (
                <Checkbox
                  checked={selectedIds.includes(subTask.id)}
                  onChange={() => onSelect?.(subTask.id)}
                  className="flex-shrink-0"
                />
              ) : (
                <Checkbox
                  checked={subTask.completed}
                  onChange={() => onToggle(subTask.id, !subTask.completed)}
                  className="flex-shrink-0"
                />
              )}

              {editingId === subTask.id ? (
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={(e) => handleKeyDown(e, handleSaveEdit)}
                  className="flex-1 px-2 py-1 text-sm border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-200"
                  autoFocus
                />
              ) : (
                <span
                  onClick={() => handleStartEdit(subTask)}
                  className={cn(
                    "flex-1 text-sm cursor-pointer",
                    subTask.completed
                      ? "line-through text-gray-400"
                      : "text-gray-700"
                  )}
                >
                  {subTask.text}
                </span>
              )}

              {/* 产物按钮 */}
              <button
                onClick={() => toggleArtifact(subTask.id)}
                className={cn(
                  "p-1.5 rounded-lg transition-colors",
                  subTask.artifact
                    ? "text-emerald-500 bg-emerald-50 hover:bg-emerald-100"
                    : "text-gray-400 hover:text-emerald-500 hover:bg-gray-100",
                  expandedArtifacts.has(subTask.id) && "text-emerald-500 bg-emerald-50"
                )}
                title={subTask.artifact ? "查看产物" : "添加产物"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>

              {/* 审批状态徽章 */}
              {onApprove && (
                <ApprovalBadge
                  status={subTask.approvalStatus || 'pending'}
                  size="sm"
                  onClick={() => {
                    if (subTask.approvalStatus === 'pending' || isReapproving) {
                      setApprovalModalSubTask(subTask);
                      setIsReapproving(false);
                    }
                  }}
                  onReset={
                    subTask.approvalStatus !== 'pending'
                      ? () => {
                          setIsReapproving(true);
                          setApprovalModalSubTask(subTask);
                        }
                      : undefined
                  }
                />
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(subTask.id)}
                className="opacity-0 group-hover:opacity-100 w-7 h-7 text-gray-400 hover:text-rose-400"
                aria-label="删除子任务"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Button>
            </div>

            {/* 产物区域 */}
            {expandedArtifacts.has(subTask.id) && (
              <div className="px-2 pb-2">
                <ArtifactCard
                  title="子任务产物"
                  content={subTask.artifact}
                  onSave={(artifact) => onUpdateArtifact(subTask.id, artifact)}
                  compact
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 添加子任务 */}
      {isAdding ? (
        <div className="flex items-center gap-2 mt-3">
          <input
            type="text"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            onBlur={() => !newText.trim() && setIsAdding(false)}
            onKeyDown={(e) => handleKeyDown(e, handleAdd)}
            placeholder="输入子任务..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-200"
            autoFocus
          />
          <Button size="sm" onClick={handleAdd} disabled={!newText.trim()}>
            添加
          </Button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-3 text-sm text-gray-400 hover:text-emerald-500 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          添加子任务
        </button>
      )}

      {/* 审批弹窗 */}
      <ApprovalModal
        isOpen={!!approvalModalSubTask}
        onClose={() => {
          setApprovalModalSubTask(null);
          setIsReapproving(false);
        }}
        currentStatus={approvalModalSubTask?.approvalStatus || 'pending'}
        onApprove={() => {
          if (approvalModalSubTask && onApprove) {
            onApprove(approvalModalSubTask.id, 'approved');
          }
          setApprovalModalSubTask(null);
          setIsReapproving(false);
        }}
        onReject={() => {
          if (approvalModalSubTask && onApprove) {
            onApprove(approvalModalSubTask.id, 'rejected');
          }
          setApprovalModalSubTask(null);
          setIsReapproving(false);
        }}
      />
    </div>
  );
}
