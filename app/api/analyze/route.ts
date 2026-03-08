/**
 * 任务分析 API 路由
 * 
 * 使用 Kimi CLI Agent 模式 + Print 模式调用 task-analyst
 * Agent 模式文档: https://moonshotai.github.io/kimi-cli/zh/customization/agents.html
 * Print 模式文档: https://moonshotai.github.io/kimi-cli/zh/customization/print-mode.html
 * 
 * Agent 文件格式（version: 1）：
 * agent:
 *   name: agent名称
 *   extend: default              # 继承内置 default Agent
 *   system_prompt_path: ./prompt.md
 *   system_prompt_args:          # 自定义参数（提示词中用 ${VAR} 引用）
 *     MY_VAR: "值"
 *   subagents:                   # 子 Agent 定义
 *     explorer:
 *       path: ./sub.yaml
 * 
 * Print 模式特点：
 * - 非交互：执行完指令后自动退出
 * - 自动审批：隐式启用 --yolo 模式，所有操作自动批准
 * - 文本输出：AI 的回复输出到 stdout
 * - --final-message-only：仅输出最终消息，跳过工具调用过程
 * 
 * 内置变量（在提示词中用 ${VAR} 引用）：
 * - ${KIMI_NOW}：当前时间（ISO 格式）
 * - ${KIMI_WORK_DIR}：工作目录路径
 * - ${KIMI_WORK_DIR_LS}：工作目录文件列表
 * - ${KIMI_AGENTS_MD}：AGENTS.md 文件内容
 * - ${KIMI_SKILLS}：加载的 Skills 列表
 */

import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

// Agent 配置文件路径
const AGENT_FILE = "./config/agents/task-analyst.yaml";

export async function POST(request: NextRequest) {
  try {
    const { taskText, taskId, context } = await request.json();

    if (!taskText || typeof taskText !== "string") {
      return NextResponse.json(
        { error: "任务内容不能为空" },
        { status: 400 }
      );
    }

    // 检查 Agent 文件是否存在
    const agentPath = join(process.cwd(), AGENT_FILE);
    if (!existsSync(agentPath)) {
      console.warn(`Agent 文件不存在: ${agentPath}`);
    }

    /**
     * 构建 kimi 命令
     * 
     * Agent + Print 模式组合：
     *   kimi --agent-file ./config/agents/task-analyst.yaml \
     *        --print \
     *        --final-message-only \
     *        -p "任务描述"
     * 
     * 说明：
     * - --agent-file: 加载自定义 Agent YAML 配置
     * - --print: 启用 Print 模式
     * - --final-message-only: 仅输出最终消息
     * - -p: 传入用户指令
     * 
     * Agent 配置中的 system_prompt_path 指向的提示词文件
     * 可以使用 ${KIMI_NOW}, ${KIMI_WORK_DIR} 等内置变量
     */
    const args: string[] = [
      "--quiet",                    // 启用 Print 模式
      // "--final-message-only",       // 仅输出最终消息，跳过工具调用过程
      "-p",                         // 传入用户指令
      `"${taskText.replace(/"/g, '\\"')}"`,
    ];

    // 如果 Agent 文件存在，使用 --agent-file
    if (existsSync(agentPath)) {
      args.unshift("--agent-file", AGENT_FILE);
    }

    const command = `kimi ${args.join(" ")}`;

    console.log(`[TaskAnalyzer] 分析任务: ${taskId || "unknown"}`);
    console.log(`[TaskAnalyzer] 命令: ${command}`);

    // 执行命令
    const result = execSync(command, {
      encoding: "utf-8",
      timeout: 120000,  // 2分钟超时，任务分析可能需要较长时间
      cwd: process.cwd(),
      env: {
        ...process.env,
        AGENT_ID: "task-analyzer",
        AGENT_ROLE: "analyzer",
        AGENT_FILE: AGENT_FILE,
        // 传递上下文信息
        TASK_CONTEXT: context ? JSON.stringify(context) : "",
      },
    });
    console.log('[TaskAnalyzer] 原始输出:', result);

    // 解析结果 - 尝试提取 JSON 格式的任务列表
    let analysisResult;
    try {
      // 先尝试直接解析整个输出为 JSON
      analysisResult = JSON.parse(result);
    } catch {
      // 尝试从 markdown 中提取 JSON 代码块
      const jsonCodeBlockMatch = result.match(/```json\n([\s\S]*?)\n```/);
      if (jsonCodeBlockMatch) {
        try {
          analysisResult = JSON.parse(jsonCodeBlockMatch[1]);
        } catch {
          analysisResult = null;
        }
      }
      
      // 尝试从文本中提取 JSON 对象
      if (!analysisResult) {
        const jsonMatch = result.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            analysisResult = JSON.parse(jsonMatch[0]);
          } catch {
            analysisResult = null;
          }
        }
      }
      
      // 如果都无法解析，将原始文本作为结果
      if (!analysisResult) {
        analysisResult = {
          summary: "AI 分析结果",
          complexity: "medium",
          analysis_text: result,
          subTasks: [],
          executionOrder: [],
          risks: [],
        };
      }
    }

    return NextResponse.json({
      success: true,
      result: analysisResult,
      raw: result,
      meta: {
        taskId,
        agentFile: AGENT_FILE,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[TaskAnalyzer] 任务分析失败:", error);
    return NextResponse.json(
      {
        error: "任务分析失败",
        message: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}

/**
 * 获取 Agent 配置和提示词内容（用于前端展示）
 */
export async function GET() {
  try {
    // 读取 Agent 配置文件
    const agentPath = join(process.cwd(), AGENT_FILE);
    const promptPath = join(process.cwd(), "./config/agents/task-analyst.md");
    
    if (!existsSync(agentPath)) {
      return NextResponse.json(
        { error: "Agent 配置文件不存在" },
        { status: 404 }
      );
    }
    
    const agentContent = readFileSync(agentPath, "utf-8");
    const promptContent = existsSync(promptPath) 
      ? readFileSync(promptPath, "utf-8") 
      : null;
    
    return NextResponse.json({
      success: true,
      agent: {
        content: agentContent,
        path: AGENT_FILE,
      },
      prompt: promptContent ? {
        content: promptContent,
        path: "./config/agents/task-analyst.md",
      } : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "读取 Agent 配置失败",
        message: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
