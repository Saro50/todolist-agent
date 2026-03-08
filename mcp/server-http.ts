/**
 * MCP HTTP 服务器 - 纯 Express 实现
 * 
 * 不依赖 @modelcontextprotocol/sdk，使用原生 JSON-RPC 协议
 */

import express from "express";
import type { Request, Response } from "express";
import cors from "cors";
import { z } from "zod";
import type { JSONRPCRequest, JSONRPCResponse, Tool, ToolResult } from "./types";
import {
  handleGetTodos,
  handleCreateTodo,
  handleUpdateTodo,
  handleDeleteTodo,
  handleToggleTodo,
  handleGetTags,
  handleCreateTag,
  handleUpdateTag,
  handleDeleteTag,
  handleGetSubTasks,
  handleCreateSubTask,
  handleUpdateSubTask,
  handleDeleteSubTask,
  handleToggleSubTask,
  handleUpdateTodoArtifact,
  handleUpdateSubTaskArtifact,
  handleSearchTodos,
  handleGetTodosByTag,
  handleGetStats,
  handleGetWorkspaces,
  handleCreateWorkspace,
  handleUpdateWorkspace,
  handleDeleteWorkspace,
} from "./handlers";

const PORT = process.env.MCP_PORT || "4001";

// 服务器信息
const SERVER_INFO = {
  name: "todolist-mcp-server",
  version: "1.0.0",
};

// 协议版本
const PROTOCOL_VERSION = "2024-11-05";

