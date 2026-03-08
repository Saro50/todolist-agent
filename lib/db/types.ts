/**
 * 数据库抽象接口定义
 * 
 * 设计原则：
 * 1. 所有方法返回 Promise，支持异步操作
 * 2. 接口与具体实现解耦，便于替换存储后端
 * 3. 支持事务操作，保证数据一致性
 * 4. 统一错误处理
 */

import { Todo, Tag, SubTask, Workspace, CreateSubTaskInput, UpdateSubTaskInput } from "@/app/types";

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
 * Todo 数据访问接口
 */
export interface ITodoRepository {
  // 查询
  findAll(workspacePath?: string): Promise<Todo[]>;
  findAllPaginated(workspacePath?: string, pagination?: PaginationParams, filters?: FilterParams): Promise<PaginatedResult<Todo>>;
  findById(id: string): Promise<Todo | null>;
  findByTag(tagId: string, workspacePath?: string): Promise<Todo[]>;
  findByStatus(completed: boolean, workspacePath?: string): Promise<Todo[]>;
  findByWorkspace(workspacePath: string): Promise<Todo[]>;
  
  // 统计（支持筛选）
  count(workspacePath?: string, filters?: FilterParams): Promise<number>;
  
  // 增删改
  create(todo: Omit<Todo, "id" | "createdAt" | "subTasks">): Promise<Todo>;
  update(id: string, data: Partial<Omit<Todo, "subTasks">>): Promise<Todo | null>;
  delete(id: string): Promise<boolean>;
  
  // 批量操作
  batchDelete(ids: string[]): Promise<number>;
  clearCompleted(workspacePath?: string): Promise<number>;
  
  // 标签关联
  addTag(todoId: string, tagId: string): Promise<boolean>;
  removeTag(todoId: string, tagId: string): Promise<boolean>;
  setTags(todoId: string, tagIds: string[]): Promise<boolean>;
  
  // 产物操作
  updateArtifact(todoId: string, artifact: string | null): Promise<boolean>;
  
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
  findAll(): Promise<Tag[]>;
  findById(id: string): Promise<Tag | null>;
  findByIds(ids: string[]): Promise<Tag[]>;
  
  // 增删改
  create(tag: Omit<Tag, "id">): Promise<Tag>;
  update(id: string, data: Partial<Tag>): Promise<Tag | null>;
  delete(id: string): Promise<boolean>;
  
  // 获取标签关联的任务数量
  getTodoCount(tagId: string): Promise<number>;
}

/**
 * 子任务数据访问接口
 */
export interface ISubTaskRepository {
  // 查询
  findById(id: string): Promise<SubTask | null>;
  findByTodoId(todoId: string): Promise<SubTask[]>;
  
  // 增删改
  create(input: CreateSubTaskInput): Promise<SubTask>;
  update(id: string, data: UpdateSubTaskInput): Promise<SubTask | null>;
  delete(id: string): Promise<boolean>;
  
  // 批量操作
  deleteByTodoId(todoId: string): Promise<number>;
  reorder(todoId: string, subTaskIds: string[]): Promise<boolean>;
  
  // 统计
  getCompletedCount(todoId: string): Promise<number>;
  getTotalCount(todoId: string): Promise<number>;
  
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
  table: "todos" | "tags" | "subTasks";
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
