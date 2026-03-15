import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../../db";
import { logger, logApiRequest } from "@/lib/api/logger";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/subtasks/:id - 获取单个子任务
export async function GET(request: NextRequest, { params }: RouteParams) {
  const start = Date.now();
  
  try {
    const { id } = await params;
    const db = await ensureConnected();
    
    logger.debug("Fetching subtask", { id });
    const subTask = await db.subTasks.findById(id);

    if (!subTask) {
      logApiRequest(request, 404, start);
      return NextResponse.json({ error: "SubTask not found" }, { status: 404 });
    }

    logApiRequest(request, 200, start);
    return NextResponse.json(subTask);
  } catch (error) {
    logger.error("Failed to fetch subtask", { error: (error as Error).message });
    logApiRequest(request, 500, start, error as Error);
    return NextResponse.json(
      { error: "Failed to fetch subtask" },
      { status: 500 }
    );
  }
}

// PATCH /api/subtasks/:id - 更新子任务
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const start = Date.now();
  
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const data = await request.json();

    logger.debug("Updating subtask", { id, data });
    const subTask = await db.subTasks.update(id, data);

    if (!subTask) {
      logApiRequest(request, 404, start);
      return NextResponse.json({ error: "SubTask not found" }, { status: 404 });
    }

    logger.info("Subtask updated", { id });
    logApiRequest(request, 200, start);
    return NextResponse.json(subTask);
  } catch (error) {
    logger.error("Failed to update subtask", { error: (error as Error).message });
    logApiRequest(request, 500, start, error as Error);
    return NextResponse.json(
      { error: "Failed to update subtask" },
      { status: 500 }
    );
  }
}

// DELETE /api/subtasks/:id - 删除子任务
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const start = Date.now();
  
  try {
    const { id } = await params;
    const db = await ensureConnected();
    
    logger.debug("Deleting subtask", { id });
    const success = await db.subTasks.delete(id);

    if (!success) {
      logApiRequest(request, 404, start);
      return NextResponse.json({ error: "SubTask not found" }, { status: 404 });
    }

    logger.info("Subtask deleted", { id });
    logApiRequest(request, 200, start);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete subtask", { error: (error as Error).message });
    logApiRequest(request, 500, start, error as Error);
    return NextResponse.json(
      { error: "Failed to delete subtask" },
      { status: 500 }
    );
  }
}
