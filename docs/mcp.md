# Kanai MCP 服务文档

## 概述

Kanai 提供基于 MCP (Model Context Protocol) 的服务，允许 AI Agent 与任务管理系统进行交互。MCP 服务支持两种运行模式：

- **stdio 模式**：标准输入输出通信，适用于本地集成
- **HTTP 模式**：HTTP 服务，适用于远程访问和多客户端

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Agent (Claude)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │ MCP Protocol
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server (Port 4001)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  tools.ts   │  │ handlers.ts │  │      api.ts         │  │
│  │  工具定义    │  │  处理器实现  │  │  API 客户端封装     │  │
│  └─────────────┘  └─────────────┘  └──────────┬──────────┘  │
└───────────────────────────────────────────────┼─────────────┘
                                                │ HTTP
                                                ▼
┌─────────────────────────────────────────────────────────────┐
│                   REST API (Port 4000)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ todos/route │  │ tags/route  │  │  workspaces/route   │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Layer (SQLite)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   todos     │  │    tags     │  │    workspaces       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 设计原则

1. **无状态设计**：每个工具调用通过参数显式指定工作区，不维护服务端状态
2. **API 共用**：MCP 通过 HTTP 调用 REST API，确保业务逻辑一致性
3. **类型安全**：使用 Zod 进行参数验证，TypeScript 保证类型安全

## 配置方式

### Claude Code 配置

在 Claude Code 的 MCP 配置文件中添加：

```json
{
  "mcpServers": {
    "Kanai": {
      "url": "http://localhost:4001/mcp"
    }
  }
}
```

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `MCP_API_PORT` | `4000` | API 服务端口 |
| `MCP_PORT` | `4001` | MCP HTTP 服务端口 |
| `NEXT_PUBLIC_API_URL` | - | API 基础 URL |

## 启动服务

```bash
# 同时启动 Web 和 MCP 服务
npm run dev

# 仅启动 MCP HTTP 服务
npm run dev:mcp

# MCP stdio 模式（用于本地集成）
npm run mcp

# MCP HTTP 模式
npm run mcp:http
```

## 可用工具

### 任务管理

| 工具名 | 说明 | 必需参数 |
|--------|------|----------|
| `get_todos` | 获取任务列表，支持状态/标签筛选 | `workspaceId` |
| `create_todo` | 创建新任务 | `workspaceId`, `text` |
| `update_todo` | 更新任务信息 | `id`, `workspaceId` |
| `delete_todo` | 删除任务 | `id` |
| `toggle_todo` | 切换任务完成状态 | `id` |

### 工作区管理

| 工具名 | 说明 | 必需参数 |
|--------|------|----------|
| `get_workspaces` | 获取工作区列表，支持路径匹配 | - |
| `create_workspace` | 创建新工作区 | `name` |
| `update_workspace` | 更新工作区信息 | `id` |
| `delete_workspace` | 删除工作区 | `id` |

### 标签管理

| 工具名 | 说明 | 必需参数 |
|--------|------|----------|
| `get_tags` | 获取所有标签 | - |
| `create_tag` | 创建新标签 | `name`, `color` |
| `update_tag` | 更新标签信息 | `id` |
| `delete_tag` | 删除标签 | `id` |

### 子任务管理

| 工具名 | 说明 | 必需参数 |
|--------|------|----------|
| `get_subtasks` | 获取任务的子任务列表 | `workspaceId`, `todoId` |
| `create_subtask` | 创建子任务 | `workspaceId`, `todoId`, `text` |
| `update_subtask` | 更新子任务信息 | `id` |
| `delete_subtask` | 删除子任务 | `id` |
| `toggle_subtask` | 切换子任务完成状态 | `id`, `completed` |

### 搜索与筛选

| 工具名 | 说明 | 必需参数 |
|--------|------|----------|
| `search_todos` | 模糊搜索任务标题 | `workspaceId`, `keyword` |
| `get_todos_by_tag` | 按标签查询任务 | `workspaceId`, `tagId` |

### 产物管理

| 工具名 | 说明 | 必需参数 |
|--------|------|----------|
| `update_todo_artifact` | 更新任务产物 | `todoId`, `artifact` |
| `update_subtask_artifact` | 更新子任务产物 | `subTaskId`, `artifact` |

### 审批功能

| 工具名 | 说明 | 必需参数 |
|--------|------|----------|
| `approve_todo` | 审批任务（通过/拒绝） | `id`, `workspaceId`, `approvalStatus` |
| `get_pending_approvals` | 获取待审批任务列表 | `workspaceId` |

### 统计

| 工具名 | 说明 | 必需参数 |
|--------|------|----------|
| `get_stats` | 获取工作区统计信息 | `workspaceId` |

## 工具参数详解

### get_todos

```typescript
{
  workspaceId: string;      // 必需：工作区ID
  status?: "all" | "active" | "completed";  // 可选：状态筛选
  tagId?: string;           // 可选：标签筛选
  includeSubTasks?: boolean; // 可选：是否包含子任务
}
```

### create_todo

