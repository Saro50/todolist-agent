"use client";

import { ApprovalStatus, getApprovalStatusConfig } from "@/app/types";
import { cn } from "@/lib/utils";
import { RotateCcw } from "lucide-react";

interface ApprovalBadgeProps {
  status: ApprovalStatus;
  size?: "sm" | "md";
  className?: string;
  onClick?: () => void;
  onReset?: () => void;
}

export function ApprovalBadge({ status, size = "md", className, onClick, onReset }: ApprovalBadgeProps) {
  const config = getApprovalStatusConfig(status);
  
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-0.5",
  };

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={onClick}
        className={cn(
          "inline-flex items-center gap-1 rounded-full font-medium transition-all",
          status === "pending" && "hover:ring-2 hover:ring-offset-1 hover:ring-amber-300",
          config.bg,
          config.color,
          sizeClasses[size],
          className
        )}
      >
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </button>
      {/* 已审批状态下显示重新审批图标 */}
      {status !== "pending" && onReset && (
        <button
          onClick={onReset}
          className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          title="重新审批"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
