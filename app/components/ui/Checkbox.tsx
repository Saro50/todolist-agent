"use client";

import { cn } from "@/lib/utils";

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  className?: string;
}

/**
 * 圆形复选框组件
 * 用于标记任务完成状态
 */
export function Checkbox({ checked, onChange, className }: CheckboxProps) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "flex-shrink-0 w-6 h-6 rounded-full border-2",
        "flex items-center justify-center",
        "transition-all duration-300",
        checked
          ? "bg-emerald-400 border-emerald-400"
          : "border-gray-300 hover:border-emerald-400",
        className
      )}
      aria-checked={checked}
      role="checkbox"
    >
      {checked && (
        <svg
          className="w-4 h-4 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </svg>
      )}
    </button>
  );
}
