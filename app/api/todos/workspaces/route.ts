import { NextResponse } from "next/server";
import { ensureConnected } from "../../db";

// GET /api/todos/workspaces - 获取所有工作目录列表
export async function GET() {
  try {
    const db = await ensureConnected();
    const workspaces = await db.workspaces.findAll();
    return NextResponse.json(workspaces.map(w => w.path));
  } catch (error) {
    console.error("Failed to fetch workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}
