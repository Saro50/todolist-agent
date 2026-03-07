"use client";

import { useState } from "react";
import { Tag, TagColor, TAG_COLORS } from "@/app/types";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface TagSelectorProps {
  availableTags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  onCreateTag?: (name: string, color: TagColor) => void;
  className?: string;
}

/**
 * 标签选择器组件
 * 支持选择已有标签和创建新标签
 */
export function TagSelector({
  availableTags,
  selectedTagIds,
  onChange,
  onCreateTag,
  className,
}: TagSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState<TagColor>("emerald");

  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreateTag = () => {
    if (newTagName.trim() && onCreateTag) {
      onCreateTag(newTagName.trim(), newTagColor);
      setNewTagName("");
      setIsCreating(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      {/* 已选标签显示 */}
      {selectedTagIds.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTagIds.map((tagId) => {
            const tag = availableTags.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <span
                key={tagId}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                  getTagColorStyle(tag.color).bg,
                  getTagColorStyle(tag.color).text
                )}
              >
                {tag.name}
                <button
                  onClick={() => toggleTag(tagId)}
                  className="ml-0.5 hover:bg-black/10 rounded-full p-0.5 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* 可选标签列表 */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableTags
            .filter((tag) => !selectedTagIds.includes(tag.id))
            .map((tag) => {
              const colorStyle = getTagColorStyle(tag.color);
              return (
                <button
                  key={tag.id}
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-200",
                    "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  + {tag.name}
                </button>
              );
            })}
        </div>
      )}

      {/* 创建新标签 */}
      {onCreateTag && (
        <div>
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="text-sm text-gray-400 hover:text-emerald-500 transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建标签
            </button>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="标签名称"
                className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                autoFocus
              />
              <div className="flex gap-1">
                {TAG_COLORS.map(({ key }) => (
                  <button
                    key={key}
                    onClick={() => setNewTagColor(key)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all",
                      getTagColorStyle(key).bg,
                      newTagColor === key && "ring-2 ring-offset-1 ring-gray-400"
                    )}
                    title={key}
                  />
                ))}
              </div>
              <Button size="sm" onClick={handleCreateTag} disabled={!newTagName.trim()}>
                创建
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
                取消
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 辅助函数
function getTagColorStyle(color: TagColor) {
  return TAG_COLORS.find((c) => c.key === color) || TAG_COLORS[0];
}
