import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../../db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/subtasks/:id - 获取单个子任务
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const subTask = await db.subTasks.findById(id);

    if (!subTask) {
      return NextResponse.json({ error: "SubTask not found" }, { status: 404 });
    }

    return NextResponse.json(subTask);
  } catch (error) {
    console.error("Failed to fetch subtask:", error);
    return NextResponse.json(
      { error: "Failed to fetch subtask" },
      { status: 500 }
    );
  }
}

// PATCH /api/subtasks/:id - 更新子任务
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const data = await request.json();

    const subTask = await db.subTasks.update(id, data);

    if (!subTask) {
      return NextResponse.json({ error: "SubTask not found" }, { status: 404 });
    }

    return NextResponse.json(subTask);
  } catch (error) {
    console.error("Failed to update subtask:", error);
    return NextResponse.json(
      { error: "Failed to update subtask" },
      { status: 500 }
    );
  }
}

// DELETE /api/subtasks/:id - 删除子任务
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const success = await db.subTasks.delete(id);

    if (!success) {
      return NextResponse.json({ error: "SubTask not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete subtask:", error);
    return NextResponse.json(
      { error: "Failed to delete subtask" },
      { status: 500 }
    );
  }
}
