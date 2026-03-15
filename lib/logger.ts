/**
 * Winston 日志配置
 * 
 * 提供统一的日志记录能力，支持：
 * - 控制台输出（开发环境）
 * - 文件输出（生产环境）
 * - 日志级别控制
 * - 结构化日志
 */

import winston from "winston";
import path from "path";

// 日志级别
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// 根据环境确定日志级别
const level = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

// 日志颜色
const colors = {
  error: "red",
  warn: "yellow",
  info: "green",
  http: "magenta",
  debug: "white",
};

winston.addColors(colors);

// 控制台输出格式
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

// 文件输出格式（JSON）
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 创建日志目录
const logDir = process.env.LOG_DIR || path.join(process.cwd(), "logs");

// 配置 transports
const transports: winston.transport[] = [
  // 控制台输出
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// 生产环境添加文件输出
if (process.env.NODE_ENV === "production") {
  transports.push(
    // 错误日志
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: fileFormat,
    }),
    // 所有日志
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
      format: fileFormat,
    })
  );
}

// 创建 logger 实例
export const logger = winston.createLogger({
  level,
  levels,
  transports,
  exitOnError: false,
});

// 请求日志记录器
export function logRequest(
  method: string,
  url: string,
  statusCode: number,
  duration: number,
  userAgent?: string,
  error?: Error
) {
  const message = `${method} ${url} ${statusCode} ${duration}ms`;
  
  const meta: Record<string, unknown> = {
    method,
    url,
    statusCode,
    duration,
  };
  
  if (userAgent) {
    meta.userAgent = userAgent;
  }
  
  if (error) {
    meta.error = error.message;
    meta.stack = error.stack;
    logger.error(message, meta);
  } else if (statusCode >= 500) {
    logger.error(message, meta);
  } else if (statusCode >= 400) {
    logger.warn(message, meta);
  } else {
    logger.http(message, meta);
  }
}

// 数据库操作日志
export function logDatabase(operation: string, table: string, duration: number, error?: Error) {
  const message = `DB ${operation} ${table} ${duration}ms`;
  
  if (error) {
    logger.error(message, { operation, table, duration, error: error.message });
  } else {
    logger.debug(message, { operation, table, duration });
  }
}

export default logger;
