# 单元测试指南

## 快速开始

```bash
# 运行所有测试
npm test

# 运行特定文件
npm test -- Button.test.tsx

# 监视模式
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage
```

## 测试结果

```
Test Suites: 6 passed, 6 total
Tests:       71 passed, 71 total
Time:        ~2s
```

## 测试架构

```
__tests__/
├── utils/
│   ├── mockDatabase.ts      # Mock 数据库实现（内存存储）
│   └── testUtils.tsx        # 测试工具和辅助函数
├── db/
│   └── mockDatabase.test.ts # 数据库层测试 (31 tests)
├── api/
│   └── client.test.ts       # API 客户端测试 (16 tests)
├── components/
│   ├── ui/
│   │   ├── Button.test.tsx  # UI 组件测试 (9 tests)
│   │   └── Tag.test.tsx     # 标签组件测试 (8 tests)
│   └── todo/
│       └── TodoItem.test.tsx # 任务项测试 (8 tests)
└── hooks/
    └── useTodos.test.tsx    # 数据管理 Hook 测试 (10 tests)
```

## 测试分类

### 1. 数据库层测试 (31 tests)

使用 `MockDatabase` 测试业务逻辑，无需真实数据库：

```typescript
import { MockDatabase } from "../utils/mockDatabase";

describe("TodoRepository", () => {
  let db: MockDatabase;

  beforeEach(async () => {
    db = new MockDatabase();
    await db.connect();
  });

  afterEach(() => {
    db.disconnect();
  });

  it("should create todo", async () => {
    const todo = await db.todos.create({
      text: "Test",
      completed: false,
      tagIds: [],
    });

    expect(todo.text).toBe("Test");
  });
});
```

**测试覆盖：**
- ✅ 连接管理 (connect/disconnect)
- ✅ Todo CRUD (create, read, update, delete)
- ✅ Todo 筛选 (by status, by tag)
- ✅ 标签关联 (setTags, addTag, removeTag)
- ✅ Tag CRUD
- ✅ **SubTask CRUD** (新增)
- ✅ **SubTask 统计** (新增)
- ✅ 批量操作 (batchDelete, clearCompleted)
- ✅ 事务支持
- ✅ 数据种子和重置

### 2. 组件测试 (17 tests)

使用 React Testing Library：

```typescript
import { render, screen } from "../utils/testUtils";
import { Button } from "@/app/components/ui/Button";

describe("Button", () => {
  it("renders correctly", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText("Click me")).toBeInTheDocument();
  });

  it("handles click", async () => {
    const handleClick = jest.fn();
    const { user } = render(<Button onClick={handleClick}>Click</Button>);

    await user.click(screen.getByText("Click"));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

**测试覆盖：**
- ✅ Button (9 tests) - 变体、尺寸、加载状态、图标
- ✅ Tag (8 tests) - 颜色、点击、删除
- ✅ TodoItem (8 tests) - 交互、标签编辑

### 3. Hook 测试 (10 tests)

使用 `renderHook` 和 `act`：

```typescript
import { renderHook, waitFor, act } from "@testing-library/react";
import { useTodos } from "@/lib/hooks/useTodos";

describe("useTodos", () => {
  it("loads todos on mount", async () => {
    const { result } = renderHook(() => useTodos());

    expect(result.current.isLoading).toBe(true);
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.todos).toBeDefined();
  });

  it("adds subtask", async () => {
    const { result } = renderHook(() => useTodos());
    
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.addSubTask("todo-1", "SubTask");
    });

    expect(result.current.subTasks["todo-1"]).toHaveLength(1);
  });
});
```

**测试覆盖：**
- ✅ 数据加载
- ✅ 错误处理
- ✅ addTodo/toggleTodo/deleteTodo
- ✅ updateTodoTags
- ✅ createTag
- ✅ clearCompleted
- ✅ refetch
- ✅ **addSubTask/toggleSubTask/deleteSubTask** (新增)

### 4. API 客户端测试 (16 tests)

Mock fetch API：

```typescript
import { mockFetchResponse, mockFetchError } from "../utils/testUtils";

describe("todoApi", () => {
  it("fetches todos", async () => {
    mockFetchResponse([{ id: "1", text: "Test" }]);

    const todos = await api.todos.getAll();

    expect(todos).toHaveLength(1);
  });

  it("fetches subtasks", async () => {
    mockFetchResponse([{ id: "1", text: "SubTask", completed: false }]);

    const subTasks = await api.subTasks.getByTodoId("todo-1");

    expect(subTasks).toHaveLength(1);
  });
});
```

**测试覆盖：**
- ✅ Todo API (GET/POST/PATCH/DELETE)
- ✅ Tag API
- ✅ **SubTask API** (新增)
- ✅ 错误处理 (404, 500, network)

## 测试工具

### 数据工厂

```typescript
import { 
  createTodo, 
  createTag, 
  createSubTask,  // 新增
  createTodos, 
  createTags,
  createSubTasks,  // 新增
} from "../utils/testUtils";

// 创建单个实体
const todo = createTodo({ text: "Custom text" });
const tag = createTag({ name: "Work", color: "blue" });
const subTask = createSubTask({ todoId: "todo-1", text: "SubTask" });

// 批量创建
const todos = createTodos(5);      // 5个随机 todo
const tags = createTags(3);        // 3个随机 tag
const subTasks = createSubTasks(3, "todo-1");  // 3个随机 subtask
```

### Mock 辅助

```typescript
import {
  mockFetchResponse,      // 模拟成功响应
  mockFetchError,         // 模拟 HTTP 错误
  mockFetchNetworkError,  // 模拟网络错误
} from "../utils/testUtils";

// Mock 数据库
import { MockDatabase, resetMockDatabase } from "../utils/mockDatabase";
```

### 自定义渲染

```typescript
import { render, screen } from "../utils/testUtils";

// 自动包含 userEvent setup
const { user } = render(<Component />);
await user.click(screen.getByRole("button"));
```

## 测试最佳实践

1. **AAA 模式**: Arrange → Act → Assert
2. **一个概念一个测试**: 每个测试只验证一个行为
3. **使用 waitFor**: 处理异步状态更新
4. **使用 act**: 包裹会导致状态更新的操作
5. **清理**: beforeEach 中重置 mocks 和数据库

## 覆盖率目标

| 类型 | 目标 | 当前状态 |
|------|------|----------|
| Statements | 70% | ✅ 满足 |
| Branches | 70% | ✅ 满足 |
| Functions | 70% | ✅ 满足 |
| Lines | 70% | ✅ 满足 |

查看覆盖率报告：
```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

## 添加新测试

1. **数据库测试**: `__tests__/db/yourFeature.test.ts`
2. **组件测试**: `__tests__/components/path/Component.test.tsx`
3. **Hook 测试**: `__tests__/hooks/useHook.test.ts`
4. **API 测试**: `__tests__/api/feature.test.ts`

## CI/CD 集成

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm test -- --coverage
```
