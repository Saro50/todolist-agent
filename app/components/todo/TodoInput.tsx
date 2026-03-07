"use client";

import { useState, FormEvent } from "react";
import { Tag } from "@/app/types";
import { Input } from "@/app/components/ui/Input";
import { Button } from "@/app/components/ui/Button";
import { TagSelector } from "@/app/components/ui/TagSelector";

interface TodoInputProps {
  availableTags: Tag[];
  onAdd: (text: string, tagIds: string[]) => void;
  onCreateTag: (name: string, color: Tag["color"]) => void;
}

/**
 * 任务输入组件
 * 支持添加任务和选择标签
 */
export function TodoInput({ availableTags, onAdd, onCreateTag }: TodoInputProps) {
  const [text, setText] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [showTagSelector, setShowTagSelector] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim(), selectedTagIds);
      setText("");
      setSelectedTagIds([]);
      setShowTagSelector(false);
    }
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit}>
        <Input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="添加新任务..."
          rightElement={
            <div className="flex items-center gap-1">
              {/* 标签选择按钮 */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowTagSelector(!showTagSelector)}
                className={selectedTagIds.length > 0 ? "text-emerald-500" : ""}
                aria-label="添加标签"
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
                {selectedTagIds.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                    {selectedTagIds.length}
                  </span>
                )}
              </Button>
              <Button
                type="submit"
                size="icon"
                disabled={!text.trim()}
                aria-label="添加任务"
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </Button>
            </div>
          }
        />
      </form>

      {/* 标签选择器 */}
      {showTagSelector && (
        <div className="p-4 bg-gray-50 rounded-xl animate-in fade-in slide-in-from-top-2">
          <p className="text-sm text-gray-500 mb-3">选择标签</p>
          <TagSelector
            availableTags={availableTags}
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
            onCreateTag={onCreateTag}
          />
        </div>
      )}
    </div>
  );
}
