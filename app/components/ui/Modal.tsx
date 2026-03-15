"use client";

import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface ModalProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 弹窗标题 */
  title?: React.ReactNode;
  /** 弹窗内容 */
  children: React.ReactNode;
  /** 底部操作区 */
  footer?: React.ReactNode;
  /** 弹窗大小 */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /** 是否点击遮罩关闭 */
  maskClosable?: boolean;
  /** 是否显示关闭按钮 */
  showCloseButton?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 内容区自定义类名 */
  contentClassName?: string;
  /** 弹窗位置 */
  position?: "center" | "top";
  /** 遮罩样式 */
  maskClassName?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-4xl",
  full: "max-w-6xl h-[90vh] flex flex-col",
};

/**
 * 通用弹窗组件
 * 
 * 提供统一的弹窗容器、遮罩层、标题栏和底部操作区
 * 使用 Portal 渲染到 body，避免父元素样式影响
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = "md",
  maskClosable = true,
  showCloseButton = true,
  className,
  contentClassName,
  position = "center",
  maskClassName,
}: ModalProps) {
  if (!isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-[10000]">
      {/* 遮罩层 */}
      <div
        className={cn(
          "absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity",
          maskClassName
        )}
        onClick={maskClosable ? onClose : undefined}
      />
      
      {/* 内容层 */}
      <div
        className={cn(
          "relative z-10 flex h-full overflow-auto",
          position === "center" && "items-center justify-center",
          position === "top" && "items-start justify-center pt-[100px]"
        )}
      >
        <div
          className={cn(
            "bg-white rounded-xl shadow-xl w-full mx-4 overflow-hidden",
            sizeClasses[size],
            className
          )}
        >
          {/* 头部 */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              {title ? (
                <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
              ) : (
                <div />
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          )}

          {/* 内容区 */}
          <div className={cn("overflow-y-auto flex-1 min-h-0", contentClassName)}>
            {children}
          </div>

          {/* 底部 */}
          {footer && (
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // 使用 Portal 渲染到 body
  return createPortal(content, document.body);
}

export default Modal;
