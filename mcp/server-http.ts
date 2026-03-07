/**
 * MCP HTTP 服务器
 * 
 * 提供基于 HTTP/SSE 的 MCP 服务，运行在 4001 端口
 * 允许 AI 客户端通过 HTTP 连接
 */

import express from "express";
import cors from "cors";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { toolDefinitions, ToolName } from "./tools.js";
import { toolHandlers } from "./handlers.js";

const PORT = process.env.MCP_PORT || "4001";

/**
 * 创建 MCP 服务器
 */
export function createMCPServer(): Server {
  // 转换工具定义为 MCP Tool 格式
  const tools: Tool[] = toolDefinitions.map((def) => ({
    name: def.name,
    description: def.description,
    inputSchema: zodToJsonSchema(def.schema),
  }));

  // 创建服务器实例
  const server = new Server(
    {
      name: "todolist-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // 处理工具列表请求
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools };
  });

  // 处理工具调用请求
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const handler = toolHandlers[name as ToolName];
    if (!handler) {
      return {
        content: [{ type: "text", text: `❌ 未知工具: ${name}` }],
        isError: true,
      };
    }

    return handler(args);
  });

  return server;
}

/**
 * 启动 MCP HTTP 服务器
 */
export async function startMCPHTTPServer(): Promise<void> {
  const app = express();
  
  app.use(cors());
  app.use(express.json());

  const transports: Map<string, SSEServerTransport> = new Map();

  // SSE 端点
  app.get("/sse", async (req, res) => {
    const transport = new SSEServerTransport("/messages", res);
    const sessionId = transport.sessionId;
    
    transports.set(sessionId, transport);
    
    console.log(`✅ MCP 客户端已连接: ${sessionId}`);

    const server = createMCPServer();
    await server.connect(transport);

    // 客户端断开连接
    res.on("close", () => {
      console.log(`👋 MCP 客户端已断开: ${sessionId}`);
      transports.delete(sessionId);
    });
  });

  // 消息端点
  app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);
    
    if (transport) {
      await transport.handlePostMessage(req, res, req.body);
    } else {
      res.status(400).json({ error: "无效的 sessionId" });
    }
  });

  // 健康检查
  app.get("/health", (req, res) => {
    res.json({ 
      status: "ok", 
      service: "todolist-mcp-server",
      version: "1.0.0",
      clients: transports.size,
    });
  });

  // 工具列表（REST API）
  app.get("/tools", (req, res) => {
    res.json({
      tools: toolDefinitions.map((def) => ({
        name: def.name,
        description: def.description,
      })),
    });
  });

  app.listen(PORT, () => {
    console.log("🚀 TodoList MCP HTTP Server 已启动");
    console.log(`   Port: ${PORT}`);
    console.log(`   SSE:  http://localhost:${PORT}/sse`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Tools: http://localhost:${PORT}/tools`);
    console.log(`   可用工具: ${toolDefinitions.length} 个`);
  });
}

/**
 * 将 Zod Schema 转换为 JSON Schema
 */
function zodToJsonSchema(zodSchema: any): any {
  const schema = zodSchema._def || zodSchema;
  
  if (schema.typeName === "ZodObject") {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(schema.shape())) {
      const propSchema = zodToJsonSchema(value as any);
      properties[key] = propSchema;
      
      if (!(value as any).isOptional || !(value as any).isOptional()) {
        required.push(key);
      }
    }

    return {
      type: "object",
      properties,
      required,
    };
  }

  if (schema.typeName === "ZodString") {
    return { type: "string" };
  }

  if (schema.typeName === "ZodNumber") {
    return { type: "number" };
  }

  if (schema.typeName === "ZodBoolean") {
    return { type: "boolean" };
  }

  if (schema.typeName === "ZodArray") {
    return {
      type: "array",
      items: zodToJsonSchema(schema.type),
    };
  }

  if (schema.typeName === "ZodEnum") {
    return {
      type: "string",
      enum: schema.values,
    };
  }

  if (schema.typeName === "ZodOptional") {
    return zodToJsonSchema(schema.innerType);
  }

  return { type: "object" };
}
