import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../db";

// GET /api/todos - 获取所有任务（支持分页和筛选）
export async function GET(request: NextRequest) {
  try {
    const db = await ensureConnected();
    const { searchParams } = new URL(request.url);
    
    // 筛选参数
    const tagId = searchParams.get("tag");
    const completed = searchParams.get("completed");
    const workspace = searchParams.get("workspace");
    const status = searchParams.get("status"); // pending/in_progress/completed
    
    // 分页参数
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "20", 10);
    const usePagination = searchParams.has("page");

    // 限制分页大小
    const validPageSize = Math.min(Math.max(pageSize, 1), 100);
    const validPage = Math.max(page, 1);

    // 兼容旧 API：如果只传 completed，使用旧方法
    if (completed !== null && !status && !tagId) {
      const todos = await db.todos.findByStatus(completed === "true", workspace || undefined);
      return NextResponse.json(todos);
    }

    // 兼容旧 API：如果只传 tag，使用旧方法
    if (tagId && !usePagination && !status) {
      const todos = await db.todos.findByTag(tagId, workspace || undefined);
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
        workspace || undefined,
        { page: validPage, pageSize: validPageSize },
        Object.keys(filters).length > 0 ? filters : undefined
      );
      return NextResponse.json(result);
    } else {
      // 不分页，但支持筛选
      const todos = await db.todos.findAll(workspace || undefined);
      
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

    console.log(`[API POST /todos] 收到数据:`, JSON.stringify(data));

    // 确定状态：优先使用传入的 status，否则根据 completed 计算
    const status = data.status || (data.completed ? "completed" : "pending");
    const workspacePath = data.workspacePath || "/";
    
    console.log(`[API POST /todos] 处理后的 workspacePath: ${workspacePath}`);

    const todo = await db.todos.create({
      text: data.text,
      status,
      completed: status === "completed",
      tagIds: data.tagIds || [],
      workspacePath,
    });

    console.log(`[API POST /todos] 创建成功: ${todo.id}, 工作区: ${todo.workspacePath}`);

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error("[API POST /todos] 错误:", error);
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 }
    );
  }
}
