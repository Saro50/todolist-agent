"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";
import { MarkdownEditor, MarkdownPreview } from "./MarkdownEditor";

interface ArtifactCardProps {
  title?: string;
  content?: string;
  onSave: (content: string) => Promise<void>;
  className?: string;
  compact?: boolean;  // 紧凑模式（用于子任务）
  fullHeight?: boolean;  // 全高模式（用于弹窗）
}

/**
 * 产物卡片组件
 * 支持显示和编辑 Markdown 产物报告
 */
export function ArtifactCard({
  title = "产物报告",
  content,
  onSave,
  className,
  compact = false,
  fullHeight = false,
}: ArtifactCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content || "");
  const [isSaving, setIsSaving] = useState(false);

  const hasContent = !!content?.trim();

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editContent);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(content || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>编辑{title}</span>
        </div>
        <MarkdownEditor
          value={editContent}
          onChange={setEditContent}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative border rounded-xl transition-all",
        hasContent
          ? "border-emerald-100 bg-emerald-50/30"
          : "border-dashed border-gray-200 bg-gray-50/50 hover:border-emerald-200 hover:bg-emerald-50/20",
        className
      )}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-inherit">
        <div className="flex items-center gap-2 text-sm">
          <svg
            className={cn(
              "w-4 h-4",
              hasContent ? "text-emerald-500" : "text-gray-400"
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <span
            className={cn(
              "font-medium",
              hasContent ? "text-emerald-700" : "text-gray-500"
            )}
          >
            {title}
          </span>
          {hasContent && (
            <span className="text-xs text-emerald-500 bg-emerald-100 px-2 py-0.5 rounded-full">
              已填写
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 w-7 h-7"
          aria-label={hasContent ? "编辑产物" : "添加产物"}
        >
          {hasContent ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          )}
        </Button>
      </div>

      {/* 内容区 */}
      <div className={cn("px-3", compact ? "py-2" : "py-3")}>
        {hasContent ? (
          <MarkdownPreview
            content={content}
            maxHeight={fullHeight ? "none" : compact ? "120px" : "200px"}
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="w-full py-4 text-center text-sm text-gray-400 hover:text-emerald-500 transition-colors flex flex-col items-center gap-1"
          >
            <svg className="w-8 h-8 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>点击添加{title}</span>
          </button>
        )}
      </div>
    </div>
  );
}
