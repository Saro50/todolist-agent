"use client";

import { memo, useState } from "react";
import { Todo, Tag, SubTask } from "@/app/types";
import { Card } from "@/app/components/ui/Card";
import { Checkbox } from "@/app/components/ui/Checkbox";
import { Button } from "@/app/components/ui/Button";
import { Tag as TagComponent } from "@/app/components/ui/Tag";
import { InlineTagEditor } from "@/app/components/ui/InlineTagEditor";
import { SubTaskList } from "@/app/components/ui/SubTaskList";
import { ArtifactCard } from "@/app/components/ui/ArtifactCard";
import { cn } from "@/lib/utils";

interface TodoItemProps {
  todo: Todo;
  tags: Tag[];  // 所有可用标签
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateTags: (id: string, tagIds: string[]) => void;  // 更新任务标签
  onCreateTag?: (name: string, color: Tag["color"]) => void;  // 创建新标签
  onTagClick?: (tagId: string) => void;  // 点击标签筛选
  
  // 子任务相关
  subTasks?: SubTask[];
  onAddSubTask: (todoId: string, text: string) => Promise<void>;
  onToggleSubTask: (subTaskId: string, completed: boolean) => Promise<void>;
  onDeleteSubTask: (subTaskId: string) => Promise<void>;
  onUpdateSubTask: (subTaskId: string, text: string) => Promise<void>;
  onUpdateSubTaskArtifact: (subTaskId: string, artifact: string) => Promise<void>;
  
  // 产物相关
  onUpdateArtifact: (todoId: string, artifact: string) => Promise<void>;
  
  // 任务分析
  onAnalyze?: (todo: Todo) => void;
}

/**
 * 单个任务项组件
 * 支持显示和编辑标签、子任务、产物
 */
export const TodoItem = memo(function TodoItem({
  todo,
  tags,
  onToggle,
  onDelete,
  onUpdateTags,
  onCreateTag,
  onTagClick,
  subTasks = [],
  onAddSubTask,
  onToggleSubTask,
  onDeleteSubTask,
  onUpdateSubTask,
  onUpdateSubTaskArtifact,
  onUpdateArtifact,
  onAnalyze,
}: TodoItemProps) {
  const [isEditingTags, setIsEditingTags] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showArtifact, setShowArtifact] = useState(false);
  
  // 获取任务关联的标签对象
  const todoTags = tags.filter((tag) => todo.tagIds.includes(tag.id));
  const hasSubTasks = subTasks.length > 0;
  const completedSubTasks = subTasks.filter((st) => st.completed).length;
  const hasArtifact = !!todo.artifact?.trim();

  return (
    <Card
      className={cn(
        "group flex flex-col gap-3 p-4",
        "hover:shadow-md transition-all duration-300",
        todo.completed && "opacity-60"
      )}
    >
      <div className="flex items-center gap-3">
        <Checkbox
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
        />

        <span
          className={cn(
            "flex-1 text-gray-700 transition-all duration-300",
            todo.completed && "line-through text-gray-400"
          )}
        >
          {todo.text}
        </span>

        {/* 产物徽章 */}
        {hasArtifact && (
          <button
            onClick={() => setShowArtifact(!showArtifact)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
              "transition-colors",
              showArtifact
                ? "bg-violet-100 text-violet-600"
                : "bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-500"
            )}
            title="点击查看产物"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            产物
          </button>
        )}

        {/* 子任务计数徽章 */}
        {hasSubTasks && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs",
              "transition-colors",
              isExpanded
                ? "bg-emerald-100 text-emerald-600"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            )}
            title="点击查看子任务"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            {completedSubTasks}/{subTasks.length}
          </button>
        )}

        <div className="flex items-center gap-1">
          {/* 分析按钮 */}
          {onAnalyze && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onAnalyze(todo)}
              className="opacity-0 group-hover:opacity-100 text-purple-400 hover:text-purple-600 hover:bg-purple-50"
              aria-label="AI分析任务"
              title="AI分析任务"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </Button>
          )}

          {/* 产物按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowArtifact(!showArtifact)}
            className={cn(
              "opacity-0 group-hover:opacity-100",
              showArtifact && "opacity-100 text-violet-500 bg-violet-50",
              hasArtifact && !showArtifact && "text-violet-400"
            )}
            aria-label="产物"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </Button>

          {/* 标签编辑按钮 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsEditingTags(!isEditingTags)}
            className={cn(
              "opacity-0 group-hover:opacity-100",
              isEditingTags && "opacity-100 text-emerald-500 bg-emerald-50"
            )}
            aria-label="编辑标签"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          </Button>

          {/* 展开/收起子任务按钮 */}
          {!hasSubTasks && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsExpanded(!isExpanded)}
              className={cn(
                "opacity-0 group-hover:opacity-100",
                isExpanded && "opacity-100 text-blue-500 bg-blue-50"
              )}
              aria-label="添加子任务"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </Button>
          )}

          <Button
            variant="danger"
            size="icon"
            onClick={() => onDelete(todo.id)}
            className="opacity-0 group-hover:opacity-100"
            aria-label="删除任务"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </Button>
        </div>
      </div>

      {/* 标签显示或编辑 */}
      {isEditingTags ? (
        <div className="pl-9">
          <InlineTagEditor
            availableTags={tags}
            selectedTagIds={todo.tagIds}
            onChange={(newTagIds) => onUpdateTags(todo.id, newTagIds)}
            onCreateTag={onCreateTag}
            onClose={() => setIsEditingTags(false)}
          />
        </div>
      ) : todoTags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pl-9">
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
        <div className="pl-9">
          <ArtifactCard
            title="任务产物"
            content={todo.artifact}
            onSave={(artifact) => onUpdateArtifact(todo.id, artifact)}
          />
        </div>
      )}

      {/* 子任务列表 */}
      {(isExpanded || hasSubTasks) && (
        <div className="mt-2 pt-3 border-t border-gray-100">
          <SubTaskList
            todoId={todo.id}
            subTasks={subTasks}
            onAdd={onAddSubTask}
            onToggle={onToggleSubTask}
            onDelete={onDeleteSubTask}
            onUpdateText={onUpdateSubTask}
            onUpdateArtifact={onUpdateSubTaskArtifact}
          />
        </div>
      )}
    </Card>
  );
});
