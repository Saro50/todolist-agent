# 端口配置说明

## 默认端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Web 服务 | **4000** | Next.js 前端 + API |
| MCP 服务 | **4001** | MCP HTTP/SSE 服务 |

## 启动方式

### 同时启动所有服务（推荐）

```bash
npm run dev
```

这会同时启动：
- Web 服务: http://localhost:4000
- MCP 服务: http://localhost:4001

### 单独启动服务

```bash
# 只启动 Web 服务
npm run dev:web

# 只启动 MCP 服务
npm run dev:mcp
```

### 启动 MCP 客户端（stdio 模式）

```bash
npm run mcp
```

## MCP 端点

MCP HTTP 服务提供以下端点：

| 端点 | 说明 |
|------|------|
| `http://localhost:4001/sse` | SSE 连接端点 |
| `http://localhost:4001/messages` | 消息接收端点 |
| `http://localhost:4001/health` | 健康检查 |
| `http://localhost:4001/tools` | 工具列表 |

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | 4000 | Web 服务端口 |
| `MCP_PORT` | 4001 | MCP 服务端口 |
| `MCP_API_PORT` | 4000 | MCP 连接的后端端口 |

## 配置示例

### Claude Desktop 配置

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "todolist": {
      "command": "node",
      "args": ["--loader", "ts-node/esm", "/path/to/my-app/mcp/index-http.ts"],
      "env": {
        "NEXT_PUBLIC_API_URL": "http://localhost:4000",
        "MCP_API_PORT": "4000",
        "MCP_PORT": "4001"
      }
    }
  }
}
```

### 独立运行 MCP HTTP

```bash
# 先启动 Web 服务
npm run dev:web

# 再启动 MCP HTTP 服务
npm run dev:mcp
```

### Docker 环境

```yaml
services:
  web:
    build: .
    ports:
      - "4000:4000"
    environment:
      - PORT=4000
  
  mcp:
    build: .
    ports:
      - "4001:4001"
    environment:
      - MCP_PORT=4001
      - MCP_API_PORT=4000
      - NEXT_PUBLIC_API_URL=http://web:4000
```

## 日志输出

启动时会显示彩色日志：

```
======================================================================
🚀 启动 TodoList 开发服务
======================================================================
   🌐 Web:  http://localhost:4000
   🔌 MCP:  http://localhost:4001
   📖 API:  http://localhost:4000/api
======================================================================

[12:00:00] [WEB] 启动 Next.js 服务 (端口: 4000)...
[12:00:00] [MCP] 启动 MCP HTTP 服务 (端口: 4001)...
[12:00:03] [WEB] ✓ Ready on http://localhost:4000
[12:00:03] [MCP] 🚀 TodoList MCP HTTP Server 已启动
[12:00:03] [MCP]    Port: 4001
```

按 `Ctrl+C` 可同时停止所有服务。
