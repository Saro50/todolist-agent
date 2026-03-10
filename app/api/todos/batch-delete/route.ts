import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../../db";

// POST /api/todos/batch-delete - 批量删除任务
export async function POST(request: NextRequest) {
  try {
    const db = await ensureConnected();
    const data = await request.json();
    const { ids } = data;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Invalid ids array" },
        { status: 400 }
      );
    }

    const deletedCount = await db.todos.batchDelete(ids);

    return NextResponse.json({ deletedCount });
  } catch (error) {
    console.error("Failed to batch delete todos:", error);
    return NextResponse.json(
      { error: "Failed to batch delete todos" },
      { status: 500 }
    );
  }
}
