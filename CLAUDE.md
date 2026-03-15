# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Kanai 是一个用于 AI Agent 任务管理的系统，支持任务生命周期管理、标签维度体系、工作区隔离，并通过 MCP 协议与 AI Agent 集成。核心价值在于记录上下文、协助规划、持续追踪，实现人与 AI 的异步并行协作。

## Development Commands

### 启动开发服务

```bash
# 同时启动 Web (端口 4000) 和 MCP HTTP 服务 (端口 4001)
npm run dev

# 分别启动
npm run dev:web   # Web 界面
npm run dev:mcp   # MCP HTTP 服务
```

### 测试

```bash
# 运行所有测试
npm test

# 监视模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 构建

```bash
# 构建 Next.js 应用
npm run build

# 生产模式启动
npm start
```

### MCP 服务

```bash
# MCP stdio 模式
npm run mcp

# MCP HTTP 模式
npm run mcp:http
```

### 代码检查

```bash
# ESLint 检查
npm run lint
```

## Architecture

### 数据层 (Repository 模式)

项目使用 Repository 模式抽象数据访问，定义在 `lib/db/types.ts`：

- **IDatabase**: 数据库连接接口，管理连接和事务
- **ITodoRepository**: 任务数据访问
- **ITagRepository**: 标签数据访问
- **ISubTaskRepository**: 子任务数据访问
- **IWorkspaceRepository**: 工作区数据访问

具体实现在 `lib/db/sqlite.ts` (使用 better-sqlite3) 和 `lib/db/remote.ts` (远程数据库)。

工厂模式：`lib/db/factory.ts` 中的 `DatabaseFactory.create()` 用于创建不同类型的数据库实例。

数据库单例：`app/api/db.ts` 中的 `getDatabase()` 和 `ensureConnected()` 确保开发模式下数据库连接持久化。

### 数据模型

核心类型定义在 `app/types/index.ts`：

- **Todo**: 任务实体，包含主任务 (`type='task'`) 和子任务 (`type='subtask'`)
  - 支持处理状态：`pending` | `in_progress` | `completed`
  - 支持审批状态：`pending` | `approved` | `rejected`
  - 关联标签 (`tagIds`)、产物 (`artifact`)、工作区 (`workspaceId`)

- **Workspace**: 工作区，支持多项目隔离
- **Tag**: 标签，支持维度分类
- **SubTask**: 子任务（与 Todo 相同，type='subtask'）

### API 层

REST API 路由在 `app/api/` 目录：

- `app/api/todos/` - 任务 CRUD
- `app/api/tags/` - 标签管理
- `app/api/workspaces/` - 工作区管理
- `app/api/subtasks/` - 子任务管理

API 使用 Next.js App Router，每个路由文件导出 GET/POST/PUT/DELETE 等方法。所有 API 路由通过 `app/api/db.ts` 获取数据库连接。

前端客户端：`lib/api/client.ts` 提供类型安全的 API 调用封装。

### MCP 服务

MCP (Model Context Protocol) 服务实现位于 `mcp/` 目录，详细文档见 [docs/mcp.md](docs/mcp.md)。

**文件结构**：
- `mcp/index.ts` - stdio 模式入口
- `mcp/index-http.ts` / `mcp/server-http.ts` - HTTP 模式入口
- `mcp/tools.ts` - 工具定义（使用 Zod 验证）
- `mcp/handlers.ts` - 工具处理器实现
- `mcp/api.ts` - MCP 与后端 API 的通信层

**架构设计**：
```
AI Agent ──MCP──▶ MCP Server ──HTTP──▶ REST API ──▶ SQLite
                   (4001)              (4000)
