"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MoreVertical, FileText, Tag, Trash2, CheckSquare, ListTodo } from "lucide-react";

interface MoreActionsProps {
  onEditArtifact?: () => void;
  onEditTags?: () => void;
  onViewSubtasks?: () => void;
  onAddSubtask?: () => void;
  onDelete?: () => void;
  hasArtifact?: boolean;
  className?: string;
}

export function MoreActions({
  onEditArtifact,
  onEditTags,
  onViewSubtasks,
  onAddSubtask,
  onDelete,
  hasArtifact = false,
  className,
}: MoreActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} className={cn("relative", className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "p-1.5 rounded-lg transition-all",
          isOpen ? "bg-gray-100 text-gray-700" : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
        )}
        title="更多操作"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-20">
          {onEditArtifact && (
            <button
              onClick={() => {
                onEditArtifact();
                setIsOpen(false);
              }}
              className={cn(
                "w-full px-3 py-2 text-left text-sm flex items-center gap-2 transition-colors",
                hasArtifact ? "text-violet-600" : "text-gray-600",
                "hover:bg-gray-50"
              )}
            >
              <FileText className="w-4 h-4" />
              {hasArtifact ? "编辑产物" : "添加产物"}
            </button>
          )}
          
          {onEditTags && (
            <button
              onClick={() => {
                onEditTags();
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-600 flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <Tag className="w-4 h-4" />
              编辑标签
            </button>
          )}
          
          {/* 查看子任务 - 有子任务时显示 */}
          {onViewSubtasks && (
            <button
              onClick={() => {
                onViewSubtasks();
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-emerald-600 flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <ListTodo className="w-4 h-4" />
              查看子任务
            </button>
          )}
          
          {/* 添加子任务 - 没有子任务时显示 */}
          {onAddSubtask && (
            <button
              onClick={() => {
                onAddSubtask();
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-gray-600 flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <ListTodo className="w-4 h-4" />
              添加子任务
            </button>
          )}
          
          {onDelete && (
            <>
              <div className="h-px bg-gray-100 my-1" />
              <button
                onClick={() => {
                  onDelete();
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-rose-500 flex items-center gap-2 hover:bg-rose-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                删除任务
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
