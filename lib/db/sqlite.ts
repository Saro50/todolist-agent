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
  Workspace,
  CreateSubTaskInput, 
  UpdateSubTaskInput,
  CreateTodoInput,
  UpdateTodoInput,
  TaskStatus,
  TodoType
} from "@/app/types";
import {
  IDatabase,
  ITodoRepository,
  ITagRepository,
  ISubTaskRepository,
  IWorkspaceRepository,
  TransactionContext,
  DatabaseConfig,
  ConnectionError,
  NotFoundError,
} from "./types";

// ==================== SQLite Todo Repository ====================

class SQLiteTodoRepository implements ITodoRepository {
  constructor(private db: Database.Database) {}

  async findAll(workspacePath?: string, type?: 'task' | 'subtask'): Promise<Todo[]> {
    let sql = `
      SELECT t.*, GROUP_CONCAT(tt.tag_id) as tag_ids
      FROM todos t
      LEFT JOIN todo_tags tt ON t.id = tt.todo_id
    `;
    const conditions: string[] = [];
    const params: any[] = [];
    
    if (workspacePath) {
      conditions.push(`t.workspace_path = ?`);
      params.push(workspacePath);
    }
    
    if (type) {
      conditions.push(`t.type = ?`);
      params.push(type);
    }
    
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    sql += ` GROUP BY t.id ORDER BY t.created_at DESC`;
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map(this.rowToTodo);
  }

  async findAllPaginated(
    workspacePath?: string, 
    pagination?: { page: number; pageSize: number },
    filters?: { status?: string; tagId?: string; type?: 'task' | 'subtask' }
  ): Promise<{ data: Todo[]; total: number; page: number; pageSize: number; totalPages: number }> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    // 构建 WHERE 子句
    const whereConditions: string[] = [];
    const whereParams: any[] = [];
    
    if (workspacePath) {
      whereConditions.push(`t.workspace_path = ?`);
      whereParams.push(workspacePath);
    }
    
    if (filters?.status) {
      whereConditions.push(`t.status = ?`);
      whereParams.push(filters.status);
    }

