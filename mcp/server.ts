/**
 * MCP 服务器实现
 * 
 * 使用 Model Context Protocol SDK 创建标准输入输出服务器
 * 复用现有的 API 客户端与后端通信
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { toolDefinitions, ToolName } from "./tools";
import { toolHandlers } from "./handlers";

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

    const result = await handler(args);
    return result;
  });

  return server;
}

/**
 * 启动 MCP 服务器
 */
export async function startMCPServer(): Promise<void> {
  const server = createMCPServer();
  const transport = new StdioServerTransport();

  console.error("🚀 TodoList MCP Server 启动中...");
  console.error(`📦 可用工具: ${toolDefinitions.length} 个`);
  
  await server.connect(transport);
  
  console.error("✅ MCP Server 已连接，等待请求...");
}

/**
 * 将 Zod Schema 转换为 JSON Schema
 * 简化版本，支持基本类型
 */
function zodToJsonSchema(zodSchema: any): any {
  // 获取 Zod schema 的内部结构
  const schema = zodSchema._def || zodSchema;
  
  if (schema.typeName === "ZodObject") {
    const properties: Record<string, any> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(schema.shape())) {
      const propSchema = zodToJsonSchema(value as any);
      properties[key] = propSchema;
      
      // 检查是否为可选
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

  // 默认返回 any
  return { type: "object" };
}
