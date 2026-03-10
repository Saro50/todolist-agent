/**
 * Workspaces API 路由测试
 * 
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/workspaces/route";
import * as dbModule from "@/app/api/db";
import { SQLiteDatabase } from "@/lib/db/sqlite";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock db 模块
jest.mock("@/app/api/db", () => ({
  ensureConnected: jest.fn(),
}));

describe("Workspaces API Routes", () => {
  let testDb: SQLiteDatabase;
  let tempDbPath: string;

  beforeEach(async () => {
    tempDbPath = path.join(os.tmpdir(), `test-workspaces-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    testDb = new SQLiteDatabase({ sqlitePath: tempDbPath });
    await testDb.connect();
    (dbModule.ensureConnected as jest.Mock).mockResolvedValue(testDb);
  });

  afterEach(async () => {
    await testDb.disconnect();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
    jest.clearAllMocks();
  });

  describe("GET /api/workspaces", () => {
    it("should return all workspaces including root", async () => {
      // 创建一些工作区
      await testDb.workspaces.create({
        id: "ws-1",
        name: "Workspace 1",
        path: "/test1",
        color: "blue",
      });
      await testDb.workspaces.create({
        id: "ws-2",
        name: "Workspace 2",
        path: "/test2",
        color: "green",
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      // 包含 root 和两个创建的工作区
      expect(data.length).toBeGreaterThanOrEqual(3);
      expect(data.some((w: any) => w.id === "root")).toBe(true);
      expect(data.some((w: any) => w.id === "ws-1")).toBe(true);
      expect(data.some((w: any) => w.id === "ws-2")).toBe(true);
    });

    it("should return workspace with correct structure", async () => {
      // 创建工作区
      await testDb.workspaces.create({
        id: "test-ws",
        name: "Test Workspace",
        path: "/test",
        color: "red",
      });

      const response = await GET();
      const data = await response.json();

      const testWs = data.find((w: any) => w.id === "test-ws");
      expect(testWs).toBeDefined();
      expect(testWs.name).toBe("Test Workspace");
      expect(testWs.path).toBe("/test");
      expect(testWs.color).toBe("red");
      expect(testWs.createdAt).toBeDefined();
    });
  });

  describe("POST /api/workspaces", () => {
    it("should create a new workspace", async () => {
      const request = new Request("http://localhost/api/workspaces", {
        method: "POST",
        body: JSON.stringify({
          name: "New Workspace",
          path: "/new-workspace",
          color: "purple",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("New Workspace");
      expect(data.path).toBe("/new-workspace");
      expect(data.color).toBe("purple");
      expect(data.id).toBeDefined();
    });

    it("should return 500 on database error", async () => {
      (dbModule.ensureConnected as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const request = new Request("http://localhost/api/workspaces", {
        method: "POST",
        body: JSON.stringify({
          name: "Error Workspace",
          path: "/error",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
