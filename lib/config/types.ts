/**
 * Agent 配置类型定义
 * 
 * 定义 Agent 配置的数据结构和类型
 */

/**
 * Agent 角色类型
 */
export type AgentRole = "analyzer" | "dispatcher" | "coder";

/**
 * Agent 配置项
 */
export interface AgentConfig {
  /** 唯一标识符 */
  id: string;
  /** 显示名称 */
  name: string;
  /** 角色类型 */
  role: AgentRole;
  /** 描述 */
  description: string;
  /** 是否启用 */
  enabled: boolean;
  /** 优先级（数字越小优先级越高） */
  priority: number;
  /** 系统提示词 */
  prompt: string;
}

/**
 * 执行模式
 */
export type ExecutionMode = "sequential" | "parallel" | "auto";

/**
 * 通信模式
 */
export type CommunicationMode = "direct" | "queue" | "event";

/**
 * 全局配置
 */
export interface GlobalConfig {
  /** 执行模式 */
  execution_mode: ExecutionMode;
  /** 最大重试次数 */
  max_retries: number;
  /** 任务超时时间（分钟） */
  task_timeout: number;
  /** 是否启用日志记录 */
  enable_logging: boolean;
  /** Agent 间通信方式 */
  communication_mode: CommunicationMode;
}

/**
 * 完整的 Agent 配置
 */
export interface AgentsConfiguration {
  /** 配置版本 */
  version: string;
  /** 配置描述 */
  description: string;
  /** Agent 列表 */
  agents: AgentConfig[];
  /** 全局配置 */
  global: GlobalConfig;
}

/**
 * Agent 查找选项
 */
export interface AgentLookupOptions {
  /** 是否包含禁用的 Agent */
  includeDisabled?: boolean;
  /** 按角色筛选 */
  role?: AgentRole;
}
