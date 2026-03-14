/**
 * 数据库抽象接口定义
 * 
 * 设计原则：
 * 1. 所有方法返回 Promise，支持异步操作
 * 2. 接口与具体实现解耦，便于替换存储后端
 * 3. 支持事务操作，保证数据一致性
 * 4. 统一错误处理
 */

import { Todo, Tag, Workspace, CreateSubTaskInput, UpdateSubTaskInput, CreateTodoInput, UpdateTodoInput, TodoType } from "@/app/types";

// 数据库连接配置
export interface DatabaseConfig {
  type: "sqlite" | "remote";
  // SQLite 配置
  sqlitePath?: string;
  // 远程数据库配置
  remoteUrl?: string;
  apiKey?: string;
}

// 数据库操作结果
export interface DbResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 事务上下文
export interface TransactionContext {
  commit(): Promise<void>;
  rollback(): Promise<void>;
}

// ==================== Repository 接口 ====================

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;      // 页码，从 1 开始
  pageSize: number;  // 每页数量
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  data: T[];           // 当前页数据
  total: number;       // 总数量
  page: number;        // 当前页码
  pageSize: number;    // 每页数量
  totalPages: number;  // 总页数
}

/**
 * 筛选参数
 */
export interface FilterParams {
  status?: string;      // 状态筛选：pending/in_progress/completed
  tagId?: string;       // 标签筛选
}

/**
 * Todo 数据访问接口（V3: 使用 todo_workspaces 关系表）
 */
export interface ITodoRepository {
  // ========== 查询 ==========
  findAll(workspaceId?: string, type?: TodoType): Promise<Todo[]>;
  findAllPaginated(workspaceId?: string, pagination?: PaginationParams, filters?: FilterParams & { type?: TodoType }): Promise<PaginatedResult<Todo>>;
  findById(id: string): Promise<Todo | null>;
  findByTag(tagId: string, workspaceId?: string): Promise<Todo[]>;
  findByStatus(completed: boolean, workspaceId?: string): Promise<Todo[]>;
  findByWorkspace(workspaceId: string, type?: TodoType): Promise<Todo[]>;
  
  // 查找子任务
  findChildren(parentId: string): Promise<Todo[]>;
  
  // 查找父任务
  findParents(childId: string): Promise<Todo[]>;
  
  // 搜索任务（按标题模糊匹配，支持多标签过滤）
  search(keyword: string, workspaceId?: string, tagIds?: string[]): Promise<Todo[]>;
  
  // 统计（支持筛选）
  count(workspaceId?: string, filters?: FilterParams & { type?: TodoType }): Promise<number>;
  
  // ========== 增删改 ==========
  create(input: CreateTodoInput): Promise<Todo>;
  update(id: string, data: UpdateTodoInput): Promise<Todo | null>;
  delete(id: string): Promise<boolean>;
  
  // 批量操作
  batchDelete(ids: string[]): Promise<number>;
  clearCompleted(workspaceId?: string): Promise<number>;
  
  // ========== 标签关联（所有任务类型都支持） ==========
  addTag(todoId: string, tagId: string): Promise<boolean>;
  removeTag(todoId: string, tagId: string): Promise<boolean>;
  setTags(todoId: string, tagIds: string[]): Promise<boolean>;
  
  // ========== 产物操作 ==========
  updateArtifact(todoId: string, artifact: string | null): Promise<boolean>;
  
  // ========== 关系操作 ==========
  addChild(parentId: string, childId: string): Promise<boolean>;
  removeChild(parentId: string, childId: string): Promise<boolean>;
  setChildren(parentId: string, childIds: string[]): Promise<boolean>;
  reorderChildren(parentId: string, childIds: string[]): Promise<boolean>;
}

/**
 * 工作区数据访问接口
 */
export interface IWorkspaceRepository {
  // 查询
  findAll(): Promise<Workspace[]>;
  findById(id: string): Promise<Workspace | null>;
  findByPath(path: string): Promise<Workspace | null>;
  
  // 增删改
  create(workspace: Omit<Workspace, "id" | "createdAt"> & { id?: string }): Promise<Workspace>;
  update(id: string, data: Partial<Omit<Workspace, "id">>): Promise<Workspace | null>;
  delete(id: string): Promise<boolean>;
  
