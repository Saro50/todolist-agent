# TodoList MCP 服务提示词模板

## 服务概述

**TodoList MCP 服务是任务管理系统的核心组件，用于管理用户在当前工作目录下产生的所有任务。**

该服务记录了项目的完整历史、背景信息和实施路径，是 Agent 理解项目上下文、保持工作连续性的重要依据。每次与用户交互时，**必须**先查询该服务获取相关背景信息。

## 核心职责

1. **任务记录**：记录所有用户请求和 Agent 的执行过程
2. **背景获取**：从任务中了解项目背景、历史决策和相关上下文
3. **工作规划**：将用户需求拆解为可执行的任务结构
4. **状态追踪**：跟踪任务处理状态（待处理/处理中/已完成），保持工作连续性

## 标签体系（必须严格遵守）

所有任务必须打上以下标签之一，用于区分任务性质：

### 1. 需求（蓝色 - blue）
**用途**：项目/功能的背景描述，让 Agent 了解业务目标和上下文
- 记录用户提出的功能需求
- 描述项目背景和业务目标
- 作为后续技术规划和实施的依据
- **必须创建子任务**细化需求点

**示例**：
- "用户需要实现用户认证系统，支持邮箱+密码登录"
- "项目需要添加多语言支持，先支持中英文"

### 2. 流水账（灰色 - slate）
**用途**：日常常规操作，不具备长期回溯价值
- 文件删除、重命名
- 目录调整
- 配置修改
- 临时性操作

**示例**：
- "删除临时文件 temp.js"
- "调整目录结构，将组件移至 components 目录"

### 3. 技术规划（紫色 - violet）
**用途**：为需求实现设计的项目架构和可实施路径
- 架构设计方案
- 技术选型决策
- 实施步骤规划
- **必须创建可测试的子任务**

**示例**：
- "技术方案：使用 JWT 实现认证，包含登录/注册/令牌刷新"
- "架构设计：前端使用 React Context + LocalStorage 存储用户状态"

### 4. 实施（青色 - cyan）
**用途**：按照技术规划的具体实现记录
- 具体的代码实现
- 功能开发过程
- 与规划对应的执行步骤

**示例**：
- "实现登录 API 接口 /api/auth/login"
- "创建 AuthContext 组件管理全局登录状态"

### 5. 分支名（可选标签 - amber）
**用途**：标记任务出现的 Git 分支
- 如果任务在特定分支上执行，需添加此标记
- 格式：`分支:feature/login` 或 `分支:main`
- 非 Git 项目可省略

## 工作流程（强制执行）

### 阶段一：背景获取（每次交互开始）

```
1. 调用 get_workspaces 获取当前工作区列表
2. 调用 get_todos 或 search_todos 查询相关任务
   - 搜索关键词：用户提到的功能点、模块名
   - 查看相同工作区下的历史任务
3. 调用 get_tags 了解已有标签体系
4. 分析任务背景，确定是否已有相关需求/规划
```

### 阶段二：需求分析（发现新需求时）

```
1. 如果用户提出新需求：
   a. 创建需求任务（标记：需求）
      - 标题格式：[需求] 用户需要的功能概述
      - 详细描述用户意图和业务背景
   
   b. 为需求创建子任务（细化需求点）
      - 将大需求拆分为可验证的功能点
      - 每个子任务代表一个具体的用户故事
      
2. 如果已有相关需求：
   a. 读取原有需求任务
   b. 评估是否需要补充或调整
   c. 更新需求任务或创建关联任务
```

### 阶段三：技术规划（需求明确后）

```
1. 创建技术规划任务（标记：技术规划）
   - 标题格式：[技术规划] 实现 XXX 的技术方案
   - 描述整体架构设计
   - 列出关键技术决策
   
2. 为技术规划创建子任务（可测试的子规划）
   - 每个子任务必须可验证/可测试
   - 示例格式：
     * "设计数据库表结构（包含用户表、令牌表）"
     * "实现登录接口（输入：邮箱+密码，输出：JWT 令牌）"
     * "实现令牌刷新机制（自动刷新过期令牌）"
```

### 阶段四：任务实施（开始编码）

```
1. 为每个子技术规划创建实施任务（标记：实施）
   - 标题格式：[实施] 具体实现内容
   - 关联到对应的技术规划
   - 初始状态设为 "pending"（待处理）
   
2. 实施过程中：
   - 开始处理时更新状态为 "in_progress"（处理中）
   - 记录实现细节和遇到的问题
   - 如有偏差，更新技术规划
   
3. 任务完成后：
   - 更新状态为 "completed"（已完成）
   - 使用 toggle_todo 标记完成状态
```

### 阶段五：流水账记录（常规操作）

```
对于临时性、常规性操作：
1. 创建流水账任务（标记：流水账）
2. 简要描述操作内容
3. 不需要创建子任务
4. 完成后直接标记为 completed
```

## 处理状态说明

任务有三个处理状态，用于追踪工作进度：

| 状态 | 值 | 含义 | 使用场景 |
|------|-----|------|----------|
| ⏳ 待处理 | `pending` | 任务已创建，尚未开始 | 新建需求、技术规划初期 |
| 🔄 处理中 | `in_progress` | 正在处理该任务 | 开始编码、实施阶段 |
| ✅ 已完成 | `completed` | 任务已完成 | 代码提交、功能验证通过 |

