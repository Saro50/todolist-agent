/**
 * 数据库工厂
 * 
 * 用于创建不同类型的数据库实例
 * 支持：SQLite（本地）、Remote（远程）
 */

import { IDatabase, DatabaseConfig } from "./types";
import { SQLiteDatabase } from "./sqlite";
import { RemoteDatabase } from "./remote";

export class DatabaseFactory {
  /**
   * 创建数据库实例
   */
  static create(config: DatabaseConfig): IDatabase {
    switch (config.type) {
      case "sqlite":
        if (!config.sqlitePath) {
          throw new Error("SQLite database requires sqlitePath");
        }
        return new SQLiteDatabase({ sqlitePath: config.sqlitePath });

      case "remote":
        if (!config.remoteUrl) {
          throw new Error("Remote database requires remoteUrl");
        }
        return new RemoteDatabase({
          remoteUrl: config.remoteUrl,
          apiKey: config.apiKey,
        });

      default:
        throw new Error(`Unknown database type: ${(config as any).type}`);
    }
  }

  /**
   * 创建本地 SQLite 数据库（默认配置）
   */
  static createLocal(path: string = "./data/todos.db"): IDatabase {
    return this.create({ type: "sqlite", sqlitePath: path });
  }

  /**
   * 创建远程数据库
   */
  static createRemote(url: string, apiKey?: string): IDatabase {
    return this.create({ type: "remote", remoteUrl: url, apiKey });
  }
}
