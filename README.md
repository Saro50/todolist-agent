# Kanai - AI Agent 任务管理系统

## 项目背景

随着 AI Agent 在项目开发中的深入应用，我们面临以下挑战：

| 痛点 | 描述 |
|------|------|
| 🔄 上下文丢失 | Agent 无法了解之前的工作决策和项目历史 |
| 📊 任务追踪困难 | 难以知道当前工作的进展状态 |
| ❓ 需求理解偏差 | 缺乏统一的需求记录和管理方式 |

**Kanai** 就是为了解决这些问题而生的任务管理系统。

## 核心价值

### 1. 记录上下文，为 AI 提供背景
- 记录碎片化的需求和任务信息
- 保存项目历史决策和实施路径
- 让 Agent 能够理解项目全貌

### 2. 协助规划，结构化任务
- 将需求拆解为可执行的任务结构
- 支持四级标签体系（需求/技术规划/实施/流水账）
- 工作区隔离，支持多项目并行

### 3. 持续追踪，保持连续性
- 自动监控 AI 完成进度
- 支持定时任务自动驱动 Agent
- 24 小时不间断执行

## 人与 AI 的协作模式

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│   👤 人：提出需求 → 持续设计规划                              │
│         ↓                                                   │
│   🤖 AI：协助分解/拆分/发散任务                               │
│         ↓                                                   │
│   👤 人：审核确认                                            │
│         ↓                                                   │
│   🤖 AI：执行任务实施                                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 核心优势

1. **异步并行** - 规划设计与任务执行分离
2. **全天执行** - 人类日间规划 + AI 24小时实施
3. **可控高效** - 提升可控度与进度，优化协作分工

## 功能特性

| 能力 | 说明 |
|------|------|
| 📋 任务生命周期管理 | 创建、更新、删除、完成状态追踪 |
| 🏷️ 标签维度体系 | 区分有长期和短期任务，长期任务方便用于做背景知识回溯，并且增加其它维度以限定任务可参考的范围 |
| 📁 工作区隔离 | 支持多项目并行管理 |
| 🔌 MCP 协议支持 | 标准化 AI Agent 接口 |
| 📝 产物记录 | 支持 Markdown 格式报告 |

## 技术栈

| 组件 | 技术 |
|------|------|
| 前端 | Next.js 16 + React 19 + Tailwind CSS 4 |
| 数据库 | SQLite (better-sqlite3) |
| MCP SDK | @modelcontextprotocol/sdk |
| 验证 | Zod |
| 测试 | Jest + Testing Library |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务（Web + MCP）
npm run dev

# 或分别启动
npm run dev:web   # Web 界面 (端口 4000)
npm run dev:mcp   # MCP HTTP 服务 (端口 4001)
```

## 项目结构

```
my-app/
├── app/                    # Next.js 应用
│   ├── api/               # REST API
│   └── components/        # React 组件
├── lib/                   # 共享库
│   ├── api/              # API 客户端
│   ├── config/           # 配置加载
│   └── db/               # 数据库层
├── mcp/                   # MCP 服务
│   ├── index.ts          # stdio 入口
│   ├── index-http.ts     # HTTP 入口
│   └── tools.ts          # 工具定义
├── config/               # 配置文件
│   └── agents/           # Agent 配置
├── prompts/              # Agent 提示词
└── data/                 # SQLite 数据库
```

## MCP 工具清单（25+）

## 配置到 Claude Code
```json
{
  "mcpServers": {
    "Kanai": {
      "url": "http://localhost:4001/mcp"
    }
  }
}
```
### 任务管理
- `get_todos` / `create_todo` / `update_todo` / `delete_todo` / `toggle_todo`

### 工作区管理
- `get_workspaces` / `create_workspace` / `update_workspace` / `delete_workspace`

### 标签管理
- `get_tags` / `create_tag` / `update_tag` / `delete_tag`

### 子任务管理
- `get_subtasks` / `create_subtask` / `update_subtask` / `delete_subtask` / `toggle_subtask`

### 产物与搜索
- `update_todo_artifact` / `update_subtask_artifact`
- `search_todos` / `get_todos_by_tag` / `get_stats`

### 审批功能
- `approve_todo` / `get_pending_approvals`

## 文档

- [MCP 服务详细文档](docs/mcp.md)
- [日志系统说明](docs/logging.md)
- [开发指南](CLAUDE.md)

## License

MIT