"use client";

import React, { useState, useCallback } from "react";
import { Folder, Plus, X } from "lucide-react";

interface WorkspaceSelectorProps {
  /** 当前选中的工作区 */
  currentWorkspace: string;
  /** 所有可用的工作区列表 */
  workspaces: string[];
  /** 切换工作区时的回调 */
  onSwitchWorkspace: (workspace: string) => void;
  /** 添加新工作区时的回调 */
  onAddWorkspace?: (workspace: string) => void;
  /** 是否正在加载 */
  isLoading?: boolean;
}

/**
 * 工作区选择器组件
 * 
 * 允许用户在不同的工作目录之间切换
 * 支持添加新的工作区
 */
export function WorkspaceSelector({
  currentWorkspace,
  workspaces,
  onSwitchWorkspace,
  onAddWorkspace,
  isLoading = false,
}: WorkspaceSelectorProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState("");

  const handleAdd = useCallback(() => {
    if (newWorkspace.trim() && onAddWorkspace) {
      // 规范化路径：移除末尾斜杠，确保以 / 开头
      let normalized = newWorkspace.trim();
      if (!normalized.startsWith("/")) {
        normalized = "/" + normalized;
      }
      normalized = normalized.replace(/\/$/, "") || "/";
      
      onAddWorkspace(normalized);
      setNewWorkspace("");
      setIsAdding(false);
    }
  }, [newWorkspace, onAddWorkspace]);

  const handleCancel = useCallback(() => {
    setIsAdding(false);
    setNewWorkspace("");
  }, []);

  // 获取工作区的显示名称
  const getDisplayName = (workspace: string) => {
    if (workspace === "/") return "根目录";
    // 显示最后一部分路径
    const parts = workspace.split("/").filter(Boolean);
    return parts[parts.length - 1] || workspace;
  };

  // 获取工作区的完整路径提示
  const getTooltip = (workspace: string) => {
    if (workspace === "/") return "根工作区 - 所有任务";
    return workspace;
  };

  return (
    <div className="flex items-center gap-2">
      {/* 工作区图标 */}
      <Folder className="w-4 h-4 text-slate-400" />
      
      {/* 工作区选择下拉框 */}
      <div className="relative">
        <select
          value={currentWorkspace}
          onChange={(e) => onSwitchWorkspace(e.target.value)}
          disabled={isLoading}
          className="appearance-none bg-white border border-slate-200 rounded-lg px-3 py-1.5 pr-8 text-sm text-slate-700 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:bg-slate-50 disabled:text-slate-400
                     cursor-pointer hover:border-slate-300 transition-colors"
          title={getTooltip(currentWorkspace)}
        >
          {workspaces.map((workspace) => (
            <option key={workspace} value={workspace}>
              {getDisplayName(workspace)}
            </option>
          ))}
        </select>
        
        {/* 下拉箭头 */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* 添加新工作区按钮 */}
      {onAddWorkspace && !isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          disabled={isLoading}
          className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-colors"
          title="添加工作区"
        >
          <Plus className="w-4 h-4" />
        </button>
      )}

      {/* 添加新工作区输入框 */}
      {isAdding && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={newWorkspace}
            onChange={(e) => setNewWorkspace(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
              if (e.key === "Escape") handleCancel();
            }}
            placeholder="工作区路径"
            autoFocus
            className="w-32 px-2 py-1 text-sm border border-slate-200 rounded-md 
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleAdd}
            disabled={!newWorkspace.trim()}
            className="p-1 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
            title="确认"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </button>
          <button
            onClick={handleCancel}
            className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors"
            title="取消"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default WorkspaceSelector;
