/**
 * API 路由日志中间件
 * 
 * 用于 Next.js API 路由的请求/响应日志记录
 */

import { NextRequest, NextResponse } from "next/server";
import { logger, logRequest } from "@/lib/logger";

/**
 * 包装 API 路由处理函数，自动记录请求日志
 */
export function withLogging(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const start = Date.now();
    const url = req.url;
    const method = req.method;
    const userAgent = req.headers.get("user-agent") || undefined;
    
    // 记录请求开始（调试级别）
    logger.debug(`→ ${method} ${url}`, {
      headers: Object.fromEntries(req.headers.entries()),
    });
    
    try {
      const response = await handler(req);
      const duration = Date.now() - start;
      
      // 记录请求完成
      logRequest(
        method,
        url,
        response.status,
        duration,
        userAgent
      );
      
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      
      // 记录请求错误
      logRequest(
        method,
        url,
        500,
        duration,
        userAgent,
        error as Error
      );
      
      throw error;
    }
  };
}

/**
 * 简化的日志记录，用于在 API 路由中手动调用
 */
export function logApiRequest(
  req: NextRequest,
  statusCode: number,
  startTime: number,
  error?: Error
) {
  logRequest(
    req.method,
    req.url,
    statusCode,
    Date.now() - startTime,
    req.headers.get("user-agent") || undefined,
    error
  );
}

export { logger };
