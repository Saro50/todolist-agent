#!/usr/bin/env node
"use strict";
/**
 * MCP HTTP 服务器入口
 *
 * 运行在 4001 端口，提供 HTTP/SSE 接口
 *
 * 运行方式:
 * - 开发: npx ts-node mcp/index-http.ts
 * - 生产: node dist/mcp/index-http.js
 */
Object.defineProperty(exports, "__esModule", { value: true });
const server_http_ts_1 = require("./server-http.ts");
// 启动 HTTP 服务器
(0, server_http_ts_1.startMCPHTTPServer)().catch((error) => {
    console.error("❌ MCP HTTP Server 启动失败:", error);
    process.exit(1);
});