// 工具定义
const tools: Tool[] = [
  {
    name: "get_todos",
    description: "获取任务列表，支持按状态、标签、工作区筛选",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["all", "active", "completed"], description: "筛选状态" },
        tagId: { type: "string", description: "按标签ID筛选" },
        includeSubTasks: { type: "boolean", description: "是否包含子任务" },
        workspace: { type: "string", description: "工作区路径（如 /project-a），不传则获取所有工作区" },
      },
    },
  },
  {
    name: "create_todo",
    description: "创建新任务",
    inputSchema: {
      type: "object",
      properties: {
        text: { type: "string", description: "任务内容" },
        tagIds: { type: "array", items: { type: "string" }, description: "关联的标签ID列表" },
        artifact: { type: "string", description: "产物(Markdown格式)" },
        workspace: { type: "string", description: "工作区路径（如 /project-a），不传则创建在根目录" },
        status: { type: "string", enum: ["pending", "in_progress", "completed"], description: "任务处理状态：pending(待处理), in_progress(处理中), completed(已完成)" },
      },
      required: ["text"],
    },
  },
  {
    name: "update_todo",
    description: "更新任务信息（内容、状态、标签、产物、工作区）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "任务ID" },
        text: { type: "string", description: "新的任务内容" },
        completed: { type: "boolean", description: "完成状态" },
        status: { type: "string", enum: ["pending", "in_progress", "completed"], description: "任务处理状态：pending(待处理), in_progress(处理中), completed(已完成)" },
        tagIds: { type: "array", items: { type: "string" }, description: "标签ID列表" },
        artifact: { type: "string", description: "Markdown格式的任务产物/报告" },
        workspace: { type: "string", description: "工作区路径（用于修改任务所属工作区）" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_todo",
    description: "删除任务及其所有子任务",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "要删除的任务ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "toggle_todo",
    description: "切换任务完成状态",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "任务ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "get_tags",
    description: "获取所有标签",
    inputSchema: { type: "object" },
  },
  {
    name: "create_tag",
    description: "创建新标签",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "标签名称" },
        color: { type: "string", enum: ["emerald", "blue", "violet", "rose", "amber", "cyan"], description: "标签颜色" },
      },
      required: ["name", "color"],
    },
  },
  {
    name: "update_tag",
    description: "更新标签信息",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "标签ID" },
        name: { type: "string", description: "新标签名称" },
        color: { type: "string", enum: ["emerald", "blue", "violet", "rose", "amber", "cyan"], description: "新标签颜色" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_tag",
    description: "删除标签",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "要删除的标签ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "get_subtasks",
    description: "获取指定任务的所有子任务",
    inputSchema: {
      type: "object",
      properties: {
        todoId: { type: "string", description: "父任务ID" },
      },
      required: ["todoId"],
    },
  },
  {
    name: "create_subtask",
    description: "为指定任务创建子任务",
    inputSchema: {
      type: "object",
      properties: {
        todoId: { type: "string", description: "父任务ID" },
        text: { type: "string", description: "子任务内容" },
      },
      required: ["todoId", "text"],
    },
  },
  {
    name: "update_subtask",
    description: "更新子任务内容",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "子任务ID" },
        text: { type: "string", description: "新的子任务内容" },
        completed: { type: "boolean", description: "完成状态" },
        artifact: { type: "string", description: "产物(Markdown格式)" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_subtask",
    description: "删除子任务",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "要删除的子任务ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "toggle_subtask",
    description: "切换子任务完成状态",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "子任务ID" },
        completed: { type: "boolean", description: "完成状态" },
      },
      required: ["id", "completed"],
    },
  },
  {
    name: "update_todo_artifact",
    description: "更新任务的 Markdown 产物/报告",
    inputSchema: {
      type: "object",
      properties: {
        todoId: { type: "string", description: "任务ID" },
        artifact: { type: "string", description: "Markdown格式的产物内容" },
      },
      required: ["todoId", "artifact"],
    },
  },
  {
    name: "update_subtask_artifact",
    description: "更新子任务的 Markdown 产物/报告",
    inputSchema: {
      type: "object",
      properties: {
        subTaskId: { type: "string", description: "子任务ID" },
        artifact: { type: "string", description: "Markdown格式的产物内容" },
      },
      required: ["subTaskId", "artifact"],
    },
  },
  {
    name: "get_stats",
    description: "获取任务统计信息",
    inputSchema: { type: "object" },
  },
  {
    name: "search_todos",
    description: "模糊搜索任务标题",
    inputSchema: {
      type: "object",
      properties: {
        keyword: { type: "string", description: "搜索关键词" },
        workspace: { type: "string", description: "工作区路径（可选）" },
        status: { type: "string", enum: ["all", "active", "completed"], description: "筛选状态" },
      },
      required: ["keyword"],
    },
  },
  {
    name: "get_todos_by_tag",
    description: "通过标签ID查询任务列表",
    inputSchema: {
      type: "object",
      properties: {
        tagId: { type: "string", description: "标签ID" },
        workspace: { type: "string", description: "工作区路径（可选）" },
        status: { type: "string", enum: ["all", "active", "completed"], description: "筛选状态" },
      },
      required: ["tagId"],
    },
  },
  {
    name: "get_workspaces",
    description: "获取所有工作区列表",
    inputSchema: { type: "object" },
  },
  {
    name: "create_workspace",
    description: "创建新工作区",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "工作区名称" },
        path: { type: "string", description: "工作区路径（可选，自动生成）" },
        color: { type: "string", enum: ["blue", "emerald", "violet", "rose", "amber", "cyan", "slate"], description: "工作区颜色标识" },
        id: { type: "string", description: "工作区ID（可选，自动生成）" },
      },
      required: ["name"],
    },
  },
  {
    name: "update_workspace",
    description: "更新工作区信息",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "工作区ID" },
        name: { type: "string", description: "工作区名称" },
        path: { type: "string", description: "工作区路径" },
        color: { type: "string", enum: ["blue", "emerald", "violet", "rose", "amber", "cyan", "slate"], description: "工作区颜色标识" },
      },
      required: ["id"],
    },
  },
  {
    name: "delete_workspace",
    description: "删除工作区（有任务时不可删除）",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string", description: "工作区ID" },
      },
      required: ["id"],
    },
  },
];

// 工具处理器映射
type ToolHandler = (args: unknown) => Promise<ToolResult>;

const toolHandlers: Record<string, ToolHandler> = {
  get_todos: handleGetTodos,
  create_todo: handleCreateTodo,
  update_todo: handleUpdateTodo,
  delete_todo: handleDeleteTodo,
  toggle_todo: handleToggleTodo,
  get_tags: handleGetTags,
  create_tag: handleCreateTag,
  update_tag: handleUpdateTag,
  delete_tag: handleDeleteTag,
  get_subtasks: handleGetSubTasks,
  create_subtask: handleCreateSubTask,
  update_subtask: handleUpdateSubTask,
  delete_subtask: handleDeleteSubTask,
  toggle_subtask: handleToggleSubTask,
  update_todo_artifact: handleUpdateTodoArtifact,
  update_subtask_artifact: handleUpdateSubTaskArtifact,
  search_todos: handleSearchTodos,
  get_todos_by_tag: handleGetTodosByTag,
  get_stats: handleGetStats,
  get_workspaces: handleGetWorkspaces,
  create_workspace: handleCreateWorkspace,
  update_workspace: handleUpdateWorkspace,
  delete_workspace: handleDeleteWorkspace,
};

