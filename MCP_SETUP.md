# MCP 快速配置指南

## 安装依赖

```bash
cd my-app
npm install
```

## 启动服务

### 1. 启动后端（终端1）

```bash
npm run dev
```

服务将在 http://localhost:3000 运行

### 2. 配置 MCP 客户端

#### Claude Desktop (macOS)

编辑 `~/Library/Application Support/Claude/claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "todolist": {
      "command": "node",
      "args": [
        "--loader", "ts-node/esm",
        "/Users/YOUR_USERNAME/Work/todolist-agent/my-app/mcp/index.ts"
      ],
      "env": {
        "NEXT_PUBLIC_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

**注意**：将 `YOUR_USERNAME` 替换为你的实际用户名

#### 其他 MCP 客户端

配置类似，指定：
- 命令：`node`
- 参数：`--loader ts-node/esm /path/to/mcp/index.ts`
- 环境变量：`NEXT_PUBLIC_API_URL=http://localhost:3000`

## 测试 MCP

配置完成后，在 Claude 中输入：

```
查看我的任务列表
```

Claude 会调用 MCP 工具获取并显示任务。

## 可用操作

- 📋 查看任务（按状态、标签筛选）
- ➕ 创建任务
- ✏️ 更新任务（内容、状态、标签）
- 🗑️ 删除任务
- 🏷️ 管理标签
- 📋 管理子任务
- 📝 编辑产物（Markdown）
- 📊 查看统计

## 故障排除

### MCP 连接失败

1. 确认后端服务运行：`curl http://localhost:3000/api/todos`
2. 检查路径是否正确：确保 `mcp/index.ts` 路径正确
3. 检查环境变量：`NEXT_PUBLIC_API_URL` 是否设置正确

### 工具调用失败

1. 查看 Claude Desktop 日志：
   ```bash
   tail -f ~/Library/Logs/Claude/mcp*.log
   ```
2. 确认数据库已初始化：删除 `data/todos.db` 后重启服务

## 项目结构

```
my-app/
├── app/                 # Next.js 应用
├── lib/                 # 共享库
├── mcp/                 # MCP 服务 ← 新增
│   ├── api.ts          # API 客户端
│   ├── handlers.ts     # 工具处理器
│   ├── server.ts       # MCP 服务器
│   ├── tools.ts        # 工具定义
│   └── index.ts        # 入口
└── data/               # SQLite 数据库
```

## 复用逻辑

MCP 服务完全复用现有业务逻辑：

- ✅ 使用相同的 API 端点
- ✅ 使用相同的类型定义
- ✅ 使用相同的数据验证
- ✅ 复用数据库层

只新增了 MCP 协议封装层，零业务逻辑重复。
