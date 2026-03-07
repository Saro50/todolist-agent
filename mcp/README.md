# TodoList MCP Server

TodoList 的 Model Context Protocol (MCP) 服务实现，允许 AI 助手通过标准接口管理任务。

## 功能特性

- ✅ 任务管理（CRUD、状态切换）
- 🏷️ 标签管理（创建、分配）
- 📋 子任务管理
- 📝 产物编辑（Markdown 格式）
- 📊 统计分析

## 可用工具

### 任务管理

| 工具 | 描述 |
|------|------|
| `get_todos` | 获取任务列表，支持按状态和标签筛选 |
| `create_todo` | 创建新任务 |
| `update_todo` | 更新任务信息 |
| `delete_todo` | 删除任务 |
| `toggle_todo` | 切换任务完成状态 |

### 标签管理

| 工具 | 描述 |
|------|------|
| `get_tags` | 获取所有标签 |
| `create_tag` | 创建新标签 |
| `update_tag` | 更新标签信息 |
| `delete_tag` | 删除标签 |

### 子任务管理

| 工具 | 描述 |
|------|------|
| `get_subtasks` | 获取子任务列表 |
| `create_subtask` | 创建子任务 |
| `update_subtask` | 更新子任务 |
| `delete_subtask` | 删除子任务 |
| `toggle_subtask` | 切换子任务状态 |

### 产物管理

| 工具 | 描述 |
|------|------|
| `update_todo_artifact` | 更新任务产物（Markdown） |
| `update_subtask_artifact` | 更新子任务产物（Markdown） |

### 统计

| 工具 | 描述 |
|------|------|
| `get_stats` | 获取任务统计信息 |

## 使用方法

### 1. 配置 MCP 客户端

在 MCP 客户端配置文件中添加：

```json
{
  "mcpServers": {
    "todolist": {
      "command": "node",
      "args": ["/path/to/my-app/dist/mcp/index.js"],
      "env": {
        "NEXT_PUBLIC_API_URL": "http://localhost:3000"
      }
    }
  }
}
```

### 2. 开发模式运行

```bash
# 确保后端服务已启动
npm run dev

# 在另一个终端运行 MCP 服务器
npx ts-node mcp/index.ts
```

### 3. 构建生产版本

```bash
npm run build
npm run build:mcp
```

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

### 更新产物

```
用户: 为任务 xxx 添加产物报告
AI: 我已打开产物编辑器，请输入 Markdown 格式的报告内容。

用户: ## 项目总结
      - 完成了 API 设计
      - 编写了测试用例
      
AI: ✅ 任务产物已更新
```

## 架构设计

```
mcp/
├── index.ts       # 入口文件
├── server.ts      # MCP 服务器实现
├── tools.ts       # 工具定义（Zod Schema）
├── handlers.ts    # 工具处理器
└── README.md      # 本文档
```

**设计原则：**
1. **复用逻辑** - 直接使用 `lib/api/client` 与后端通信
2. **类型安全** - 使用 Zod 进行参数验证
3. **统一格式** - 所有工具返回一致的文本格式
4. **错误处理** - 统一的错误捕获和返回

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

- MCP 服务器通过 HTTP API 与后端通信，需要确保后端服务正在运行
- 所有数据操作会直接影响数据库，请谨慎使用删除功能
- 产物内容支持 Markdown 格式，会在前端正确渲染
