/**
 * SubTasks API 路由测试
 *
 * @jest-environment node
 *
 * 测试子任务数量限制和其他 API 功能
 */

import { GET, POST } from "@/app/api/todos/[id]/subtasks/route";
import * as dbModule from "@/app/api/db";
import { SQLiteDatabase } from "@/lib/db/sqlite";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock db 模块
jest.mock("@/app/api/db", () => ({
  ensureConnected: jest.fn(),
}));

// 延迟函数，避免 ID 冲突（ID 基于时间戳生成，需要足够长的延迟）
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe("SubTasks API Routes", () => {
  let testDb: SQLiteDatabase;
  let tempDbPath: string;
  let testTodoId: string;

  beforeEach(async () => {
    // 创建临时文件数据库，使用唯一路径
    tempDbPath = path.join(os.tmpdir(), `test-subtasks-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    testDb = new SQLiteDatabase({ sqlitePath: tempDbPath });
    await testDb.connect();
    (dbModule.ensureConnected as jest.Mock).mockResolvedValue(testDb);

    // 创建一个测试主任务，等待确保 ID 唯一
    await delay(10);
    const todo = await testDb.todos.create({
      text: "Test Todo for SubTasks",
      tagIds: [],
      workspaceId: "root",
    });
    testTodoId = todo.id;
  });

  afterEach(async () => {
    await testDb.disconnect();
    // 清理临时文件
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
    jest.clearAllMocks();
  });

  describe("GET /api/todos/:id/subtasks", () => {
    it("should return empty array when no subtasks", async () => {
      const request = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`);
      const response = await GET(request, { params: Promise.resolve({ id: testTodoId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it("should return all subtasks for a todo", async () => {
      // 通过 API 创建子任务
      await delay(10);
      const request1 = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`, {
        method: "POST",
        body: JSON.stringify({ text: "SubTask 1" }),
      });
      const resp1 = await POST(request1, { params: Promise.resolve({ id: testTodoId }) });
      expect(resp1.status).toBe(201);
      await delay(10);

      const request2 = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`, {
        method: "POST",
        body: JSON.stringify({ text: "SubTask 2" }),
      });
      const resp2 = await POST(request2, { params: Promise.resolve({ id: testTodoId }) });
      expect(resp2.status).toBe(201);

      const request = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`);
      const response = await GET(request, { params: Promise.resolve({ id: testTodoId }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(2);
    });
  });

  describe("POST /api/todos/:id/subtasks - 数量限制", () => {
    it("should create subtask when under limit", async () => {
      await delay(10);
      const request = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`, {
        method: "POST",
        body: JSON.stringify({ text: "New SubTask" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testTodoId }) });
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.text).toBe("New SubTask");
      expect(data.id).toBeDefined();
    });

    it("should allow creating exactly 10 subtasks", async () => {
      // 创建 10 个子任务
      for (let i = 1; i <= 10; i++) {
        await delay(10);
        const request = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`, {
          method: "POST",
          body: JSON.stringify({ text: `SubTask ${i}` }),
        });

        const response = await POST(request, { params: Promise.resolve({ id: testTodoId }) });
        expect(response.status).toBe(201);
      }

      // 验证确实有 10 个子任务
      const subTasks = await testDb.subTasks.findByTodoId(testTodoId);
      expect(subTasks).toHaveLength(10);
    });

    it("should reject creating more than 10 subtasks", async () => {
      // 通过 API 创建 10 个子任务
      for (let i = 1; i <= 10; i++) {
        await delay(10);
        const request = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`, {
          method: "POST",
          body: JSON.stringify({ text: `SubTask ${i}` }),
        });
        const resp = await POST(request, { params: Promise.resolve({ id: testTodoId }) });
        expect(resp.status).toBe(201);
      }

      // 等待确保 ID 唯一
      await delay(10);

      // 尝试创建第 11 个子任务
      const request = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`, {
        method: "POST",
        body: JSON.stringify({ text: "SubTask 11 - Should Fail" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testTodoId }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("已达上限");
      expect(data.error).toContain("10");
    });

    it("should return correct error message format", async () => {
      // 通过 API 创建 10 个子任务
      for (let i = 1; i <= 10; i++) {
        await delay(10);
        const request = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`, {
          method: "POST",
          body: JSON.stringify({ text: `SubTask ${i}` }),
        });
        await POST(request, { params: Promise.resolve({ id: testTodoId }) });
      }

      await delay(10);

      const request = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`, {
        method: "POST",
        body: JSON.stringify({ text: "Extra SubTask" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testTodoId }) });
      const data = await response.json();

      // 验证错误消息包含建议
      expect(response.status).toBe(400);
      expect(data.error).toContain("建议拆分任务规模");
    });

    it("should allow creating subtasks for different todos independently", async () => {
      // 创建第二个主任务
      await delay(10);
      const todo2 = await testDb.todos.create({
        text: "Test Todo 2",
        tagIds: [],
        workspaceId: "root",
      });

      // 为第一个任务创建 10 个子任务
      for (let i = 1; i <= 10; i++) {
        await delay(10);
        const request = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`, {
          method: "POST",
          body: JSON.stringify({ text: `Todo1 SubTask ${i}` }),
        });
        await POST(request, { params: Promise.resolve({ id: testTodoId }) });
      }

      await delay(10);

      // 第一个任务应该拒绝第 11 个子任务
      const request1 = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`, {
        method: "POST",
        body: JSON.stringify({ text: "Todo1 SubTask 11" }),
      });
      const response1 = await POST(request1, { params: Promise.resolve({ id: testTodoId }) });
      expect(response1.status).toBe(400);

      await delay(10);

      // 第二个任务应该可以创建子任务
      const request2 = new Request(`http://localhost/api/todos/${todo2.id}/subtasks`, {
        method: "POST",
        body: JSON.stringify({ text: "Todo2 SubTask 1" }),
      });
      const response2 = await POST(request2, { params: Promise.resolve({ id: todo2.id }) });
      expect(response2.status).toBe(201);
    });

    it("should count correctly after deleting subtasks", async () => {
      // 通过 API 创建 10 个子任务，记录 ID
      const subTaskIds: string[] = [];
      for (let i = 1; i <= 10; i++) {
        await delay(10);
        const request = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`, {
          method: "POST",
          body: JSON.stringify({ text: `SubTask ${i}` }),
        });
        const response = await POST(request, { params: Promise.resolve({ id: testTodoId }) });
        const data = await response.json();
        expect(response.status).toBe(201);
        subTaskIds.push(data.id);
      }

      // 删除一个子任务
      await testDb.subTasks.delete(subTaskIds[0]);

      await delay(10);

      // 现在应该可以创建新的子任务
      const request = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`, {
        method: "POST",
        body: JSON.stringify({ text: "New SubTask After Delete" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testTodoId }) });
      expect(response.status).toBe(201);

      // 验证总数仍然是 10
      const subTasks = await testDb.subTasks.findByTodoId(testTodoId);
      expect(subTasks).toHaveLength(10);
    });
  });

  describe("POST /api/todos/:id/subtasks - 错误处理", () => {
    it("should return 500 on database error", async () => {
      // 模拟数据库错误
      (dbModule.ensureConnected as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const request = new Request(`http://localhost/api/todos/${testTodoId}/subtasks`, {
        method: "POST",
        body: JSON.stringify({ text: "Error SubTask" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: testTodoId }) });
      expect(response.status).toBe(500);
    });

    it("should return 500 for non-existent todo when creating subtask", async () => {
      const nonExistentId = "non-existent-todo-id";
      const request = new Request(`http://localhost/api/todos/${nonExistentId}/subtasks`, {
        method: "POST",
        body: JSON.stringify({ text: "SubTask for non-existent todo" }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: nonExistentId }) });
      // 根据实现可能返回 404 或 500，这里主要验证不会崩溃
      expect([404, 500]).toContain(response.status);
    });
  });
});
