"use client";

import { memo, useState, useCallback } from "react";
import { Todo, Tag, SubTask, ProcessingStatus } from "@/app/types";
import { Card } from "@/app/components/ui/Card";
import { Checkbox } from "@/app/components/ui/Checkbox";
import { Tag as TagComponent } from "@/app/components/ui/Tag";
import { InlineTagEditor } from "@/app/components/ui/InlineTagEditor";
import { SubTaskList } from "@/app/components/ui/SubTaskList";
import { ArtifactCard } from "@/app/components/ui/ArtifactCard";
import { ApprovalBadge } from "@/app/components/ui/ApprovalBadge";
import { ApprovalModal } from "@/app/components/ui/ApprovalModal";
import { MoreActions } from "@/app/components/ui/MoreActions";
import { cn } from "@/lib/utils";

interface TodoItemProps {
  todo: Todo;
  tags: Tag[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTags: (id: string, tagIds: string[]) => void;
  onCreateTag?: (name: string, color: Tag["color"]) => void;
  onTagClick?: (tagId: string) => void;
  onUpdateStatus: (id: string, status: ProcessingStatus) => Promise<void>;
  subTasks?: SubTask[];
  isSubTasksLoaded?: boolean;
  onLoadSubTasks?: (todoId: string) => Promise<void>;
  onAddSubTask: (todoId: string, text: string) => Promise<void>;
  onToggleSubTask: (subTaskId: string, completed: boolean) => Promise<void>;
  onDeleteSubTask: (subTaskId: string) => Promise<void>;
  onUpdateSubTask: (subTaskId: string, text: string) => Promise<void>;
  onUpdateSubTaskArtifact: (subTaskId: string, artifact: string) => Promise<void>;
  onUpdateArtifact: (todoId: string, artifact: string) => Promise<void>;
  onAnalyze?: (todo: Todo) => void;
  onApprove?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
  isSelectable?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
  /** 控制是否自动进入添加子任务模式 */
  autoAddSubTask?: boolean;
}

export const TodoItem = memo(function TodoItem({
  todo,
  tags,
  onToggle,
  onDelete,
  onUpdateTags,
  onCreateTag,
  onTagClick,
  onUpdateStatus,
  subTasks = [],
  isSubTasksLoaded = false,
  onLoadSubTasks,
  onAddSubTask,
  onToggleSubTask,
  onDeleteSubTask,
  onUpdateSubTask,
  onUpdateSubTaskArtifact,
  onUpdateArtifact,
  onAnalyze,
  onApprove,
  onReject,
  isSelectable = false,
  isSelected = false,
  onSelect,
}: TodoItemProps) {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showArtifact, setShowArtifact] = useState(false);
  const [isLoadingSubTasks, setIsLoadingSubTasks] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [isReapproving, setIsReapproving] = useState(false);
  const [isAddingSubTask, setIsAddingSubTask] = useState(false);

  const todoTags = tags.filter((tag) => todo.tagIds.includes(tag.id));
  const hasSubTasks = subTasks.length > 0;
  const hasArtifact = !!todo.artifact?.trim();

  // 查看子任务（需要加载）
  const handleViewSubtasks = useCallback(async () => {
    if (!isExpanded && !isSubTasksLoaded && onLoadSubTasks) {
      setIsLoadingSubTasks(true);
      try {
        await onLoadSubTasks(todo.id);
      } catch (err) {
        console.error("Failed to load subtasks:", err);
      } finally {
        setIsLoadingSubTasks(false);
      }
    }
    setIsExpanded(!isExpanded);
    setIsAddingSubTask(false);  // 关闭添加模式
  }, [isExpanded, isSubTasksLoaded, onLoadSubTasks, todo.id]);

  // 添加子任务（展开并进入添加模式）
  const handleAddSubtask = useCallback(async () => {
    if (!isSubTasksLoaded && onLoadSubTasks) {
      setIsLoadingSubTasks(true);
      try {
        await onLoadSubTasks(todo.id);
      } catch (err) {
        console.error("Failed to load subtasks:", err);
      } finally {
        setIsLoadingSubTasks(false);
      }
    }
    setIsExpanded(true);
    setIsAddingSubTask(true);  // 进入添加模式
  }, [isSubTasksLoaded, onLoadSubTasks, todo.id]);

  const statusConfig = {
    pending: { label: "待处理", color: "text-amber-600", bgColor: "bg-amber-50" },
    in_progress: { label: "处理中", color: "text-blue-600", bgColor: "bg-blue-50" },
    completed: { label: "已完成", color: "text-green-600", bgColor: "bg-green-50" },
  };

  const formatCreatedAt = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  };

  // 处理审批徽章点击
  const handleApprovalClick = () => {
    if (todo.approvalStatus === "pending") {
      setIsApprovalModalOpen(true);
    }
  };

  // 处理重新审批
  const handleReapprove = () => {
    setIsReapproving(true);
    setIsApprovalModalOpen(true);
  };

