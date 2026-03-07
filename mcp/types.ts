/**
 * MCP 协议类型定义
 * 
 * 基于 MCP 规范定义核心类型
 */

// JSON-RPC 基础类型
export interface JSONRPCRequest {
  jsonrpc: "2.0";
  id?: string | number;
  method: string;
  params?: unknown;
}

export interface JSONRPCResponse {
  jsonrpc: "2.0";
  id?: string | number;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// MCP 工具类型
export interface Tool {
  name: string;
  description?: string;
  inputSchema: object;
}

export interface ToolCall {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

// MCP 服务器能力
export interface ServerCapabilities {
  tools?: object;
}

// MCP 实现信息
export interface Implementation {
  name: string;
  version: string;
}

// 标准 MCP 响应
export interface InitializeResult {
  protocolVersion: string;
  capabilities: ServerCapabilities;
  serverInfo: Implementation;
}

export interface ListToolsResult {
  tools: Tool[];
}

export interface CallToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}
