/**
 * MCP 工具处理器
 * 
 * 实现所有工具的具体逻辑
 * 复用现有的 API 客户端与后端通信
 */

import { api } from "./api.js";
import { Todo, Tag, SubTask } from "@/app/types";
import {
  ToolName,
  GetTodosSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  DeleteTodoSchema,
  ToggleTodoSchema,
  CreateTagSchema,
  UpdateTagSchema,
  DeleteTagSchema,
  GetSubTasksSchema,
  CreateSubTaskSchema,
  UpdateSubTaskSchema,
  DeleteSubTaskSchema,
  ToggleSubTaskSchema,
  UpdateTodoArtifactSchema,
  UpdateSubTaskArtifactSchema,
} from "./tools.js";
import { z } from "zod";

// ==================== 工具调用结果 ====================

import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";

export type ToolResult = CallToolResult;

// ==================== 格式化函数 ====================

function formatTodo(todo: Todo, subTasks: SubTask[] = []): string {
  const status = todo.completed ? "✅" : "⬜";
  const tags = todo.tagIds.length > 0 ? ` [${todo.tagIds.join(", ")}]` : "";
  const artifact = todo.artifact ? " 📄" : "";
  
  let result = `${status} ${todo.text}${tags}${artifact}\n`;
  result += `   ID: ${todo.id} | 创建: ${new Date(todo.createdAt).toLocaleDateString()}\n`;
  
  if (subTasks.length > 0) {
    result += `   子任务: ${subTasks.filter(st => st.completed).length}/${subTasks.length} 完成\n`;
    for (const st of subTasks) {
      const stStatus = st.completed ? "✅" : "⬜";
      const stArtifact = st.artifact ? " 📄" : "";
      result += `     ${stStatus} ${st.text}${stArtifact}\n`;
    }
  }
  
  if (todo.artifact) {
    result += `   产物: 已设置\n`;
  }
  
  return result;
}

function formatTag(tag: Tag): string {
  return `- ${tag.name} (ID: ${tag.id}, 颜色: ${tag.color})`;
}

function formatSubTask(subTask: SubTask): string {
  const status = subTask.completed ? "✅" : "⬜";
  const artifact = subTask.artifact ? " 📄" : "";
  return `${status} ${subTask.text}${artifact} (ID: ${subTask.id})`;
}

// ==================== 错误处理 ====================

function handleError(error: unknown): ToolResult {
  const message = error instanceof Error ? error.message : "未知错误";
  return {
    content: [{ type: "text", text: `❌ 操作失败: ${message}` }],
    isError: true,
  };
}

// ==================== Todo 处理器 ====================

