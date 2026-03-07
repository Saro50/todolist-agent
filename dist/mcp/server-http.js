"use strict";
/**
 * MCP HTTP 服务器
 *
 * 提供基于 HTTP/SSE 的 MCP 服务，运行在 4001 端口
 * 允许 AI 客户端通过 HTTP 连接
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMCPServer = createMCPServer;
exports.startMCPHTTPServer = startMCPHTTPServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const sse_js_1 = require("@modelcontextprotocol/sdk/server/sse.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const tools_ts_1 = require("./tools.ts");
const handlers_ts_1 = require("./handlers.ts");
const PORT = process.env.MCP_PORT || "4001";
/**
 * 创建 MCP 服务器
 */
function createMCPServer() {
    // 转换工具定义为 MCP Tool 格式
    const tools = tools_ts_1.toolDefinitions.map((def) => ({
        name: def.name,
        description: def.description,
        inputSchema: zodToJsonSchema(def.schema),
    }));
    // 创建服务器实例
    const server = new index_js_1.Server({
        name: "todolist-mcp-server",
        version: "1.0.0",
    }, {
        capabilities: {
            tools: {},
        },
    });
    // 处理工具列表请求
    server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => {
        return { tools };
    });
    // 处理工具调用请求
    server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        const handler = handlers_ts_1.toolHandlers[name];
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
async function startMCPHTTPServer() {
    const app = (0, express_1.default)();
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    const transports = new Map();
    // SSE 端点
    app.get("/sse", async (req, res) => {
        const transport = new sse_js_1.SSEServerTransport("/messages", res);
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
        const sessionId = req.query.sessionId;
        const transport = transports.get(sessionId);
        if (transport) {
            await transport.handlePostMessage(req, res, req.body);
        }
        else {
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
            tools: tools_ts_1.toolDefinitions.map((def) => ({
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
        console.log(`   可用工具: ${tools_ts_1.toolDefinitions.length} 个`);
    });
}
/**
 * 将 Zod Schema 转换为 JSON Schema
 */
function zodToJsonSchema(zodSchema) {
    const schema = zodSchema._def || zodSchema;
    if (schema.typeName === "ZodObject") {
        const properties = {};
        const required = [];
        for (const [key, value] of Object.entries(schema.shape())) {
            const propSchema = zodToJsonSchema(value);
            properties[key] = propSchema;
            if (!value.isOptional || !value.isOptional()) {
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
