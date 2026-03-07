/**
 * Agent 配置加载器测试
 */

import {
  loadAgentConfig,
  AgentConfigManager,
  ConfigLoadError,
  resetAgentConfigManager,
} from "@/lib/config/loader";
import { writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

// 测试用的临时目录
const TEST_DIR = join(tmpdir(), "todolist-config-test-" + Date.now());

describe("Agent Config Loader", () => {
  beforeAll(() => {
    if (!existsSync(TEST_DIR)) {
      mkdirSync(TEST_DIR, { recursive: true });
    }
  });

  afterAll(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    resetAgentConfigManager();
  });

  describe("loadAgentConfig", () => {
    it("should load default config file", () => {
      // 测试加载默认配置（使用项目中的 config/agents.yml）
      const config = loadAgentConfig();
      
      expect(config).toBeDefined();
      expect(config.version).toBe("1.0.0");
      expect(config.agents).toHaveLength(3);
      expect(config.global).toBeDefined();
    });

    it("should throw error when file does not exist", () => {
      expect(() => loadAgentConfig("non-existent-file.yml")).toThrow(ConfigLoadError);
      expect(() => loadAgentConfig("non-existent-file.yml")).toThrow("配置文件不存在");
    });

    it("should throw error for invalid YAML", () => {
      const invalidYamlPath = join(TEST_DIR, "invalid.yml");
      writeFileSync(invalidYamlPath, "invalid: yaml: content: [");

      expect(() => loadAgentConfig(invalidYamlPath)).toThrow(ConfigLoadError);
    });

    it("should throw error for empty config", () => {
      const emptyPath = join(TEST_DIR, "empty.yml");
      writeFileSync(emptyPath, "");

      expect(() => loadAgentConfig(emptyPath)).toThrow(ConfigLoadError);
    });

    it("should throw error for missing version", () => {
      const noVersionPath = join(TEST_DIR, "no-version.yml");
      writeFileSync(noVersionPath, `
agents: []
global:
  execution_mode: auto
`);

      expect(() => loadAgentConfig(noVersionPath)).toThrow("缺少配置版本号");
    });

    it("should throw error for missing agents array", () => {
      const noAgentsPath = join(TEST_DIR, "no-agents.yml");
      writeFileSync(noAgentsPath, `
version: "1.0.0"
global:
  execution_mode: auto
`);

      expect(() => loadAgentConfig(noAgentsPath)).toThrow("agents 必须是数组");
    });

    it("should throw error for empty agents array", () => {
      const emptyAgentsPath = join(TEST_DIR, "empty-agents.yml");
      writeFileSync(emptyAgentsPath, `
version: "1.0.0"
agents: []
global:
  execution_mode: auto
`);

      expect(() => loadAgentConfig(emptyAgentsPath)).toThrow("至少需要配置一个 Agent");
    });

    it("should throw error for duplicate agent ids", () => {
      const duplicatePath = join(TEST_DIR, "duplicate.yml");
      writeFileSync(duplicatePath, `
version: "1.0.0"
agents:
  - id: "test-agent"
    name: "Test"
    role: "analyzer"
    description: "Test agent"
    enabled: true
    priority: 1
    prompt: "Test prompt"
  - id: "test-agent"
    name: "Test 2"
    role: "coder"
    description: "Test agent 2"
    enabled: true
    priority: 2
    prompt: "Test prompt 2"
global:
  execution_mode: auto
  max_retries: 3
  task_timeout: 30
  enable_logging: true
  communication_mode: event
`);

      expect(() => loadAgentConfig(duplicatePath)).toThrow("Agent id 重复");
    });

    it("should throw error for invalid agent role", () => {
      const invalidRolePath = join(TEST_DIR, "invalid-role.yml");
      writeFileSync(invalidRolePath, `
version: "1.0.0"
agents:
  - id: "test-agent"
    name: "Test"
    role: "invalid-role"
    description: "Test agent"
    enabled: true
    priority: 1
    prompt: "Test prompt"
global:
  execution_mode: auto
  max_retries: 3
  task_timeout: 30
  enable_logging: true
  communication_mode: event
`);

      expect(() => loadAgentConfig(invalidRolePath)).toThrow("role 无效");
    });

    it("should throw error for missing agent prompt", () => {
      const noPromptPath = join(TEST_DIR, "no-prompt.yml");
      writeFileSync(noPromptPath, `
version: "1.0.0"
agents:
  - id: "test-agent"
    name: "Test"
    role: "analyzer"
    description: "Test agent"
    enabled: true
    priority: 1
    prompt: ""
global:
  execution_mode: auto
  max_retries: 3
  task_timeout: 30
  enable_logging: true
  communication_mode: event
`);

      expect(() => loadAgentConfig(noPromptPath)).toThrow("prompt 为空");
    });
  });

  describe("AgentConfigManager", () => {
    it("should load config on initialization", () => {
      const manager = new AgentConfigManager();
      
      expect(manager.getConfig()).toBeDefined();
      expect(manager.getVersion()).toBe("1.0.0");
    });

    it("should get all enabled agents", () => {
      const manager = new AgentConfigManager();
      const agents = manager.getAllAgents();
      
      expect(agents).toHaveLength(3);
      expect(agents.every(a => a.enabled)).toBe(true);
    });

    it("should get all agents including disabled", () => {
      const testConfigPath = join(TEST_DIR, "with-disabled.yml");
      writeFileSync(testConfigPath, `
version: "1.0.0"
agents:
  - id: "enabled-agent"
    name: "Enabled"
    role: "analyzer"
    description: "Enabled agent"
    enabled: true
    priority: 1
    prompt: "Test prompt"
  - id: "disabled-agent"
    name: "Disabled"
    role: "coder"
    description: "Disabled agent"
    enabled: false
    priority: 2
    prompt: "Test prompt 2"
global:
  execution_mode: auto
  max_retries: 3
  task_timeout: 30
  enable_logging: true
  communication_mode: event
`);

      const manager = new AgentConfigManager(testConfigPath);
      const allAgents = manager.getAllAgents({ includeDisabled: true });
      const enabledAgents = manager.getAllAgents();
      
      expect(allAgents).toHaveLength(2);
      expect(enabledAgents).toHaveLength(1);
    });

    it("should filter agents by role", () => {
      const manager = new AgentConfigManager();
      const analyzers = manager.getAgentsByRole("analyzer");
      const coders = manager.getAgentsByRole("coder");
      const dispatchers = manager.getAgentsByRole("dispatcher");
      
      expect(analyzers).toHaveLength(1);
      expect(analyzers[0].role).toBe("analyzer");
      
      expect(coders).toHaveLength(1);
      expect(coders[0].role).toBe("coder");
      
      expect(dispatchers).toHaveLength(1);
      expect(dispatchers[0].role).toBe("dispatcher");
    });

    it("should get agent by id", () => {
      const manager = new AgentConfigManager();
      const agent = manager.getAgentById("task-analyzer");
      
      expect(agent).toBeDefined();
      expect(agent?.id).toBe("task-analyzer");
      expect(agent?.role).toBe("analyzer");
    });

    it("should return undefined for non-existent agent id", () => {
      const manager = new AgentConfigManager();
      const agent = manager.getAgentById("non-existent");
      
      expect(agent).toBeUndefined();
    });

    it("should get first agent by role", () => {
      const manager = new AgentConfigManager();
      const analyzer = manager.getFirstAgentByRole("analyzer");
      
      expect(analyzer).toBeDefined();
      expect(analyzer?.role).toBe("analyzer");
    });

    it("should check if agent is enabled", () => {
      const manager = new AgentConfigManager();
      
      expect(manager.isAgentEnabled("task-analyzer")).toBe(true);
      expect(manager.isAgentEnabled("non-existent")).toBe(false);
    });

    it("should get enabled agent count", () => {
      const manager = new AgentConfigManager();
      
      expect(manager.getEnabledAgentCount()).toBe(3);
    });

    it("should sort agents by priority", () => {
      const testConfigPath = join(TEST_DIR, "priority-sort.yml");
      writeFileSync(testConfigPath, `
version: "1.0.0"
agents:
  - id: "low-priority"
    name: "Low"
    role: "analyzer"
    description: "Low priority"
    enabled: true
    priority: 3
    prompt: "Test"
  - id: "high-priority"
    name: "High"
    role: "coder"
    description: "High priority"
    enabled: true
    priority: 1
    prompt: "Test"
  - id: "mid-priority"
    name: "Mid"
    role: "dispatcher"
    description: "Mid priority"
    enabled: true
    priority: 2
    prompt: "Test"
global:
  execution_mode: auto
  max_retries: 3
  task_timeout: 30
  enable_logging: true
  communication_mode: event
`);

      const manager = new AgentConfigManager(testConfigPath);
      const agents = manager.getAllAgents();
      
      expect(agents[0].id).toBe("high-priority");
      expect(agents[1].id).toBe("mid-priority");
      expect(agents[2].id).toBe("low-priority");
    });

    it("should reload config", () => {
      const testConfigPath = join(TEST_DIR, "reload-test.yml");
      writeFileSync(testConfigPath, `
version: "1.0.0"
agents:
  - id: "original-agent"
    name: "Original"
    role: "analyzer"
    description: "Original agent"
    enabled: true
    priority: 1
    prompt: "Original prompt"
global:
  execution_mode: auto
  max_retries: 3
  task_timeout: 30
  enable_logging: true
  communication_mode: event
`);

      const manager = new AgentConfigManager(testConfigPath);
      expect(manager.getAgentById("original-agent")).toBeDefined();
      
      // 修改配置文件
      writeFileSync(testConfigPath, `
version: "1.0.1"
agents:
  - id: "new-agent"
    name: "New"
    role: "coder"
    description: "New agent"
    enabled: true
    priority: 1
    prompt: "New prompt"
global:
  execution_mode: parallel
  max_retries: 5
  task_timeout: 60
  enable_logging: false
  communication_mode: queue
`);
      
      manager.reload();
      
      expect(manager.getVersion()).toBe("1.0.1");
      expect(manager.getAgentById("original-agent")).toBeUndefined();
      expect(manager.getAgentById("new-agent")).toBeDefined();
    });

    it("should get global config", () => {
      const manager = new AgentConfigManager();
      const global = manager.getGlobalConfig();
      
      expect(global).toBeDefined();
      expect(global.execution_mode).toBe("auto");
      expect(global.max_retries).toBe(3);
      expect(global.task_timeout).toBe(30);
      expect(global.enable_logging).toBe(true);
      expect(global.communication_mode).toBe("event");
    });
  });
});