/**
 * 创建 JSON-RPC 成功响应
 */
function createResult(id: string | number | undefined, result: unknown): JSONRPCResponse {
  return {
    jsonrpc: "2.0",
    id,
    result,
  };
}

/**
 * 创建 JSON-RPC 错误响应
 */
function createError(
  id: string | number | undefined,
  code: number,
  message: string,
  data?: unknown
): JSONRPCResponse {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
      data,
    },
  };
}

/**
 * 处理 JSON-RPC 请求
 */
async function handleRequest(req: JSONRPCRequest): Promise<JSONRPCResponse> {
  const { id, method, params } = req;

  try {
    switch (method) {
      case "initialize": {
        return createResult(id, {
          protocolVersion: PROTOCOL_VERSION,
          capabilities: { tools: {} },
          serverInfo: SERVER_INFO,
        });
      }

      case "initialized": {
        // 初始化完成通知，无需响应
        return createResult(id, {});
      }

      case "tools/list": {
        return createResult(id, { tools });
      }

      case "tools/call": {
        const { name, arguments: args } = params as { name: string; arguments?: Record<string, unknown> };
        const handler = toolHandlers[name];
        
        if (!handler) {
          return createError(id, -32602, `未知工具: ${name}`);
        }

        const result = await handler(args);
        return createResult(id, result);
      }

      default: {
        return createError(id, -32601, `未知方法: ${method}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return createError(id, -32603, `内部错误: ${message}`);
  }
}

/**
 * 启动 HTTP/SSE 模式服务器
 */
export async function startHTTPServer(): Promise<void> {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  // SSE 端点
  app.get("/sse", async (req: Request, res: Response) => {
    const sessionId = Math.random().toString(36).substring(2, 15);
    const clientIp = req.ip || req.socket.remoteAddress;
    
    console.log(`[${new Date().toISOString()}] 🔌 SSE 连接请求 from ${clientIp}`);
    
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // 禁用 Nginx 缓冲
    
    console.log(`[${new Date().toISOString()}] ✅ SSE 客户端已连接: ${sessionId}`);

    // 发送初始端点信息
    const messagesEndpoint = `/messages?sessionId=${sessionId}`;
    res.write(`event: endpoint\n`);
    res.write(`data: ${messagesEndpoint}\n\n`);
    
    console.log(`[${new Date().toISOString()}] 📤 SSE 发送 endpoint: ${messagesEndpoint}`);

    // 保持连接的心跳
    const keepAlive = setInterval(() => {
      res.write(`:keep-alive\n\n`);
    }, 30000);

    // 客户端断开连接
    req.on("close", () => {
      clearInterval(keepAlive);
      console.log(`[${new Date().toISOString()}] 👋 SSE 客户端已断开: ${sessionId}`);
    });
    
    // 错误处理
    req.on("error", (err) => {
      console.log(`[${new Date().toISOString()}] ❌ SSE 客户端错误: ${sessionId}, ${err.message}`);
      clearInterval(keepAlive);
    });
  });

  // 消息端点 - JSON-RPC over HTTP (用于 SSE 模式)
  app.post("/messages", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId as string;
    const request = req.body as JSONRPCRequest;
    
    console.log(`[${new Date().toISOString()}] 📨 Messages 请求 (session: ${sessionId || 'none'}): ${request?.method}`);
    
    if (!request || request.jsonrpc !== "2.0") {
      console.log(`[${new Date().toISOString()}] ❌ 无效的 JSON-RPC 请求`);
      return res.status(400).json(createError(undefined, -32600, "无效的 JSON-RPC 请求"));
    }

    try {
      const response = await handleRequest(request);
      console.log(`[${new Date().toISOString()}] ✅ Messages 响应: ${request.method}`);
      res.json(response);
    } catch (error) {
      console.log(`[${new Date().toISOString()}] ❌ Messages 处理错误: ${error}`);
      res.status(500).json(createError(request.id, -32603, "Internal error"));
    }
  });

  // JSON-RPC 端点（简化版，不通过 SSE）
  app.post("/rpc", async (req: Request, res: Response) => {
    const request = req.body as JSONRPCRequest;
    
    if (!request || request.jsonrpc !== "2.0") {
      return res.status(400).json(createError(undefined, -32600, "无效的 JSON-RPC 请求"));
    }

    const response = await handleRequest(request);
    res.json(response);
  });

  // 健康检查
  app.get("/health", (req: Request, res: Response) => {
    res.json({ 
      status: "ok", 
      service: SERVER_INFO.name,
      version: SERVER_INFO.version,
      protocolVersion: PROTOCOL_VERSION,
    });
  });

  // 工具列表（REST API）
  app.get("/tools", (req: Request, res: Response) => {
    res.json({ tools });
  });

  // MCP 初始化端点 - 兼容 MCP 客户端
  app.get("/mcp", (req: Request, res: Response) => {
    console.log(`[${new Date().toISOString()}] 📡 MCP 初始化请求 from ${req.ip}`);
    res.json({
      name: SERVER_INFO.name,
      version: SERVER_INFO.version,
      protocolVersion: PROTOCOL_VERSION,
      capabilities: {
        tools: {},
      },
      endpoints: {
        sse: `/sse`,
        messages: `/messages`,
        rpc: `/rpc`,
      },
    });
  });

  // MCP POST 端点 - 处理 JSON-RPC 请求 (HTTP 模式，无需 SSE)
  app.post("/mcp", async (req: Request, res: Response) => {
    const request = req.body as JSONRPCRequest;
    const clientIp = req.ip || req.socket.remoteAddress;
    
    console.log(`[${new Date().toISOString()}] 📨 MCP POST from ${clientIp}: ${request?.method || 'unknown'}`);
    
    if (!request || request.jsonrpc !== "2.0") {
      console.log(`[${new Date().toISOString()}] ❌ 无效的 JSON-RPC 请求: ${JSON.stringify(req.body).substring(0, 100)}`);
      return res.status(400).json(createError(undefined, -32600, "无效的 JSON-RPC 请求"));
    }

    try {
      const response = await handleRequest(request);
      console.log(`[${new Date().toISOString()}] ✅ MCP 响应: ${request.method}`);
      res.json(response);
    } catch (error) {
      console.log(`[${new Date().toISOString()}] ❌ MCP 处理错误: ${error}`);
      res.status(500).json(createError(request.id, -32603, `Internal error: ${error}`));
    }
  });

  // 404 处理 - 提供有用的错误信息
  app.use((req: Request, res: Response) => {
    console.log(`[${new Date().toISOString()}] ⚠️ 未知端点: ${req.method} ${req.path}`);
    const availableEndpoints = [
      "GET /mcp - MCP 初始化",
      "POST /mcp - JSON-RPC 请求",
      "GET /sse - SSE 连接",
      "POST /messages - 消息 (SSE 模式)",
      "GET /health - 健康检查",
      "GET /tools - 工具列表",
    ];
    res.status(404).json({ 
      error: "Not Found", 
      path: req.path,
      message: `端点 ${req.path} 不存在`,
      availableEndpoints,
      hint: "Kimi CLI 请配置: { \"mcpServers\": { \"todolist\": { \"url\": \"http://localhost:4001/mcp\" } } }"
    });
  });

  app.listen(PORT, () => {
    console.log("🚀 TodoList MCP HTTP Server 已启动");
    console.log(`   Port: ${PORT}`);
    console.log(`   MCP:  http://localhost:${PORT}/mcp  (推荐)`);
    console.log(`   RPC:  http://localhost:${PORT}/rpc`);
    console.log(`   SSE:  http://localhost:${PORT}/sse`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Tools: http://localhost:${PORT}/tools`);
    console.log(`   可用工具: ${tools.length} 个`);
  });
}

/**
 * 启动 STDIO 模式服务器
 */
export async function startStdioServer(): Promise<void> {
  const readline = await import("readline");
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  console.error(`${SERVER_INFO.name} v${SERVER_INFO.version} running on stdio`);

  for await (const line of rl) {
    try {
      const request = JSON.parse(line) as JSONRPCRequest;
      const response = await handleRequest(request);
      
      // 只有有 id 的请求才需要响应（通知不需要）
      if (request.id !== undefined) {
        console.log(JSON.stringify(response));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "解析错误";
      const errorResponse = createError(undefined, -32700, `解析错误: ${message}`);
      console.log(JSON.stringify(errorResponse));
    }
  }
}
