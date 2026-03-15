import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../db";
import { logger, logApiRequest } from "@/lib/api/logger";

// GET /api/workspaces - 获取所有工作区
export async function GET(request?: NextRequest) {
  const start = Date.now();
  
  try {
    const db = await ensureConnected();
    logger.debug("Fetching workspaces");
    
    const workspaces = await db.workspaces.findAll();
    if (request) {
      logApiRequest(request, 200, start);
    }
    return NextResponse.json(workspaces);
  } catch (error) {
    logger.error("Failed to fetch workspaces", { error: (error as Error).message });
    if (request) {
      logApiRequest(request, 500, start, error as Error);
    }
    return NextResponse.json(
      { error: "Failed to fetch workspaces" },
      { status: 500 }
    );
  }
}

// POST /api/workspaces - 创建工作区
export async function POST(request: NextRequest) {
  const start = Date.now();
  
  try {
    const db = await ensureConnected();
    const data = await request.json();

    logger.debug("Creating workspace", { name: data.name, id: data.id });

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

    logger.info("Workspace created", { id: workspace.id, name: workspace.name });
    logApiRequest(request, 201, start);
    return NextResponse.json(workspace, { status: 201 });
  } catch (error) {
    logger.error("Failed to create workspace", { error: (error as Error).message });
    logApiRequest(request, 500, start, error as Error);
    const message = error instanceof Error ? error.message : "Failed to create workspace";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