**状态流转建议**：
- 需求/技术规划：`pending` → `in_progress` → `completed`
- 实施任务：`pending` → `in_progress` → `completed`
- 流水账：`completed`（直接完成）

## 任务创建规范

### 标题格式

```
[类型] 任务概述

类型：需求/技术规划/实施/流水账
```

### 描述格式

```
背景：
- 为什么需要这个任务
- 与哪些需求/规划相关

内容：
- 具体要做什么
- 预期结果是什么

关联：
- 关联的需求ID
- 关联的技术规划ID
```

### 标签使用

```json
{
  "name": "需求",
  "color": "blue"
}
```

### 状态管理

```javascript
// 创建任务时指定初始状态
create_todo({
  text: "[实施] 实现登录接口",
  status: "pending",      // 可选：pending/in_progress/completed
  workspace: "/path/to/project"
})

// 更新任务状态
update_todo({
  id: "任务ID",
  status: "in_progress"   // 开始处理时
})

update_todo({
  id: "任务ID", 
  status: "completed"     // 完成后
})
```

## 使用示例

### 场景：用户需要添加登录功能

**Step 1: 检查背景**
```
user: 帮我添加一个登录功能
→ 调用 search_todos({keyword: "登录", status: "pending"})    // 查看待处理任务
→ 调用 search_todos({keyword: "认证", status: "in_progress"}) // 查看进行中任务
→ 未发现相关任务，确定是新需求
```

**Step 2: 创建需求任务**
```
→ 调用 create_todo({
     text: "[需求] 实现用户登录功能",
     status: "pending",           // 初始状态：待处理
     workspace: "/path/to/project",
     tagIds: ["需求标签ID"]
   })
→ 调用 create_subtask(todoId, "用户可以通过邮箱+密码登录")
→ 调用 create_subtask(todoId, "登录成功后返回 JWT 令牌")
→ 调用 create_subtask(todoId, "支持令牌自动刷新")
→ 调用 update_todo({
     id: todoId,
     status: "in_progress"        // 开始分析需求
   })
```

**Step 3: 创建技术规划**
```
→ 调用 create_todo({
     text: "[技术规划] 登录功能技术方案",
     workspace: "/path/to/project",
     tagIds: ["技术规划标签ID"]
   })
→ 调用 create_subtask(todoId, "[可测试] 设计数据库用户表（包含id,email,password_hash字段）")
→ 调用 create_subtask(todoId, "[可测试] 实现 /api/auth/login 接口（返回200+token）")
→ 调用 create_subtask(todoId, "[可测试] 实现令牌刷新中间件（自动刷新过期token）")
```

**Step 4: 创建实施任务**
```
→ 调用 create_todo({
     text: "[实施] 创建用户数据库表",
     status: "pending",
     workspace: "/path/to/project",
     tagIds: ["实施标签ID"]
   })
→ 开始编码时调用 update_todo({
     id: todoId,
     status: "in_progress"
   })
→ 实施完成后调用 update_todo({
     id: todoId,
     status: "completed"
   })
→ 然后调用 toggle_todo 标记完成
```

## 检查清单（每次交互）

- [ ] 已查询相关历史任务（search_todos）
- [ ] 已了解当前工作区（get_workspaces）
- [ ] 新需求已创建需求任务并打标签
- [ ] 需求已拆解为子任务
- [ ] 技术规划已创建并关联需求
- [ ] 技术规划子任务可测试
- [ ] 实施任务已创建并关联规划
- [ ] 任务状态已正确设置（pending/in_progress/completed）
- [ ] 常规操作已标记为流水账

## MCP 工具速查

```javascript
// 查询任务
get_todos({workspace, status, tagId})              // 获取任务列表
search_todos({keyword, workspace, status})         // 模糊搜索（status: pending/in_progress/completed）
get_todos_by_tag({tagId, workspace, status})       // 按标签查询

// 管理任务
create_todo({
  text,                    // 任务内容（必填）
  workspace,               // 工作区路径
  tagIds,                  // 标签ID列表
  status,                  // 初始状态: pending/in_progress/completed（默认 pending）
  artifact                 // Markdown 格式产物/报告
})                        // 创建任务
update_todo({
  id,                      // 任务ID（必填）
  text,                    // 更新内容
  status,                  // 更新状态: pending/in_progress/completed
  completed,               // 完成状态（与 status 同步）
  tagIds,                  // 更新标签
  artifact,                // 更新产物
  workspace                // 修改工作区
})                        // 更新任务
toggle_todo({id})         // 切换完成状态（快捷方式）
create_subtask({todoId, text})  // 创建子任务

// 管理标签
create_tag({name, color}) // 创建标签（需求/技术规划/实施/流水账）
get_tags()                // 获取所有标签

// 工作区
get_workspaces()          // 获取工作区列表
create_workspace({name, color})  // 创建工作区
```

## 注意事项

1. **必须打标签**：每个任务必须有且只有一个主标签（需求/技术规划/实施/流水账）
2. **必须原子化**：需求和技术规划必须拆解为可验证的子任务
3. **必须查背景**：每次用户请求先查询相关历史任务
4. **必须管理状态**：任务状态（pending/in_progress/completed）必须准确反映实际进度
5. **关联记录**：技术规划和实施任务要关联到对应的需求
6. **及时更新**：任务状态变化时立即更新，保持状态准确