    if (filters?.type) {
      whereConditions.push(`t.type = ?`);
      whereParams.push(filters.type);
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // 如果有标签筛选，使用子查询
    let tagJoin = '';
    let tagWhere = '';
    if (filters?.tagId) {
      tagJoin = `INNER JOIN todo_tags tt_filter ON t.id = tt_filter.todo_id`;
      tagWhere = `AND tt_filter.tag_id = ?`;
      whereParams.push(filters.tagId);
    }

    // 获取总数
    const total = await this.count(workspacePath, filters);
    const totalPages = Math.ceil(total / pageSize);

    // 获取分页数据
    let sql = `
      SELECT t.*, GROUP_CONCAT(tt.tag_id) as tag_ids
      FROM todos t
      ${tagJoin}
      LEFT JOIN todo_tags tt ON t.id = tt.todo_id
      ${whereClause}
      ${tagWhere}
    `;
    
    const params = [...whereParams];
    
    sql += ` GROUP BY t.id ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    
    return {
      data: rows.map(this.rowToTodo),
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  async count(workspacePath?: string, filters?: { status?: string; tagId?: string; type?: 'task' | 'subtask' }): Promise<number> {
    // 如果有标签筛选，使用子查询
    if (filters?.tagId) {
      let sql = `
        SELECT COUNT(DISTINCT t.id) as count 
        FROM todos t
        INNER JOIN todo_tags tt ON t.id = tt.todo_id
        WHERE tt.tag_id = ?
      `;
      const params: any[] = [filters.tagId];
      
      if (workspacePath) {
        sql += ` AND t.workspace_path = ?`;
        params.push(workspacePath);
      }
      
      if (filters?.status) {
        sql += ` AND t.status = ?`;
        params.push(filters.status);
      }

      if (filters?.type) {
        sql += ` AND t.type = ?`;
        params.push(filters.type);
      }
      
      const stmt = this.db.prepare(sql);
      const row = stmt.get(...params) as any;
      return row?.count || 0;
    }
    
    // 普通计数
    let sql = `SELECT COUNT(*) as count FROM todos`;
    const params: any[] = [];
    const conditions: string[] = [];
    
    if (workspacePath) {
      conditions.push(`workspace_path = ?`);
      params.push(workspacePath);
    }
    
    if (filters?.status) {
      conditions.push(`status = ?`);
      params.push(filters.status);
    }

    if (filters?.type) {
      conditions.push(`type = ?`);
      params.push(filters.type);
    }
    
    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params) as any;
    return row?.count || 0;
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

  async findByTag(tagId: string, workspacePath?: string): Promise<Todo[]> {
    let sql = `
      SELECT t.*, GROUP_CONCAT(tt2.tag_id) as tag_ids
      FROM todos t
      INNER JOIN todo_tags tt ON t.id = tt.todo_id AND tt.tag_id = ?
      LEFT JOIN todo_tags tt2 ON t.id = tt2.todo_id
    `;
    const params: any[] = [tagId];
    
    if (workspacePath) {
      sql += ` WHERE t.workspace_path = ?`;
      params.push(workspacePath);
    }
    
    sql += ` GROUP BY t.id ORDER BY t.created_at DESC`;
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map(this.rowToTodo);
  }

  async findByStatus(completed: boolean, workspacePath?: string): Promise<Todo[]> {
    let sql = `
      SELECT t.*, GROUP_CONCAT(tt.tag_id) as tag_ids
      FROM todos t
      LEFT JOIN todo_tags tt ON t.id = tt.todo_id
      WHERE t.completed = ?
    `;
    const params: any[] = [completed ? 1 : 0];
    
    if (workspacePath) {
      sql += ` AND t.workspace_path = ?`;
      params.push(workspacePath);
    }
    
    sql += ` GROUP BY t.id ORDER BY t.created_at DESC`;
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map(this.rowToTodo);
  }

  async findByWorkspace(workspacePath: string, type?: 'task' | 'subtask'): Promise<Todo[]> {
    let sql = `
      SELECT t.*, GROUP_CONCAT(tt.tag_id) as tag_ids
      FROM todos t
      LEFT JOIN todo_tags tt ON t.id = tt.todo_id
      WHERE t.workspace_path = ?
    `;
    const params: any[] = [workspacePath];
    
    if (type) {
      sql += ` AND t.type = ?`;
      params.push(type);
    }
    
    sql += ` GROUP BY t.id ORDER BY t.created_at DESC`;
    
    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map(this.rowToTodo);
  }

  // ========== 关系操作 ==========

  async findChildren(parentId: string): Promise<Todo[]> {
    const stmt = this.db.prepare(`
      SELECT t.*, GROUP_CONCAT(tt.tag_id) as tag_ids
      FROM todos t
      JOIN todo_relations tr ON t.id = tr.child_id
      LEFT JOIN todo_tags tt ON t.id = tt.todo_id
      WHERE tr.parent_id = ?
      GROUP BY t.id
      ORDER BY t.sort_order ASC, t.created_at ASC
    `);
    
    const rows = stmt.all(parentId) as any[];
    return rows.map(this.rowToTodo);
  }

  async findParents(childId: string): Promise<Todo[]> {
    const stmt = this.db.prepare(`
      SELECT t.*, GROUP_CONCAT(tt.tag_id) as tag_ids
      FROM todos t
      JOIN todo_relations tr ON t.id = tr.parent_id
      LEFT JOIN todo_tags tt ON t.id = tt.todo_id
      WHERE tr.child_id = ?
      GROUP BY t.id
    `);
    
    const rows = stmt.all(childId) as any[];
    return rows.map(this.rowToTodo);
  }

  async addChild(parentId: string, childId: string): Promise<boolean> {
    try {
      const stmt = this.db.prepare(`
        INSERT OR IGNORE INTO todo_relations (parent_id, child_id) VALUES (?, ?)
      `);
      const result = stmt.run(parentId, childId);
      return result.changes > 0;
    } catch {
      return false;
    }
  }

  async removeChild(parentId: string, childId: string): Promise<boolean> {
    const stmt = this.db.prepare(`
      DELETE FROM todo_relations WHERE parent_id = ? AND child_id = ?
    `);
    const result = stmt.run(parentId, childId);
    return result.changes > 0;
  }

  async setChildren(parentId: string, childIds: string[]): Promise<boolean> {
    const deleteStmt = this.db.prepare("DELETE FROM todo_relations WHERE parent_id = ?");
    deleteStmt.run(parentId);

    if (childIds.length === 0) return true;

    const insertStmt = this.db.prepare(`
      INSERT INTO todo_relations (parent_id, child_id) VALUES (?, ?)
    `);

    for (const childId of childIds) {
      insertStmt.run(parentId, childId);
    }

    return true;
  }

  async reorderChildren(parentId: string, childIds: string[]): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE todos SET sort_order = ? WHERE id = ?
    `);

