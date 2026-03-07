/**
 * Mock 数据库实现
 * 
 * 用于单元测试，内存存储，快速重置
 */

import {
  IDatabase,
  ITodoRepository,
  ITagRepository,
  ISubTaskRepository,
  TransactionContext,
} from "@/lib/db/types";
import { Todo, Tag, SubTask, CreateSubTaskInput, UpdateSubTaskInput } from "@/app/types";

// ==================== Mock Todo Repository ====================

class MockTodoRepository implements ITodoRepository {
  private todos: Todo[] = [];

  async findAll(): Promise<Todo[]> {
    return [...this.todos].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async findById(id: string): Promise<Todo | null> {
    return this.todos.find((t) => t.id === id) || null;
  }

  async findByTag(tagId: string): Promise<Todo[]> {
    return this.todos
      .filter((t) => t.tagIds.includes(tagId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async findByStatus(completed: boolean): Promise<Todo[]> {
    return this.todos
      .filter((t) => t.completed === completed)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async create(data: Omit<Todo, "id" | "createdAt" | "subTasks">): Promise<Todo> {
    const todo: Todo = {
      id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: data.text,
      completed: data.completed,
      tagIds: data.tagIds || [],
      artifact: data.artifact,
      createdAt: new Date(),
    };
    this.todos.push(todo);
    return todo;
  }

  async update(id: string, data: Partial<Omit<Todo, "subTasks">>): Promise<Todo | null> {
    const index = this.todos.findIndex((t) => t.id === id);
    if (index === -1) return null;

    this.todos[index] = { ...this.todos[index], ...data };
    return this.todos[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.todos.findIndex((t) => t.id === id);
    if (index === -1) return false;
    this.todos.splice(index, 1);
    return true;
  }

  async batchDelete(ids: string[]): Promise<number> {
    const initialLength = this.todos.length;
    this.todos = this.todos.filter((t) => !ids.includes(t.id));
    return initialLength - this.todos.length;
  }

  async clearCompleted(): Promise<number> {
    const completed = this.todos.filter((t) => t.completed);
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

  // 测试辅助方法
  __reset(): void {
    this.todos = [];
  }

  __seed(todos: Todo[]): void {
    this.todos = [...todos];
  }
}

// ==================== Mock Tag Repository ====================

class MockTagRepository implements ITagRepository {
  private tags: Tag[] = [];

  async findAll(): Promise<Tag[]> {
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

  async create(data: Omit<Tag, "id">): Promise<Tag> {
    const tag: Tag = {
      id: `tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: data.name,
      color: data.color,
    };
    this.tags.push(tag);
    return tag;
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
    this.tags.splice(index, 1);
    return true;
  }

  async getTodoCount(tagId: string): Promise<number> {
    // 这个需要在 MockDatabase 中通过 todos 计算
    return 0;
  }

  // 测试辅助方法
  __reset(): void {
    this.tags = [];
  }

  __seed(tags: Tag[]): void {
    this.tags = [...tags];
  }
}

// ==================== Mock SubTask Repository ====================

class MockSubTaskRepository implements ISubTaskRepository {
  private subTasks: SubTask[] = [];

  async findById(id: string): Promise<SubTask | null> {
    return this.subTasks.find((st) => st.id === id) || null;
  }

  async findByTodoId(todoId: string): Promise<SubTask[]> {
    return this.subTasks
      .filter((st) => st.todoId === todoId)
      .sort((a, b) => a.order - b.order);
  }

  async create(input: CreateSubTaskInput): Promise<SubTask> {
    const todoSubTasks = this.subTasks.filter((st) => st.todoId === input.todoId);
    const maxOrder = todoSubTasks.reduce((max, st) => Math.max(max, st.order), 0);

    const subTask: SubTask = {
      id: `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      todoId: input.todoId,
      text: input.text,
      completed: false,
      createdAt: new Date(),
      order: maxOrder + 1,
    };
    this.subTasks.push(subTask);
    return subTask;
  }

  async update(id: string, data: UpdateSubTaskInput): Promise<SubTask | null> {
    const index = this.subTasks.findIndex((st) => st.id === id);
    if (index === -1) return null;

    this.subTasks[index] = { ...this.subTasks[index], ...data };
    return this.subTasks[index];
  }

  async delete(id: string): Promise<boolean> {
    const index = this.subTasks.findIndex((st) => st.id === id);
    if (index === -1) return false;
    this.subTasks.splice(index, 1);
    return true;
  }

  async deleteByTodoId(todoId: string): Promise<number> {
    const initialCount = this.subTasks.length;
    this.subTasks = this.subTasks.filter((st) => st.todoId !== todoId);
    return initialCount - this.subTasks.length;
  }

  async reorder(todoId: string, subTaskIds: string[]): Promise<boolean> {
    const todoSubTasks = this.subTasks.filter((st) => st.todoId === todoId);
    
    for (let i = 0; i < subTaskIds.length; i++) {
      const subTask = todoSubTasks.find((st) => st.id === subTaskIds[i]);
      if (subTask) {
        subTask.order = i;
      }
    }
    return true;
  }

  async getCompletedCount(todoId: string): Promise<number> {
    return this.subTasks.filter((st) => st.todoId === todoId && st.completed).length;
  }

  async getTotalCount(todoId: string): Promise<number> {
    return this.subTasks.filter((st) => st.todoId === todoId).length;
  }

  async updateArtifact(subTaskId: string, artifact: string | null): Promise<boolean> {
    const subTask = await this.findById(subTaskId);
    if (!subTask) return false;
    subTask.artifact = artifact || undefined;
    return true;
  }

  // 测试辅助方法
  __reset(): void {
    this.subTasks = [];
  }

  __seed(subTasks: SubTask[]): void {
    this.subTasks = [...subTasks];
  }
}

// ==================== Mock Database ====================

export class MockDatabase implements IDatabase {
  public todos: MockTodoRepository;
  public tags: MockTagRepository;
  public subTasks: MockSubTaskRepository;
  private _isConnected = false;

  constructor() {
    this.todos = new MockTodoRepository();
    this.tags = new MockTagRepository();
    this.subTasks = new MockSubTaskRepository();
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
    this.subTasks.__reset();
  }

  async transaction<T>(callback: (tx: TransactionContext) => Promise<T>): Promise<T> {
    const tx: TransactionContext = {
      commit: async () => {},
      rollback: async () => {},
    };
    return callback(tx);
  }

  // 测试辅助方法
  seed(data: { todos?: Todo[]; tags?: Tag[]; subTasks?: SubTask[] }): void {
    if (data.todos) this.todos.__seed(data.todos);
    if (data.tags) this.tags.__seed(data.tags);
    if (data.subTasks) this.subTasks.__seed(data.subTasks);
  }

  clear(): void {
    this.todos.__reset();
    this.tags.__reset();
    this.subTasks.__reset();
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
