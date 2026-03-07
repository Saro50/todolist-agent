#!/usr/bin/env node
/**
 * MCP 服务器入口
 * 
 * 运行方式:
 * - 开发: npx ts-node mcp/index.ts
 * - 生产: node dist/mcp/index.js
 */

import { startMCPServer } from "./server";

// 启动服务器
startMCPServer().catch((error) => {
  console.error("❌ MCP Server 启动失败:", error);
  process.exit(1);
});
