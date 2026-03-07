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
 * 传输方式类型
 */
export type TransportType = "stdio" | "http" | "sse" | "cli";

/**
 * HTTP/SSE 端点配置
 */
export interface EndpointConfig {
  /** 主机地址 */
  host: string;
  /** 端口号 */
  port: number;
  /** 基础路径（HTTP 模式） */
  base_path?: string;
  /** SSE 端点路径（SSE 模式） */
  sse_path?: string;
  /** 消息端点路径（SSE 模式） */
  message_path?: string;
}

/**
 * 健康检查配置
 */
export interface HealthCheckConfig {
  /** 是否启用健康检查 */
  enabled: boolean;
  /** 检查间隔（秒） */
  interval: number;
  /** 健康检查 URL */
  url: string;
}

/**
 * 重启策略配置
 */
export interface RestartPolicyConfig {
  /** 最大重启次数 */
  max_restarts: number;
  /** 退避倍数 */
  backoff_multiplier: number;
  /** 初始延迟（毫秒） */
  initial_delay: number;
}

/**
 * CLI 执行模式
 */
export type CliMode = "single-run" | "interactive";

/**
 * CLI 输入传递方式
 */
export type CliInputMethod = "stdin" | "arg" | "file";

/**
 * CLI 输出格式
 */
export type CliOutputFormat = "raw" | "json" | "markdown";

/**
 * 代码提取配置
 */
export interface CodeExtractionConfig {
  /** 是否启用代码提取 */
  enabled: boolean;
  /** 从 markdown 代码块中提取 */
  extract_from_markdown: boolean;
  /** 支持的代码语言 */
  languages: string[];
}

/**
 * CLI 模式特有配置
 */
export interface CliConfig {
  /** 执行模式: single-run | interactive */
  mode: CliMode;
  
  /** 输入传递方式: stdin | arg | file */
  input_method: CliInputMethod;
  
  /** 输出格式: raw | json | markdown */
  output_format: CliOutputFormat;
  
  /** 成功的退出码列表 */
  success_exit_codes: number[];
  
  /** 最大输出长度（字符） */
  max_output_length: number;
  
  /** 代码提取配置 */
  code_extraction?: CodeExtractionConfig;
}

/**
 * Agent 启动配置
 */
export interface LaunchConfig {
  /** 传输方式: stdio | http | sse | cli */
  transport: TransportType;
  
  /** 启动命令（stdio/sse/http/cli 模式下使用） */
  command?: string;
  
  /** 命令参数 */
  args?: string[];
  
  /** 参数模板（用于动态生成参数） */
  arg_templates?: Record<string, string>;
  
  /** 工作目录 */
  cwd?: string;
  
  /** 环境变量 */
  env?: Record<string, string>;
  
  /** 启动超时（秒） */
  timeout: number;
  
  /** HTTP/SSE 端点配置（http/sse 模式下使用） */
  endpoint?: EndpointConfig;
  
  /** 健康检查配置 */
  health_check?: HealthCheckConfig;
  
  /** 重启策略配置 */
  restart_policy?: RestartPolicyConfig;
  
  /** CLI 模式特有配置（cli 模式下使用） */
  cli_config?: CliConfig;
}

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
  /** 启动配置 */
  launch_config: LaunchConfig;
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
 * CLI 默认配置
 */
export interface CliDefaultsConfig {
  /** 默认 CLI 命令 */
  default_command: string;
  /** 默认参数 */
  default_args: string[];
  /** 环境变量前缀 */
  env_prefix: string;
  /** 临时文件目录 */
  temp_dir: string;
}

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
  /** CLI 工具全局默认配置 */
  cli_defaults?: CliDefaultsConfig;
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