    for (let i = 0; i < childIds.length; i++) {
      stmt.run(i, childIds[i]);
    }

    return true;
  }

  async create(input: import("@/app/types").CreateTodoInput): Promise<Todo> {
    const id = Date.now().toString();
    const createdAt = new Date();
    const updatedAt = createdAt;
    const workspacePath = input.workspacePath || "/";
    const type = input.type || "task";
    // 从 status 派生 completed，或从 completed 派生 status
    const status = input.status || "pending";
    const completed = status === "completed";

    const insertTodo = this.db.prepare(`
      INSERT INTO todos (id, type, text, status, completed, created_at, updated_at, artifact, workspace_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertTodo.run(
      id, 
      type,
      input.text, 
      status,
      completed ? 1 : 0, 
      createdAt.toISOString(), 
      updatedAt.toISOString(),
      input.artifact || null,
      workspacePath
    );

    // 插入标签关联
    if (input.tagIds && input.tagIds.length > 0) {
      const insertTag = this.db.prepare(`
        INSERT INTO todo_tags (todo_id, tag_id) VALUES (?, ?)
      `);
      for (const tagId of input.tagIds) {
        insertTag.run(id, tagId);
      }
    }

    return {
      id,
      type,
      text: input.text,
      status,
      completed,
      createdAt,
      updatedAt,
      tagIds: input.tagIds || [],
      artifact: input.artifact,
      workspacePath,
    };
  }

  async update(id: string, data: import("@/app/types").UpdateTodoInput): Promise<Todo | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    // 处理 status 和 completed 的同步逻辑
    let status = data.status;
    let completed = data.completed;

    if (data.status !== undefined && data.completed === undefined) {
      // 如果只更新了 status，同步 completed
      completed = data.status === "completed";
    } else if (data.completed !== undefined && data.status === undefined) {
      // 如果只更新了 completed，同步 status
      status = data.completed ? "completed" : (existing.status === "completed" ? "pending" : existing.status);
    }

    if (data.text !== undefined) {
      updates.push("text = ?");
      values.push(data.text);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      values.push(status);
    }
    if (completed !== undefined) {
      updates.push("completed = ?");
      values.push(completed ? 1 : 0);
    }
    if (data.artifact !== undefined) {
      updates.push("artifact = ?");
      values.push(data.artifact);
    }
    if (data.sortOrder !== undefined) {
      updates.push("sort_order = ?");
      values.push(data.sortOrder);
    }

    // 始终更新 updated_at
    updates.push("updated_at = ?");
    values.push(new Date().toISOString());

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
    // 获取所有子任务 ID
    const childIds = this.db.prepare(
      "SELECT child_id FROM todo_relations WHERE parent_id = ?"
    ).all(id) as { child_id: string }[];

    // 级联删除子任务（统一表结构，子任务也是 todos）
    for (const { child_id } of childIds) {
      await this.delete(child_id);  // 递归删除
    }

    // 删除关系
    this.db.prepare("DELETE FROM todo_relations WHERE parent_id = ? OR child_id = ?").run(id, id);

    // 删除标签关联（外键约束）
    this.db.prepare("DELETE FROM todo_tags WHERE todo_id = ?").run(id);

    const stmt = this.db.prepare("DELETE FROM todos WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async batchDelete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    const placeholders = ids.map(() => "?").join(",");
    
    // 获取所有子任务 ID（包括级联的子任务）
    const allIds = new Set<string>(ids);
    for (const id of ids) {
      const childIds = this.db.prepare(
        "SELECT child_id FROM todo_relations WHERE parent_id = ?"
      ).all(id) as { child_id: string }[];
      childIds.forEach(c => allIds.add(c.child_id));
    }

    const allIdList = Array.from(allIds);
    const allPlaceholders = allIdList.map(() => "?").join(",");
    
    // 删除关系
    this.db.prepare(`DELETE FROM todo_relations WHERE parent_id IN (${allPlaceholders}) OR child_id IN (${allPlaceholders})`).run(...allIdList, ...allIdList);

    // 删除标签关联
    this.db.prepare(`DELETE FROM todo_tags WHERE todo_id IN (${allPlaceholders})`).run(...allIdList);

    // 删除任务
    const deleteTodos = this.db.prepare(`
      DELETE FROM todos WHERE id IN (${allPlaceholders})
    `);
    const result = deleteTodos.run(...allIdList);
    
    return result.changes;
  }

  async clearCompleted(workspacePath?: string): Promise<number> {
    // 获取已完成的任务 ID
    let sql = "SELECT id FROM todos WHERE completed = 1";
    const params: any[] = [];
    
    if (workspacePath) {
      sql += " AND workspace_path = ?";
      params.push(workspacePath);
    }
    
    const findStmt = this.db.prepare(sql);
    const rows = findStmt.all(...params) as { id: string }[];
    const ids = rows.map((r) => r.id);

    return this.batchDelete(ids);
  }

  async getAllWorkspaces(): Promise<string[]> {
    const stmt = this.db.prepare(`
      SELECT DISTINCT workspace_path 
      FROM todos 
      WHERE workspace_path IS NOT NULL 
      ORDER BY workspace_path
    `);
    const rows = stmt.all() as { workspace_path: string }[];
    return rows.map(r => r.workspace_path);
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
    const status: TaskStatus = row.status || (row.completed ? "completed" : "pending");
    return {
      id: row.id,
      type: row.type || 'task',
      text: row.text,
      status,
      completed: status === "completed",
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at || row.created_at),
      tagIds: row.tag_ids ? row.tag_ids.split(",") : [],
      artifact: row.artifact || undefined,
      workspacePath: row.workspace_path || "/",
      sortOrder: row.sort_order,
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
// V2: 基于统一任务表，子任务也是 Todo，type='subtask'

class SQLiteSubTaskRepository implements ISubTaskRepository {
  constructor(private db: Database.Database) {}

  async findById(id: string): Promise<Todo | null> {
    const stmt = this.db.prepare(`
      SELECT t.*, GROUP_CONCAT(tt.tag_id) as tag_ids
      FROM todos t
      LEFT JOIN todo_tags tt ON t.id = tt.todo_id
      WHERE t.id = ? AND t.type = 'subtask'
      GROUP BY t.id
    `);
    const row = stmt.get(id) as any;
    return row ? this.rowToSubTask(row) : null;
  }

  async findByTodoId(parentId: string): Promise<Todo[]> {
    const stmt = this.db.prepare(`
      SELECT t.*, GROUP_CONCAT(tt.tag_id) as tag_ids
      FROM todos t
      JOIN todo_relations tr ON t.id = tr.child_id
      LEFT JOIN todo_tags tt ON t.id = tt.todo_id
      WHERE tr.parent_id = ? AND t.type = 'subtask'
      GROUP BY t.id
      ORDER BY t.sort_order ASC, t.created_at ASC
    `);
    const rows = stmt.all(parentId) as any[];
    return rows.map(this.rowToSubTask);
  }

  async create(input: CreateSubTaskInput): Promise<Todo> {
    const id = Date.now().toString();
    const createdAt = new Date();
    const updatedAt = createdAt;

    // 获取父任务的 workspace_path
    const parentStmt = this.db.prepare(`
      SELECT workspace_path FROM todos WHERE id = ?
    `);
    const parentRow = parentStmt.get(input.parentId) as any;
    const workspacePath = parentRow?.workspace_path || '/';

    // 获取当前最大 sort_order
    const maxOrderStmt = this.db.prepare(`
      SELECT MAX(t.sort_order) as max_order 
      FROM todos t
      JOIN todo_relations tr ON t.id = tr.child_id
      WHERE tr.parent_id = ?
    `);
    const maxOrderRow = maxOrderStmt.get(input.parentId) as any;
    const sortOrder = (maxOrderRow?.max_order || 0) + 1;

    // 插入子任务到统一 todos 表
    const stmt = this.db.prepare(`
      INSERT INTO todos (id, type, text, status, completed, created_at, updated_at, artifact, workspace_path, sort_order)
      VALUES (?, 'subtask', ?, 'pending', 0, ?, ?, NULL, ?, ?)
    `);
    stmt.run(id, input.text, createdAt.toISOString(), updatedAt.toISOString(), workspacePath, sortOrder);

    // 建立关系
    const relationStmt = this.db.prepare(`
      INSERT INTO todo_relations (parent_id, child_id) VALUES (?, ?)
    `);
    relationStmt.run(input.parentId, id);

    return {
      id,
      type: 'subtask',
      text: input.text,
      status: 'pending',
      completed: false,
      createdAt,
      updatedAt,
      tagIds: [],
      workspacePath,
      sortOrder,
    };
  }

  async update(id: string, data: UpdateSubTaskInput): Promise<Todo | null> {
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
      updates.push("status = ?");
      values.push(data.completed ? 'completed' : 'pending');
    }
    if (data.sortOrder !== undefined) {
      updates.push("sort_order = ?");
      values.push(data.sortOrder);
    }
    if (data.artifact !== undefined) {
      updates.push("artifact = ?");
      values.push(data.artifact);
    }

    // 始终更新 updated_at
    updates.push("updated_at = ?");
    values.push(new Date().toISOString());

    if (updates.length > 0) {
      const stmt = this.db.prepare(`
        UPDATE todos SET ${updates.join(", ")} WHERE id = ? AND type = 'subtask'
      `);
      stmt.run(...values, id);
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    // 先删除关系
    this.db.prepare("DELETE FROM todo_relations WHERE child_id = ?").run(id);
    
    // 删除标签关联
    this.db.prepare("DELETE FROM todo_tags WHERE todo_id = ?").run(id);
    
    // 删除任务
    const stmt = this.db.prepare("DELETE FROM todos WHERE id = ? AND type = 'subtask'");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async deleteByTodoId(parentId: string): Promise<number> {
    // 获取所有子任务 ID
    const childIds = this.db.prepare(`
      SELECT child_id FROM todo_relations WHERE parent_id = ?
    `).all(parentId) as { child_id: string }[];
    
    let count = 0;
    for (const { child_id } of childIds) {
      if (await this.delete(child_id)) {
        count++;
      }
    }
    return count;
  }

  async reorder(parentId: string, subTaskIds: string[]): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE todos SET sort_order = ? WHERE id = ?
    `);

    for (let i = 0; i < subTaskIds.length; i++) {
      stmt.run(i, subTaskIds[i]);
    }

    return true;
  }

  async getCompletedCount(parentId: string): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM todos t
      JOIN todo_relations tr ON t.id = tr.child_id
      WHERE tr.parent_id = ? AND t.type = 'subtask' AND t.completed = 1
    `);
    const row = stmt.get(parentId) as any;
    return row?.count || 0;
  }

  async getTotalCount(parentId: string): Promise<number> {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count 
      FROM todos t
      JOIN todo_relations tr ON t.id = tr.child_id
      WHERE tr.parent_id = ? AND t.type = 'subtask'
    `);
    const row = stmt.get(parentId) as any;
    return row?.count || 0;
  }

  async updateArtifact(subTaskId: string, artifact: string | null): Promise<boolean> {
    const stmt = this.db.prepare(`
      UPDATE todos SET artifact = ?, updated_at = ? WHERE id = ? AND type = 'subtask'
    `);
    const result = stmt.run(artifact, new Date().toISOString(), subTaskId);
    return result.changes > 0;
  }

  private rowToSubTask(row: any): Todo {
    const status: TaskStatus = row.status || (row.completed ? "completed" : "pending");
    return {
      id: row.id,
      type: 'subtask',
      text: row.text,
      status,
      completed: status === "completed",
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at || row.created_at),
      tagIds: row.tag_ids ? row.tag_ids.split(",") : [],
      workspacePath: row.workspace_path || "/",
      sortOrder: row.sort_order,
      artifact: row.artifact || undefined,
    };
  }
}

