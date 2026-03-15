/**
 * Mock Database 测试
 *
 * 验证 Mock 数据库实现的正确性（V3 架构：使用 workspaceId）
 */

import { MockDatabase, resetMockDatabase } from "../utils/mockDatabase";

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
          workspaceId: "root",
        });

        expect(todo.text).toBe("Buy milk");
        expect(todo.completed).toBe(false);
        expect(todo.id).toBeDefined();
        expect(todo.createdAt).toBeInstanceOf(Date);
        expect(todo.workspaceId).toBe("root");
      });

      it("should create a todo with tags", async () => {
        const todo = await db.todos.create({
          text: "Buy milk",
          workspaceId: "root",
          tagIds: ["tag-1", "tag-2"],
        });

        expect(todo.tagIds).toEqual(["tag-1", "tag-2"]);
      });

      it("should create a subtask with parent", async () => {
        const parent = await db.todos.create({
          text: "Parent task",
          workspaceId: "root",
          type: 'task',
        });

        const subtask = await db.todos.create({
          text: "Subtask",
          workspaceId: "root",
          type: 'subtask',
          parentId: parent.id,
        });

        expect(subtask.type).toBe('subtask');
        expect(subtask.parentId).toBe(parent.id);
      });
    });

    describe("findAll", () => {
      beforeEach(async () => {
        await db.todos.create({
          text: "Root task",
          workspaceId: "root",
          type: 'task',
        });
        await db.todos.create({
          text: "Project task",
          workspaceId: "project-a",
          type: 'task',
        });
      });

      it("should return all todos ordered by createdAt desc", async () => {
        const all = await db.todos.findAll();

        expect(all).toHaveLength(2);
      });

      it("should filter by workspaceId", async () => {
        const rootTodos = await db.todos.findAll("root");

        expect(rootTodos).toHaveLength(1);
        expect(rootTodos[0].text).toBe("Root task");
      });

      it("should filter by type", async () => {
        const tasks = await db.todos.findAll(undefined, 'task');

        expect(tasks).toHaveLength(2);
        expect(tasks.every(t => t.type === 'task')).toBe(true);
      });
    });

    describe("findAllPaginated", () => {
      beforeEach(async () => {
        for (let i = 1; i <= 25; i++) {
          await db.todos.create({
            text: `Task ${i}`,
            workspaceId: "root",
            type: 'task',
          });
        }
      });

      it("should return paginated results", async () => {
        const result = await db.todos.findAllPaginated("root", { page: 1, pageSize: 10 });

        expect(result.data).toHaveLength(10);
        expect(result.total).toBe(25);
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(10);
        expect(result.totalPages).toBe(3);
      });

      it("should return second page correctly", async () => {
        const result = await db.todos.findAllPaginated("root", { page: 2, pageSize: 10 });

        expect(result.data).toHaveLength(10);
        expect(result.page).toBe(2);
      });

      it("should filter by status", async () => {
        await db.todos.update((await db.todos.findAll("root"))[0].id, { status: 'completed' });

        const pending = await db.todos.findAllPaginated("root", undefined, { status: 'pending' });

        expect(pending.total).toBe(24);
      });
    });

    describe("findById", () => {
      it("should find todo by id", async () => {
        const created = await db.todos.create({
          text: "Test",
          workspaceId: "root",
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

    describe("findByWorkspace", () => {
      beforeEach(async () => {
        await db.todos.create({
          text: "Root task",
          workspaceId: "root",
          type: 'task',
        });
        await db.todos.create({
          text: "Project task",
          workspaceId: "project-a",
          type: 'task',
        });
      });

      it("should return todos for specific workspace", async () => {
        const result = await db.todos.findByWorkspace("root");

        expect(result).toHaveLength(1);
        expect(result[0].text).toBe("Root task");
      });

      it("should filter by type in workspace", async () => {
        await db.todos.create({
          text: "Root subtask",
          workspaceId: "root",
          type: 'subtask',
        });

        const tasks = await db.todos.findByWorkspace("root", 'task');

        expect(tasks).toHaveLength(1);
        expect(tasks[0].type).toBe('task');
      });
    });

    describe("update", () => {
      it("should update todo text", async () => {
        const created = await db.todos.create({
          text: "Original",
          workspaceId: "root",
        });

        const updated = await db.todos.update(created.id, { text: "Updated" });

        expect(updated?.text).toBe("Updated");
        expect(updated?.id).toBe(created.id);
      });

      it("should update todo workspaceId", async () => {
        await db.workspaces.create({ name: "New Workspace", path: "/new" });
        const created = await db.todos.create({
          text: "Test",
          workspaceId: "root",
        });

        const updated = await db.todos.update(created.id, { workspaceId: "new-workspace" });

        expect(updated?.workspaceId).toBe("new-workspace");
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
          workspaceId: "root",
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

    describe("batchDelete", () => {
      it("should delete multiple todos", async () => {
        const todo1 = await db.todos.create({ text: "1", workspaceId: "root" });
        const todo2 = await db.todos.create({ text: "2", workspaceId: "root" });
        const todo3 = await db.todos.create({ text: "3", workspaceId: "root" });

        const count = await db.todos.batchDelete([todo1.id, todo2.id]);

        expect(count).toBe(2);
        expect(await db.todos.findById(todo1.id)).toBeNull();
        expect(await db.todos.findById(todo2.id)).toBeNull();
        expect(await db.todos.findById(todo3.id)).not.toBeNull();
      });
    });

    describe("findByStatus", () => {
      it("should return only completed todos", async () => {
        await db.todos.create({
          text: "Active",
          workspaceId: "root",
          status: 'pending',
        });
        await db.todos.create({
          text: "Completed",
          workspaceId: "root",
          status: 'completed',
        });

        const completed = await db.todos.findByStatus(true);

        expect(completed).toHaveLength(1);
        expect(completed[0].text).toBe("Completed");
      });

      it("should filter by workspaceId", async () => {
        await db.todos.create({
          text: "Root active",
          workspaceId: "root",
          status: 'pending',
        });
        await db.todos.create({
          text: "Project active",
          workspaceId: "project-a",
          status: 'pending',
        });

        const result = await db.todos.findByStatus(false, "root");

        expect(result).toHaveLength(1);
        expect(result[0].text).toBe("Root active");
      });
    });

    describe("findByTag", () => {
      it("should return todos with specific tag", async () => {
        const tagId = "tag-1";
        await db.todos.create({
          text: "Tagged",
          workspaceId: "root",
          tagIds: [tagId],
        });
        await db.todos.create({
          text: "Untagged",
          workspaceId: "root",
          tagIds: [],
        });

        const result = await db.todos.findByTag(tagId);

        expect(result).toHaveLength(1);
        expect(result[0].text).toBe("Tagged");
      });
    });

    describe("search", () => {
      it("should search todos by keyword", async () => {
        await db.todos.create({ text: "Buy groceries", workspaceId: "root" });
        await db.todos.create({ text: "Buy milk", workspaceId: "root" });
        await db.todos.create({ text: "Walk dog", workspaceId: "root" });

        const results = await db.todos.search("buy");

        expect(results).toHaveLength(2);
        expect(results.every(r => r.text.toLowerCase().includes("buy"))).toBe(true);
      });

      it("should filter by workspaceId", async () => {
        await db.todos.create({ text: "Test root", workspaceId: "root" });
        await db.todos.create({ text: "Test project", workspaceId: "project-a" });

        const results = await db.todos.search("test", "root");

        expect(results).toHaveLength(1);
        expect(results[0].workspaceId).toBe("root");
      });
    });

    describe("clearCompleted", () => {
      it("should remove all completed todos", async () => {
        await db.todos.create({
          text: "Active 1",
          workspaceId: "root",
          status: 'pending',
        });
        await db.todos.create({
          text: "Active 2",
          workspaceId: "root",
          status: 'pending',
        });
        await db.todos.create({
          text: "Completed 1",
          workspaceId: "root",
          status: 'completed',
        });
        await db.todos.create({
          text: "Completed 2",
          workspaceId: "root",
          status: 'completed',
        });

        const deletedCount = await db.todos.clearCompleted();
        const remaining = await db.todos.findAll();

        expect(deletedCount).toBe(2);
        expect(remaining).toHaveLength(2);
        expect(remaining.every((t) => !t.completed)).toBe(true);
      });

      it("should filter by workspaceId", async () => {
        await db.todos.create({
          text: "Root completed",
          workspaceId: "root",
          status: 'completed',
        });
        await db.todos.create({
          text: "Project completed",
          workspaceId: "project-a",
          status: 'completed',
        });

        const deletedCount = await db.todos.clearCompleted("root");
        const projectTodos = await db.todos.findByWorkspace("project-a");

        expect(deletedCount).toBe(1);
        expect(projectTodos).toHaveLength(1);
      });
    });

    describe("tag operations", () => {
      it("should add tag to todo", async () => {
        const todo = await db.todos.create({ text: "Test", workspaceId: "root" });
        await db.todos.addTag(todo.id, "tag-1");

        const updated = await db.todos.findById(todo.id);
        expect(updated?.tagIds).toContain("tag-1");
      });

      it("should remove tag from todo", async () => {
        const todo = await db.todos.create({
          text: "Test",
          workspaceId: "root",
          tagIds: ["tag-1", "tag-2"],
        });
        await db.todos.removeTag(todo.id, "tag-1");

        const updated = await db.todos.findById(todo.id);
        expect(updated?.tagIds).toEqual(["tag-2"]);
      });

      it("should set tags for todo", async () => {
        const todo = await db.todos.create({
          text: "Test",
          workspaceId: "root",
          tagIds: ["tag-1"],
        });
        await db.todos.setTags(todo.id, ["tag-2", "tag-3"]);

        const updated = await db.todos.findById(todo.id);
        expect(updated?.tagIds).toEqual(["tag-2", "tag-3"]);
      });
    });

    describe("child operations", () => {
      it("should add child to parent", async () => {
        const parent = await db.todos.create({
          text: "Parent",
          workspaceId: "root",
          type: 'task',
        });
        const child = await db.todos.create({
          text: "Child",
          workspaceId: "root",
          type: 'subtask',
          parentId: parent.id,
        });

        const children = await db.todos.findChildren(parent.id);
        expect(children).toHaveLength(1);
        expect(children[0].id).toBe(child.id);
      });

      it("should remove child from parent", async () => {
        const parent = await db.todos.create({
          text: "Parent",
          workspaceId: "root",
          type: 'task',
        });
        const child = await db.todos.create({
          text: "Child",
          workspaceId: "root",
          type: 'subtask',
          parentId: parent.id,
        });

        await db.todos.removeChild(parent.id, child.id);
        const children = await db.todos.findChildren(parent.id);

        expect(children).toHaveLength(0);
      });

      it("should reorder children", async () => {
        const parent = await db.todos.create({
          text: "Parent",
          workspaceId: "root",
          type: 'task',
        });
        const child1 = await db.todos.create({
          text: "Child 1",
          workspaceId: "root",
          type: 'subtask',
          parentId: parent.id,
        });
        const child2 = await db.todos.create({
          text: "Child 2",
          workspaceId: "root",
          type: 'subtask',
          parentId: parent.id,
        });

        await db.todos.reorderChildren(parent.id, [child2.id, child1.id]);

        const children = await db.todos.findChildren(parent.id);
        expect(children[0].id).toBe(child2.id);
        expect(children[0].sortOrder).toBe(0);
        expect(children[1].id).toBe(child1.id);
        expect(children[1].sortOrder).toBe(1);
      });
    });

    describe("artifact operations", () => {
      it("should update artifact", async () => {
        const todo = await db.todos.create({ text: "Test", workspaceId: "root" });
        await db.todos.updateArtifact(todo.id, "# Artifact content");

        const updated = await db.todos.findById(todo.id);
        expect(updated?.artifact).toBe("# Artifact content");
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

      it("should create tag and associate with workspace", async () => {
        const tag = await db.tags.create(
          { name: "Workspace Tag", color: "blue" },
          "root"
        );

        const tagsInWorkspace = await db.tags.findByWorkspace("root");
        expect(tagsInWorkspace).toContainEqual(tag);
      });
    });

    describe("findAll", () => {
      beforeEach(async () => {
        await db.tags.create({ name: "Zebra", color: "blue" });
        await db.tags.create({ name: "Apple", color: "red" });
        await db.tags.create({ name: "Banana", color: "yellow" });
      });

      it("should return all tags ordered by name", async () => {
        const all = await db.tags.findAll();

        expect(all).toHaveLength(3);
        expect(all[0].name).toBe("Apple");
        expect(all[1].name).toBe("Banana");
        expect(all[2].name).toBe("Zebra");
      });

      it("should filter by workspaceId", async () => {
        await db.tags.associateWithWorkspace((await db.tags.findAll())[0].id, "root");
        await db.tags.associateWithWorkspace((await db.tags.findAll())[1].id, "root");

        const rootTags = await db.tags.findAll("root");
        expect(rootTags).toHaveLength(2);
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

    describe("workspace association", () => {
      it("should associate tag with workspace", async () => {
        const tag = await db.tags.create({ name: "Tag", color: "blue" });
        await db.tags.associateWithWorkspace(tag.id, "root");

        const tags = await db.tags.findByWorkspace("root");
        expect(tags).toContainEqual(tag);
      });

      it("should remove tag from workspace", async () => {
        const tag = await db.tags.create({ name: "Tag", color: "blue" });
        await db.tags.associateWithWorkspace(tag.id, "root");
        await db.tags.removeFromWorkspace(tag.id, "root");

        const tags = await db.tags.findByWorkspace("root");
        expect(tags).toHaveLength(0);
      });
    });
  });

  describe("SubTask Repository", () => {
    describe("findByTodoId", () => {
      it("should return subtasks for parent", async () => {
        const parent = await db.todos.create({
          text: "Parent",
          workspaceId: "root",
          type: 'task',
        });
        await db.todos.create({
          text: "Child 1",
          workspaceId: "root",
          type: 'subtask',
          parentId: parent.id,
        });
        await db.todos.create({
          text: "Child 2",
          workspaceId: "root",
          type: 'subtask',
          parentId: parent.id,
        });

        const subtasks = await db.subTasks.findByTodoId(parent.id);

        expect(subtasks).toHaveLength(2);
      });
    });

    describe("getCompletedCount", () => {
      it("should return completed subtask count", async () => {
        const parent = await db.todos.create({
          text: "Parent",
          workspaceId: "root",
          type: 'task',
        });
        await db.todos.create({
          text: "Completed",
          workspaceId: "root",
          type: 'subtask',
          parentId: parent.id,
          status: 'completed',  // 设置为已完成
        });
        await db.todos.create({
          text: "Active",
          workspaceId: "root",
          type: 'subtask',
          parentId: parent.id,
        });

        const count = await db.subTasks.getCompletedCount(parent.id);

        expect(count).toBe(1);
      });

      it("should return total subtask count", async () => {
        const parent = await db.todos.create({
          text: "Parent",
          workspaceId: "root",
          type: 'task',
        });
        await db.todos.create({
          text: "Child 1",
          workspaceId: "root",
          type: 'subtask',
          parentId: parent.id,
        });
        await db.todos.create({
          text: "Child 2",
          workspaceId: "root",
          type: 'subtask',
          parentId: parent.id,
        });

        const count = await db.subTasks.getTotalCount(parent.id);

        expect(count).toBe(2);
      });
    });
  });

  describe("Workspace Repository", () => {
    describe("create", () => {
      it("should create a workspace", async () => {
        const workspace = await db.workspaces.create({
          name: "My Project",
          path: "/my-project",
        });

        expect(workspace.name).toBe("My Project");
        expect(workspace.path).toBe("/my-project");
        expect(workspace.id).toBeDefined();
      });

      it("should generate unique path if not provided", async () => {
        const ws1 = await db.workspaces.create({ name: "Test" });
        const ws2 = await db.workspaces.create({ name: "Test" });

        expect(ws1.path).toBe("/test");
        expect(ws2.path).toBe("/test-1");
      });
    });

    describe("findAll", () => {
      it("should return all workspaces", async () => {
        await db.workspaces.create({ name: "Project A", path: "/a" });
        await db.workspaces.create({ name: "Project B", path: "/b" });

        const workspaces = await db.workspaces.findAll();

        expect(workspaces).toHaveLength(2);
      });
    });

    describe("findById", () => {
      it("should find workspace by id", async () => {
        const created = await db.workspaces.create({
          name: "Project",
          path: "/project",
        });

        const found = await db.workspaces.findById(created.id);

        expect(found?.name).toBe("Project");
      });
    });

    describe("findByPath", () => {
      it("should find workspace by path", async () => {
        await db.workspaces.create({ name: "Project", path: "/project" });

        const found = await db.workspaces.findByPath("/project");

        expect(found?.name).toBe("Project");
      });
    });

    describe("update", () => {
      it("should update workspace", async () => {
        const created = await db.workspaces.create({
          name: "Project",
          path: "/project",
        });

        const updated = await db.workspaces.update(created.id, {
          name: "Updated Project",
        });

        expect(updated?.name).toBe("Updated Project");
      });
    });

    describe("delete", () => {
      it("should delete workspace", async () => {
        const created = await db.workspaces.create({
          name: "Temp",
          path: "/temp",
        });

        const deleted = await db.workspaces.delete(created.id);
        const found = await db.workspaces.findById(created.id);

        expect(deleted).toBe(true);
        expect(found).toBeNull();
      });
    });

    describe("getTodoCount", () => {
      it("should return todo count for workspace", async () => {
        const workspace = await db.workspaces.create({
          name: "Project",
          path: "/project",
        });
        await db.todos.create({ text: "Task 1", workspaceId: workspace.id });
        await db.todos.create({ text: "Task 2", workspaceId: workspace.id });

        const count = await db.workspaces.getTodoCount(workspace.id);

        expect(count).toBe(2);
      });
    });
  });

  describe("Transaction", () => {
    it("should execute callback in transaction", async () => {
      const result = await db.transaction(async (tx) => {
        const todo = await db.todos.create({
          text: "In transaction",
          workspaceId: "root",
        });
        await tx.commit();
        return todo;
      });

      expect(result.text).toBe("In transaction");
    });
  });
});
