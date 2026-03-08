/**
 * Mock Database 测试
 * 
 * 验证 Mock 数据库实现的正确性
 */

import { MockDatabase, resetMockDatabase } from "../utils/mockDatabase";
import { createTodo, createTag } from "../utils/testUtils";

describe("MockDatabase", () => {
  let db: MockDatabase;

  beforeEach(async () => {
    resetMockDatabase();
    db = new MockDatabase();
    await db.connect();
  });

  afterEach(() => {
    db.disconnect();
  });

  describe("Connection", () => {
    it("should connect successfully", () => {
      expect(db.isConnected).toBe(true);
    });

    it("should disconnect successfully", async () => {
      await db.disconnect();
      expect(db.isConnected).toBe(false);
    });
  });

  describe("Todo Repository", () => {
    describe("create", () => {
      it("should create a todo with text", async () => {
        const todo = await db.todos.create({
          text: "Buy milk",
          completed: false,
          tagIds: [],
          workspacePath: "/",
        });

        expect(todo.text).toBe("Buy milk");
        expect(todo.completed).toBe(false);
        expect(todo.id).toBeDefined();
        expect(todo.createdAt).toBeInstanceOf(Date);
      });

      it("should create a todo with tags", async () => {
        const todo = await db.todos.create({
          text: "Buy milk",
          completed: false,
          tagIds: ["tag-1", "tag-2"],
          workspacePath: "/",
        });

        expect(todo.tagIds).toEqual(["tag-1", "tag-2"]);
      });
    });

    describe("findAll", () => {
      it("should return all todos ordered by createdAt desc", async () => {
        const todo1 = await db.todos.create({
          text: "First",
          completed: false,
          tagIds: [],
          workspacePath: "/",
        });
        await new Promise((r) => setTimeout(r, 10));
        const todo2 = await db.todos.create({
          text: "Second",
          completed: false,
          tagIds: [],
          workspacePath: "/",
        });

        const all = await db.todos.findAll();

        expect(all).toHaveLength(2);
        expect(all[0].id).toBe(todo2.id);
        expect(all[1].id).toBe(todo1.id);
      });
    });

    describe("findById", () => {
      it("should find todo by id", async () => {
        const created = await db.todos.create({
          text: "Test",
          completed: false,
          tagIds: [],
          workspacePath: "/",
        });

        const found = await db.todos.findById(created.id);

        expect(found).not.toBeNull();
        expect(found?.id).toBe(created.id);
      });

      it("should return null for non-existent id", async () => {
        const found = await db.todos.findById("non-existent");
        expect(found).toBeNull();
      });
    });

    describe("update", () => {
      it("should update todo text", async () => {
        const created = await db.todos.create({
          text: "Original",
          completed: false,
          tagIds: [],
          workspacePath: "/",
        });

        const updated = await db.todos.update(created.id, { text: "Updated" });

        expect(updated?.text).toBe("Updated");
        expect(updated?.id).toBe(created.id);
      });

      it("should update todo completed status", async () => {
        const created = await db.todos.create({
          text: "Test",
          completed: false,
          tagIds: [],
          workspacePath: "/",
        });

        const updated = await db.todos.update(created.id, { completed: true });

        expect(updated?.completed).toBe(true);
      });

      it("should return null for non-existent id", async () => {
        const updated = await db.todos.update("non-existent", { text: "Test" });
        expect(updated).toBeNull();
      });
    });

    describe("delete", () => {
      it("should delete todo", async () => {
        const created = await db.todos.create({
          text: "To delete",
          completed: false,
          tagIds: [],
          workspacePath: "/",
        });

        const deleted = await db.todos.delete(created.id);
        const found = await db.todos.findById(created.id);

        expect(deleted).toBe(true);
        expect(found).toBeNull();
      });

      it("should return false for non-existent id", async () => {
        const deleted = await db.todos.delete("non-existent");
        expect(deleted).toBe(false);
      });
    });

    describe("findByStatus", () => {
      it("should return only completed todos", async () => {
        await db.todos.create({ text: "Active", completed: false, tagIds: [], workspacePath: "/" });
        await db.todos.create({
          text: "Completed",
          completed: true,
          tagIds: [],
          workspacePath: "/",
        });

        const completed = await db.todos.findByStatus(true);

        expect(completed).toHaveLength(1);
        expect(completed[0].text).toBe("Completed");
      });
    });

    describe("clearCompleted", () => {
      it("should remove all completed todos", async () => {
        await db.todos.create({ text: "Active 1", completed: false, tagIds: [], workspacePath: "/" });
        await db.todos.create({ text: "Active 2", completed: false, tagIds: [], workspacePath: "/" });
        await db.todos.create({
          text: "Completed 1",
          completed: true,
          tagIds: [],
          workspacePath: "/",
        });
        await db.todos.create({
          text: "Completed 2",
          completed: true,
          tagIds: [],
          workspacePath: "/",
        });

        const deletedCount = await db.todos.clearCompleted();
        const remaining = await db.todos.findAll();

        expect(deletedCount).toBe(2);
        expect(remaining).toHaveLength(2);
        expect(remaining.every((t) => !t.completed)).toBe(true);
      });
    });

    describe("setTags", () => {
      it("should set tags for todo", async () => {
        const todo = await db.todos.create({
          text: "Test",
          completed: false,
          tagIds: ["tag-1"],
          workspacePath: "/",
        });

        await db.todos.setTags(todo.id, ["tag-2", "tag-3"]);
        const updated = await db.todos.findById(todo.id);

        expect(updated?.tagIds).toEqual(["tag-2", "tag-3"]);
      });
    });
  });

  describe("Tag Repository", () => {
    describe("create", () => {
      it("should create a tag with name and color", async () => {
        const tag = await db.tags.create({
          name: "Important",
          color: "rose",
        });

        expect(tag.name).toBe("Important");
        expect(tag.color).toBe("rose");
        expect(tag.id).toBeDefined();
      });
    });

    describe("findAll", () => {
      it("should return all tags ordered by name", async () => {
        await db.tags.create({ name: "Zebra", color: "blue" });
        await db.tags.create({ name: "Apple", color: "red" });
        await db.tags.create({ name: "Banana", color: "yellow" });

        const all = await db.tags.findAll();

        expect(all).toHaveLength(3);
        expect(all[0].name).toBe("Apple");
        expect(all[1].name).toBe("Banana");
        expect(all[2].name).toBe("Zebra");
      });
    });

    describe("findById", () => {
      it("should find tag by id", async () => {
        const created = await db.tags.create({ name: "Work", color: "blue" });

        const found = await db.tags.findById(created.id);

        expect(found?.name).toBe("Work");
      });
    });

    describe("update", () => {
      it("should update tag name", async () => {
        const created = await db.tags.create({ name: "Work", color: "blue" });

        const updated = await db.tags.update(created.id, { name: "Job" });

        expect(updated?.name).toBe("Job");
        expect(updated?.color).toBe("blue");
      });
    });

    describe("delete", () => {
      it("should delete tag", async () => {
        const created = await db.tags.create({ name: "Temp", color: "gray" });

        const deleted = await db.tags.delete(created.id);
        const found = await db.tags.findById(created.id);

        expect(deleted).toBe(true);
        expect(found).toBeNull();
      });
    });
  });

  describe("Transaction", () => {
    it("should execute callback in transaction", async () => {
      const result = await db.transaction(async (tx) => {
        const todo = await db.todos.create({
          text: "In transaction",
          completed: false,
          tagIds: [],
          workspacePath: "/",
        });
        await tx.commit();
        return todo;
      });

      expect(result.text).toBe("In transaction");
    });
  });

  describe("Seed and Reset", () => {
    it("should seed data", async () => {
      const todo = createTodo({ text: "Seeded" });
      const tag = createTag({ name: "Seeded" });

      db.seed({ todos: [todo], tags: [tag] });

      const todos = await db.todos.findAll();
      const tags = await db.tags.findAll();

      expect(todos).toHaveLength(1);
      expect(todos[0].text).toBe("Seeded");
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe("Seeded");
    });

    it("should clear all data", async () => {
      await db.todos.create({ text: "Todo", completed: false, tagIds: [], workspacePath: "/" });
      await db.tags.create({ name: "Tag", color: "blue" });

      db.clear();

      const todos = await db.todos.findAll();
      const tags = await db.tags.findAll();

      expect(todos).toHaveLength(0);
      expect(tags).toHaveLength(0);
    });
  });
});
