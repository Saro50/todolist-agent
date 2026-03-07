#!/usr/bin/env node
/**
 * MCP STDIO 服务器入口
 * 
 * 纯 Node.js 实现，不依赖 @modelcontextprotocol/sdk
 */

import { startStdioServer } from "./server-http";

startStdioServer().catch((error) => {
  console.error("❌ MCP STDIO Server 启动失败:", error);
  process.exit(1);
});
