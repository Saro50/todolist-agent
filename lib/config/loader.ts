/**
 * Agent 配置加载器
 * 
 * 负责从 YAML 文件加载和解析 Agent 配置
 */

import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";
import { parse } from "yaml";
import {
  AgentsConfiguration,
  AgentConfig,
  AgentRole,
  AgentLookupOptions,
} from "./types";

/** 默认配置文件路径 */
const DEFAULT_CONFIG_PATH = "config/agents.yml";

/** 配置加载错误 */
export class ConfigLoadError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = "ConfigLoadError";
  }
}

/**
 * 加载 Agent 配置文件
 * 
 * @param configPath - 配置文件路径（相对于项目根目录，或使用绝对路径）
 * @returns 解析后的配置对象
 * @throws ConfigLoadError 当文件不存在或解析失败时
 */
export function loadAgentConfig(configPath: string = DEFAULT_CONFIG_PATH): AgentsConfiguration {
  const fullPath = resolve(process.cwd(), configPath);
  
  if (!existsSync(fullPath)) {
    throw new ConfigLoadError(`配置文件不存在: ${fullPath}`);
  }
  
  try {
    const content = readFileSync(fullPath, "utf-8");
    const config = parse(content) as AgentsConfiguration;
    
    // 验证配置结构
    validateConfig(config);
    
    return config;
  } catch (error) {
    if (error instanceof ConfigLoadError) {
      throw error;
    }
    throw new ConfigLoadError(
      `解析配置文件失败: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * 验证配置结构
 */
function validateConfig(config: AgentsConfiguration): void {
  if (!config) {
    throw new ConfigLoadError("配置内容为空");
  }
  
  if (!config.version) {
    throw new ConfigLoadError("缺少配置版本号 (version)");
  }
  
  if (!Array.isArray(config.agents)) {
    throw new ConfigLoadError("agents 必须是数组");
  }
  
  if (config.agents.length === 0) {
    throw new ConfigLoadError("至少需要配置一个 Agent");
  }
  
  // 验证每个 Agent 配置
  const ids = new Set<string>();
  config.agents.forEach((agent, index) => {
    validateAgent(agent, index, ids);
  });
  
  // 验证全局配置
  if (!config.global) {
    throw new ConfigLoadError("缺少全局配置 (global)");
  }
}

/**
 * 验证单个 Agent 配置
 */
function validateAgent(agent: AgentConfig, index: number, ids: Set<string>): void {
  if (!agent.id) {
    throw new ConfigLoadError(`第 ${index + 1} 个 Agent 缺少 id`);
  }
  
  if (ids.has(agent.id)) {
    throw new ConfigLoadError(`Agent id 重复: ${agent.id}`);
  }
  ids.add(agent.id);
  
  if (!agent.name) {
    throw new ConfigLoadError(`Agent ${agent.id} 缺少 name`);
  }
  
  if (!agent.role) {
    throw new ConfigLoadError(`Agent ${agent.id} 缺少 role`);
  }
  
  const validRoles: AgentRole[] = ["analyzer", "dispatcher", "coder"];
  if (!validRoles.includes(agent.role)) {
    throw new ConfigLoadError(
      `Agent ${agent.id} 的 role 无效: ${agent.role}，必须是 ${validRoles.join(", ")} 之一`
    );
  }
  
  if (!agent.prompt || agent.prompt.trim().length === 0) {
    throw new ConfigLoadError(`Agent ${agent.id} 缺少 prompt 或 prompt 为空`);
  }
}

/**
 * Agent 配置管理器
 * 
 * 提供便捷的 Agent 配置查询和管理接口
 */
export class AgentConfigManager {
  private config: AgentsConfiguration;
  private agentMap: Map<string, AgentConfig>;
  private configPath: string | undefined;
  
  /**
   * 创建配置管理器实例
   * 
   * @param configPath - 配置文件路径，如果不提供则使用默认路径
   */
  constructor(configPath?: string) {
    this.configPath = configPath;
    this.config = loadAgentConfig(configPath);
    this.agentMap = new Map(this.config.agents.map(a => [a.id, a]));
  }
  
  /**
   * 获取完整配置
   */
  getConfig(): AgentsConfiguration {
    return this.config;
  }
  
  /**
   * 获取配置版本
   */
  getVersion(): string {
    return this.config.version;
  }
  
  /**
   * 获取全局配置
   */
  getGlobalConfig() {
    return this.config.global;
  }
  
  /**
   * 获取所有 Agent 配置
   * 
   * @param options - 查找选项
   */
  getAllAgents(options: AgentLookupOptions = {}): AgentConfig[] {
    let agents = this.config.agents;
    
    if (!options.includeDisabled) {
      agents = agents.filter(a => a.enabled);
    }
    
    if (options.role) {
      agents = agents.filter(a => a.role === options.role);
    }
    
    // 按优先级排序
    return agents.sort((a, b) => a.priority - b.priority);
  }
  
  /**
   * 根据 ID 获取 Agent 配置
   * 
   * @param id - Agent ID
   * @returns Agent 配置，不存在时返回 undefined
   */
  getAgentById(id: string): AgentConfig | undefined {
    return this.agentMap.get(id);
  }
  
  /**
   * 根据角色获取 Agent 配置
   * 
   * @param role - Agent 角色
   * @returns 符合条件的 Agent 列表
   */
  getAgentsByRole(role: AgentRole): AgentConfig[] {
    return this.getAllAgents({ role });
  }
  
  /**
   * 获取特定角色的第一个启用 Agent
   * 
   * @param role - Agent 角色
   * @returns Agent 配置，不存在时返回 undefined
   */
  getFirstAgentByRole(role: AgentRole): AgentConfig | undefined {
    return this.getAllAgents({ role })[0];
  }
  
  /**
   * 检查 Agent 是否存在且启用
   * 
   * @param id - Agent ID
   */
  isAgentEnabled(id: string): boolean {
    const agent = this.agentMap.get(id);
    return agent?.enabled ?? false;
  }
  
  /**
   * 获取启用的 Agent 数量
   */
  getEnabledAgentCount(): number {
    return this.config.agents.filter(a => a.enabled).length;
  }
  
  /**
   * 重新加载配置
   * 
   * @param configPath - 新的配置文件路径，如果不提供则使用初始化时的路径
   */
  reload(configPath?: string): void {
    const pathToUse = configPath ?? this.configPath;
    this.config = loadAgentConfig(pathToUse);
    this.agentMap = new Map(this.config.agents.map(a => [a.id, a]));
  }
}

// 导出单例实例（默认配置）
let defaultManager: AgentConfigManager | null = null;

/**
 * 获取默认的配置管理器实例
 * 
 * @returns AgentConfigManager 实例
 */
export function getAgentConfigManager(): AgentConfigManager {
  if (!defaultManager) {
    defaultManager = new AgentConfigManager();
  }
  return defaultManager;
}

/**
 * 重置默认的配置管理器实例
 * 
 * 主要用于测试场景
 */
export function resetAgentConfigManager(): void {
  defaultManager = null;
}
