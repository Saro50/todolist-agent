/**
 * Mock 数据库实现
 *
 * 用于单元测试，内存存储，快速重置
 * 使用 V3 架构：支持 workspaceId 和工作区隔离
 */

import {
  IDatabase,
  ITodoRepository,
  ITagRepository,
  ISubTaskRepository,
  IWorkspaceRepository,
  TransactionContext,
  PaginatedResult,
  PaginationParams,
  FilterParams,
} from "@/lib/db/types";
import { Todo, Tag, CreateSubTaskInput, UpdateSubTaskInput, CreateTodoInput, UpdateTodoInput, Workspace, TaskStatus } from "@/app/types";

// ==================== Mock Todo Repository ====================

class MockTodoRepository implements ITodoRepository {
  private todos: Todo[] = [];
  private todoWorkspaces: Map<string, Set<string>> = new Map(); // workspaceId -> Set of todoId

  private ensureCompletedSync(todo: Todo): void {
    // 确保 completed 和 status 同步
    if (todo.status === 'completed') {
      (todo as any).completed = true;
    } else {
      (todo as any).completed = false;
    }
  }

  async findAll(workspaceId?: string, type?: 'task' | 'subtask'): Promise<Todo[]> {
    let result = [...this.todos];

    // 按工作区筛选
    if (workspaceId) {
      const todoIds = this.todoWorkspaces.get(workspaceId);
      if (todoIds) {
        result = result.filter(t => todoIds.has(t.id));
      } else {
        return []; // 工作区不存在，返回空
      }
    }

    // 按类型筛选
    if (type) {
      result = result.filter(t => t.type === type);
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findAllPaginated(
    workspaceId?: string,
    pagination?: PaginationParams,
    filters?: FilterParams & { type?: 'task' | 'subtask' }
  ): Promise<PaginatedResult<Todo>> {
    const page = pagination?.page || 1;
    const pageSize = pagination?.pageSize || 20;

    let result = [...this.todos];

    // 按工作区筛选
    if (workspaceId) {
      const todoIds = this.todoWorkspaces.get(workspaceId);
      if (todoIds) {
        result = result.filter(t => todoIds.has(t.id));
      } else {
        return { data: [], total: 0, page, pageSize, totalPages: 0 };
      }
    }

    // 按类型筛选
    if (filters?.type) {
      result = result.filter(t => t.type === filters.type);
    }

    // 按状态筛选
    if (filters?.status) {
      result = result.filter(t => t.status === filters.status);
    }

    // 按标签筛选
    if (filters?.tagId) {
      result = result.filter(t => t.tagIds.includes(filters.tagId!));
    }

    const total = result.length;
    const totalPages = Math.ceil(total / pageSize);

    result = result
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice((page - 1) * pageSize, page * pageSize);

    return { data: result, total, page, pageSize, totalPages };
  }

  async findById(id: string): Promise<Todo | null> {
    return this.todos.find((t) => t.id === id) || null;
  }

  async findByTag(tagId: string, workspaceId?: string): Promise<Todo[]> {
    let result = this.todos.filter((t) => t.tagIds.includes(tagId));

    if (workspaceId) {
      const todoIds = this.todoWorkspaces.get(workspaceId);
      if (todoIds) {
        result = result.filter(t => todoIds.has(t.id));
      } else {
        return [];
      }
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByStatus(completed: boolean, workspaceId?: string): Promise<Todo[]> {
    // 使用 completed 字段进行筛选（它与 status 同步）
    let result = this.todos.filter((t) => t.completed === completed);

    if (workspaceId) {
      const todoIds = this.todoWorkspaces.get(workspaceId);
      if (todoIds) {
        result = result.filter(t => todoIds.has(t.id));
      } else {
        return [];
      }
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByWorkspace(workspaceId: string, type?: 'task' | 'subtask'): Promise<Todo[]> {
    const todoIds = this.todoWorkspaces.get(workspaceId);
    if (!todoIds) return [];

    let result = this.todos.filter((t) => todoIds.has(t.id));

    if (type) {
      result = result.filter(t => t.type === type);
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findChildren(parentId: string): Promise<Todo[]> {
    return this.todos
      .filter((t) => t.parentId === parentId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async findParents(childId: string): Promise<Todo[]> {
    const child = await this.findById(childId);
    if (!child || !child.parentId) return [];
    const parent = this.todos.find(t => t.id === child.parentId);
    return parent ? [parent] : [];
  }

  async search(keyword: string, workspaceId?: string, tagIds?: string[]): Promise<Todo[]> {
    const lowerKeyword = keyword.toLowerCase();
    let result = this.todos.filter((t) =>
      t.text.toLowerCase().includes(lowerKeyword)
    );

    if (workspaceId) {
      const todoIds = this.todoWorkspaces.get(workspaceId);
      if (todoIds) {
        result = result.filter(t => todoIds.has(t.id));
      } else {
        return [];
      }
    }

    if (tagIds && tagIds.length > 0) {
      result = result.filter(t =>
        tagIds.some(tagId => t.tagIds.includes(tagId))
      );
    }

    return result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async count(workspaceId?: string, filters?: FilterParams & { type?: 'task' | 'subtask' }): Promise<number> {
    let result = [...this.todos];

    if (workspaceId) {
      const todoIds = this.todoWorkspaces.get(workspaceId);
      if (todoIds) {
        result = result.filter(t => todoIds.has(t.id));
      } else {
        return 0;
      }
    }

    if (filters?.type) {
      result = result.filter(t => t.type === filters.type);
    }

    if (filters?.status) {
      result = result.filter(t => t.status === filters.status);
    }

    if (filters?.tagId) {
      result = result.filter(t => t.tagIds.includes(filters.tagId!));
    }

    return result.length;
  }

  async create(input: CreateTodoInput): Promise<Todo> {
    const status = input.status || 'pending';
    const completed = status === 'completed';

    const todo: Todo = {
      id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: input.type || 'task',
      text: input.text,
      status,
      completed,
      approvalStatus: input.approvalStatus || 'pending',
      tagIds: input.tagIds || [],
      artifact: input.artifact,
      workspaceId: input.workspaceId,
      createdAt: new Date(),
      updatedAt: new Date(),
      sortOrder: input.sortOrder,
      parentId: input.parentId,
    };
    this.todos.push(todo);

    // 关联到工作区
    if (input.workspaceId) {
      const todoIds = this.todoWorkspaces.get(input.workspaceId) || new Set();
      todoIds.add(todo.id);
      this.todoWorkspaces.set(input.workspaceId, todoIds);
    }

    return todo;
  }

  async update(id: string, data: UpdateTodoInput): Promise<Todo | null> {
    const index = this.todos.findIndex((t) => t.id === id);
    if (index === -1) return null;

    const oldTodo = this.todos[index];

    // 处理 status 和 completed 的同步
    let newStatus = data.status;
    let newCompleted = data.completed;

    if (data.status !== undefined) {
      newCompleted = data.status === 'completed';
    } else if (data.completed !== undefined) {
      newStatus = data.completed ? 'completed' : 'pending';
    }

    const updatedTodo: Todo = {
      ...oldTodo,
      ...data,
      status: newStatus || oldTodo.status,
      completed: newCompleted !== undefined ? newCompleted : oldTodo.completed,
      updatedAt: new Date(),
    };
    this.todos[index] = updatedTodo;

    // 如果 workspaceId 变了，更新关联
    if (data.workspaceId !== undefined && data.workspaceId !== oldTodo.workspaceId) {
      // 从旧工作区移除
      if (oldTodo.workspaceId) {
        const oldWsTodos = this.todoWorkspaces.get(oldTodo.workspaceId);
        if (oldWsTodos) {
          oldWsTodos.delete(id);
        }
      }
      // 添加到新工作区
      if (data.workspaceId) {
        const newWsTodos = this.todoWorkspaces.get(data.workspaceId) || new Set();
        newWsTodos.add(id);
        this.todoWorkspaces.set(data.workspaceId, newWsTodos);
      }
    }

    return updatedTodo;
  }

  async delete(id: string): Promise<boolean> {
    const index = this.todos.findIndex((t) => t.id === id);
    if (index === -1) return false;

    const todo = this.todos[index];

    // 从所有工作区关联中移除
    for (const [wsId, todoIds] of this.todoWorkspaces.entries()) {
      if (todoIds.has(id)) {
        todoIds.delete(id);
        this.todoWorkspaces.set(wsId, todoIds);
      }
    }

    this.todos.splice(index, 1);
    return true;
  }

  async batchDelete(ids: string[]): Promise<number> {
    let count = 0;
    for (const id of ids) {
      if (await this.delete(id)) {
        count++;
      }
    }
    return count;
  }

  async clearCompleted(workspaceId?: string): Promise<number> {
    let completed = this.todos.filter((t) => t.completed);

    if (workspaceId) {
      const todoIds = this.todoWorkspaces.get(workspaceId);
      if (todoIds) {
        completed = completed.filter(t => todoIds.has(t.id));
      } else {
        return 0;
      }
    }

    return this.batchDelete(completed.map((t) => t.id));
  }

  async addTag(todoId: string, tagId: string): Promise<boolean> {
    const todo = await this.findById(todoId);
    if (!todo) return false;
    if (!todo.tagIds.includes(tagId)) {
      todo.tagIds.push(tagId);
    }
    return true;
  }

  async removeTag(todoId: string, tagId: string): Promise<boolean> {
    const todo = await this.findById(todoId);
    if (!todo) return false;
    const index = todo.tagIds.indexOf(tagId);
    if (index > -1) {
      todo.tagIds.splice(index, 1);
      return true;
    }
    return false;
  }

  async setTags(todoId: string, tagIds: string[]): Promise<boolean> {
    const todo = await this.findById(todoId);
    if (!todo) return false;
    todo.tagIds = [...tagIds];
    return true;
  }

  async updateArtifact(todoId: string, artifact: string | null): Promise<boolean> {
    const todo = await this.findById(todoId);
    if (!todo) return false;
    todo.artifact = artifact || undefined;
    return true;
  }

  async addChild(parentId: string, childId: string): Promise<boolean> {
    const child = await this.findById(childId);
    if (!child) return false;
    child.parentId = parentId;
    return true;
  }

  async removeChild(parentId: string, childId: string): Promise<boolean> {
    const child = await this.findById(childId);
    if (!child) return false;
    child.parentId = undefined;
    return true;
  }

  async setChildren(parentId: string, childIds: string[]): Promise<boolean> {
    const parent = await this.findById(parentId);
    if (!parent) return false;

    for (const childId of childIds) {
      const child = await this.findById(childId);
      if (child) {
        child.parentId = parentId;
      }
    }
    return true;
  }

  async reorderChildren(parentId: string, childIds: string[]): Promise<boolean> {
    for (let i = 0; i < childIds.length; i++) {
      const child = await this.findById(childIds[i]);
      if (child) {
        child.sortOrder = i;
      }
    }
    return true;
  }

  // 测试辅助方法
  __reset(): void {
    this.todos = [];
    this.todoWorkspaces.clear();
  }

  __seed(todos: Todo[]): void {
    this.todos = [...todos];
    // 重建工作区关联
    this.todoWorkspaces.clear();
    for (const todo of todos) {
      if (todo.workspaceId) {
        const todoIds = this.todoWorkspaces.get(todo.workspaceId) || new Set();
        todoIds.add(todo.id);
        this.todoWorkspaces.set(todo.workspaceId, todoIds);
      }
    }
  }

  // 用于 SubTask Repository 访问
  __getTodos(): Todo[] {
    return this.todos;
  }

  __addToTodos(todo: Todo): void {
    this.todos.push(todo);
    if (todo.workspaceId) {
      const todoIds = this.todoWorkspaces.get(todo.workspaceId) || new Set();
      todoIds.add(todo.id);
      this.todoWorkspaces.set(todo.workspaceId, todoIds);
    }
  }
}

// ==================== Mock Tag Repository ====================

class MockTagRepository implements ITagRepository {
  private tags: Tag[] = [];
  private workspaceTags: Map<string, Set<string>> = new Map(); // workspaceId -> Set of tagId

  async findAll(workspaceId?: string): Promise<Tag[]> {
    if (workspaceId) {
      const tagIds = this.workspaceTags.get(workspaceId);
      if (tagIds) {
        return this.tags
          .filter(t => tagIds.has(t.id))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
      return [];
    }
    return [...this.tags].sort((a, b) => a.name.localeCompare(b.name));
  }

  async findById(id: string): Promise<Tag | null> {
    return this.tags.find((t) => t.id === id) || null;
  }

  async findByIds(ids: string[]): Promise<Tag[]> {
    return this.tags
      .filter((t) => ids.includes(t.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async create(tag: Omit<Tag, "id">, workspaceId?: string): Promise<Tag> {
    const newTag: Tag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: tag.name,
      color: tag.color,
    };
    this.tags.push(newTag);

    // 关联到工作区
    if (workspaceId) {
      const tagIds = this.workspaceTags.get(workspaceId) || new Set();
      tagIds.add(newTag.id);
      this.workspaceTags.set(workspaceId, tagIds);
    }

    return newTag;
  }

  async update(id: string, data: Partial<Tag>): Promise<Tag | null> {
    const index = this.tags.findIndex((t) => t.id === id);
    if (index === -1) return null;

    this.tags[index] = { ...this.tags[index], ...data };
    return this.tags[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.tags.findIndex((t) => t.id === id);
    if (index === -1) return false;

    // 从所有工作区关联中移除
    for (const [wsId, tagIds] of this.workspaceTags.entries()) {
      if (tagIds.has(id)) {
        tagIds.delete(id);
        this.workspaceTags.set(wsId, tagIds);
      }
    }

    this.tags.splice(index, 1);
    return true;
  }

  async getTodoCount(tagId: string): Promise<number> {
    // 在 MockDatabase 中通过 todos 计算
    return 0;
  }

  async findByWorkspace(workspaceId: string): Promise<Tag[]> {
    const tagIds = this.workspaceTags.get(workspaceId);
    if (!tagIds) return [];

    return this.tags
      .filter(t => tagIds.has(t.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async associateWithWorkspace(tagId: string, workspaceId: string): Promise<void> {
    const tagIds = this.workspaceTags.get(workspaceId) || new Set();
    tagIds.add(tagId);
    this.workspaceTags.set(workspaceId, tagIds);
  }

  async removeFromWorkspace(tagId: string, workspaceId: string): Promise<void> {
    const tagIds = this.workspaceTags.get(workspaceId);
    if (tagIds) {
      tagIds.delete(tagId);
      this.workspaceTags.set(workspaceId, tagIds);
    }
  }

  // 测试辅助方法
  __reset(): void {
    this.tags = [];
    this.workspaceTags.clear();
  }

  __seed(tags: Tag[]): void {
    this.tags = [...tags];
  }
}

// ==================== Mock SubTask Repository ====================

class MockSubTaskRepository implements ISubTaskRepository {
  private todoRepo: MockTodoRepository;

  constructor(todoRepo: MockTodoRepository) {
    this.todoRepo = todoRepo;
  }

  async findById(id: string): Promise<Todo | null> {
    return this.todoRepo.findById(id);
  }

  async findByTodoId(parentId: string): Promise<Todo[]> {
    const allTodos = this.todoRepo.__getTodos();
    return allTodos
      .filter((t: Todo) => t.parentId === parentId)
      .sort((a: Todo, b: Todo) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }

  async create(input: CreateSubTaskInput): Promise<Todo> {
    const allTodos = this.todoRepo.__getTodos();
    const parent = allTodos.find((t: Todo) => t.id === input.parentId);

    // 查找当前最大的 sortOrder
    const siblings = await this.findByTodoId(input.parentId);
    const maxOrder = siblings.reduce((max, st) => Math.max(max, st.sortOrder || 0), 0);

    const subTask: Todo = {
      id: `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'subtask',
      text: input.text,
      status: 'pending',
      completed: false,
      approvalStatus: input.approvalStatus || 'pending',
      tagIds: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      sortOrder: maxOrder + 1,
      parentId: input.parentId,
      workspaceId: parent?.workspaceId, // 继承父任务的工作区
    };
    this.todoRepo.__addToTodos(subTask);
    return subTask;
  }

  async update(id: string, data: UpdateSubTaskInput): Promise<Todo | null> {
    return this.todoRepo.update(id, {
      text: data.text,
      completed: data.completed,
      sortOrder: data.sortOrder,
      artifact: data.artifact,
      approvalStatus: data.approvalStatus,
    });
  }

  async delete(id: string): Promise<boolean> {
    return this.todoRepo.delete(id);
  }

  async deleteByTodoId(parentId: string): Promise<number> {
    const subTasks = await this.findByTodoId(parentId);
    const ids = subTasks.map((t: Todo) => t.id);
    return this.todoRepo.batchDelete(ids);
  }

  async reorder(parentId: string, subTaskIds: string[]): Promise<boolean> {
    return this.todoRepo.reorderChildren(parentId, subTaskIds);
  }

  async getCompletedCount(parentId: string): Promise<number> {
    const subTasks = await this.findByTodoId(parentId);
    return subTasks.filter(st => st.completed).length;
  }

  async getTotalCount(parentId: string): Promise<number> {
    const subTasks = await this.findByTodoId(parentId);
    return subTasks.length;
  }

  async updateArtifact(subTaskId: string, artifact: string | null): Promise<boolean> {
    return this.todoRepo.updateArtifact(subTaskId, artifact);
  }
}

// ==================== Mock Workspace Repository ====================

class MockWorkspaceRepository implements IWorkspaceRepository {
  private workspaces: Workspace[] = [];
  private todoRepo: MockTodoRepository;

  constructor(todoRepo: MockTodoRepository) {
    this.todoRepo = todoRepo;
  }

  async findAll(): Promise<Workspace[]> {
    return [...this.workspaces];
  }

  async findById(id: string): Promise<Workspace | null> {
    return this.workspaces.find((w) => w.id === id) || null;
  }

  async findByPath(path: string): Promise<Workspace | null> {
    return this.workspaces.find((w) => w.path === path) || null;
  }

  async create(workspace: Omit<Workspace, "id" | "createdAt"> & { id?: string }): Promise<Workspace> {
    // 生成唯一路径
    let path = workspace.path;
    if (!path) {
      path = `/${workspace.name.toLowerCase().replace(/\s+/g, '-')}`;
      let counter = 1;
      while (await this.findByPath(path)) {
        path = `/${workspace.name.toLowerCase().replace(/\s+/g, '-')}-${counter}`;
        counter++;
      }
    }

    const newWorkspace: Workspace = {
      id: workspace.id || `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: workspace.name,
      path,
      color: workspace.color,
      createdAt: new Date(),
    };
    this.workspaces.push(newWorkspace);
    return newWorkspace;
  }

  async update(id: string, data: Partial<Omit<Workspace, "id">>): Promise<Workspace | null> {
    const index = this.workspaces.findIndex((w) => w.id === id);
    if (index === -1) return null;

    this.workspaces[index] = { ...this.workspaces[index], ...data };
    return this.workspaces[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.workspaces.findIndex((w) => w.id === id);
    if (index === -1) return false;
    this.workspaces.splice(index, 1);
    return true;
  }

  async getTodoCount(id: string): Promise<number> {
    const result = await this.todoRepo.findByWorkspace(id);
    return result.length;
  }

  async generateUniquePath(name: string): Promise<string> {
    let path = `/${name.toLowerCase().replace(/\s+/g, '-')}`;
    let counter = 1;

    while (await this.findByPath(path)) {
      path = `/${name.toLowerCase().replace(/\s+/g, '-')}-${counter}`;
      counter++;
    }

    return path;
  }

  // 测试辅助方法
  __reset(): void {
    this.workspaces = [];
  }

  __seed(workspaces: Workspace[]): void {
    this.workspaces = [...workspaces];
  }
}

// ==================== Mock Database ====================

export class MockDatabase implements IDatabase {
  public todos: MockTodoRepository;
  public tags: MockTagRepository;
  public subTasks: MockSubTaskRepository;
  public workspaces: MockWorkspaceRepository;
  private _isConnected = false;

  constructor() {
    this.todos = new MockTodoRepository();
    this.tags = new MockTagRepository();
    this.subTasks = new MockSubTaskRepository(this.todos);
    this.workspaces = new MockWorkspaceRepository(this.todos);
  }

  get isConnected(): boolean {
    return this._isConnected;
  }

  async connect(): Promise<void> {
    this._isConnected = true;
  }

  async disconnect(): Promise<void> {
    this._isConnected = false;
  }

  async migrate(): Promise<void> {
    // Mock 数据库不需要迁移
  }

  async reset(): Promise<void> {
    this.todos.__reset();
    this.tags.__reset();
    this.workspaces.__reset();
  }

  async transaction<T>(callback: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const tx: TransactionContext = {
      commit: async () => {},
      rollback: async () => {},
    };
    return callback(tx);
  }

  // 测试辅助方法
  seed(data: { todos?: Todo[]; tags?: Tag[]; subTasks?: Todo[]; workspaces?: Workspace[] }): void {
    if (data.workspaces) this.workspaces.__seed(data.workspaces);
    if (data.todos) this.todos.__seed(data.todos);
    if (data.tags) this.tags.__seed(data.tags);
    if (data.subTasks) {
      for (const subTask of data.subTasks) {
        this.todos.__addToTodos(subTask);
      }
    }
  }

  clear(): void {
    this.todos.__reset();
    this.tags.__reset();
    this.workspaces.__reset();
  }
}

// 全局 mock 数据库实例
let mockDb: MockDatabase | null = null;

export function getMockDatabase(): MockDatabase {
  if (!mockDb) {
    mockDb = new MockDatabase();
  }
  return mockDb;
}

export function resetMockDatabase(): void {
  if (mockDb) {
    mockDb.clear();
  }
}