```

**设计原则**：
1. **无状态设计**：每个工具调用通过参数显式指定工作区，不维护服务端状态
2. **API 共用**：MCP 通过 HTTP 调用 REST API，确保业务逻辑与前端一致
3. **分页响应处理**：API 返回分页格式 `{data, total, page, pageSize, totalPages}`，MCP 客户端自动提取 `data` 字段

**可用工具**：
- 任务管理：`get_todos` / `create_todo` / `update_todo` / `delete_todo` / `toggle_todo`
- 工作区管理：`get_workspaces` / `create_workspace` / `update_workspace` / `delete_workspace`
- 标签管理：`get_tags` / `create_tag` / `update_tag` / `delete_tag`
- 子任务管理：`get_subtasks` / `create_subtask` / `update_subtask` / `delete_subtask` / `toggle_subtask`
- 产物与搜索：`update_todo_artifact` / `update_subtask_artifact` / `search_todos` / `get_todos_by_tag` / `get_stats`
- 审批功能：`approve_todo` / `get_pending_approvals`

### 前端状态管理

React 自定义 hooks 封装业务逻辑：

- `lib/hooks/useTodos.ts` - 核心状态管理 hook，提供：
  - 任务/标签/子任务数据状态
  - 筛选和分页状态
  - 工作区切换
  - 各种 CRUD 操作

组件在 `app/components/` 目录下：
- `app/components/todo/` - 任务相关组件
- `app/components/workspace/` - 工作区管理组件
- `app/components/ui/` - 通用 UI 组件

### 数据库关系

V3 架构使用关系表：

- `todos` - 任务表（主任务和子任务）
- `tags` - 标签表
- `workspaces` - 工作区表
- `todo_tags` - 任务-标签关联表
- `todo_workspaces` - 任务-工作区关联表
- `todo_relations` - 任务关系表（父子关系）

子任务通过 `type='subtask'` 和 `parentId` 字段标识，通过 `todo_relations` 表与父任务关联，工作区继承自父任务。

## Testing

测试分为两个项目，配置在 `jest.config.ts`：

1. **api 项目**: 测试 API 路由，使用 `node` 环境
   - 位置: `__tests__/api/*.test.ts`
   - 使用 `node-mocks-http` 模拟 Next.js 请求

2. **components 项目**: 测试组件和库函数，使用 `jsdom` 环境
   - 位置: `__tests__/components/**/*.test.ts`、`__tests__/db/**/*.test.ts`、`__tests__/api/client.test.ts`

测试覆盖率要求：70%（branches、functions、lines、statements）。

## 端口配置

- **Web 服务**: 4000 (默认)
- **MCP HTTP 服务**: 4001
- **MCP API**: 4000 (与 Web 共享)

环境变量：`MCP_API_PORT`、`MCP_PORT`、`NEXT_PUBLIC_API_URL`

## MCP 配置

在 Claude Code 中配置 Kanai MCP 服务：

```json
{
  "mcpServers": {
    "Kanai": {
      "url": "http://localhost:4001/mcp"
    }
  }
}
```

可用工具包括：
- 任务管理：`get_todos` / `create_todo` / `update_todo` / `delete_todo` / `toggle_todo`
- 工作区管理：`get_workspaces` / `create_workspace` / `update_workspace` / `delete_workspace`
- 标签管理：`get_tags` / `create_tag` / `update_tag` / `delete_tag`
- 子任务管理：`get_subtasks` / `create_subtask` / `update_subtask` / `delete_subtask` / `toggle_subtask`
- 产物与搜索：`update_todo_artifact` / `update_subtask_artifact` / `search_todos` / `get_todos_by_tag` / `get_stats`

## 代码组织原则

1. **数据库操作**: 使用 Repository 接口，不直接调用 better-sqlite3
2. **API 路由**: 通过 `ensureConnected()` 获取数据库连接
3. **类型安全**: 所有数据结构和 API 调用都有完整的 TypeScript 类型
4. **组件状态**: 使用 `useTodos` hook，避免重复的状态管理逻辑
5. **MCP 无状态**: 每个工具调用通过参数显式指定工作区，不维护服务端状态

## 常见任务

### 添加新的 MCP 工具

1. 在 `mcp/tools.ts` 中定义 Zod schema
2. 在 `mcp/handlers.ts` 中实现处理函数
3. 在 `mcp/server-http.ts` 或 `mcp/index.ts` 中注册工具

### 修改数据库结构

1. 更新 `lib/db/types.ts` 中的接口定义
2. 修改 `lib/db/sqlite.ts` 中的 SQL 语句
3. 在 `migrate()` 方法中添加迁移逻辑

### 添加新的 API 端点

1. 在 `app/api/` 创建新的路由文件
2. 使用 `ensureConnected()` 获取数据库连接
3. 导出相应的 HTTP 方法 (GET/POST/PUT/DELETE)
4. 在 `lib/api/client.ts` 添加对应的客户端方法

## 重要实现注意事项

### 数据层筛选实现

在 `lib/db/sqlite.ts` 中实现筛选时，**必须使用 EXISTS 子查询**而非 JOIN 中直接添加参数，以避免参数顺序不匹配问题：

```sql
-- ❌ 错误：JOIN 中的参数顺序与 params 数组可能不匹配
JOIN todo_tags tt ON t.id = tt.todo_id AND tt.tag_id = ?

-- ✅ 正确：使用 EXISTS 子查询，参数在 WHERE 子句中按顺序绑定
WHERE tw.workspace_id = ?
  AND EXISTS (SELECT 1 FROM todo_tags tt WHERE tt.todo_id = t.id AND tt.tag_id = ?)
```

### API 分页响应格式

所有列表 API 返回统一的分页格式：

```typescript
{
  data: T[];           // 数据数组
  total: number;       // 总记录数
  page: number;        // 当前页码
  pageSize: number;    // 每页数量
  totalPages: number;  // 总页数
}
```

客户端（MCP 和前端）需要从 `result.data` 提取实际数据。

### MCP 与 API 一致性

MCP 和前端都通过 HTTP 调用 REST API，**共用同一业务逻辑**。修改 API 行为会同时影响 MCP 和前端，无需单独处理。

