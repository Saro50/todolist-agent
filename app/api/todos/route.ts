import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../db";

// GET /api/todos - 获取所有任务（支持分页和筛选）
export async function GET(request: NextRequest) {
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
    const usePagination = searchParams.has("page");

    // 限制分页大小
    const validPageSize = Math.min(Math.max(pageSize, 1), 100);
    const validPage = Math.max(page, 1);

    // 搜索接口：如果传了 keyword，使用搜索（支持多标签过滤）
    if (keyword) {
      let todos = await db.todos.search(keyword, workspaceId || undefined, tagIds.length > 0 ? tagIds : undefined);
      return NextResponse.json(todos);
    }

    // 兼容旧 API：如果只传 completed，使用旧方法
    if (completed !== null && !status && !tagId) {
      const todos = await db.todos.findByStatus(completed === "true", workspaceId || undefined);
      return NextResponse.json(todos);
    }

    // 兼容旧 API：如果只传 tag，使用旧方法
    if (tagId && !usePagination && !status) {
      const todos = await db.todos.findByTag(tagId, workspaceId || undefined);
      return NextResponse.json(todos);
    }

    // 构建筛选参数
    const filters: { status?: string; tagId?: string } = {};
    
    // status 参数优先于 completed 参数
    if (status) {
      filters.status = status;
    } else if (completed !== null) {
      // 将 completed 转换为 status
      filters.status = completed === "true" ? "completed" : "pending";
    }
    
    if (tagId) {
      filters.tagId = tagId;
    }

    // 是否使用分页
    if (usePagination) {
      const result = await db.todos.findAllPaginated(
        workspaceId || undefined,
        { page: validPage, pageSize: validPageSize },
        Object.keys(filters).length > 0 ? filters : undefined
      );
      return NextResponse.json(result);
    } else {
      // 不分页，但支持筛选
      const todos = await db.todos.findAll(workspaceId || undefined);
      
      // 手动筛选（当不分页时）
      let filteredTodos = todos;
      if (filters.status) {
        filteredTodos = filteredTodos.filter(t => t.status === filters.status);
      }
      if (filters.tagId) {
        filteredTodos = filteredTodos.filter(t => t.tagIds.includes(filters.tagId!));
      }
      
      return NextResponse.json(filteredTodos);
    }
  } catch (error) {
    console.error("Failed to fetch todos:", error);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 }
    );
  }
}

// POST /api/todos - 创建新任务
export async function POST(request: NextRequest) {
  try {
    const db = await ensureConnected();
    const data = await request.json();

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

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error("[API POST /todos] 错误:", error);
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 }
    );
  }
}
