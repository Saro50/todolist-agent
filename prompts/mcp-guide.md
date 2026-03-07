# MCP 服务指南

## 概述

TodoList MCP (Model Context Protocol) 服务允许 AI 助手通过标准接口管理任务、标签、子任务和产物。

## 架构设计

```
mcp/
├── api.ts           # MCP 专用 API 客户端（支持配置基础URL）
├── handlers.ts      # 工具处理器（复用业务逻辑）
├── index.ts         # 入口文件
├── server.ts        # MCP 服务器实现
├── tools.ts         # 工具定义（Zod Schema）
└── README.md        # 详细文档
```

**设计原则：**
1. **复用逻辑** - 直接使用现有的 API 客户端模式
2. **类型安全** - 使用 Zod 进行参数验证
3. **统一格式** - 所有工具返回一致的文本格式
4. **可配置** - 通过环境变量配置后端地址

## 可用工具

### 任务管理 (5个)

| 工具 | 功能 | 参数示例 |
|------|------|---------|
| `get_todos` | 获取任务列表 | `{ "status": "active", "includeSubTasks": true }` |
| `create_todo` | 创建任务 | `{ "text": "完成文档", "tagIds": ["tag-1"] }` |
| `update_todo` | 更新任务 | `{ "id": "todo-1", "completed": true }` |
| `delete_todo` | 删除任务 | `{ "id": "todo-1" }` |
| `toggle_todo` | 切换状态 | `{ "id": "todo-1" }` |

### 标签管理 (4个)

| 工具 | 功能 | 参数示例 |
|------|------|---------|
| `get_tags` | 获取所有标签 | `{}` |
| `create_tag` | 创建标签 | `{ "name": "工作", "color": "blue" }` |
| `update_tag` | 更新标签 | `{ "id": "tag-1", "name": "重要" }` |
| `delete_tag` | 删除标签 | `{ "id": "tag-1" }` |

### 子任务管理 (5个)

| 工具 | 功能 | 参数示例 |
|------|------|---------|
| `get_subtasks` | 获取子任务 | `{ "todoId": "todo-1" }` |
| `create_subtask` | 创建子任务 | `{ "todoId": "todo-1", "text": "子任务1" }` |
| `update_subtask` | 更新子任务 | `{ "id": "sub-1", "completed": true }` |
| `delete_subtask` | 删除子任务 | `{ "id": "sub-1" }` |
| `toggle_subtask` | 切换状态 | `{ "id": "sub-1", "completed": true }` |

### 产物管理 (2个)

| 工具 | 功能 | 参数示例 |
|------|------|---------|
| `update_todo_artifact` | 更新任务产物 | `{ "todoId": "todo-1", "artifact": "## 报告" }` |
| `update_subtask_artifact` | 更新子任务产物 | `{ "subTaskId": "sub-1", "artifact": "## 报告" }` |

### 统计 (1个)

| 工具 | 功能 |
|------|------|
| `get_stats` | 获取任务统计信息 |

## 使用方法

### 1. 环境配置

```bash
# 设置后端 API 地址（可选，默认 http://localhost:3000）
export NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### 2. 启动后端服务

```bash
npm run dev
```

### 3. 配置 MCP 客户端

在 Claude Desktop 或其他 MCP 客户端配置：

```json
{
  "mcpServers": {
    "todolist": {
      "command": "node",
      "args": ["--loader", "ts-node/esm", "/path/to/my-app/mcp/index.ts"],
      "env": {
        "NEXT_PUBLIC_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

### 4. 运行 MCP 服务器（开发模式）

```bash
npm run mcp
```

## 示例对话

### 查询任务
```
AI: 我来为您查看进行中的任务。

📋 任务列表 (3项)

⬜ 完成项目文档 [工作]
   ID: todo-xxx | 创建: 2024/01/15
   子任务: 1/2 完成
     ⬜ 定位问题
     ✅ 编写修复代码
```

### 创建任务
```
AI: 我来为您创建这个任务。

✅ 任务创建成功

⬜ 完成项目文档 [工作]
   ID: todo-xxx | 创建: 2024/01/15
```

### 更新产物
```
AI: 我来更新任务产物。

✅ 任务产物已更新

⬜ 完成项目文档 [工作] 📄
   ID: todo-xxx | 创建: 2024/01/15
   产物: 已设置
```

## 开发指南

### 添加新工具

1. 在 `tools.ts` 中定义：

```typescript
export const MyToolSchema = z.object({
  param: z.string().describe("参数说明"),
});

export enum ToolName {
  MY_TOOL = "my_tool",
}

export const toolDefinitions = [
  {
    name: ToolName.MY_TOOL,
    description: "工具描述",
    schema: MyToolSchema,
  },
];
```

2. 在 `handlers.ts` 中实现：

```typescript
async function handleMyTool(args: unknown): Promise<ToolResult> {
  const params = MyToolSchema.parse(args);
  // 调用 API
  return {
    content: [{ type: "text", text: "结果" }],
  };
}

export const toolHandlers = {
  [ToolName.MY_TOOL]: handleMyTool,
};
```

## 复用说明

MCP 服务复用了以下现有逻辑：

1. **API 客户端模式** - 复用 `lib/api/client` 的结构
2. **类型定义** - 复用 `app/types/index.ts`
3. **业务逻辑** - 复用现有的 CRUD 操作
4. **格式化函数** - 统一的输出格式

新增内容：
- Zod Schema 验证
- MCP SDK 封装
- 文本格式化输出

## 注意事项

- MCP 服务器通过 HTTP 与后端通信，需要确保后端服务运行
- 所有操作直接影响数据库，谨慎使用删除功能
- 产物支持 Markdown 格式，会在前端正确渲染
- 环境变量 `NEXT_PUBLIC_API_URL` 控制后端地址
