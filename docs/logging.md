# 服务端日志记录

项目使用 [Winston](https://github.com/winstonjs/winston) 作为日志库，提供统一的日志记录能力。

## 日志配置

### 日志级别

| 级别 | 数值 | 说明 |
|------|------|------|
| error | 0 | 错误信息 |
| warn | 1 | 警告信息 |
| info | 2 | 一般信息 |
| http | 3 | HTTP 请求信息 |
| debug | 4 | 调试信息 |

### 环境变量

```bash
# 设置日志级别 (默认: production=info, development=debug)
LOG_LEVEL=debug

# 设置日志输出目录 (生产环境, 默认: ./logs)
LOG_DIR=/var/log/todolist

# 环境模式
NODE_ENV=production
```

## 使用方式

### 在 API 路由中使用

```typescript
import { logger, logApiRequest } from "@/lib/api/logger";

export async function GET(request: NextRequest) {
  const start = Date.now();
  
  try {
    logger.debug("Fetching data", { params });
    const data = await fetchData();
    
    logApiRequest(request, 200, start);
    return NextResponse.json(data);
  } catch (error) {
    logger.error("Failed to fetch data", { error: error.message });
    logApiRequest(request, 500, start, error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
```

### 直接使用 Logger

```typescript
import { logger } from "@/lib/logger";

logger.error("Error message", { error: "details" });
logger.warn("Warning message");
logger.info("Info message");
logger.http("HTTP message");
logger.debug("Debug message", { extra: "data" });
```

## 日志输出

### 开发环境

- 输出到控制台
- 带颜色格式化
- 包含时间戳、级别、消息

```
2026-03-14 15:57:31 [info]: Todo created {"id":"123","text":"Test"}
```

### 生产环境

- 输出到控制台
- 输出到文件：
  - `logs/error.log` - 仅错误级别
  - `logs/combined.log` - 所有级别
- JSON 格式
