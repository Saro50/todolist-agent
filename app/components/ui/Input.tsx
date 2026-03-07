import { cn } from "@/lib/utils";
import { InputHTMLAttributes, ReactNode } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode;
  rightElement?: ReactNode;
}

/**
 * 通用输入框组件
 * @param icon - 左侧图标
 * @param rightElement - 右侧自定义元素（如提交按钮）
 */
export function Input({
  icon,
  rightElement,
  className,
  ...rest
}: InputProps) {
  return (
    <div className="relative">
      {icon && (
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
          {icon}
        </div>
      )}
      <input
        className={cn(
          "w-full px-6 py-4 bg-white rounded-2xl",
          "shadow-sm border border-gray-100",
          "text-gray-700 placeholder-gray-400",
          "focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-transparent",
          "transition-all duration-300",
          icon && "pl-12",
          rightElement && "pr-14",
          className
        )}
        {...rest}
      />
      {rightElement && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          {rightElement}
        </div>
      )}
    </div>
  );
}
