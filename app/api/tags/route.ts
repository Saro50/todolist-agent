import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../db";
import { logger, logApiRequest } from "@/lib/api/logger";

// GET /api/tags - 获取所有标签（支持按工作区筛选）
export async function GET(request: NextRequest) {
  const start = Date.now();
  
  try {
    const db = await ensureConnected();
    const { searchParams } = new URL(request.url);
    
    const ids = searchParams.get("ids");
    const workspaceId = searchParams.get("workspace");
    
    logger.debug("Fetching tags", { ids, workspaceId });
    
    let tags;
    if (ids) {
      tags = await db.tags.findByIds(ids.split(","));
    } else if (workspaceId) {
      // V4: 按工作区查询标签
      tags = await db.tags.findByWorkspace(workspaceId);
    } else {
      tags = await db.tags.findAll();
    }

    logApiRequest(request, 200, start);
    return NextResponse.json(tags);
  } catch (error) {
    logger.error("Failed to fetch tags", { error: (error as Error).message });
    logApiRequest(request, 500, start, error as Error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

// POST /api/tags - 创建新标签
export async function POST(request: NextRequest) {
  const start = Date.now();
  
  try {
    const db = await ensureConnected();
    const data = await request.json();

    logger.debug("Creating tag", { name: data.name, color: data.color });

    // V4: 支持指定工作区创建标签
    const workspaceId = data.workspaceId;

    const tag = await db.tags.create({
      name: data.name,
      color: data.color,
    }, workspaceId);

    logger.info("Tag created", { id: tag.id, name: tag.name });
    logApiRequest(request, 201, start);
    return NextResponse.json(tag, { status: 201 });
  } catch (error) {
    logger.error("Failed to create tag", { error: (error as Error).message });
    logApiRequest(request, 500, start, error as Error);
    return NextResponse.json(
      { error: "Failed to create tag" },
      { status: 500 }
    );
  }
}
