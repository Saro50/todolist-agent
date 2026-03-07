/**
 * Agent 配置模块
 * 
 * 提供 Agent 配置的加载、管理和访问功能
 * 
 * @example
 * ```typescript
 * import { AgentConfigManager, loadAgentConfig } from "@/lib/config";
 * 
 * // 方式1：直接加载配置
 * const config = loadAgentConfig();
 * console.log(config.agents);
 * 
 * // 方式2：使用配置管理器
 * const manager = new AgentConfigManager();
 * const analyzer = manager.getFirstAgentByRole("analyzer");
 * console.log(analyzer?.prompt);
 * 
 * // 方式3：使用单例实例
 * import { getAgentConfigManager } from "@/lib/config/loader";
 * const agent = getAgentConfigManager().getAgentById("task-analyzer");
 * ```
 */

// 类型定义
export type {
  AgentConfig,
  AgentRole,
  AgentsConfiguration,
  GlobalConfig,
  ExecutionMode,
  CommunicationMode,
  AgentLookupOptions,
  LaunchConfig,
  TransportType,
  EndpointConfig,
  HealthCheckConfig,
  RestartPolicyConfig,
  CliConfig,
  CliMode,
  CliInputMethod,
  CliOutputFormat,
  CodeExtractionConfig,
  CliDefaultsConfig,
} from "./types";

// 加载器
export {
  loadAgentConfig,
  AgentConfigManager,
  getAgentConfigManager,
  resetAgentConfigManager,
  ConfigLoadError,
} from "./loader";
