"use client";

import { ApprovalStatus } from "@/app/types";
import { Button } from "./Button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: ApprovalStatus;
  onApprove: () => void;
  onReject: () => void;
}

export function ApprovalModal({
  isOpen,
  onClose,
  currentStatus,
  onApprove,
  onReject,
}: ApprovalModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      
      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-xl shadow-lg p-6 w-full max-w-sm mx-4">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-lg font-semibold text-gray-800 mb-2">审批任务</h3>
        <p className="text-sm text-gray-500 mb-6">
          当前状态: <span className={cn(
            "font-medium",
            currentStatus === "approved" && "text-emerald-600",
            currentStatus === "rejected" && "text-rose-600",
            currentStatus === "pending" && "text-amber-600",
          )}>
            {currentStatus === "approved" && "已通过"}
            {currentStatus === "rejected" && "已拒绝"}
            {currentStatus === "pending" && "待审批"}
          </span>
        </p>

        <div className="flex gap-3">
          <Button
            variant="primary"
            className="flex-1 bg-emerald-500 hover:bg-emerald-600"
            onClick={() => {
              onApprove();
              onClose();
            }}
          >
            ✅ 通过
          </Button>
          <Button
            variant="secondary"
            className="flex-1 bg-rose-100 text-rose-600 hover:bg-rose-200"
            onClick={() => {
              onReject();
              onClose();
            }}
          >
            ❌ 拒绝
          </Button>
        </div>
      </div>
    </div>
  );
}
