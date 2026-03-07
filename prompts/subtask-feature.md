# 子任务功能实现文档

## 功能概述

每个 Todo 任务现在可以拥有多个子任务（SubTask），子任务具有独立的完成状态，但没有标签功能。

## 数据模型

```typescript
interface SubTask {
  id: string;           // 唯一标识
  todoId: string;       // 所属任务 ID
  text: string;         // 子任务内容
  completed: boolean;   // 完成状态
  createdAt: Date;      // 创建时间
  order: number;        // 排序序号
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: Date;
  tagIds: string[];
  subTasks?: SubTask[]; // 子任务列表
}
```

## 数据库设计

### SQLite 表结构

```sql
-- 子任务表
CREATE TABLE sub_tasks (
  id TEXT PRIMARY KEY,
  todo_id TEXT NOT NULL,
  text TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
);

-- 索引
CREATE INDEX idx_sub_tasks_todo_id ON sub_tasks(todo_id);
CREATE INDEX idx_sub_tasks_order ON sub_tasks("order");
```

## API 接口

### 子任务 API

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/todos/:id/subtasks` | 获取任务的所有子任务 |
| POST | `/api/todos/:id/subtasks` | 创建子任务 |
| DELETE | `/api/todos/:id/subtasks` | 删除任务的所有子任务 |
| POST | `/api/todos/:id/subtasks/reorder` | 重新排序子任务 |
| GET | `/api/subtasks/:id` | 获取单个子任务 |
| PATCH | `/api/subtasks/:id` | 更新子任务 |
| DELETE | `/api/subtasks/:id` | 删除子任务 |

### 客户端 API

```typescript
// 获取子任务
const subTasks = await api.subTasks.getByTodoId(todoId);

// 创建子任务
const newSubTask = await api.subTasks.create(todoId, "子任务内容");

// 更新子任务
await api.subTasks.update(subTaskId, { text: "新内容", completed: true });

// 切换完成状态
await api.subTasks.toggle(subTaskId, true);

// 删除子任务
await api.subTasks.delete(subTaskId);

// 重新排序
await api.subTasks.reorder(todoId, [subTaskId1, subTaskId2, ...]);
```

## 组件

### SubTaskList 组件

显示子任务列表、进度条，支持添加、编辑、删除子任务。

```tsx
<SubTaskList
  todoId={todo.id}
  subTasks={subTasks}
  onAdd={addSubTask}
  onToggle={toggleSubTask}
  onDelete={deleteSubTask}
  onUpdateText={updateSubTask}
/>
```

### TodoItem 组件更新

- 显示子任务计数徽章（已完成/总数）
- 点击徽章展开/收起子任务列表
- 没有子任务时可快速添加

## 界面交互

```
┌─────────────────────────────────────────────┐
│ ○ 主任务内容                          🏷️ 🗑️ │
│    [标签1] [标签2]                           │
├─────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────┐ │
│ │ 子任务进度                  2/4        │ │
│ │ ████████████░░░░░░░░░░░░░░░░ 50%      │ │
│ ├─────────────────────────────────────────┤ │
│ │ ○ 子任务 1                              │ │
│ │ ○ 子任务 2                              │ │
│ │ ● 子任务 3（已完成）                    │ │
│ │ ● 子任务 4（已完成）                    │ │
│ ├─────────────────────────────────────────┤ │
│ │ + 添加子任务                            │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

## 使用 Hook

```typescript
const {
  todos,
  tags,
  subTasks,           // Record<string, SubTask[]>
  loadSubTasks,       // (todoId: string) => Promise<void>
  addSubTask,         // (todoId: string, text: string) => Promise<void>
  toggleSubTask,      // (subTaskId: string, completed: boolean) => Promise<void>
  deleteSubTask,      // (subTaskId: string) => Promise<void>
  updateSubTask,      // (subTaskId: string, text: string) => Promise<void>
} = useTodos();
```

## 特性

1. **层级关系**：子任务属于某个主任务，主任务删除时级联删除所有子任务
2. **独立状态**：子任务有自己的完成状态，不影响主任务状态
3. **进度显示**：显示子任务完成进度条和计数
4. **拖拽排序**：支持重新排序子任务（通过 reorder API）
5. **快速编辑**：点击子任务文本可直接编辑
6. **即时添加**：展开子任务区域后可快速添加新子任务

## 测试覆盖

- ✅ SubTask Repository (MockDatabase)
- ✅ SubTask API 客户端
- ✅ SubTaskList 组件
- ✅ TodoItem 子任务交互

## 数据库抽象

子任务功能同样遵循数据库抽象原则：

```typescript
interface ISubTaskRepository {
  findById(id: string): Promise<SubTask | null>;
  findByTodoId(todoId: string): Promise<SubTask[]>;
  create(input: CreateSubTaskInput): Promise<SubTask>;
  update(id: string, data: UpdateSubTaskInput): Promise<SubTask | null>;
  delete(id: string): Promise<boolean>;
  deleteByTodoId(todoId: string): Promise<number>;
  reorder(todoId: string, subTaskIds: string[]): Promise<boolean>;
  getCompletedCount(todoId: string): Promise<number>;
  getTotalCount(todoId: string): Promise<number>;
}
```

支持 SQLite 和 Remote 两种实现，切换方式与主任务相同。
