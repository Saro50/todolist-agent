# Agent 配置系统

## 概述

Agent 配置系统允许通过 YAML 文件配置和管理三个核心 Agent：

1. **任务分析器 (task-analyzer)** - 分析任务并拆分为子任务
2. **任务分配器 (task-dispatcher)** - 分配子任务给对应 Agent 并跟踪状态
3. **编码专家 (code-agent)** - 执行具体的编码任务

## 配置文件

配置文件位于 `config/agents.yml`，包含：

- `version`: 配置版本号
- `description`: 配置描述
- `agents`: Agent 列表，每个包含 id、name、role、description、enabled、priority、prompt
- `global`: 全局配置（执行模式、重试次数、超时等）

## 使用方法

### 1. 直接加载配置

```typescript
import { loadAgentConfig } from "@/lib/config";

const config = loadAgentConfig();
console.log(config.version);
console.log(config.agents);
```

### 2. 使用配置管理器

```typescript
import { AgentConfigManager } from "@/lib/config";

const manager = new AgentConfigManager();

// 获取所有启用的 Agent
const agents = manager.getAllAgents();

// 根据角色获取 Agent
const analyzer = manager.getFirstAgentByRole("analyzer");
console.log(analyzer?.prompt);

// 根据 ID 获取 Agent
const agent = manager.getAgentById("task-analyzer");

// 获取全局配置
const globalConfig = manager.getGlobalConfig();
```

### 3. 使用单例实例

```typescript
import { getAgentConfigManager } from "@/lib/config";

const agent = getAgentConfigManager().getAgentById("task-analyzer");
```

## API 参考

### `loadAgentConfig(configPath?)`

加载并验证 YAML 配置文件。

- `configPath`: 配置文件路径（相对于项目根目录，或使用绝对路径）
- 返回: `AgentsConfiguration` 对象
- 抛出: `ConfigLoadError` 当文件不存在或解析失败时

### `AgentConfigManager`

配置管理器类，提供便捷的查询接口。

#### 方法

- `getConfig()`: 获取完整配置
- `getVersion()`: 获取配置版本
- `getGlobalConfig()`: 获取全局配置
- `getAllAgents(options?)`: 获取 Agent 列表
  - `options.includeDisabled`: 是否包含禁用的 Agent
  - `options.role`: 按角色筛选
- `getAgentById(id)`: 根据 ID 获取 Agent
- `getAgentsByRole(role)`: 根据角色获取 Agent 列表
- `getFirstAgentByRole(role)`: 获取指定角色的第一个 Agent
- `isAgentEnabled(id)`: 检查 Agent 是否启用
- `getEnabledAgentCount()`: 获取启用的 Agent 数量
- `reload(configPath?)`: 重新加载配置

## 测试

```bash
npm test -- __tests__/config/loader.test.ts
```

## 扩展

如需添加更多 Agent，只需在 `config/agents.yml` 的 `agents` 数组中添加新配置项，支持的 role 类型包括：
- `analyzer` - 任务分析
- `dispatcher` - 任务分配
- `coder` - 编码实现
