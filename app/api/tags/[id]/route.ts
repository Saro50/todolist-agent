import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../../db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/tags/:id - 获取单个标签
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const tag = await db.tags.findById(id);

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Failed to fetch tag:", error);
    return NextResponse.json(
      { error: "Failed to fetch tag" },
      { status: 500 }
    );
  }
}

// GET /api/tags/:id/count - 获取标签关联的任务数量
export async function getCount(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const count = await db.tags.getTodoCount(id);
    return NextResponse.json({ count });
  } catch (error) {
    console.error("Failed to get tag count:", error);
    return NextResponse.json(
      { error: "Failed to get tag count" },
      { status: 500 }
    );
  }
}

// PATCH /api/tags/:id - 更新标签
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const data = await request.json();

    const tag = await db.tags.update(id, data);

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Failed to update tag:", error);
    return NextResponse.json(
      { error: "Failed to update tag" },
      { status: 500 }
    );
  }
}

// DELETE /api/tags/:id - 删除标签
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = await ensureConnected();
    const success = await db.tags.delete(id);

    if (!success) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete tag:", error);
    return NextResponse.json(
      { error: "Failed to delete tag" },
      { status: 500 }
    );
  }
}
