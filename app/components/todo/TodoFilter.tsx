"use client";

import { TodoFilterStatus, Tag } from "@/app/types";
import { FilterTabs } from "@/app/components/ui/FilterTabs";
import { Tag as TagComponent } from "@/app/components/ui/Tag";
import { cn } from "@/lib/utils";

interface TodoFilterProps {
  // 状态筛选
  currentStatus: TodoFilterStatus;
  onStatusChange: (status: TodoFilterStatus) => void;
  statusCounts: {
    all: number;
    pending: number;
    in_progress: number;
    completed: number;
  };
  // 标签筛选
  selectedTagIds: string[];
  onTagFilterChange: (tagIds: string[]) => void;
  availableTags: Tag[];
}

const STATUS_OPTIONS: { key: TodoFilterStatus; label: string }[] = [
  { key: "all", label: "全部" },
  { key: "pending", label: "待处理" },
  { key: "in_progress", label: "处理中" },
  { key: "completed", label: "已完成" },
];

/**
 * 任务筛选组件
 * 支持状态筛选和标签筛选
 */
export function TodoFilter({
  currentStatus,
  onStatusChange,
  statusCounts,
  selectedTagIds,
  onTagFilterChange,
  availableTags,
}: TodoFilterProps) {
  // 点击标签切换筛选（单选模式：点击已选中标签取消筛选，点击未选中标签切换为该标签）
  const toggleTagFilter = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      // 已选中，取消筛选
      onTagFilterChange([]);
    } else {
      // 未选中，设置为该标签（单选）
      onTagFilterChange([tagId]);
    }
  };

  const clearTagFilters = () => {
    onTagFilterChange([]);
  };

  return (
    <div className="space-y-3">
      {/* 状态筛选 */}
      <FilterTabs
        options={STATUS_OPTIONS.map(({ key, label }) => ({
          key,
          label,
          count: statusCounts[key],
        }))}
        activeKey={currentStatus}
        onChange={onStatusChange}
      />

      {/* 标签筛选 */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400">标签:</span>
          {availableTags.map((tag) => {
            const isSelected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                onClick={() => toggleTagFilter(tag.id)}
                className={cn(
                  "transition-all duration-200",
                  !isSelected && "opacity-50 hover:opacity-80"
                )}
              >
                <TagComponent name={tag.name} color={tag.color} />
              </button>
            );
          })}
          {selectedTagIds.length > 0 && (
            <button
              onClick={clearTagFilters}
              className="text-xs text-gray-400 hover:text-gray-600 ml-2"
            >
              清除筛选
            </button>
          )}
        </div>
      )}
    </div>
  );
}
