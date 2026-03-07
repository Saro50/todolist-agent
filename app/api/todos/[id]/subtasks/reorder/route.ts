import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../../../../db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/todos/:id/subtasks/reorder - 重新排序子任务
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const data = await request.json();

    await db.subTasks.reorder(id, data.subTaskIds);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder subtasks:", error);
    return NextResponse.json(
      { error: "Failed to reorder subtasks" },
      { status: 500 }
    );
  }
}
