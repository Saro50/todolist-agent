"use client";

import { useState } from "react";
import { Tag, TagColor, TAG_COLORS } from "@/app/types";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface InlineTagEditorProps {
  availableTags: Tag[];
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  onCreateTag?: (name: string, color: TagColor) => void;
  onClose: () => void;
}

/**
 * 内联标签编辑器
 * 用于在任务卡片上直接编辑标签
 */
export function InlineTagEditor({
  availableTags,
  selectedTagIds,
  onChange,
  onCreateTag,
  onClose,
}: InlineTagEditorProps) {
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
    <div className="p-3 bg-gray-50 rounded-xl animate-in fade-in zoom-in-95">
      {/* 已选标签 */}
      {selectedTagIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selectedTagIds.map((tagId) => {
            const tag = availableTags.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <span
                key={tagId}
                className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  getColorStyle(tag.color).bg,
                  getColorStyle(tag.color).text
                )}
              >
                {tag.name}
                <button
                  onClick={() => toggleTag(tagId)}
                  className="hover:bg-black/10 rounded-full p-0.5 transition-colors"
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

      {/* 可选标签 */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {availableTags
          .filter((tag) => !selectedTagIds.includes(tag.id))
          .map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-medium border transition-all",
                "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-100"
              )}
            >
              + {tag.name}
            </button>
          ))}
      </div>

      {/* 创建新标签 */}
      {isCreating ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="标签名称"
            className="flex-1 px-2 py-1 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateTag();
              if (e.key === "Escape") setIsCreating(false);
            }}
          />
          <div className="flex gap-1">
            {TAG_COLORS.map(({ key }) => (
              <button
                key={key}
                onClick={() => setNewTagColor(key)}
                className={cn(
                  "w-5 h-5 rounded-full transition-all",
                  getColorStyle(key).bg,
                  newTagColor === key && "ring-2 ring-offset-1 ring-gray-400"
                )}
              />
            ))}
          </div>
          <Button size="sm" onClick={handleCreateTag} disabled={!newTagName.trim()}>
            创建
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          {onCreateTag && (
            <button
              onClick={() => setIsCreating(true)}
              className="text-xs text-gray-400 hover:text-emerald-500 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              新建标签
            </button>
          )}
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-600 ml-auto"
          >
            完成
          </button>
        </div>
      )}
    </div>
  );
}

function getColorStyle(color: TagColor) {
  return TAG_COLORS.find((c) => c.key === color) || TAG_COLORS[0];
}
