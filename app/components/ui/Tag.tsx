"use client";

import { TagColor, getTagColorStyle } from "@/app/types";
import { cn } from "@/lib/utils";

interface TagProps {
  name: string;
  color: TagColor;
  onClick?: () => void;
  onRemove?: () => void;
  removable?: boolean;
  clickable?: boolean;
  className?: string;
}

/**
 * 独立可复用的标签组件
 * @param name - 标签名称
 * @param color - 标签颜色
 * @param onClick - 点击回调（clickable=true 时生效）
 * @param onRemove - 删除回调（removable=true 时显示删除按钮）
 * @param removable - 是否可删除
 * @param clickable - 是否可点击
 */
export function Tag({
  name,
  color,
  onClick,
  onRemove,
  removable = false,
  clickable = false,
  className,
}: TagProps) {
  const colorStyle = getTagColorStyle(color);

  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
        "transition-all duration-200",
        colorStyle.bg,
        colorStyle.text,
        clickable && "cursor-pointer hover:opacity-80",
        className
      )}
    >
      {name}
      {removable && onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:bg-black/10 rounded-full p-0.5 transition-colors"
          aria-label={`移除标签 ${name}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  );
}
