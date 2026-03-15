# TaskBoard MCP 服务

## 核心规则

1. **每次交互必须先查询背景**：`get_workspaces` → `search_todos` → `get_pending_approvals`
2. **Agent 不能审批任务**，只能将完成后的任务状态改为 `pending` 等待用户验收
3. **只有用户能审批**：通过 Web 界面或 `approve_todo` 工具
4. **任务结束标志**：`status: completed` + `approvalStatus: approved`（可被复用参考）

---

## 任务状态流程

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│  创建任务                                                         │
│  status: pending, approvalStatus: pending                        │
│       ↓                                                          │
│  用户审批通过                                                      │
│  approvalStatus: approved                                        │
│       ↓                                                          │
│  Agent 开始处理                                                   │
│  status: in_progress                                             │
│       ↓                                                          │
│  Agent 处理完成，提交验收                                          │
│  status: completed, approvalStatus: pending  ← Agent 只能改到这里  │
│       ↓                                                          │
│  用户验收通过                                                      │
│  approvalStatus: approved                                        │
│       ↓                                                          │
│  ✅ 任务结束（可复用参考）                                          │
│  status: completed, approvalStatus: approved                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 状态组合含义

| status | approvalStatus | 含义 | Agent 行为 |
|--------|---------------|------|-----------|
| pending | pending | 待审批 | 等待用户审批 |
| pending | approved | 已审批，待处理 | 可开始执行 |
| in_progress | approved | 处理中 | 继续执行 |
| completed | pending | 已完成，待验收 | 等待用户验收 |
| completed | approved | ✅ 任务结束 | 可作为参考复用 |
| * | rejected | 已拒绝 | 重新讨论方案 |

---

## 标签体系

标签用于任务的**维度切分**，目的是：
- 快速检索相关任务
- 准确归档任务上下文
- **确保任务参考范围的准确性**

### 标签类型

| 标签 | 颜色 | 用途 | 审批 |
|------|------|------|------|
| 需求 | blue | 功能/项目背景描述 | ✅ 需要 |
| 技术规划 | violet | 架构设计、技术选型 | ✅ 需要 |
| 实施 | cyan | 具体代码实现 | ✅ 需要 |
| 流水账 | slate | 日常常规操作 | ❌ 无需 |

### 分支标签（必须添加）

**每个任务必须关联其出现的 Git 分支**，确保任务上下文可追溯：

```
格式：分支:feature/login
颜色：amber
```

### 创建任务时的标签规则

```javascript
create_todo({
  workspaceId,
  text: "[类型] 任务标题",
  tagIds: [
    "需求/技术规划/实施/流水账",  // 类型标签
    "分支:feature/xxx"            // 分支标签（必须）
  ]
})
```

### 创建新标签时

```javascript
// 发现新分支时，创建对应分支标签
create_tag({
  name: "分支:feature/new-feature",
  color: "amber"
})
```

---

## 工作流程

### 1. 每次交互开始
```javascript
get_workspaces()                    // 确定工作区
search_todos({ keyword })           // 搜索相关背景
get_pending_approvals({ workspaceId }) // 检查待审批
```

### 2. 创建任务
```javascript
create_todo({
  workspaceId,
  text: "[类型] 任务标题",
  tagIds: ["标签ID"],
  approvalStatus: "pending"  // 默认等待审批
})
```

### 3. 开始执行（审批通过后）
```javascript
update_todo({ id, workspaceId, status: "in_progress" })
```

### 4. 完成提交验收
```javascript
update_todo({
  id,
  workspaceId,
  status: "completed",
  approvalStatus: "pending"  // 重置为 pending 等待验收
})
```

---

## MCP 工具速查

### 查询（每次交互必须）
```javascript
get_workspaces({ path })                    // 获取/匹配工作区
search_todos({ workspaceId, keyword })      // 模糊搜索
get_todos({ workspaceId, status, tagId })   // 获取任务列表
get_pending_approvals({ workspaceId })      // 待审批列表
get_subtasks({ workspaceId, todoId })       // 获取子任务
get_tags()                                  // 获取标签
```

### 任务管理
```javascript
create_todo({ workspaceId, text, tagIds, artifact, approvalStatus })
update_todo({ id, workspaceId, text, status, approvalStatus, artifact })
delete_todo({ id })
toggle_todo({ id })

// 子任务（最多10条）
create_subtask({ workspaceId, todoId, text })
update_subtask({ id, text, completed, artifact })
delete_subtask({ id })
toggle_subtask({ id, completed })

// 产物
update_todo_artifact({ todoId, artifact })
update_subtask_artifact({ subTaskId, artifact })
```

### 用户操作（Agent 不可调用）
```javascript
approve_todo({ id, workspaceId, approvalStatus: "approved" | "rejected" })
```

---

## 检查清单

### 创建任务时
- [ ] 已查询相关历史任务
- [ ] 标题格式：`[类型] 描述`
- [ ] 已添加类型标签（需求/技术规划/实施/流水账）
- [ ] 已添加分支标签（格式：`分支:xxx`）
- [ ] 已设置 `approvalStatus: "pending"`
- [ ] 已告知用户需要审批

### 开始执行前
- [ ] 已确认 `approvalStatus: "approved"`

### 完成任务时
- [ ] `status: "completed"`
- [ ] `approvalStatus: "pending"`（提交验收）
- [ ] 已更新 artifact 记录实施细节

---

## 禁止事项

- ❌ Agent 调用 `approve_todo`
- ❌ 跳过审批直接执行（流水账除外）
- ❌ 假设审批通过而不查询确认
- ❌ 创建超过 10 个子任务
- ❌ 不查询背景就开始工作
