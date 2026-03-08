import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../db";

// GET /api/workspaces - 获取所有工作区
export async function GET() {
  try {
    const db = await ensureConnected();
    const workspaces = await db.workspaces.findAll();
    return NextResponse.json(workspaces);
  } catch (error) {
    console.error("Failed to fetch workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces - 创建工作区
export async function POST(request: NextRequest) {
  try {
    const db = await ensureConnected();
    const data = await request.json();

    // 如果没有提供 path，自动生成
    let path = data.path;
    if (!path) {
      path = await db.workspaces.generateUniquePath(data.name);
    }

    const workspace = await db.workspaces.create({
      id: data.id,
      name: data.name,
      path,
      color: data.color,
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    console.error("Failed to create workspace:", error);
    const message = error instanceof Error ? error.message : "Failed to create workspace";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
