import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../../db";

// GET /api/workspaces/:id - 获取单个工作区
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const workspace = await db.workspaces.findById(id);
    
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Failed to fetch workspace:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspace" },
      { status: 500 }
    );
  }
}

// PATCH /api/workspaces/:id - 更新工作区
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const data = await request.json();

    const workspace = await db.workspaces.update(id, data);
    
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(workspace);
  } catch (error) {
    console.error("Failed to update workspace:", error);
    const message = error instanceof Error ? error.message : "Failed to update workspace";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// DELETE /api/workspaces/:id - 删除工作区
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    
    await db.workspaces.delete(id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete workspace:", error);
    const message = error instanceof Error ? error.message : "Failed to delete workspace";
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}
