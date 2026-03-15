# Kanai MCP Server

Kanai 的 Model Context Protocol (MCP) 服务实现，允许 AI 助手通过标准接口管理任务和工作区。

## 功能特性

- ✅ 任务管理（CRUD、状态切换）
- 🔍 模糊搜索（按标题搜索任务）
- 📁 工作区管理（多项目隔离）
- 🏷️ 标签管理（创建、分配）
- 📋 子任务管理
- 📝 产物编辑（Markdown 格式）
- 📊 统计分析

## AI Agent 提示词模板

本项目提供了完整的 AI Agent 提示词模板，指导 Agent 如何使用 MCP 服务进行任务管理：

📄 **[PROMPT.md](./PROMPT.md)** - Agent 任务管理提示词

该模板包含：
- 标签体系定义（需求/技术规划/实施/流水账）
- 完整的工作流程（背景获取→需求分析→技术规划→任务实施）
- 任务创建规范和检查清单
- 实际使用示例

**推荐**：将 `PROMPT.md` 内容添加到 Agent 的系统提示词中，以获得最佳的任务管理效果。

## 可用工具

### 任务管理

| 工具 | 描述 | 关键参数 |
|------|------|---------|
| `get_todos` | 获取任务列表 | `workspaceId`, `status?`, `tagId?` |
| `create_todo` | 创建新任务 | `workspaceId`, `text` |
| `update_todo` | 更新任务信息 | `id`, `workspaceId`, `text?`, `completed?` |
| `delete_todo` | 删除任务 | `id` |
| `toggle_todo` | 切换任务完成状态 | `id` |
| `search_todos` | 模糊搜索任务标题 | `workspaceId`, `keyword`, `status?` |
| `get_todos_by_tag` | 通过标签ID查询任务 | `workspaceId`, `tagId`, `status?` |

### 工作区管理

| 工具 | 描述 | 关键参数 |
|------|------|---------|
| `get_workspaces` | 获取工作区列表，支持路径后缀匹配 | `path?` |
| `create_workspace` | 创建工作区 | `name`, `color?` |
| `update_workspace` | 更新工作区 | `id`, `name?`, `color?` |
| `delete_workspace` | 删除工作区 | `id` |

### 标签管理

| 工具 | 描述 | 关键参数 |
|------|------|---------|
| `get_tags` | 获取所有标签 | 无 |
| `create_tag` | 创建标签 | `name`, `color` |
| `update_tag` | 更新标签 | `id`, `name?`, `color?` |
| `delete_tag` | 删除标签 | `id` |

### 子任务管理

| 工具 | 描述 | 关键参数 |
|------|------|---------|
| `get_subtasks` | 获取子任务列表 | `todoId` |
| `create_subtask` | 创建子任务 | `todoId`, `text` |
| `update_subtask` | 更新子任务 | `id`, `text?`, `completed?` |
| `delete_subtask` | 删除子任务 | `id` |
| `toggle_subtask` | 切换子任务状态 | `id`, `completed` |

### 产物管理

| 工具 | 描述 | 关键参数 |
|------|------|---------|
| `update_todo_artifact` | 更新任务产物 | `todoId`, `artifact` |
| `update_subtask_artifact` | 更新子任务产物 | `subTaskId`, `artifact` |

### 统计

| 工具 | 描述 | 关键参数 |
|------|------|---------|
| `get_stats` | 获取统计信息 | `workspaceId` |

## 使用方法

### 1. 配置 MCP 客户端

只需配置 MCP 服务端的 URL 地址即可，无需在本地启动服务。

#### Claude Code 配置

在 Claude Code 配置文件中添加 MCP 服务：

```json
{
  "mcpServers": {
    "Kanai": {
      "url": "http://localhost:4001/mcp"
    }
  }
}
```

#### Kimi CLI 配置

在 Kimi CLI 配置文件中添加 MCP 服务（默认路径 `~/.kimi/config.json`）：

```json
{
  "mcpServers": {
    "kanai": {
      "url": "http://localhost:4001/mcp"
    }
  }
}
```