// ==================== SQLite Workspace Repository ====================

class SQLiteWorkspaceRepository implements IWorkspaceRepository {
  constructor(private db: Database.Database) {}

  async findAll(): Promise<Workspace[]> {
    const stmt = this.db.prepare("SELECT * FROM workspaces ORDER BY name");
    const rows = stmt.all() as any[];
    return rows.map(this.rowToWorkspace);
  }

  async findById(id: string): Promise<Workspace | null> {
    const stmt = this.db.prepare("SELECT * FROM workspaces WHERE id = ?");
    const row = stmt.get(id) as any;
    return row ? this.rowToWorkspace(row) : null;
  }

  async findByPath(path: string): Promise<Workspace | null> {
    const stmt = this.db.prepare("SELECT * FROM workspaces WHERE path = ?");
    const row = stmt.get(path) as any;
    return row ? this.rowToWorkspace(row) : null;
  }

  async create(workspace: Omit<Workspace, "id" | "createdAt"> & { id?: string }): Promise<Workspace> {
    const id = workspace.id || this.generateId(workspace.name);
    const createdAt = new Date();

    const stmt = this.db.prepare(`
      INSERT INTO workspaces (id, name, path, color, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, workspace.name, workspace.path, workspace.color || null, createdAt.toISOString());

    return {
      id,
      name: workspace.name,
      path: workspace.path,
      color: workspace.color,
      createdAt,
    };
  }

  async update(id: string, data: Partial<Omit<Workspace, "id">>): Promise<Workspace | null> {
    const existing = await this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push("name = ?");
      values.push(data.name);
    }
    if (data.path !== undefined) {
      updates.push("path = ?");
      values.push(data.path);
    }
    if (data.color !== undefined) {
      updates.push("color = ?");
      values.push(data.color);
    }

    if (updates.length > 0) {
      const stmt = this.db.prepare(`
        UPDATE workspaces SET ${updates.join(", ")} WHERE id = ?
      `);
      stmt.run(...values, id);
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    // 检查是否有任务使用此工作区
    const count = await this.getTodoCount(id);
    if (count > 0) {
      throw new Error(`无法删除：该工作区还有 ${count} 个任务`);
    }

    const stmt = this.db.prepare("DELETE FROM workspaces WHERE id = ?");
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async getTodoCount(id: string): Promise<number> {
    const workspace = await this.findById(id);
    if (!workspace) return 0;
    
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM todos WHERE workspace_path = ?
    `);
    const row = stmt.get(workspace.path) as any;
    return row?.count || 0;
  }

