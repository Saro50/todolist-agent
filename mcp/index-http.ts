#!/usr/bin/env node
/**
 * MCP HTTP 服务器入口
 * 
 * 纯 Express 实现，不依赖 @modelcontextprotocol/sdk
 */

import { startHTTPServer } from "./server-http";

startHTTPServer().catch((error) => {
  console.error("❌ MCP HTTP Server 启动失败:", error);
  process.exit(1);
});
