/**
 * MCP 工具处理器
 * 
 * 实现所有工具的具体逻辑
 * 复用现有的 API 客户端与后端通信
 * 支持多工作目录隔离
 */

import { api } from "./api";
// 类型定义内联
type ProcessingStatus = "pending" | "in_progress" | "completed";

type Todo = {
  id: string;
  text: string;
  status: ProcessingStatus;
  completed: boolean;
  createdAt: Date;
  tagIds: string[];
  subTasks?: SubTask[];
  artifact?: string;
  workspaceId?: string;
};

type Tag = {
  id: string;
  name: string;
  color: string;
};

type SubTask = {
  id: string;
  todoId: string;  // 父任务 ID
  text: string;
  completed: boolean;
  createdAt: Date;
  order: number;
  artifact?: string;
  parentId?: string;  // 父任务 ID（V3 新增）
};

type Workspace = {
  id: string;
  name: string;
  path: string;
  color?: string;
  createdAt: Date;
};

import {
  ToolName,
  GetTodosSchema,
  CreateTodoSchema,
  UpdateTodoSchema,
  DeleteTodoSchema,
  ToggleTodoSchema,
  GetWorkspacesSchema,
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  DeleteWorkspaceSchema,
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
  SearchTodosSchema,
  GetTodosByTagSchema,
  GetStatsSchema,
  ApproveTodoSchema,
  GetPendingApprovalsSchema,
} from "./tools";
import { z } from "zod";

// ==================== 工具调用结果 ====================

// CallToolResult 类型 - 从 MCP SDK 提取
interface CallToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export type ToolResult = CallToolResult;

// MCP 无状态设计：每个操作通过参数显式指定工作区
// 不提供 getCurrentWorkspace/setCurrentWorkspace 等状态化接口

// ==================== 格式化函数 ====================