  return (
    <>
      <Card
        className={cn(
          "group flex flex-col gap-2 p-3",
          "hover:shadow-md transition-all duration-300",
          todo.completed && "opacity-60"
        )}
      >
        {/* 主行 */}
        <div className={cn("flex items-start gap-2", isSelected && "bg-blue-50/50 -mx-3 px-3 py-2 rounded-lg")}>
          {isSelectable ? (
            <Checkbox checked={isSelected} onChange={() => onSelect?.()} />
          ) : (
            <Checkbox checked={todo.completed} onChange={() => onToggle(todo.id)} />
          )}

          {/* 任务内容区域 */}
          <div className="flex-1 min-w-0">
            <span
              className={cn(
                "block text-gray-700 transition-all duration-300",
                todo.completed && "text-gray-400"
              )}
            >
              {todo.text}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400 font-mono">ID: {todo.id}</span>
              <span className="text-xs text-gray-400">·</span>
              <span className="text-xs text-gray-400">{formatCreatedAt(todo.createdAt)}</span>
              
              {/* 子任务展开按钮 */}
              {subTasks.length > 0 ? (
                <>
                  <span className="text-xs text-gray-400">·</span>
                  <button
                    onClick={handleViewSubtasks}
                    className={cn(
                      "text-xs flex items-center gap-1 transition-colors",
                      isExpanded 
                        ? "text-emerald-600" 
                        : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <span>子任务 {subTasks.filter(st => st.completed).length}/{subTasks.length}</span>
                    <svg 
                      className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </>
              ) : (
                /* 没有子任务时显示展开子任务按钮 */
                <>
                  <span className="text-xs text-gray-400">·</span>
                  <button
                    onClick={handleViewSubtasks}
                    className={cn(
                      "text-xs flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors",
                      isExpanded && "text-emerald-600"
                    )}
                  >
                    <span>展开子任务</span>
                    <svg 
                      className={cn(
                        "w-3.5 h-3.5 transition-transform duration-200",
                        isExpanded && "rotate-180"
                      )} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 右侧操作区域 */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* 状态选择器 */}
            <select
              value={todo.status}
              onChange={(e) => onUpdateStatus(todo.id, e.target.value as ProcessingStatus)}
              className={cn(
                "text-xs px-2 py-1 rounded-full border-0 cursor-pointer",
                "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-300",
                "transition-colors duration-200",
                statusConfig[todo.status].bgColor,
                statusConfig[todo.status].color
              )}
            >
              <option value="pending">待处理</option>
              <option value="in_progress">处理中</option>
              <option value="completed">已完成</option>
            </select>

            {/* 审批状态徽章 */}
            <ApprovalBadge
              status={todo.approvalStatus}
              size="sm"
              onClick={handleApprovalClick}
              onReset={isReapproving ? undefined : handleReapprove}
            />

            {/* 更多操作 */}
            <MoreActions
              onEditArtifact={() => setShowArtifact(!showArtifact)}
              onEditTags={() => setIsEditingTags(!isEditingTags)}
              onViewSubtasks={hasSubTasks ? handleViewSubtasks : undefined}
              onAddSubtask={!hasSubTasks ? handleAddSubtask : undefined}
              onDelete={() => onDelete(todo.id)}
              hasArtifact={hasArtifact}
            />
          </div>
        </div>

        {/* 标签显示或编辑 */}
        {isEditingTags ? (
          <div className="pl-7">
            <InlineTagEditor
              availableTags={tags}
              selectedTagIds={todo.tagIds}
              onChange={(newTagIds) => onUpdateTags(todo.id, newTagIds)}
              onCreateTag={onCreateTag}
              onClose={() => setIsEditingTags(false)}
            />
          </div>
        ) : todoTags.length > 0 ? (
          <div className="flex flex-wrap gap-1 pl-7">
            {todoTags.map((tag) => (
              <TagComponent
                key={tag.id}
                name={tag.name}
                color={tag.color}
                clickable={!!onTagClick}
                onClick={() => onTagClick?.(tag.id)}
              />
            ))}
          </div>
        ) : null}

        {/* 产物区域 */}
        {showArtifact && (
          <div className="pl-7">
            <ArtifactCard
              title="任务产物"
              content={todo.artifact}
              onSave={(artifact) => onUpdateArtifact(todo.id, artifact)}
            />
          </div>
        )}

        {/* 子任务列表 */}
        {isExpanded && (
          <div className="mt-2 pt-3 border-t border-gray-100 pl-7">
            <SubTaskList
              todoId={todo.id}
              subTasks={subTasks}
              onAdd={onAddSubTask}
              onToggle={onToggleSubTask}
              onDelete={onDeleteSubTask}
              onUpdateText={onUpdateSubTask}
              onUpdateArtifact={onUpdateSubTaskArtifact}
              autoFocusAdd={isAddingSubTask}
            />
          </div>
        )}
      </Card>

      {/* 审批弹窗 */}
      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => {
          setIsApprovalModalOpen(false);
          setIsReapproving(false);
        }}
        currentStatus={todo.approvalStatus}
        onApprove={() => {
          onApprove?.(todo.id);
          setIsReapproving(false);
        }}
        onReject={() => {
          onReject?.(todo.id);
          setIsReapproving(false);
        }}
      />
    </>
  );
});