  // 获取工作区任务数量
  getTodoCount(id: string): Promise<number>;
  
  // 路径生成
  generateUniquePath(name: string): Promise<string>;
}

/**
 * Tag 数据访问接口
 */
export interface ITagRepository {
  // 查询
  findAll(workspaceId?: string): Promise<Tag[]>;
  findById(id: string): Promise<Tag | null>;
  findByIds(ids: string[]): Promise<Tag[]>;
  
  // 增删改
  create(tag: Omit<Tag, "id">, workspaceId?: string): Promise<Tag>;
  update(id: string, data: Partial<Tag>): Promise<Tag | null>;
  delete(id: string): Promise<boolean>;
  
  // 获取标签关联的任务数量
  getTodoCount(tagId: string): Promise<number>;
  
  // V4: 工作区关联
  findByWorkspace(workspaceId: string): Promise<Tag[]>;
  associateWithWorkspace(tagId: string, workspaceId: string): Promise<void>;
  removeFromWorkspace(tagId: string, workspaceId: string): Promise<void>;
}

/**
 * 子任务数据访问接口（V3: 基于统一任务表，通过关系跟随主任务工作区）
 * 
 * 注意：子任务现在也是 Todo，只是 type='subtask'
 * 子任务不直接关联工作区，通过 todo_relations 跟随主任务
 */
export interface ISubTaskRepository {
  // 查询
  findById(id: string): Promise<Todo | null>;
  findByTodoId(parentId: string): Promise<Todo[]>;  // 查找父任务的所有子任务
  
  // 增删改
  create(input: CreateSubTaskInput): Promise<Todo>;
  update(id: string, data: UpdateSubTaskInput): Promise<Todo | null>;
  delete(id: string): Promise<boolean>;
  
  // 批量操作
  deleteByTodoId(parentId: string): Promise<number>;  // 删除父任务的所有子任务
  reorder(parentId: string, subTaskIds: string[]): Promise<boolean>;
  
  // 统计
  getCompletedCount(parentId: string): Promise<number>;
  getTotalCount(parentId: string): Promise<number>;
  
  // 产物操作
  updateArtifact(subTaskId: string, artifact: string | null): Promise<boolean>;
}

// ==================== 数据库连接接口 ====================

/**
 * 抽象数据库连接接口
 * 实现类：SQLiteDatabase, RemoteDatabase
 */
export interface IDatabase {
  readonly isConnected: boolean;
  
  // 连接管理
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // 仓库访问
  todos: ITodoRepository;
  tags: ITagRepository;
  subTasks: ISubTaskRepository;
  workspaces: IWorkspaceRepository;
  
  // 事务支持
  transaction<T>(callback: (tx: TransactionContext) => Promise<T>): Promise<T>;
  
  // 初始化/迁移
  migrate(): Promise<void>;
  reset(): Promise<void>;
}

// ==================== 同步相关接口 ====================

/**
 * 数据变更记录（用于同步）
 */
export interface ChangeLog {
  id: string;
  table: "todos" | "tags" | "todo_relations";
  operation: "create" | "update" | "delete";
  recordId: string;
  data?: string;  // JSON 序列化的变更数据
  timestamp: Date;
  synced: boolean;
}

/**
 * 同步接口（远程数据库实现）
 */
export interface ISyncable {
  // 获取未同步的变更
  getPendingChanges(): Promise<ChangeLog[]>;
  
  // 标记变更已同步
  markAsSynced(changeIds: string[]): Promise<void>;
  
  // 应用远程变更
  applyRemoteChanges(changes: ChangeLog[]): Promise<void>;
  
  // 全量同步
  fullSync(): Promise<{ uploaded: number; downloaded: number }>;
}

// ==================== 错误类型 ====================

export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string, originalError?: unknown) {
    super(message, "CONNECTION_ERROR", originalError);
    this.name = "ConnectionError";
  }
}

export class NotFoundError extends DatabaseError {
  constructor(entity: string, id: string) {
    super(`${entity} with id ${id} not found`, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}
