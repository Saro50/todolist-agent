import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../db";
import { logger, logApiRequest } from "@/lib/api/logger";

// GET /api/todos - 获取所有任务（支持分页和筛选）
export async function GET(request: NextRequest) {
  const start = Date.now();
  
  try {
    const db = await ensureConnected();
    const { searchParams } = new URL(request.url);
    
    // 筛选参数
    const tagId = searchParams.get("tag");
    const tagIds = searchParams.getAll("tag"); // 支持多个标签
    const completed = searchParams.get("completed");
    const workspaceId = searchParams.get("workspace");
    const status = searchParams.get("status"); // pending/in_progress/completed
    const keyword = searchParams.get("keyword"); // 搜索关键词
    
    // 分页参数
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);

    // 限制分页大小
    const validPageSize = Math.min(Math.max(pageSize, 1), 100);
    const validPage = Math.max(page, 1);

    logger.debug("Fetching todos", { workspaceId, status, tagId, page: validPage, pageSize: validPageSize });

    // 构建筛选参数
    const filters: { status?: string; tagId?: string } = {};

    if (status) {
      filters.status = status;
    } else if (completed !== null) {
      // 将 completed 转换为 status
      filters.status = completed === "true" ? "completed" : "pending";
    }

    if (tagId) {
      filters.tagId = tagId;
    }

    // 搜索接口：如果传了 keyword，使用搜索（支持多标签过滤）
    if (keyword) {
      let todos = await db.todos.search(keyword, workspaceId || undefined, tagIds.length > 0 ? tagIds : undefined);
      logApiRequest(request, 200, start);
      return NextResponse.json(todos);
    }

    // 使用分页接口
    const result = await db.todos.findAllPaginated(
      workspaceId || undefined,
      { page: validPage, pageSize: validPageSize },
      Object.keys(filters).length > 0 ? filters : undefined
    );
    
    logger.debug("Todos fetched", { count: result.data.length, total: result.total });
    logApiRequest(request, 200, start);
    return NextResponse.json(result);
  } catch (error) {
    logger.error("Failed to fetch todos", { error: (error as Error).message });
    logApiRequest(request, 500, start, error as Error);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 }
    );
  }
}

// POST /api/todos - 创建新任务
export async function POST(request: NextRequest) {
  const start = Date.now();
  
  try {
    const db = await ensureConnected();
    const data = await request.json();

    logger.debug("Creating todo", { text: data.text, workspaceId: data.workspaceId });

    // 确定状态：优先使用传入的 status，否则根据 completed 计算
    const status = data.status || (data.completed ? "completed" : "pending");
    
    // 使用传入的 workspaceId，默认为 root
    const workspaceId = data.workspaceId || 'root';
    
    const todo = await db.todos.create({
      text: data.text,
      status,
      tagIds: data.tagIds || [],
      workspaceId,
    });

    logger.info("Todo created", { id: todo.id, text: todo.text });
    logApiRequest(request, 201, start);
    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    logger.error("Failed to create todo", { error: (error as Error).message });
    logApiRequest(request, 500, start, error as Error);
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 }
    );
  }
}