async function handleGetTodos(args: unknown): Promise<ToolResult> {
  try {
    const params = GetTodosSchema.parse(args);
    
    let todos: Todo[];
    if (params.status === "active") {
      todos = await api.todos.getByStatus(false);
    } else if (params.status === "completed") {
      todos = await api.todos.getByStatus(true);
    } else if (params.tagId) {
      todos = await api.todos.getByTag(params.tagId);
    } else {
      todos = await api.todos.getAll();
    }

    // 如果需要包含子任务
    const subTasksMap: Record<string, SubTask[]> = {};
    if (params.includeSubTasks && todos.length > 0) {
      for (const todo of todos) {
        subTasksMap[todo.id] = await api.subTasks.getByTodoId(todo.id);
      }
    }

    if (todos.length === 0) {
      return { content: [{ type: "text", text: "📭 暂无任务" }] };
    }

    const lines = [`📋 任务列表 (${todos.length}项)\n`];
    for (const todo of todos) {
      lines.push(formatTodo(todo, params.includeSubTasks ? subTasksMap[todo.id] : []));
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (error) {
    return handleError(error);
  }
}

async function handleCreateTodo(args: unknown): Promise<ToolResult> {
  try {
    const params = CreateTodoSchema.parse(args);
    const todo = await api.todos.create({
      text: params.text,
      tagIds: params.tagIds || [],
      artifact: params.artifact,
    });
    
    return {
      content: [{ type: "text", text: `✅ 任务创建成功\n\n${formatTodo(todo)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

async function handleUpdateTodo(args: unknown): Promise<ToolResult> {
  try {
    const params = UpdateTodoSchema.parse(args);
    const { id, ...data } = params;
    
    const todo = await api.todos.update(id, data);
    
    return {
      content: [{ type: "text", text: `✅ 任务更新成功\n\n${formatTodo(todo!)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

async function handleDeleteTodo(args: unknown): Promise<ToolResult> {
  try {
    const params = DeleteTodoSchema.parse(args);
    await api.todos.delete(params.id);
    
    return {
      content: [{ type: "text", text: `🗑️ 任务已删除 (ID: ${params.id})` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

async function handleToggleTodo(args: unknown): Promise<ToolResult> {
  try {
    const params = ToggleTodoSchema.parse(args);
    const todo = await api.todos.getById(params.id);
    
    if (!todo) {
      return { content: [{ type: "text", text: "❌ 任务不存在" }], isError: true };
    }
    
    const updated = await api.todos.update(params.id, { completed: !todo.completed });
    const status = updated!.completed ? "已完成" : "未完成";
    
    return {
      content: [{ type: "text", text: `✅ 任务已标记为${status}\n\n${formatTodo(updated!)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

// ==================== 标签处理器 ====================

async function handleGetTags(): Promise<ToolResult> {
  try {
    const tags = await api.tags.getAll();
    
    if (tags.length === 0) {
      return { content: [{ type: "text", text: "🏷️ 暂无标签" }] };
    }

    const lines = [`🏷️ 标签列表 (${tags.length}项)\n`];
    for (const tag of tags) {
      lines.push(formatTag(tag));
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (error) {
    return handleError(error);
  }
}

async function handleCreateTag(args: unknown): Promise<ToolResult> {
  try {
    const params = CreateTagSchema.parse(args);
    const tag = await api.tags.create(params);
    
    return {
      content: [{ type: "text", text: `✅ 标签创建成功\n${formatTag(tag)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

async function handleUpdateTag(args: unknown): Promise<ToolResult> {
  try {
    const params = UpdateTagSchema.parse(args);
    const { id, ...data } = params;
    
    const tag = await api.tags.update(id, data);
    
    return {
      content: [{ type: "text", text: `✅ 标签更新成功\n${formatTag(tag!)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

async function handleDeleteTag(args: unknown): Promise<ToolResult> {
  try {
    const params = DeleteTagSchema.parse(args);
    await api.tags.delete(params.id);
    
    return {
      content: [{ type: "text", text: `🗑️ 标签已删除 (ID: ${params.id})` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

// ==================== 子任务处理器 ====================

async function handleGetSubTasks(args: unknown): Promise<ToolResult> {
  try {
    const params = GetSubTasksSchema.parse(args);
    const subTasks = await api.subTasks.getByTodoId(params.todoId);
    
    if (subTasks.length === 0) {
      return { content: [{ type: "text", text: "📭 该任务暂无子任务" }] };
    }

    const lines = [`📋 子任务列表 (${subTasks.length}项)\n`];
    for (const st of subTasks) {
      lines.push(formatSubTask(st));
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (error) {
    return handleError(error);
  }
}

async function handleCreateSubTask(args: unknown): Promise<ToolResult> {
  try {
    const params = CreateSubTaskSchema.parse(args);
    const subTask = await api.subTasks.create(params.todoId, params.text);
    
    return {
      content: [{ type: "text", text: `✅ 子任务创建成功\n${formatSubTask(subTask)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

async function handleUpdateSubTask(args: unknown): Promise<ToolResult> {
  try {
    const params = UpdateSubTaskSchema.parse(args);
    const { id, ...data } = params;
    
    const subTask = await api.subTasks.update(id, data);
    
    return {
      content: [{ type: "text", text: `✅ 子任务更新成功\n${formatSubTask(subTask!)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

async function handleDeleteSubTask(args: unknown): Promise<ToolResult> {
  try {
    const params = DeleteSubTaskSchema.parse(args);
    await api.subTasks.delete(params.id);
    
    return {
      content: [{ type: "text", text: `🗑️ 子任务已删除 (ID: ${params.id})` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

async function handleToggleSubTask(args: unknown): Promise<ToolResult> {
  try {
    const params = ToggleSubTaskSchema.parse(args);
    const subTask = await api.subTasks.update(params.id, { completed: params.completed });
    
    return {
      content: [{ type: "text", text: `✅ 子任务已更新\n${formatSubTask(subTask!)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

// ==================== 产物处理器 ====================

async function handleUpdateTodoArtifact(args: unknown): Promise<ToolResult> {
  try {
    const params = UpdateTodoArtifactSchema.parse(args);
    const todo = await api.todos.update(params.todoId, { artifact: params.artifact });
    
    return {
      content: [{ type: "text", text: `✅ 任务产物已更新\n\n${formatTodo(todo!)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

async function handleUpdateSubTaskArtifact(args: unknown): Promise<ToolResult> {
  try {
    const params = UpdateSubTaskArtifactSchema.parse(args);
    const subTask = await api.subTasks.update(params.subTaskId, { artifact: params.artifact });
    
    return {
      content: [{ type: "text", text: `✅ 子任务产物已更新\n${formatSubTask(subTask!)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

// ==================== 统计处理器 ====================

async function handleGetStats(): Promise<ToolResult> {
  try {
    const [todos, tags] = await Promise.all([
      api.todos.getAll(),
      api.tags.getAll(),
    ]);

    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;
    const active = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // 计算子任务统计
    let totalSubTasks = 0;
    let completedSubTasks = 0;
    for (const todo of todos) {
      const subTasks = await api.subTasks.getByTodoId(todo.id);
      totalSubTasks += subTasks.length;
      completedSubTasks += subTasks.filter(st => st.completed).length;
    }

    const lines = [
      "📊 TodoList 统计\n",
      `总任务数: ${total}`,
      `已完成: ${completed} (${completionRate}%)`,
      `进行中: ${active}`,
      `标签数: ${tags.length}`,
      ``,
      `子任务: ${completedSubTasks}/${totalSubTasks} 完成`,
    ];

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (error) {
    return handleError(error);
  }
}

// ==================== 处理器映射 ====================

export const toolHandlers: Record<ToolName, (args: unknown) => Promise<ToolResult>> = {
  [ToolName.GET_TODOS]: handleGetTodos,
  [ToolName.CREATE_TODO]: handleCreateTodo,
  [ToolName.UPDATE_TODO]: handleUpdateTodo,
  [ToolName.DELETE_TODO]: handleDeleteTodo,
  [ToolName.TOGGLE_TODO]: handleToggleTodo,
  
  [ToolName.GET_TAGS]: handleGetTags,
  [ToolName.CREATE_TAG]: handleCreateTag,
  [ToolName.UPDATE_TAG]: handleUpdateTag,
  [ToolName.DELETE_TAG]: handleDeleteTag,
  
  [ToolName.GET_SUBTASKS]: handleGetSubTasks,
  [ToolName.CREATE_SUBTASK]: handleCreateSubTask,
  [ToolName.UPDATE_SUBTASK]: handleUpdateSubTask,
  [ToolName.DELETE_SUBTASK]: handleDeleteSubTask,
  [ToolName.TOGGLE_SUBTASK]: handleToggleSubTask,
  
  [ToolName.UPDATE_TODO_ARTIFACT]: handleUpdateTodoArtifact,
  [ToolName.UPDATE_SUBTASK_ARTIFACT]: handleUpdateSubTaskArtifact,
  
  [ToolName.GET_STATS]: handleGetStats,
};