function formatTodo(todo: Todo, subTasks: SubTask[] = []): string {
  const completedIcon = todo.completed ? "✅" : "⬜";
  const statusIcon: Record<ProcessingStatus, string> = {
    pending: "⏳",
    in_progress: "🔄",
    completed: "✅",
  };
  const statusText: Record<ProcessingStatus, string> = {
    pending: "待处理",
    in_progress: "处理中",
    completed: "已完成",
  };
  const tags = todo.tagIds.length > 0 ? ` [${todo.tagIds.join(", ")}]` : "";
  const artifact = todo.artifact ? " 📄" : "";
  const workspace = todo.workspaceId ? ` 📁${todo.workspaceId}` : "";
  
  let result = `${completedIcon} ${todo.text}${tags}${artifact}${workspace}\n`;
  result += `   ID: ${todo.id} | 状态: ${statusIcon[todo.status]} ${statusText[todo.status]} | 创建: ${new Date(todo.createdAt).toLocaleDateString()}\n`;
  
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

function formatWorkspace(ws: Workspace): string {
  const colorEmoji: Record<string, string> = {
    blue: "🔵",
    emerald: "🟢",
    violet: "🟣",
    rose: "🔴",
    amber: "🟡",
    cyan: "🔷",
    slate: "⚪",
  };
  const emoji = colorEmoji[ws.color || "slate"] || "⚪";
  return `${emoji} ${ws.name} (${ws.path})`;
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

export async function handleGetTodos(args: unknown): Promise<ToolResult> {
  try {
    const params = GetTodosSchema.parse(args || {});
    
    // workspaceId 为必传参数
    const workspaceId = params.workspaceId;
    
    // 验证工作区是否存在
    const workspaces = await api.workspaces.getAll();
    const workspace = workspaces.find((w: any) => w.id === workspaceId);
    if (!workspace) {
      const availableWorkspaces = workspaces.map((w: any) => `${w.name}(ID: ${w.id})`).join("\n") || "无";
      return {
        content: [{ 
          type: "text", 
          text: `❌ 获取任务失败: 工作区ID "${workspaceId}" 不存在\n\n可用工作区:\n${availableWorkspaces}\n\n请先使用 get_workspaces 获取可用工作区。` 
        }],
        isError: true,
      };
    }
    
    let todos: Todo[];
    if (params.status === "active") {
      todos = await api.todos.getByStatus(false, workspaceId);
    } else if (params.status === "completed") {
      todos = await api.todos.getByStatus(true, workspaceId);
    } else if (params.tagId) {
      todos = await api.todos.getByTag(params.tagId, workspaceId);
    } else {
      todos = await api.todos.getAll(workspaceId);
    }

    // 如果需要包含子任务
    const subTasksMap: Record<string, SubTask[]> = {};
    if (params.includeSubTasks && todos.length > 0) {
      for (const todo of todos) {
        subTasksMap[todo.id] = await api.subTasks.getByTodoId(todo.id);
      }
    }

    if (todos.length === 0) {
      return { content: [{ type: "text", text: `📭 工作区 "${workspace.name}" (ID: ${workspaceId}) 暂无任务` }] };
    }

    const wsHeader = ` [工作区: ${workspace.name}]`;
    const lines = [`📋 任务列表${wsHeader} (${todos.length}项)\n`];
    for (const todo of todos) {
      lines.push(formatTodo(todo, params.includeSubTasks ? subTasksMap[todo.id] : []));
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (error) {
    return handleError(error);
  }
}

export async function handleCreateTodo(args: unknown): Promise<ToolResult> {
  try {
    const params = CreateTodoSchema.parse(args || {});
    // workspaceId 为必传参数
    const workspaceId = params.workspaceId;
    
    // 打印传入参数，方便调试
    console.log(`[MCP create_todo] 参数:`, JSON.stringify({
      text: params.text,
      workspaceId,
      status: params.status,
      tagIds: params.tagIds,
      hasArtifact: !!params.artifact,
    }));
    
    // 检查工作区是否存在
    const workspaces = await api.workspaces.getAll();
    const workspace = workspaces.find((w: any) => w.id === workspaceId);
    
    if (!workspace) {
      const availableWorkspaces = workspaces.map((w: any) => `${w.name}(ID: ${w.id})`).join("\n") || "无";
      console.error(`[MCP create_todo] 错误: 工作区不存在: ${workspaceId}`);
      return {
        content: [{ 
          type: "text", 
          text: `❌ 任务创建失败: 工作区ID "${workspaceId}" 不存在\n\n可用工作区:\n${availableWorkspaces}\n\n请先使用 get_workspaces 获取可用工作区，或 create_workspace 创建新工作区。` 
        }],
        isError: true,
      };
    }
    
    const todo = await api.todos.create({
      text: params.text,
      tagIds: params.tagIds || [],
      artifact: params.artifact,
      workspaceId,
      status: params.status,
    });
    
    console.log(`[MCP create_todo] 成功创建任务: ${todo.id}, 工作区ID: ${todo.workspaceId}`);
    
    return {
      content: [{ type: "text", text: `✅ 任务创建成功\n\n${formatTodo(todo)}` }],
    };
  } catch (error) {
    console.error(`[MCP create_todo] 错误:`, error);
    return handleError(error);
  }
}

export async function handleUpdateTodo(args: unknown): Promise<ToolResult> {
  try {
    const params = UpdateTodoSchema.parse(args || {});
    const { id, workspaceId, ...data } = params;
    
    // 打印传入参数，方便调试
    console.log(`[MCP update_todo] 参数:`, JSON.stringify({
      id,
      workspaceId,
      ...data,
    }));
    
    // 验证工作区是否存在
    const workspaces = await api.workspaces.getAll();
    const workspace = workspaces.find((w: any) => w.id === workspaceId);
    if (!workspace) {
      const availableWorkspaces = workspaces.map((w: any) => `${w.name}(ID: ${w.id})`).join("\n") || "无";
      return {
        content: [{ 
          type: "text", 
          text: `❌ 任务更新失败: 工作区ID "${workspaceId}" 不存在\n\n可用工作区:\n${availableWorkspaces}` 
        }],
        isError: true,
      };
    }
    
    const todo = await api.todos.update(id, { ...data, workspaceId });
    
    console.log(`[MCP update_todo] 成功更新任务: ${todo?.id}, 工作区ID: ${todo?.workspaceId}`);
    
    return {
      content: [{ type: "text", text: `✅ 任务更新成功\n\n${formatTodo(todo!)}` }],
    };
  } catch (error) {
    console.error(`[MCP update_todo] 错误:`, error);
    return handleError(error);
  }
}

export async function handleDeleteTodo(args: unknown): Promise<ToolResult> {
  try {
    const params = DeleteTodoSchema.parse(args || {});
    await api.todos.delete(params.id);
    
    return {
      content: [{ type: "text", text: `🗑️ 任务已删除 (ID: ${params.id})` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function handleToggleTodo(args: unknown): Promise<ToolResult> {
  try {
    const params = ToggleTodoSchema.parse(args || {});
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

// ==================== 工作区处理器 ====================

export async function handleGetWorkspaces(args: unknown): Promise<ToolResult> {
  try {
    const params = GetWorkspacesSchema.parse(args || {});
    let workspaces = await api.workspaces.getAll();
    
    // 如果提供了 path 参数，进行路径后缀匹配
    if (params.path) {
      // 提取路径的最后一段作为匹配关键词
      // 例如 "a/b/c" -> "c", "/Users/wn/Work/project" -> "project"
      const pathParts = params.path.replace(/\\/g, '/').split('/');
      const lastSegment = pathParts[pathParts.length - 1];
      
      if (lastSegment) {
        // 匹配工作区 path 以 lastSegment 结尾的
        workspaces = workspaces.filter((ws: Workspace) => {
          const wsPathParts = ws.path.replace(/\\/g, '/').split('/');
          const wsLastSegment = wsPathParts[wsPathParts.length - 1];
          return wsLastSegment === lastSegment;
        });
      }
    }
    
    if (workspaces.length === 0) {
      if (params.path) {
        return { content: [{ type: "text", text: `📁 未找到路径匹配 "${params.path}" 的工作区` }] };
      }
      return { content: [{ type: "text", text: "📁 暂无工作区" }] };
    }

    const lines = [`📁 工作区列表 (${workspaces.length}个)\n`];
    for (const ws of workspaces) {
      lines.push(formatWorkspace(ws));
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (error) {
    return handleError(error);
  }
}

export async function handleCreateWorkspace(args: unknown): Promise<ToolResult> {
  try {
    const params = CreateWorkspaceSchema.parse(args || {});
    
    const workspace = await api.workspaces.create({
      name: params.name,
      path: params.path,
      color: params.color,
      id: params.id,
    });
    
    return {
      content: [{ 
        type: "text", 
        text: `✅ 工作区创建成功\n${formatWorkspace(workspace)}`, 
      }],
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function handleUpdateWorkspace(args: unknown): Promise<ToolResult> {
  try {
    const params = UpdateWorkspaceSchema.parse(args || {});
    const { id, ...data } = params;
    
    const workspace = await api.workspaces.update(id, data);
    
    if (!workspace) {
      return { content: [{ type: "text", text: "❌ 工作区不存在" }], isError: true };
    }
    
    return {
      content: [{ 
        type: "text", 
        text: `✅ 工作区更新成功\n${formatWorkspace(workspace)}`, 
      }],
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function handleDeleteWorkspace(args: unknown): Promise<ToolResult> {
  try {
    const params = DeleteWorkspaceSchema.parse(args || {});
    
    await api.workspaces.delete(params.id);
    
    return {
      content: [{ type: "text", text: `🗑️ 工作区已删除 (ID: ${params.id})` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

// ==================== 标签处理器 ====================

export async function handleGetTags(): Promise<ToolResult> {
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

export async function handleCreateTag(args: unknown): Promise<ToolResult> {
  try {
    const params = CreateTagSchema.parse(args || {});
    const tag = await api.tags.create(params);
    
    return {
      content: [{ type: "text", text: `✅ 标签创建成功\n${formatTag(tag)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function handleUpdateTag(args: unknown): Promise<ToolResult> {
  try {
    const params = UpdateTagSchema.parse(args || {});
    const { id, ...data } = params;
    
    const tag = await api.tags.update(id, data);
    
    return {
      content: [{ type: "text", text: `✅ 标签更新成功\n${formatTag(tag!)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function handleDeleteTag(args: unknown): Promise<ToolResult> {
  try {
    const params = DeleteTagSchema.parse(args || {});
    await api.tags.delete(params.id);
    
    return {
      content: [{ type: "text", text: `🗑️ 标签已删除 (ID: ${params.id})` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

// ==================== 子任务处理器 ====================

export async function handleGetSubTasks(args: unknown): Promise<ToolResult> {
  try {
    const params = GetSubTasksSchema.parse(args || {});
    const { workspaceId, todoId } = params;
    
    // 验证工作区是否存在
    const workspaces = await api.workspaces.getAll();
    const workspace = workspaces.find((w: any) => w.id === workspaceId);
    if (!workspace) {
      const availableWorkspaces = workspaces.map((w: any) => `${w.name}(ID: ${w.id})`).join("\n") || "无";
      return {
        content: [{ 
          type: "text", 
          text: `❌ 获取子任务失败: 工作区ID "${workspaceId}" 不存在\n\n可用工作区:\n${availableWorkspaces}` 
        }],
        isError: true,
      };
    }
    
    const subTasks = await api.subTasks.getByTodoId(todoId);
    
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

export async function handleCreateSubTask(args: unknown): Promise<ToolResult> {
  try {
    const params = CreateSubTaskSchema.parse(args || {});
    const { workspaceId, todoId, text } = params;
    
    // 验证工作区是否存在
    const workspaces = await api.workspaces.getAll();
    const workspace = workspaces.find((w: any) => w.id === workspaceId);
    if (!workspace) {
      const availableWorkspaces = workspaces.map((w: any) => `${w.name}(ID: ${w.id})`).join("\n") || "无";
      return {
        content: [{ 
          type: "text", 
          text: `❌ 创建子任务失败: 工作区ID "${workspaceId}" 不存在\n\n可用工作区:\n${availableWorkspaces}` 
        }],
        isError: true,
      };
    }
    
    const subTask = await api.subTasks.create(todoId, text);
    
    return {
      content: [{ type: "text", text: `✅ 子任务创建成功\n${formatSubTask(subTask)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function handleUpdateSubTask(args: unknown): Promise<ToolResult> {
  try {
    const params = UpdateSubTaskSchema.parse(args || {});
    const { id, ...data } = params;
    
    const subTask = await api.subTasks.update(id, data);
    
    return {
      content: [{ type: "text", text: `✅ 子任务更新成功\n${formatSubTask(subTask!)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function handleDeleteSubTask(args: unknown): Promise<ToolResult> {
  try {
    const params = DeleteSubTaskSchema.parse(args || {});
    await api.subTasks.delete(params.id);
    
    return {
      content: [{ type: "text", text: `🗑️ 子任务已删除 (ID: ${params.id})` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function handleToggleSubTask(args: unknown): Promise<ToolResult> {
  try {
    const params = ToggleSubTaskSchema.parse(args || {});
    const subTask = await api.subTasks.update(params.id, { completed: params.completed });
    
    return {
      content: [{ type: "text", text: `✅ 子任务已更新\n${formatSubTask(subTask!)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

// ==================== 产物处理器 ====================

export async function handleUpdateTodoArtifact(args: unknown): Promise<ToolResult> {
  try {
    const params = UpdateTodoArtifactSchema.parse(args || {});
    const todo = await api.todos.update(params.todoId, { artifact: params.artifact });
    
    return {
      content: [{ type: "text", text: `✅ 任务产物已更新\n\n${formatTodo(todo!)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

export async function handleUpdateSubTaskArtifact(args: unknown): Promise<ToolResult> {
  try {
    const params = UpdateSubTaskArtifactSchema.parse(args || {});
    const subTask = await api.subTasks.update(params.subTaskId, { artifact: params.artifact });
    
    return {
      content: [{ type: "text", text: `✅ 子任务产物已更新\n${formatSubTask(subTask!)}` }],
    };
  } catch (error) {
    return handleError(error);
  }
}

// ==================== 搜索处理器 ====================

export async function handleSearchTodos(args: unknown): Promise<ToolResult> {
  try {
    const params = SearchTodosSchema.parse(args || {});
    const keyword = params.keyword.toLowerCase();
    const workspaceId = params.workspaceId;
    
    // 验证工作区是否存在
    const workspaces = await api.workspaces.getAll();
    const workspace = workspaces.find((w: any) => w.id === workspaceId);
    if (!workspace) {
      const availableWorkspaces = workspaces.map((w: any) => `${w.name}(ID: ${w.id})`).join("\n") || "无";
      return {
        content: [{ 
          type: "text", 
          text: `❌ 搜索失败: 工作区ID "${workspaceId}" 不存在\n\n可用工作区:\n${availableWorkspaces}` 
        }],
        isError: true,
      };
    }
    
    // 使用原生搜索 API（支持数据库层模糊匹配和多标签过滤）
    let todos = await api.todos.search(params.keyword, workspaceId, params.tagIds);
    
    // 按状态筛选
    if (params.status === "active") {
      todos = todos.filter(t => !t.completed);
    } else if (params.status === "completed") {
      todos = todos.filter(t => t.completed);
    }
    
    // 获取标签信息用于显示
    const tags = await api.tags.getAll();
    const tagMap = new Map(tags.map(t => [t.id, t]));

    if (todos.length === 0) {
      return { 
        content: [{ 
          type: "text", 
          text: `🔍 搜索 "${params.keyword}" 没有匹配的任务` 
        }] 
      };
    }

    const wsHeader = ` [工作区: ${workspace.name}]`;
    const lines = [`🔍 搜索结果 "${params.keyword}"${wsHeader} (${todos.length}项)\n`];
    
    for (const todo of todos) {
      const status = todo.completed ? "✅" : "⬜";
      const tagNames = todo.tagIds.map(id => tagMap.get(id)?.name || id).join(", ");
      const tags = tagNames ? ` [${tagNames}]` : "";
      const workspace = todo.workspaceId ? ` 📁${todo.workspaceId}` : "";
      lines.push(`${status} ${todo.text}${tags}${workspace}`);
      lines.push(`   ID: ${todo.id} | 创建: ${new Date(todo.createdAt).toLocaleDateString()}`);
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (error) {
    return handleError(error);
  }
}

export async function handleGetTodosByTag(args: unknown): Promise<ToolResult> {
  try {
    const params = GetTodosByTagSchema.parse(args || {});
    const workspaceId = params.workspaceId;
    
    // 验证工作区是否存在
    const workspaces = await api.workspaces.getAll();
    const workspace = workspaces.find((w: any) => w.id === workspaceId);
    if (!workspace) {
      const availableWorkspaces = workspaces.map((w: any) => `${w.name}(ID: ${w.id})`).join("\n") || "无";
      return {
        content: [{ 
          type: "text", 
          text: `❌ 查询失败: 工作区ID "${workspaceId}" 不存在\n\n可用工作区:\n${availableWorkspaces}` 
        }],
        isError: true,
      };
    }
    
    // 获取标签信息
    const tags = await api.tags.getAll();
    const tag = tags.find(t => t.id === params.tagId);
    
    if (!tag) {
      return { 
        content: [{ 
          type: "text", 
          text: `❌ 标签不存在: ${params.tagId}\n可用标签:\n${tags.map(t => `- ${t.name} (ID: ${t.id})`).join("\n")}` 
        }],
        isError: true
      };
    }
    
    // 获取任务
    let todos = await api.todos.getByTag(params.tagId, workspaceId);
    
    // 按状态筛选
    if (params.status === "active") {
      todos = todos.filter(t => !t.completed);
    } else if (params.status === "completed") {
      todos = todos.filter(t => t.completed);
    }

    if (todos.length === 0) {
      return { 
        content: [{ 
          type: "text", 
          text: `🏷️ 工作区 "${workspace.name}" 中标签 "${tag.name}" 下暂无任务` 
        }] 
      };
    }

    const wsHeader = ` [工作区: ${workspace.name}]`;
    const lines = [`🏷️ 标签 "${tag.name}"${wsHeader} (${todos.length}项)\n`];
    
    for (const todo of todos) {
      const status = todo.completed ? "✅" : "⬜";
      const workspace = todo.workspaceId ? ` 📁${todo.workspaceId}` : "";
      lines.push(`${status} ${todo.text}${workspace}`);
      lines.push(`   ID: ${todo.id} | 创建: ${new Date(todo.createdAt).toLocaleDateString()}`);
    }

    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (error) {
    return handleError(error);
  }
}

// ==================== 审批处理器 ====================

export async function handleApproveTodo(args: unknown): Promise<ToolResult> {
  try {
    const params = ApproveTodoSchema.parse(args || {});
    const { id, workspaceId, approvalStatus } = params;
    
    // 验证工作区是否存在
    const workspaces = await api.workspaces.getAll();
    const workspace = workspaces.find((w: any) => w.id === workspaceId);
    if (!workspace) {
      const availableWorkspaces = workspaces.map((w: any) => `${w.name}(ID: ${w.id})`).join("\n") || "无";
      return {
        content: [{ 
          type: "text", 
          text: `❌ 审批失败: 工作区ID "${workspaceId}" 不存在\n\n可用工作区:\n${availableWorkspaces}` 
        }],
        isError: true,
      };
    }
    
    const todo = await api.todos.update(id, { approvalStatus, workspaceId });
    
    if (!todo) {
      return {
        content: [{ type: "text", text: "❌ 任务不存在" }],
        isError: true,
      };
    }
    
    const statusText = approvalStatus === 'approved' ? '已通过 ✅' : '已拒绝 ❌';
    
    return {
      content: [{ 
        type: "text", 
        text: `✅ 任务审批成功: ${statusText}\n\n${formatTodo(todo)}` 
      }],
    };
  } catch (error) {
    console.error(`[MCP approve_todo] 错误:`, error);
    return handleError(error);
  }
}

export async function handleGetPendingApprovals(args: unknown): Promise<ToolResult> {
  try {
    const params = GetPendingApprovalsSchema.parse(args || {});
    const { workspaceId, type = 'all' } = params;
    
    // 验证工作区是否存在
    const workspaces = await api.workspaces.getAll();
    const workspace = workspaces.find((w: any) => w.id === workspaceId);
    if (!workspace) {
      const availableWorkspaces = workspaces.map((w: any) => `${w.name}(ID: ${w.id})`).join("\n") || "无";
      return {
        content: [{ 
          type: "text", 
          text: `❌ 获取待审批任务失败: 工作区ID "${workspaceId}" 不存在\n\n可用工作区:\n${availableWorkspaces}` 
        }],
        isError: true,
      };
    }
    
    // 获取所有任务
    let todos = await api.todos.getAll(workspaceId);
    
    // 按类型筛选
    if (type === 'task') {
      todos = todos.filter(t => t.type === 'task');
    } else if (type === 'subtask') {
      todos = todos.filter(t => t.type === 'subtask');
    }
    
    // 筛选待审批的任务
    const pendingTodos = todos.filter(t => t.approvalStatus === 'pending');
    
    if (pendingTodos.length === 0) {
      return {
        content: [{ 
          type: "text", 
          text: `📭 工作区 "${workspace.name}" 暂无待审批的任务` 
        }],
      };
    }
    
    const wsHeader = ` [工作区: ${workspace.name}]`;
    const lines = [`⏳ 待审批任务列表${wsHeader} (${pendingTodos.length}项)\n`];
    
    for (const todo of pendingTodos) {
      const typeIcon = todo.type === 'subtask' ? '└─ ' : '';
      lines.push(`${typeIcon}⏳ ${todo.text}`);
      lines.push(`   ID: ${todo.id} | 状态: ${todo.status} | 创建: ${new Date(todo.createdAt).toLocaleDateString()}`);
      if (todo.artifact) {
        lines.push(`   📄 有产物文档`);
      }
      lines.push('');
    }
    
    return { content: [{ type: "text", text: lines.join("\n") }] };
  } catch (error) {
    console.error(`[MCP get_pending_approvals] 错误:`, error);
    return handleError(error);
  }
}

// ==================== 统计处理器 ====================

export async function handleGetStats(args: unknown): Promise<ToolResult> {
  try {
    const params = GetStatsSchema.parse(args || {});
    // workspaceId 为必传参数
    const workspaceId = params.workspaceId;
    
    // 验证工作区是否存在
    const workspaces = await api.workspaces.getAll();
    const workspace = workspaces.find((w: any) => w.id === workspaceId);
    if (!workspace) {
      const availableWorkspaces = workspaces.map((w: any) => `${w.name}(ID: ${w.id})`).join("\n") || "无";
      return {
        content: [{ 
          type: "text", 
          text: `❌ 统计失败: 工作区ID "${workspaceId}" 不存在\n\n可用工作区:\n${availableWorkspaces}` 
        }],
        isError: true,
      };
    }
    
    const [todos, tags] = await Promise.all([
      api.todos.getAll(workspaceId),
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

    const wsName = workspace.name;
    const lines = [
      `📊 Kanai 统计 [${wsName}]\n`,
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
  
  [ToolName.GET_WORKSPACES]: handleGetWorkspaces,
  [ToolName.CREATE_WORKSPACE]: handleCreateWorkspace,
  [ToolName.UPDATE_WORKSPACE]: handleUpdateWorkspace,
  [ToolName.DELETE_WORKSPACE]: handleDeleteWorkspace,
  
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
  
  [ToolName.SEARCH_TODOS]: handleSearchTodos,
  [ToolName.GET_TODOS_BY_TAG]: handleGetTodosByTag,
  
  [ToolName.GET_STATS]: handleGetStats,
  
  // 审批工具
  [ToolName.APPROVE_TODO]: handleApproveTodo,
  [ToolName.GET_PENDING_APPROVALS]: handleGetPendingApprovals,
};
