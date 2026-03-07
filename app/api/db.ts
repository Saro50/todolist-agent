/**
 * 数据库连接单例
 * 
 * 在 Next.js 开发模式下，模块会被热重载，
 * 使用全局变量保持数据库连接
 */

import { IDatabase } from "@/lib/db/types";
import { DatabaseFactory } from "@/lib/db/factory";
import path from "path";

const globalForDb = globalThis as unknown as {
  db: IDatabase | undefined;
};

export function getDatabase(): IDatabase {
  if (!globalForDb.db) {
    const dbPath = path.join(process.cwd(), "data", "todos.db");
    globalForDb.db = DatabaseFactory.createLocal(dbPath);
  }
  return globalForDb.db;
}

// 确保数据库已连接
export async function ensureConnected(): Promise<IDatabase> {
  const db = getDatabase();
  if (!db.isConnected) {
    await db.connect();
  }
  return db;
}
