import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../../../db";

const MAX_SUBTASKS = 10;

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/todos/:id/subtasks - 获取任务的所有子任务
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const subTasks = await db.subTasks.findByTodoId(id);

    return NextResponse.json(subTasks);
  } catch (error) {
    console.error("Failed to fetch subtasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch subtasks" },
      { status: 500 }
    );
  }
}

// POST /api/todos/:id/subtasks - 创建子任务
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const data = await request.json();

    // 检查子任务数量限制
    const existingSubTasks = await db.subTasks.findByTodoId(id);
    if (existingSubTasks.length >= MAX_SUBTASKS) {
      return NextResponse.json(
        { error: `子任务数量已达上限（${MAX_SUBTASKS}条），建议拆分任务规模或创建新的主任务来管理` },
        { status: 400 }
      );
    }

    const subTask = await db.subTasks.create({
      parentId: id,
      text: data.text,
    });

    return NextResponse.json(subTask, { status: 201 });
  } catch (error) {
    console.error("Failed to create subtask:", error);
    return NextResponse.json(
      { error: "Failed to create subtask" },
      { status: 500 }
    );
  }
}

// DELETE /api/todos/:id/subtasks - 删除任务的所有子任务
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const deletedCount = await db.subTasks.deleteByTodoId(id);

    return NextResponse.json({ deletedCount });
  } catch (error) {
    console.error("Failed to delete subtasks:", error);
    return NextResponse.json(
      { error: "Failed to delete subtasks" },
      { status: 500 }
    );
  }
}
