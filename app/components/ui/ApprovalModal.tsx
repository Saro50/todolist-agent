"use client";

import { ApprovalStatus } from "@/app/types";
import { Button } from "./Button";
import { cn } from "@/lib/utils";
import { Modal } from "./Modal";

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
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="审批任务"
      size="sm"
      showCloseButton={true}
    >
      <div className="p-6">
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
    </Modal>
  );
}
