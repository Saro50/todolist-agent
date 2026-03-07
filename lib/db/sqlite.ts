/**
 * SQLite 数据库实现
 * 
 * 使用 better-sqlite3 作为底层驱动
 * 特点：
 * - 同步 API，性能更好
 * - 本地文件存储，无需服务器
 * - 支持完整 SQL 功能
 */

import Database from "better-sqlite3";
import { 
  Todo, 
  Tag, 
  SubTask, 
  CreateSubTaskInput, 
  UpdateSubTaskInput 
} from "@/app/types";
import {
  IDatabase,
  ITodoRepository,
  ITagRepository,
  ISubTaskRepository,
  TransactionContext,
  DatabaseConfig,
  ConnectionError,
  NotFoundError,
} from "./types";

// ==================== SQLite Todo Repository ====================

class SQLiteTodoRepository implements ITodoRepository {
  constructor(private db: Database.Database) {}

  async findAll(): Promise<Todo[]> {
    const stmt = this.db.prepare(`
      SELECT t.*, GROUP_CONCAT(tt.tag_id) as tag_ids
      FROM todos t
      LEFT JOIN todo_tags tt ON t.id = tt.todo_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    
    const rows = stmt.all() as any[];
    return rows.map(this.rowToTodo);
  }

  async findById(id: string): Promise<Todo | null> {
    const stmt = this.db.prepare(`
      SELECT t.*, GROUP_CONCAT(tt.tag_id) as tag_ids
      FROM todos t
      LEFT JOIN todo_tags tt ON t.id = tt.todo_id
      WHERE t.id = ?
      GROUP BY t.id
    `);
    
    const row = stmt.get(id) as any;
    return row ? this.rowToTodo(row) : null;
  }

  async findByTag(tagId: string): Promise<Todo[]> {
    const stmt = this.db.prepare(`
      SELECT t.*, GROUP_CONCAT(tt2.tag_id) as tag_ids
      FROM todos t
      INNER JOIN todo_tags tt ON t.id = tt.todo_id AND tt.tag_id = ?
      LEFT JOIN todo_tags tt2 ON t.id = tt2.todo_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    
    const rows = stmt.all(tagId) as any[];
    return rows.map(this.rowToTodo);
  }

  async findByStatus(completed: boolean): Promise<Todo[]> {
    const stmt = this.db.prepare(`
      SELECT t.*, GROUP_CONCAT(tt.tag_id) as tag_ids
      FROM todos t
      LEFT JOIN todo_tags tt ON t.id = tt.todo_id
      WHERE t.completed = ?
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    
    const rows = stmt.all(completed ? 1 : 0) as any[];
    return rows.map(this.rowToTodo);
  }

  async create(todo: Omit<Todo, "id" | "createdAt" | "subTasks">): Promise<Todo> {
    const id = Date.now().toString();
    const createdAt = new Date();

    const insertTodo = this.db.prepare(`
      INSERT INTO todos (id, text, completed, created_at, artifact)
      VALUES (?, ?, ?, ?, ?)
    `);

    insertTodo.run(id, todo.text, todo.completed ? 1 : 0, createdAt.toISOString(), todo.artifact || null);

    // 插入标签关联
    if (todo.tagIds && todo.tagIds.length > 0) {
      const insertTag = this.db.prepare(`
        INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)
      `);
      for (const tagId of todo.tagIds) {
        insertTag.run(id, tagId);
      }
    }

    return {
      id,
      text: todo.text,
      completed: todo.completed,
      createdAt,
      tagIds: todo.tagIds || [],
      artifact: todo.artifact,
    };
  }

  async update(id: string, data: Partial<Omit<Todo, "subTasks">>): Promise<Todo | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.text !== undefined) {
      updates.push("text = ?");
      values.push(data.text);
    }
    if (data.completed !== undefined) {
      updates.push("completed = ?");
      values.push(data.completed ? 1 : 0);
    }
    if (data.artifact !== undefined) {
      updates.push("artifact = ?");
      values.push(data.artifact);
    }

    if (updates.length > 0) {
      const stmt = this.db.prepare(`
        UPDATE todos SET ${updates.join(", ")} WHERE id = ?
      `);
      stmt.run(...values, id);
    }

    // 更新标签关联
    if (data.tagIds !== undefined) {
      const deleteTags = this.db.prepare("DELETE FROM todo_tags WHERE todo_id = ?");
      deleteTags.run(id);

      if (data.tagIds.length > 0) {
        const insertTag = this.db.prepare(`
          INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)
        `);
        for (const tagId of data.tagIds) {
          insertTag.run(id, tagId);
        }
      }
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    // 先删除子任务
    const deleteSubTasks = this.db.prepare("DELETE FROM sub_tasks WHERE todo_id = ?");
    deleteSubTasks.run(id);

    // 删除标签关联（外键约束）
    const deleteTags = this.db.prepare("DELETE FROM todo_tags WHERE todo_id = ?");
    deleteTags.run(id);

    const stmt = this.db.prepare("DELETE FROM todos WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async batchDelete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => "?").join(",");
    
    // 删除子任务
    const deleteSubTasks = this.db.prepare(`
      DELETE FROM sub_tasks WHERE todo_id IN (${placeholders})
    `);
    deleteSubTasks.run(...ids);

    // 删除标签关联
    const deleteTags = this.db.prepare(`
      DELETE FROM todo_tags WHERE todo_id IN (${placeholders})
    `);
    deleteTags.run(...ids);

    // 删除任务
    const deleteTodos = this.db.prepare(`
      DELETE FROM todos WHERE id IN (${placeholders})
    `);
    const result = deleteTodos.run(...ids);
    
    return result.changes;
  }

  async clearCompleted(): Promise<number> {
    // 获取已完成的任务 ID
    const findStmt = this.db.prepare("SELECT id FROM todos WHERE completed = 1");
    const rows = findStmt.all() as { id: string }[];
    const ids = rows.map((r) => r.id);

    return this.batchDelete(ids);
  }

  async addTag(todoId: string, tagId: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO todo_tags (todo_id, tag_id) VALUES (?, ?)
      `);
      const result = stmt.run(todoId, tagId);
      return result.changes > 0;
    } catch {
      return false;
    }
  }

  async removeTag(todoId: string, tagId: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      DELETE FROM todo_tags WHERE todo_id = ? AND tag_id = ?
    `);
    const result = stmt.run(todoId, tagId);
    return result.changes > 0;
  }

  async setTags(todoId: string, tagIds: string[]): Promise<boolean> {
    const deleteStmt = this.db.prepare("DELETE FROM todo_tags WHERE todo_id = ?");
    deleteStmt.run(todoId);

    if (tagIds.length === 0) return true;

    const insertStmt = this.db.prepare(`
      INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)
    `);

    for (const tagId of tagIds) {
      insertStmt.run(todoId, tagId);
    }

    return true;
  }

  async updateArtifact(todoId: string, artifact: string | null): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE todos SET artifact = ? WHERE id = ?
    `);
    const result = stmt.run(artifact, todoId);
    return result.changes > 0;
  }

  private rowToTodo(row: any): Todo {
    return {
      id: row.id,
      text: row.text,
      completed: Boolean(row.completed),
      createdAt: new Date(row.created_at),
      tagIds: row.tag_ids ? row.tag_ids.split(",") : [],
      artifact: row.artifact || undefined,
    };
  }
}

