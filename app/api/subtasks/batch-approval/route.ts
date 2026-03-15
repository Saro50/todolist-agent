import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "@/app/api/db";
import { logger, logApiRequest } from "@/lib/api/logger";

/**
 * POST /api/subtasks/batch-approval
 * 批量审批子任务
 *
 * Request body:
 * - ids: string[] - 子任务 ID 数组
 * - approvalStatus: 'approved' | 'rejected' | 'pending' - 审批状态
 */
export async function POST(request: NextRequest) {
  const start = Date.now();

  try {
    const db = await ensureConnected();
    const body = await request.json();
    const { ids, approvalStatus } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      logApiRequest(request, 400, start);
      return NextResponse.json(
        { error: "ids must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!["approved", "rejected", "pending"].includes(approvalStatus)) {
      logApiRequest(request, 400, start);
      return NextResponse.json(
        { error: "approvalStatus must be 'approved', 'rejected', or 'pending'" },
        { status: 400 }
      );
    }

    logger.debug("Batch approving subtasks", { count: ids.length, approvalStatus });

    const results = [];
    let updated = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const subTask = await db.subTasks.update(id, { approvalStatus });
        if (subTask) {
          results.push(subTask);
          updated++;
        } else {
          failed++;
        }
      } catch (err) {
        logger.error("Failed to update subtask in batch", { id, error: (err as Error).message });
        failed++;
      }
    }

    logger.info("Batch approval completed", { updated, failed });
    logApiRequest(request, 200, start);

    return NextResponse.json({
      success: true,
      data: results,
      updated,
      failed,
    });
  } catch (error) {
    logger.error("Failed to batch approve subtasks", { error: (error as Error).message });
    logApiRequest(request, 500, start, error as Error);
    return NextResponse.json(
      { error: "Failed to batch approve subtasks" },
      { status: 500 }
    );
  }
}
