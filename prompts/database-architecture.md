# 数据库架构设计

## 架构概览

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  TodoList    │  │  TodoInput   │  │  TodoFilter  │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         └──────────────────┼──────────────────┘             │
│                            │ useTodos()                     │
└────────────────────────────┼────────────────────────────────┘
                             │ API Calls
┌────────────────────────────┼────────────────────────────────┐
│                        Backend                               │
│  ┌─────────────────────────┴─────────────────────────┐      │
│  │                  API Routes                        │      │
│  │  GET/POST /api/todos                               │      │
│  │  GET/PATCH/DELETE /api/todos/:id                   │      │
│  │  GET/POST /api/tags                                │      │
│  │  GET/PATCH/DELETE /api/tags/:id                    │      │
│  └─────────────────────────┬─────────────────────────┘      │
│                            │ DatabaseFactory.create()       │
│         ┌──────────────────┼──────────────────┐             │
│         ▼                  ▼                  ▼             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  SQLiteDB    │  │  RemoteDB    │  │  OtherDB     │      │
│  │  (本地文件)   │  │  (REST API)  │  │  (自定义)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 核心接口设计

### 1. 数据库连接接口 (IDatabase)

```typescript
interface IDatabase {
  readonly isConnected: boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // 数据仓库
  todos: ITodoRepository;
  tags: ITagRepository;
  
  // 事务和迁移
  transaction<T>(callback: (tx) => Promise<T>): Promise<T>;
  migrate(): Promise<void>;
}
```

### 2. 数据仓库接口 (Repository Pattern)

```typescript
interface ITodoRepository {
  findAll(): Promise<Todo[]>;
  findById(id: string): Promise<Todo | null>;
  findByTag(tagId: string): Promise<Todo[]>;
  create(data: Omit<Todo, "id">): Promise<Todo>;
  update(id: string, data: Partial<Todo>): Promise<Todo | null>;
  delete(id: string): Promise<boolean>;
  setTags(todoId: string, tagIds: string[]): Promise<boolean>;
}

interface ITagRepository {
  findAll(): Promise<Tag[]>;
  create(data: Omit<Tag, "id">): Promise<Tag>;
  update(id: string, data: Partial<Tag>): Promise<Tag | null>;
  delete(id: string): Promise<boolean>;
  getTodoCount(tagId: string): Promise<number>;
}
```

## 切换到远程数据库

### 方式一：修改数据库工厂配置

```typescript
// lib/db/factory.ts
export class DatabaseFactory {
  static createDefault(): IDatabase {
    // 从本地 SQLite 切换到远程
    // return this.createLocal("./data/todos.db");
    return this.createRemote(
      "https://api.example.com",
      process.env.API_KEY
    );
  }
}
```

### 方式二：环境变量配置

```typescript
// lib/db/factory.ts
export class DatabaseFactory {
  static createFromEnv(): IDatabase {
    const dbType = process.env.DATABASE_TYPE || "sqlite";
    
    switch (dbType) {
      case "sqlite":
        return this.createLocal(process.env.SQLITE_PATH || "./data/todos.db");
      
      case "remote":
        return this.createRemote(
          process.env.REMOTE_URL!,
          process.env.REMOTE_API_KEY
        );
      
      default:
        throw new Error(`Unknown database type: ${dbType}`);
    }
  }
}
```

环境变量配置 (`.env.local`):
```bash
# 使用 SQLite
DATABASE_TYPE=sqlite
SQLITE_PATH=./data/todos.db

# 或使用远程数据库
DATABASE_TYPE=remote
REMOTE_URL=https://api.example.com
REMOTE_API_KEY=your-api-key
```

### 方式三：运行时切换

```typescript
// app/api/db.ts - 根据请求头切换
export function getDatabase(): IDatabase {
  const useRemote = process.env.USE_REMOTE === "true";
  
  if (!globalForDb.db) {
    globalForDb.db = useRemote
      ? DatabaseFactory.createRemote(
          process.env.REMOTE_URL!,
          process.env.REMOTE_API_KEY
        )
      : DatabaseFactory.createLocal(process.env.SQLITE_PATH || "./data/todos.db");
  }
  return globalForDb.db;
}
```

## 添加新的数据库实现

以 MySQL 为例：

```typescript
// lib/db/mysql.ts
import { IDatabase, ITodoRepository, ITagRepository } from "./types";

export class MySQLDatabase implements IDatabase {
  private connection: mysql.Connection;
  public todos!: ITodoRepository;
  public tags!: ITagRepository;

  constructor(private config: mysql.ConnectionConfig) {}

  async connect(): Promise<void> {
    this.connection = await mysql.createConnection(this.config);
    this.todos = new MySQLTodoRepository(this.connection);
    this.tags = new MySQLTagRepository(this.connection);
    await this.migrate();
  }

  async migrate(): Promise<void> {
    // 创建表...
  }

  // ... 其他方法
}

// lib/db/factory.ts
export class DatabaseFactory {
  static createMySQL(config: mysql.ConnectionConfig): IDatabase {
    return new MySQLDatabase(config);
  }
}
```

## 数据库表结构

### SQLite 表定义

```sql
-- 任务表
CREATE TABLE todos (
  id TEXT PRIMARY KEY,
  text TEXT NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 标签表
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);

-- 多对多关联表
CREATE TABLE todo_tags (
  todo_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (todo_id, tag_id),
  FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
```

## 事务使用示例

```typescript
const db = getDatabase();

await db.transaction(async (tx) => {
  try {
    // 创建任务
    const todo = await db.todos.create({ text: "新任务", tagIds: [] });
    
    // 创建标签并关联
    const tag = await db.tags.create({ name: "紧急", color: "red" });
    await db.todos.addTag(todo.id, tag.id);
    
    // 提交事务
    await tx.commit();
  } catch (error) {
    // 回滚事务
    await tx.rollback();
    throw error;
  }
});
```

## 文件结构

```
lib/
├── db/
│   ├── types.ts          # 数据库接口定义
│   ├── sqlite.ts         # SQLite 实现
│   ├── remote.ts         # 远程数据库实现
│   ├── factory.ts        # 数据库工厂
│   └── index.ts          # 统一导出
├── api/
│   └── client.ts         # 前端 API 客户端
└── hooks/
    └── useTodos.ts       # 数据管理 Hook

app/
└── api/
    ├── db.ts             # 后端数据库连接
    ├── todos/
    │   └── route.ts      # Todo REST API
    ├── todos/[id]/
    │   └── route.ts      # 单个 Todo API
    ├── tags/
    │   └── route.ts      # Tag REST API
    └── tags/[id]/
        └── route.ts      # 单个 Tag API
```

## 优势

1. **接口抽象**: 业务逻辑与存储实现解耦
2. **易于测试**: 可注入 Mock 数据库
3. **灵活切换**: 一行代码切换存储后端
4. **类型安全**: TypeScript 全程类型检查
5. **扩展性**: 轻松添加新的数据库实现