  async generateUniquePath(name: string): Promise<string> {
    const basePath = "/" + name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let path = basePath;
    let counter = 1;
    
    while (await this.findByPath(path)) {
      path = `${basePath}-${counter}`;
      counter++;
    }
    
    return path;
  }

  private generateId(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "workspace";
  }

  private rowToWorkspace(row: any): Workspace {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      color: row.color || undefined,
      createdAt: new Date(row.created_at),
    };
  }
}

// ==================== SQLite Database ====================

export class SQLiteDatabase implements IDatabase {
  private db: Database.Database | null = null;
  public todos!: ITodoRepository;
  public tags!: ITagRepository;
  public subTasks!: ISubTaskRepository;
  public workspaces!: IWorkspaceRepository;

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
      this.workspaces = new SQLiteWorkspaceRepository(this.db);

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

    // ========== V2: 统一任务表（支持主任务和子任务） ==========
    
    // 创建新的统一 todos 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL DEFAULT 'task',
        text TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        artifact TEXT,
        workspace_path TEXT NOT NULL DEFAULT '/',
        sort_order INTEGER
      );
    `);

    // 迁移：从旧表结构迁移数据（如果存在旧表）
    this.migrateFromV1();

    // 创建任务关系表（主任务-子任务映射）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todo_relations (
        parent_id TEXT NOT NULL,
        child_id TEXT NOT NULL,
        PRIMARY KEY (parent_id, child_id),
        FOREIGN KEY (parent_id) REFERENCES todos(id) ON DELETE CASCADE,
        FOREIGN KEY (child_id) REFERENCES todos(id) ON DELETE CASCADE
      );
    `);

    // 创建 tags 表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL
      );
    `);

    // 创建任务-标签关联表（所有类型的任务都可以有标签）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS todo_tags (
        todo_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        PRIMARY KEY (todo_id, tag_id),
        FOREIGN KEY (todo_id) REFERENCES todos(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `);

    // 创建工作区表
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        color TEXT,
        created_at TEXT NOT NULL
      );
    `);

    // 插入默认工作区（根目录）
    const rootWorkspaceExists = this.db.prepare("SELECT 1 FROM workspaces WHERE id = 'root'").get();
    if (!rootWorkspaceExists) {
      this.db.exec(`
        INSERT INTO workspaces (id, name, path, color, created_at)
        VALUES ('root', '根目录', '/', 'slate', datetime('now'))
      `);
    }

    // 创建索引
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_todos_type ON todos(type);
      CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
      CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
      CREATE INDEX IF NOT EXISTS idx_todos_workspace ON todos(workspace_path);
      CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
      CREATE INDEX IF NOT EXISTS idx_todo_tags_todo_id ON todo_tags(todo_id);
      CREATE INDEX IF NOT EXISTS idx_todo_tags_tag_id ON todo_tags(tag_id);
      CREATE INDEX IF NOT EXISTS idx_todo_relations_parent ON todo_relations(parent_id);
      CREATE INDEX IF NOT EXISTS idx_todo_relations_child ON todo_relations(child_id);
    `);
  }

  /**
   * 从 V1 版本迁移数据
   * - 旧表：todos (主任务) + sub_tasks (子任务)
   * - 新表：统一 todos 表 + todo_relations 关系表
   */
  private migrateFromV1(): void {
    if (!this.db) return;

    // 检查是否存在旧版 sub_tasks 表
    const subTasksTableExists = this.db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='sub_tasks'"
    ).get();

    if (!subTasksTableExists) return;

    // 检查是否已经完成过迁移（todos 表已有 type 列）
    const todosInfo = this.db.prepare("PRAGMA table_info(todos)").all() as any[];
    const hasTypeColumn = todosInfo.some(col => col.name === 'type');
    
    if (hasTypeColumn) return; // 已迁移

    // 添加 type 列到 todos 表
    try {
      this.db.exec(`ALTER TABLE todos ADD COLUMN type TEXT NOT NULL DEFAULT 'task'`);
      this.db.exec(`ALTER TABLE todos ADD COLUMN updated_at TEXT`);
      this.db.exec(`ALTER TABLE todos ADD COLUMN sort_order INTEGER`);
    } catch {
      // 列可能已存在
    }

    // 更新旧数据的 updated_at
    const now = new Date().toISOString();
    this.db.prepare(`UPDATE todos SET updated_at = ? WHERE updated_at IS NULL`).run(now);

    // 迁移子任务到统一 todos 表
    const subTasks = this.db.prepare(`
      SELECT s.*, t.workspace_path 
      FROM sub_tasks s
      JOIN todos t ON s.todo_id = t.id
    `).all() as any[];

    for (const sub of subTasks) {
      const id = sub.id;
      const now = new Date().toISOString();
      
      // 插入子任务到 todos 表
      try {
        this.db.prepare(`
          INSERT OR IGNORE INTO todos (id, type, text, status, completed, created_at, updated_at, artifact, workspace_path, sort_order)
          VALUES (?, 'subtask', ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          sub.text,
          sub.completed ? 'completed' : 'pending',
          sub.completed ? 1 : 0,
          sub.created_at,
          now,
          sub.artifact,
          sub.workspace_path || '/',
          sub.order || 0
        );

        // 建立关系
        this.db.prepare(`
          INSERT OR IGNORE INTO todo_relations (parent_id, child_id)
          VALUES (?, ?)
        `).run(sub.todo_id, id);
      } catch (e) {
        console.error(`Failed to migrate subtask ${id}:`, e);
      }
    }

    // 重命名旧表作为备份
    try {
      this.db.exec(`ALTER TABLE sub_tasks RENAME TO sub_tasks_backup_v1`);
    } catch {
      // 忽略错误
    }

    console.log(`Migrated ${subTasks.length} subtasks to unified todos table`);
  }

  async reset(): Promise<void> {
    if (!this.db) throw new ConnectionError("Database not connected");

    this.db.exec(`
      DROP TABLE IF EXISTS todo_relations;
      DROP TABLE IF EXISTS todo_tags;
      DROP TABLE IF EXISTS todos;
      DROP TABLE IF EXISTS tags;
      DROP TABLE IF EXISTS workspaces;
      DROP TABLE IF EXISTS sub_tasks_backup_v1;
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
