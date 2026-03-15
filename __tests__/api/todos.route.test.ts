/**
 * Todos API 路由测试
 * 
 * @jest-environment node
 * 
 * 使用真实 SQLiteDatabase 进行测试，使用临时文件数据库避免污染正式数据
 */

import { GET, POST } from "@/app/api/todos/route";
import * as dbModule from "@/app/api/db";
import { SQLiteDatabase } from "@/lib/db/sqlite";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock db 模块
jest.mock("@/app/api/db", () => ({
  ensureConnected: jest.fn(),
}));

// 延迟函数，避免 ID 冲突
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe("Todos API Routes", () => {
  let testDb: SQLiteDatabase;
  let tempDbPath: string;

  beforeEach(async () => {
    // 创建临时文件数据库
    tempDbPath = path.join(os.tmpdir(), `test-todos-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    testDb = new SQLiteDatabase({ sqlitePath: tempDbPath });
    await testDb.connect();
    (dbModule.ensureConnected as jest.Mock).mockResolvedValue(testDb);
  });

  afterEach(async () => {
    await testDb.disconnect();
    // 清理临时文件
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
    jest.clearAllMocks();
  });

  describe("GET /api/todos", () => {
    it("should return empty array when no todos", async () => {
      const request = new Request("http://localhost/api/todos");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual([]);
      expect(data.total).toBe(0);
    });

    it("should return all todos", async () => {
      await testDb.todos.create({
        text: "Todo 1",
        tagIds: [],
        workspaceId: "root",
      });
      await delay(10);
      await testDb.todos.create({
        text: "Todo 2",
        tagIds: [],
        workspaceId: "root",
      });

      const request = new Request("http://localhost/api/todos");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.total).toBe(2);
    });

    it("should filter by status", async () => {
      await testDb.todos.create({
        text: "Active Todo",
        status: "pending",
        tagIds: [],
        workspaceId: "root",
      });
      await delay(10);
      await testDb.todos.create({
        text: "Completed Todo",
        status: "completed",
        tagIds: [],
        workspaceId: "root",
      });

      const request = new Request("http://localhost/api/todos?status=completed");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].text).toBe("Completed Todo");
      expect(data.data[0].status).toBe("completed");
    });

    it("should filter by workspace", async () => {
      // 创建测试工作区
      await testDb.workspaces.create({
        id: "workspace-1",
        name: "Test Workspace",
        path: "/test",
        color: "blue",
      });

      await testDb.todos.create({
        text: "Root Todo",
        tagIds: [],
        workspaceId: "root",
      });
      await delay(10);
      await testDb.todos.create({
        text: "Test Todo",
        tagIds: [],
        workspaceId: "workspace-1",
      });

      const request = new Request("http://localhost/api/todos?workspace=workspace-1");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].text).toBe("Test Todo");
    });

    it("should support pagination", async () => {
      // 创建多个任务
      for (let i = 1; i <= 5; i++) {
        await testDb.todos.create({
          text: `Todo ${i}`,
          tagIds: [],
          workspaceId: "root",
        });
        await delay(10);
      }

      const request = new Request("http://localhost/api/todos?page=1&pageSize=2");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].text).toBe("Todo 5"); // 按时间倒序
      expect(data.data[1].text).toBe("Todo 4");
      expect(data.total).toBe(5);
      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(2);
      expect(data.totalPages).toBe(3);
    });
  });

  describe("POST /api/todos", () => {
    it("should create a new todo", async () => {
      const request = new Request("http://localhost/api/todos", {
        method: "POST",
        body: JSON.stringify({
          text: "New Todo",
          tagIds: [],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.text).toBe("New Todo");
      expect(data.id).toBeDefined();
      expect(data.status).toBe("pending");

      // 验证数据库中确实创建了
      const todos = await testDb.todos.findAll();
      expect(todos).toHaveLength(1);
    });

    it("should create todo with workspaceId", async () => {
      // 创建工作区
      await testDb.workspaces.create({
        id: "test-workspace",
        name: "Test",
        path: "/test",
        color: "blue",
      });

      const request = new Request("http://localhost/api/todos", {
        method: "POST",
        body: JSON.stringify({
          text: "Workspace Todo",
          tagIds: [],
          workspaceId: "test-workspace",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.text).toBe("Workspace Todo");

      // 验证关联到正确的工作区
      const todos = await testDb.todos.findByWorkspace("test-workspace");
      expect(todos).toHaveLength(1);
    });

    it("should create todo with workspaceId directly", async () => {
      // 创建工作区
      await testDb.workspaces.create({
        id: "direct-workspace",
        name: "Direct Test",
        path: "/direct-test",
        color: "green",
      });

      const request = new Request("http://localhost/api/todos", {
        method: "POST",
        body: JSON.stringify({
          text: "Direct Todo",
          tagIds: [],
          workspaceId: "direct-workspace", // 直接使用 workspaceId
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.text).toBe("Direct Todo");
      expect(data.workspaceId).toBe("direct-workspace");

      // 验证关联到正确的工作区
      const todos = await testDb.todos.findByWorkspace("direct-workspace");
      expect(todos).toHaveLength(1);
    });

    it("should create todo with tags", async () => {
      // 创建标签
      const tag = await testDb.tags.create({ name: "Important", color: "red" });

      const request = new Request("http://localhost/api/todos", {
        method: "POST",
        body: JSON.stringify({
          text: "Tagged Todo",
          tagIds: [tag.id],
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.tagIds).toContain(tag.id);
    });

    it("should create todo with status", async () => {
      const request = new Request("http://localhost/api/todos", {
        method: "POST",
        body: JSON.stringify({
          text: "Completed Todo",
          tagIds: [],
          status: "completed",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.text).toBe("Completed Todo");
      expect(data.status).toBe("completed");
      expect(data.completed).toBe(true);
    });

    it("should return 500 on database error", async () => {
      // 模拟数据库错误
      (dbModule.ensureConnected as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const request = new Request("http://localhost/api/todos", {
        method: "POST",
        body: JSON.stringify({ text: "Error Todo" }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
