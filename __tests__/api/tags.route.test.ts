/**
 * Tags API 路由测试
 * 
 * @jest-environment node
 */

import { GET, POST } from "@/app/api/tags/route";
import * as dbModule from "@/app/api/db";
import { SQLiteDatabase } from "@/lib/db/sqlite";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Mock db 模块
jest.mock("@/app/api/db", () => ({
  ensureConnected: jest.fn(),
}));

describe("Tags API Routes", () => {
  let testDb: SQLiteDatabase;
  let tempDbPath: string;

  beforeEach(async () => {
    tempDbPath = path.join(os.tmpdir(), `test-tags-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
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

  describe("GET /api/tags", () => {
    it("should return empty array when no tags", async () => {
      const request = new Request("http://localhost/api/tags");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it("should return all tags ordered by name", async () => {
      await testDb.tags.create({ name: "Important", color: "red" });
      await new Promise(r => setTimeout(r, 10));
      await testDb.tags.create({ name: "Work", color: "blue" });
      await new Promise(r => setTimeout(r, 10));
      await testDb.tags.create({ name: "Personal", color: "green" });

      const request = new Request("http://localhost/api/tags");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveLength(3);
      // 按名称排序
      expect(data[0].name).toBe("Important");
      expect(data[1].name).toBe("Personal");
      expect(data[2].name).toBe("Work");
    });
  });

  describe("POST /api/tags", () => {
    it("should create a new tag", async () => {
      const request = new Request("http://localhost/api/tags", {
        method: "POST",
        body: JSON.stringify({
          name: "New Tag",
          color: "purple",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("New Tag");
      expect(data.color).toBe("purple");
      expect(data.id).toBeDefined();
    });

    it("should create tag with default color", async () => {
      const request = new Request("http://localhost/api/tags", {
        method: "POST",
        body: JSON.stringify({
          name: "Simple Tag",
          color: "gray",
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe("Simple Tag");
      expect(data.color).toBe("gray");
    });

    it("should return 500 on database error", async () => {
      (dbModule.ensureConnected as jest.Mock).mockRejectedValue(new Error("DB Error"));

      const request = new Request("http://localhost/api/tags", {
        method: "POST",
        body: JSON.stringify({
          name: "Error Tag",
          color: "red",
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(500);
    });
  });
});
