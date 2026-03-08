"use client";

import React, { useState, useCallback } from "react";
import { X, Plus, Edit2, Trash2, Folder, Check } from "lucide-react";
import { Workspace } from "@/app/types";

interface WorkspaceManagerProps {
  /** 是否显示 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 所有工作区 */
  workspaces: Workspace[];
  /** 当前工作区 ID */
  currentWorkspaceId: string;
  /** 切换到工作区 */
  onSwitch: (workspace: Workspace) => void;
  /** 创建工作区 */
  onCreate: (data: { name: string; color?: string }) => Promise<void>;
  /** 更新工作区 */
  onUpdate: (id: string, data: Partial<Workspace>) => Promise<void>;
  /** 删除工作区 */
  onDelete: (id: string) => Promise<void>;
  /** 是否正在加载 */
  isLoading?: boolean;
}

const WORKSPACE_COLORS = [
  { key: "blue", bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
  { key: "emerald", bg: "bg-emerald-100", text: "text-emerald-600", border: "border-emerald-200" },
  { key: "violet", bg: "bg-violet-100", text: "text-violet-600", border: "border-violet-200" },
  { key: "rose", bg: "bg-rose-100", text: "text-rose-600", border: "border-rose-200" },
  { key: "amber", bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200" },
  { key: "cyan", bg: "bg-cyan-100", text: "text-cyan-600", border: "border-cyan-200" },
  { key: "slate", bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
];

/**
 * 工作区管理器弹窗
 * 
 * 管理工作区的增删改查
 */
export function WorkspaceManager({
  isOpen,
  onClose,
  workspaces,
  currentWorkspaceId,
  onSwitch,
  onCreate,
  onUpdate,
  onDelete,
  isLoading = false,
}: WorkspaceManagerProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleStartCreate = useCallback(() => {
    setIsCreating(true);
    setNewName("");
    setNewColor("blue");
    setError(null);
  }, []);

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
    setNewName("");
    setError(null);
  }, []);

  const handleConfirmCreate = useCallback(async () => {
    if (!newName.trim()) return;
    try {
      setError(null);
      await onCreate({ name: newName.trim(), color: newColor });
      setIsCreating(false);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建工作区失败");
    }
  }, [newName, newColor, onCreate]);

  const handleStartEdit = useCallback((workspace: Workspace) => {
    setEditingId(workspace.id);
    setEditName(workspace.name);
    setEditColor(workspace.color || "blue");
    setError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditName("");
    setError(null);
  }, []);

  const handleConfirmEdit = useCallback(async () => {
    if (!editingId || !editName.trim()) return;
    try {
      setError(null);
      await onUpdate(editingId, { name: editName.trim(), color: editColor });
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "更新工作区失败");
    }
  }, [editingId, editName, editColor, onUpdate]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("确定要删除这个工作区吗？工作区中的任务将移至根目录。")) return;
    try {
      setError(null);
      await onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除工作区失败");
    }
  }, [onDelete]);

  const getColorStyle = (colorKey?: string) => {
    return WORKSPACE_COLORS.find(c => c.key === colorKey) || WORKSPACE_COLORS[6];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[100px]">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">管理工作区</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mx-4 mt-3 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-md">
            {error}
          </div>
        )}

        {/* 工作区列表 */}
        <div className="max-h-80 overflow-y-auto p-4 space-y-2">
          {workspaces.map((workspace) => {
            const colorStyle = getColorStyle(workspace.color);
            const isCurrent = workspace.id === currentWorkspaceId;
            const isEditing = editingId === workspace.id;

            return (
              <div
                key={workspace.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  isCurrent
                    ? `${colorStyle.bg} ${colorStyle.border} border-2`
                    : "bg-slate-50 border-transparent hover:bg-slate-100"
                }`}
              >
                {isEditing ? (
                  // 编辑模式
                  <>
                    <div className={`w-8 h-8 rounded-lg ${colorStyle.bg} flex items-center justify-center flex-shrink-0`}>
                      <Folder className={`w-4 h-4 ${colorStyle.text}`} />
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        {WORKSPACE_COLORS.map((c) => (
                          <button
                            key={c.key}
                            onClick={() => setEditColor(c.key)}
                            className={`w-5 h-5 rounded-full ${c.bg} ${
                              editColor === c.key ? "ring-2 ring-offset-1 ring-slate-400" : ""
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={handleConfirmEdit}
                        disabled={!editName.trim() || isLoading}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  // 查看模式
                  <>
                    <div className={`w-8 h-8 rounded-lg ${colorStyle.bg} flex items-center justify-center flex-shrink-0`}>
                      <Folder className={`w-4 h-4 ${colorStyle.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800 truncate">{workspace.name}</div>
                      <div className="text-xs text-slate-400">{workspace.path}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isCurrent && (
                        <span className="text-xs text-slate-500 px-2 py-0.5 bg-white/50 rounded">
                          当前
                        </span>
                      )}
                      {!isCurrent && (
                        <button
                          onClick={() => onSwitch(workspace)}
                          className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          切换
                        </button>
                      )}
                      {workspace.id !== "root" && (
                        <>
                          <button
                            onClick={() => handleStartEdit(workspace)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(workspace.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* 创建新工作区 */}
        {isCreating ? (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="工作区名称"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex gap-2">
              <span className="text-sm text-slate-500 py-1">颜色:</span>
              {WORKSPACE_COLORS.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setNewColor(c.key)}
                  className={`w-6 h-6 rounded-full ${c.bg} ${
                    newColor === c.key ? "ring-2 ring-offset-2 ring-slate-400" : ""
                  }`}
                />
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelCreate}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmCreate}
                disabled={!newName.trim() || isLoading}
                className="px-3 py-1.5 text-sm text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50"
              >
                创建
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100">
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建工作区
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkspaceManager;
