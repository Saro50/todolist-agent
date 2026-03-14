import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../../db";

// POST /api/todos/batch-approval - 批量审批任务
export async function POST(request: NextRequest) {
  try {
    const db = await ensureConnected();
    const data = await request.json();

    const { ids, approvalStatus } = data;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!approvalStatus || !['pending', 'approved', 'rejected'].includes(approvalStatus)) {
      return NextResponse.json(
        { error: "Invalid approvalStatus. Must be 'pending', 'approved', or 'rejected'" },
        { status: 400 }
      );
    }

    const results = [];
    const errors = [];

    for (const id of ids) {
      try {
        const todo = await db.todos.update(id, { approvalStatus });
        if (todo) {
          results.push(todo);
        } else {
          errors.push({ id, error: "Todo not found" });
        }
      } catch (error) {
        errors.push({ id, error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      data: results,
      errors: errors.length > 0 ? errors : undefined,
      updated: results.length,
      failed: errors.length,
    });
  } catch (error) {
    console.error("Failed to batch update todo approval status:", error);
    return NextResponse.json(
      { error: "Failed to batch update todo approval status" },
      { status: 500 }
    );
  }
}