**重要说明：**
- `url`: MCP 服务的 HTTP 端点地址，**必须以 `/mcp` 结尾**
- 默认端口 `4001` 是 MCP 服务端口（与 Web 服务的 4000 端口不同）
- 配置前请确保 Kanai 服务已启动（`npm run dev`）

**配置检查：**
```bash
# 测试 MCP 服务是否可访问
curl http://localhost:4001/mcp
# 应返回: {"name": "kanai-mcp-server", ...}
```

配置完成后，客户端会自动连接到远程 MCP 服务，你可以在对话中直接使用：

```
用户: @kanai 查看所有任务
AI: 我来为您查询任务列表...

📋 任务列表 (5项)
⬜ 完成任务文档
   ID: todo-xxx | 创建: 2024/01/15
...
```

#### 常见问题排查

**问题: `Failed to connect MCP servers`**

1. **检查服务是否启动**
   ```bash
   curl http://localhost:4001/health
   # 应返回: {"status": "ok", ...}
   ```

2. **检查 URL 配置是否正确**
   - ✅ 正确: `http://localhost:4001/mcp`
   - ❌ 错误: `http://localhost:4001` (缺少 `/mcp`)
   - ❌ 错误: `http://localhost:4001/sse` (这是 SSE 端点，不是 MCP 端点)

3. **检查端口是否被占用**
   ```bash
   lsof -i:4001  # 查看占用 4001 端口的进程
   ```

4. **查看 MCP 服务日志**
   ```bash
   cd /path/to/my-app
   npm run dev:mcp
   # 查看是否有错误信息
   ```

### 2. 启动服务

MCP 服务作为项目的一部分，在启动 Web 服务时自动启动：

```bash
# 启动开发服务器（同时启动 Web 服务和 MCP 服务）
npm run dev
```

MCP 服务默认在 `4001` 端口运行，HTTP 端点地址为 `http://localhost:4001/mcp`

### 3. 构建生产版本

```bash
npm run build
```

生产构建会自动包含 MCP 服务端代码，启动后同样通过 `http://localhost:4001/mcp` 访问。

## 工作区使用指南

工作区用于隔离不同项目或类别的任务。每个工作区有独立的路径（如 `/project-a`）。

### 创建工作区

```
用户: 创建一个名为"项目A"的工作区，颜色用蓝色
AI: 我来为您创建工作区。

✅ 工作区创建成功
🔵 项目A (/project-a)
```

### 在工作区中创建任务

```
用户: 在项目A中创建一个任务"完成需求分析"
AI: 我来为您创建任务。

✅ 任务创建成功

⬜ 完成需求分析 📁/project-a
   ID: todo-xxx | 创建: 2024/01/15
```

### 查看指定工作区的任务

```
用户: 查看项目A的所有任务
AI: 以下是项目A的任务：

📋 任务列表 [工作区: /project-a] (3项)

⬜ 完成需求分析
   ID: todo-xxx | 创建: 2024/01/15

⬜ 设计数据库模型
   ID: todo-yyy | 创建: 2024/01/14
```

### 列出所有工作区

```
用户: 列出所有工作区
AI:
📁 工作区列表 (3个)

⚪ 根目录 (/)
🔵 项目A (/project-a)
🟢 项目B (/project-b)
```

### 通过路径后缀匹配工作区

`get_workspaces` 支持通过 `path` 参数进行路径后缀匹配，方便快速定位特定项目的工作区：

```
用户: 查找路径匹配 "todolist-agent" 的工作区
AI:
📁 工作区列表 (1个)

⚪ todolist-agent (/Users/wn/Work/todolist-agent)
```

**匹配规则说明：**
- 输入 `"a/b/c"` 会匹配 `path` 以 `/c` 结尾的工作区
- 输入 `"/Users/wn/Work/my-project"` 会匹配 `path` 以 `/my-project` 结尾的工作区
- 匹配时忽略路径分隔符差异（`/` 和 `\` 均可）
- 不传 `path` 参数则返回所有工作区

## 示例对话

### 创建任务

```
用户: 创建一个任务"完成项目文档"，标签是"工作"
AI: 我来为您创建这个任务。

