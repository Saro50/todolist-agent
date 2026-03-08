import { NextRequest, NextResponse } from "next/server";
import { ensureConnected } from "../db";

// GET /api/todos - 获取所有任务
export async function GET(request: NextRequest) {
  try {
    const db = await ensureConnected();
    const { searchParams } = new URL(request.url);
    
    const tagId = searchParams.get("tag");
    const completed = searchParams.get("completed");
    const workspace = searchParams.get("workspace");

    let todos;
    if (tagId) {
      todos = await db.todos.findByTag(tagId, workspace || undefined);
    } else if (completed !== null) {
      todos = await db.todos.findByStatus(completed === "true", workspace || undefined);
    } else {
      todos = await db.todos.findAll(workspace || undefined);
    }

    return NextResponse.json(todos);
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

    const todo = await db.todos.create({
      text: data.text,
      completed: data.completed ?? false,
      tagIds: data.tagIds || [],
      workspacePath: data.workspacePath || "/",
    });

    return NextResponse.json(todo, { status: 201 });
  } catch (error) {
    console.error("Failed to create todo:", error);
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 }
    );
  }
}
