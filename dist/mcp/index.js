#!/usr/bin/env node
"use strict";
/**
 * MCP 服务器入口
 *
 * 运行方式:
 * - 开发: npx ts-node mcp/index.ts
 * - 生产: node dist/mcp/index.js
 */
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
// 启动服务器
(0, server_1.startMCPServer)().catch((error) => {
    console.error("❌ MCP Server 启动失败:", error);
    process.exit(1);
});
