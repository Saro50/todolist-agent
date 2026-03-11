import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../db";

// GET /api/tags - 获取所有标签（支持按工作区筛选）
export async function GET(request: NextRequest) {
  try {
    const db = await ensureConnected();
    const { searchParams } = new URL(request.url);
    
    const ids = searchParams.get("ids");
    const workspaceId = searchParams.get("workspace");
    
    let tags;
    if (ids) {
      tags = await db.tags.findByIds(ids.split(","));
    } else if (workspaceId) {
      // V4: 按工作区查询标签
      tags = await db.tags.findByWorkspace(workspaceId);
    } else {
      tags = await db.tags.findAll();
    }

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

// POST /api/tags - 创建新标签
export async function POST(request: NextRequest) {
  try {
    const db = await ensureConnected();
    const data = await request.json();

    // V4: 支持指定工作区创建标签
    const workspaceId = data.workspaceId;

    const tag = await db.tags.create({
      name: data.name,
      color: data.color,
    }, workspaceId);

    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    console.error("Failed to create tag:", error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}