✅ 任务创建成功

⬜ 完成项目文档 [工作]
   ID: todo-xxx | 创建: 2024/01/15
```

### 查看任务

```
用户: 显示所有进行中的任务
AI: 以下是进行中的任务：

📋 任务列表 (3项)

⬜ 完成项目文档 [工作]
   ID: todo-xxx | 创建: 2024/01/15

⬜ 修复登录 Bug [紧急, 开发]
   ID: todo-yyy | 创建: 2024/01/14
   子任务: 1/2 完成
     ⬜ 定位问题
     ✅ 编写修复代码
```

### 创建子任务

```
用户: 为任务 xxx 添加子任务"编写测试用例"
AI: 我来为您添加子任务。

✅ 子任务创建成功
⬜ 编写测试用例 (ID: subtask-zzz)
```

### 更新产物

```
用户: 为任务 xxx 添加产物报告
AI: 请输入 Markdown 格式的报告内容。

用户: ## 项目总结
      - 完成了 API 设计
      - 编写了测试用例

AI: ✅ 任务产物已更新
```

### 获取统计

```
用户: 查看统计信息
AI:
📊 Kanai 统计 [所有工作区]

总任务数: 15
已完成: 8 (53%)
进行中: 7
标签数: 5

子任务: 12/20 完成
```

## 架构设计

```
mcp/
├── index.ts       # 入口文件
├── server.ts      # MCP 服务器实现
├── server-http.ts # HTTP/SSE 服务器实现
├── tools.ts       # 工具定义（Zod Schema）
├── handlers.ts    # 工具处理器
├── api.ts         # API 客户端
└── README.md      # 本文档
```

**设计原则：**
1. **远程访问** - 通过 HTTP/SSE 协议提供远程 MCP 服务，客户端只需配置 URL
2. **无状态设计** - 每个请求独立，通过参数显式指定工作区
3. **复用逻辑** - 直接使用 `lib/api/client` 与后端通信
4. **类型安全** - 使用 Zod 进行参数验证
5. **统一格式** - 所有工具返回一致的文本格式
6. **错误处理** - 统一的错误捕获和返回

**部署模式：**
- MCP 服务作为项目的一部分，与 Web 服务一起部署
- 客户端通过 HTTP/SSE 连接到 `http://host:4001/mcp`
- 无需在客户端本地安装或运行任何代码

## 开发指南

### 添加新工具

1. 在 `tools.ts` 中定义 Schema：

```typescript
export const MyNewToolSchema = z.object({
  param1: z.string().describe("参数说明"),
});

export enum ToolName {
  // ... 现有工具
  MY_NEW_TOOL = "my_new_tool",
}

export const toolDefinitions = [
  // ... 现有定义
  {
    name: ToolName.MY_NEW_TOOL,
    description: "工具描述",
    schema: MyNewToolSchema,
  },
];
```

2. 在 `handlers.ts` 中实现处理器：

```typescript
async function handleMyNewTool(args: unknown): Promise<ToolResult> {
  try {
    const params = MyNewToolSchema.parse(args);
    // 调用 API
    return {
      content: [{ type: "text", text: "成功消息" }],
    };
  } catch (error) {
    return handleError(error);
  }
}

export const toolHandlers = {
  // ... 现有处理器
  [ToolName.MY_NEW_TOOL]: handleMyNewTool,
};
```

## 注意事项

- **远程连接**：MCP 服务通过 HTTP/SSE 协议提供，客户端只需配置 URL 即可连接，无需本地安装或启动服务
- **服务依赖**：需要确保 Kanai 服务（Web + MCP）正在运行，MCP 默认使用 4001 端口
- **无状态设计**：每个操作都需要显式指定 `workspaceId` 参数，不提供会话状态
- 子任务自动继承主任务的工作区，创建时无需指定
- 删除工作区前需要先删除或移动该工作区中的所有任务
- 产物内容支持 Markdown 格式，会在前端正确渲染