```typescript
{
  workspaceId: string;      // 必需：工作区ID
  text: string;             // 必需：任务内容
  tagIds?: string[];        // 可选：关联标签
  artifact?: string;        // 可选：产物（Markdown格式）
  status?: "pending" | "in_progress" | "completed";  // 可选：处理状态
  approvalStatus?: "pending" | "approved" | "rejected"; // 可选：审批状态
}
```

### update_todo

```typescript
{
  id: string;               // 必需：任务ID
  workspaceId: string;      // 必需：工作区ID（用于验证归属）
  text?: string;            // 可选：任务内容
  completed?: boolean;      // 可选：完成状态
  status?: "pending" | "in_progress" | "completed";  // 可选：处理状态
  tagIds?: string[];        // 可选：关联标签
  artifact?: string;        // 可选：产物
  approvalStatus?: "pending" | "approved" | "rejected"; // 可选：审批状态
}
```

### get_workspaces

```typescript
{
  path?: string;  // 可选：路径后缀匹配，如 "project" 匹配 "/Users/xxx/project"
}
```

### search_todos

```typescript
{
  workspaceId: string;      // 必需：工作区ID
  keyword: string;          // 必需：搜索关键词
  status?: "all" | "active" | "completed";  // 可选：状态筛选
  tagIds?: string[];        // 可选：多标签筛选（AND 逻辑）
}
```

## 使用示例

### 1. 获取工作区并创建任务

```
// 步骤1：获取可用工作区
get_workspaces({ path: "todolist-agent" })
// 返回：users-wn-work-todolist-agent

// 步骤2：在工作区创建任务
create_todo({
  workspaceId: "users-wn-work-todolist-agent",
  text: "实现用户登录功能",
  tagIds: ["1773477138549"],
  status: "pending"
})
```

### 2. 搜索任务并更新

```
// 步骤1：搜索任务
search_todos({
  workspaceId: "users-wn-work-todolist-agent",
  keyword: "登录",
  status: "active"
})

// 步骤2：更新任务状态
update_todo({
  id: "1773409059179",
  workspaceId: "users-wn-work-todolist-agent",
  status: "in_progress"
})
```

### 3. 创建带子任务的复杂任务

```
// 步骤1：创建主任务
create_todo({
  workspaceId: "users-wn-work-todolist-agent",
  text: "重构用户模块",
  status: "pending"
})

// 步骤2：为任务创建子任务
create_subtask({
  workspaceId: "users-wn-work-todolist-agent",
  todoId: "主任务ID",
  text: "设计新的数据模型"
})

create_subtask({
  workspaceId: "users-wn-work-todolist-agent",
  todoId: "主任务ID",
  text: "实现 API 接口"
})
```

### 4. 审批流程

```
// 步骤1：AI 创建待审批任务
create_todo({
  workspaceId: "users-wn-work-todolist-agent",
  text: "删除废弃的测试代码",
  approvalStatus: "pending"
})

// 步骤2：用户查看待审批任务
get_pending_approvals({
  workspaceId: "users-wn-work-todolist-agent"
})

// 步骤3：用户审批
approve_todo({
  id: "任务ID",
  workspaceId: "users-wn-work-todolist-agent",
  approvalStatus: "approved"  // 或 "rejected"
})
```

## 数据模型

### Todo（任务）

```typescript
interface Todo {
  id: string;
  type: 'task' | 'subtask';
  text: string;
  status: 'pending' | 'in_progress' | 'completed';
  completed: boolean;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt?: Date;
  tagIds: string[];
  artifact?: string;
  workspaceId?: string;
}
```

### Workspace（工作区）

```typescript
interface Workspace {
  id: string;
  name: string;
  path: string;
  color?: string;
  createdAt: Date;
}
```

### Tag（标签）

```typescript
interface Tag {
  id: string;
  name: string;
  color: 'emerald' | 'blue' | 'violet' | 'rose' | 'amber' | 'cyan';
}
```

## 错误处理

MCP 工具返回的错误信息格式：

```
❌ 操作失败: 错误描述
```

常见错误：

| 错误信息 | 原因 | 解决方案 |
|----------|------|----------|
| 工作区ID不存在 | workspaceId 无效 | 先调用 `get_workspaces` 获取可用ID |
| 任务不存在 | 任务ID无效或已删除 | 检查任务ID是否正确 |
| 标签不存在 | tagId 无效 | 先调用 `get_tags` 获取可用标签 |

## 文件结构

```
mcp/
├── index.ts          # stdio 模式入口
├── index-http.ts     # HTTP 模式入口
├── server-http.ts    # HTTP 服务器实现
├── tools.ts          # 工具定义（Zod schema）
├── handlers.ts       # 工具处理器实现
└── api.ts            # API 客户端封装
```

## 注意事项

1. **工作区隔离**：所有任务操作都需要指定 `workspaceId`，确保数据隔离
2. **无状态设计**：MCP 服务不维护会话状态，每次调用需完整参数
3. **API 依赖**：MCP 服务依赖 REST API（端口 4000），需确保 API 服务正常运行
4. **分页响应**：API 返回分页格式 `{data, total, page, pageSize, totalPages}`，MCP 客户端自动提取 `data` 字段
