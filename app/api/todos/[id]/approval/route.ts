import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../../../db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH /api/todos/:id/approval - 更新任务审批状态
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const data = await request.json();

    const { approvalStatus } = data;

    if (!approvalStatus || !['pending', 'approved', 'rejected'].includes(approvalStatus)) {
      return NextResponse.json(
        { error: "Invalid approvalStatus. Must be 'pending', 'approved', or 'rejected'" },
        { status: 400 }
      );
    }

    const todo = await db.todos.update(id, { approvalStatus });

    if (!todo) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: todo });
  } catch (error) {
    console.error("Failed to update todo approval status:", error);
    return NextResponse.json(
      { error: "Failed to update todo approval status" },
      { status: 500 }
    );
  }
}