// ==================== SQLite Tag Repository ====================

class SQLiteTagRepository implements ITagRepository {
  constructor(private db: Database.Database) {}

  async findAll(): Promise<Tag[]> {
    const stmt = this.db.prepare("SELECT * FROM tags ORDER BY name");
    const rows = stmt.all() as any[];
    return rows.map(this.rowToTag);
  }

  async findById(id: string): Promise<Tag | null> {
    const stmt = this.db.prepare("SELECT * FROM tags WHERE id = ?");
    const row = stmt.get(id) as any;
    return row ? this.rowToTag(row) : null;
  }

  async findByIds(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) return [];
    
    const placeholders = ids.map(() => "?").join(",");
    const stmt = this.db.prepare(`SELECT * FROM tags WHERE id IN (${placeholders})`);
    const rows = stmt.all(...ids) as any[];
    return rows.map(this.rowToTag);
  }

  async create(tag: Omit<Tag, "id">): Promise<Tag> {
    const id = Date.now().toString();

    const stmt = this.db.prepare(`
      INSERT INTO tags (id, name, color) VALUES (?, ?, ?)
    `);
    stmt.run(id, tag.name, tag.color);

    return { id, ...tag };
  }

  async update(id: string, data: Partial<Tag>): Promise<Tag | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.color !== undefined) {
      updates.push("color = ?");
      values.push(data.color);
    }

    if (updates.length > 0) {
      const stmt = this.db.prepare(`
        UPDATE tags SET ${updates.join(", ")} WHERE id = ?
      `);
      stmt.run(...values, id);
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    // 删除标签关联
    const deleteLinks = this.db.prepare("DELETE FROM todo_tags WHERE tag_id = ?");
    deleteLinks.run(id);

    const stmt = this.db.prepare("DELETE FROM tags WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async getTodoCount(tagId: string): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM todo_tags WHERE tag_id = ?
    `);
    const row = stmt.get(tagId) as any;
    return row?.count || 0;
  }

  private rowToTag(row: any): Tag {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
    };
  }
}

// ==================== SQLite SubTask Repository ====================

class SQLiteSubTaskRepository implements ISubTaskRepository {
  constructor(private db: Database.Database) {}

  async findById(id: string): Promise<SubTask | null> {
    const stmt = this.db.prepare("SELECT * FROM sub_tasks WHERE id = ?");
    const row = stmt.get(id) as any;
    return row ? this.rowToSubTask(row) : null;
  }

  async findByTodoId(todoId: string): Promise<SubTask[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM sub_tasks 
      WHERE todo_id = ? 
      ORDER BY "order" ASC, created_at ASC
    `);
    const rows = stmt.all(todoId) as any[];
    return rows.map(this.rowToSubTask);
  }

  async create(input: CreateSubTaskInput): Promise<SubTask> {
    const id = Date.now().toString();
    const createdAt = new Date();

    // 获取当前最大 order
    const maxOrderStmt = this.db.prepare(`
      SELECT MAX("order") as max_order FROM sub_tasks WHERE todo_id = ?
    `);
    const maxOrderRow = maxOrderStmt.get(input.todoId) as any;
    const order = (maxOrderRow?.max_order || 0) + 1;

    const stmt = this.db.prepare(`
      INSERT INTO sub_tasks (id, todo_id, text, completed, created_at, "order", artifact)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, input.todoId, input.text, 0, createdAt.toISOString(), order, null);

    return {
      id,
      todoId: input.todoId,
      text: input.text,
      completed: false,
      createdAt,
      order,
    };
  }

  async update(id: string, data: UpdateSubTaskInput): Promise<SubTask | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.text !== undefined) {
      updates.push("text = ?");
      values.push(data.text);
    }
    if (data.completed !== undefined) {
      updates.push("completed = ?");
      values.push(data.completed ? 1 : 0);
    }
    if (data.order !== undefined) {
      updates.push("\"order\" = ?");
      values.push(data.order);
    }
    if (data.artifact !== undefined) {
      updates.push("artifact = ?");
      values.push(data.artifact);
    }

    if (updates.length > 0) {
      const stmt = this.db.prepare(`
        UPDATE sub_tasks SET ${updates.join(", ")} WHERE id = ?
      `);
      stmt.run(...values, id);
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const stmt = this.db.prepare("DELETE FROM sub_tasks WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async deleteByTodoId(todoId: string): Promise<number> {
    const stmt = this.db.prepare("DELETE FROM sub_tasks WHERE todo_id = ?");
    const result = stmt.run(todoId);
    return result.changes;
  }

  async reorder(todoId: string, subTaskIds: string[]): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE sub_tasks SET "order" = ? WHERE id = ? AND todo_id = ?
    `);

    for (let i = 0; i < subTaskIds.length; i++) {
      stmt.run(i, subTaskIds[i], todoId);
    }

    return true;
  }

  async getCompletedCount(todoId: string): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM sub_tasks WHERE todo_id = ? AND completed = 1
    `);
    const row = stmt.get(todoId) as any;
    return row?.count || 0;
  }

  async getTotalCount(todoId: string): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM sub_tasks WHERE todo_id = ?
    `);
    const row = stmt.get(todoId) as any;
    return row?.count || 0;
  }

  async updateArtifact(subTaskId: string, artifact: string | null): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE sub_tasks SET artifact = ? WHERE id = ?
    `);
    const result = stmt.run(artifact, subTaskId);
    return result.changes > 0;
  }

  private rowToSubTask(row: any): SubTask {
    return {
      id: row.id,
      todoId: row.todo_id,
      text: row.text,
      completed: Boolean(row.completed),
      createdAt: new Date(row.created_at),
      order: row.order,
      artifact: row.artifact || undefined,
    };
  }
}

// ==================== SQLite Database ====================

export class SQLiteDatabase implements IDatabase {
  private db: Database.Database | null = null;
  public todos!: ITodoRepository;
  public tags!: ITagRepository;
  public subTasks!: ISubTaskRepository;

  constructor(private config: { sqlitePath: string }) {}

  get isConnected(): boolean {
    return this.db !== null;
  }

  async connect(): Promise<void> {
    try {
      this.db = new Database(this.config.sqlitePath);
      
      // 启用外键约束
      this.db.pragma("journal_mode = WAL");
      this.db.pragma("foreign_keys = ON");

      // 初始化仓库
      this.todos = new SQLiteTodoRepository(this.db);
      this.tags = new SQLiteTagRepository(this.db);
      this.subTasks = new SQLiteSubTaskRepository(this.db);

      // 执行迁移
      await this.migrate();
    } catch (error) {
      throw new ConnectionError("Failed to connect to SQLite database", error);
    }
  }

  async disconnect(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  async migrate(): Promise<void> {
    if (!this.db) throw new ConnectionError("Database not connected");

    // 创建 todos 表（包含 artifact 字段）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        artifact TEXT
      );
    `);

    // 迁移：为已存在的表添加 artifact 列
    try {
      this.db.exec(`ALTER TABLE todos ADD COLUMN artifact TEXT`);
    } catch {
      // 列已存在，忽略错误
    }

    // 创建 tags 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL
      );
    `);

    // 创建关联表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todo_tags (
        todo_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (todo_id, tag_id),
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `);

    // 创建子任务表（包含 artifact 字段）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sub_tasks (
        id TEXT PRIMARY KEY,
        todo_id TEXT NOT NULL,
        text TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        "order" INTEGER NOT NULL DEFAULT 0,
        artifact TEXT,
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE
      );
    `);

    // 迁移：为已存在的 sub_tasks 表添加 artifact 列
    try {
      this.db.exec(`ALTER TABLE sub_tasks ADD COLUMN artifact TEXT`);
    } catch {
      // 列已存在，忽略错误
    }

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
      CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
      CREATE INDEX IF NOT EXISTS idx_todo_tags_todo_id ON todo_tags(todo_id);
      CREATE INDEX IF NOT EXISTS idx_todo_tags_tag_id ON todo_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_sub_tasks_todo_id ON sub_tasks(todo_id);
      CREATE INDEX IF NOT EXISTS idx_sub_tasks_order ON sub_tasks("order");
    `);
  }

  async reset(): Promise<void> {
    if (!this.db) throw new ConnectionError("Database not connected");

    this.db.exec(`
      DROP TABLE IF EXISTS sub_tasks;
      DROP TABLE IF EXISTS todo_tags;
      DROP TABLE IF EXISTS todos;
      DROP TABLE IF EXISTS tags;
    `);

    await this.migrate();
  }

  async transaction<T>(callback: (tx: TransactionContext) => Promise<T>): Promise<T> {
    if (!this.db) throw new ConnectionError("Database not connected");

    // better-sqlite3 使用同步事务
    const transaction = this.db.transaction(() => {
      const tx: TransactionContext = {
        commit: async () => {}, // SQLite 事务自动提交
        rollback: async () => { throw new Error("Rollback not supported in better-sqlite3"); },
      };
      return callback(tx);
    });

    return transaction();
  }
}
