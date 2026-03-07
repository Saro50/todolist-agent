/**
 * 任务分析 API 路由
 * 
 * 调用 task-analyzer Agent 分析任务并拆分为子任务
 */

import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

export async function POST(request: NextRequest) {
  try {
    const { taskText, taskId } = await request.json();

    if (!taskText || typeof taskText !== "string") {
      return NextResponse.json(
        { error: "任务内容不能为空" },
        { status: 400 }
      );
    }

    // 创建临时目录
    const tempDir = join(tmpdir(), "todolist-analyzer");
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true });
    }

    // 创建系统提示词文件
    const promptContent = `你是一个专业的任务分析专家。你的职责是：

1. 分析用户输入的任务描述，评估其复杂度
2. 识别任务的关键组成部分和依赖关系
3. 如果任务较为复杂（需要多个步骤或涉及多个领域），将其拆分为清晰的子任务
4. 为每个子任务定义：
   - 明确的标题和描述
   - 优先级（high/medium/low）
   - 预估完成时间
   - 依赖关系（哪些子任务需要在其他子任务之前完成）

分析原则：
- 保持子任务的独立性和可执行性
- 确保子任务的粒度适中（通常2-4小时可完成）
- 识别潜在的风险和阻塞点
- 提供清晰的执行顺序建议

输出格式要求（必须是有效的 JSON）：
{
  "summary": "任务概述",
  "complexity": "simple|medium|complex",
  "subTasks": [
    {
      "title": "子任务标题",
      "description": "详细描述",
      "priority": "high|medium|low",
      "estimatedTime": "2h",
      "dependencies": []
    }
  ],
  "executionOrder": [0, 1, 2],
  "risks": ["风险1", "风险2"]
}`;

    const promptFile = join(tempDir, `prompt-${taskId}.txt`);
    writeFileSync(promptFile, promptContent, "utf-8");

    // 构建 kimi 命令
    const taskInput = `请分析以下任务并提供详细的子任务拆分方案：\n\n${taskText}`;
    const command = `kimi --print --no-stream --system-prompt-file "${promptFile}" "${taskInput.replace(/"/g, '\\"')}"`;

    // 执行命令
    const result = execSync(command, {
      encoding: "utf-8",
      timeout: 60000,
      cwd: process.cwd(),
      env: {
        ...process.env,
        AGENT_ID: "task-analyzer",
        AGENT_ROLE: "analyzer",
      },
    });

    // 解析结果
    let analysisResult;
    try {
      // 尝试从结果中提取 JSON
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = {
          summary: result.substring(0, 200),
          complexity: "medium",
          subTasks: [],
          executionOrder: [],
          risks: [],
        };
      }
    } catch {
      analysisResult = {
        summary: result.substring(0, 500),
        complexity: "medium",
        subTasks: [],
        executionOrder: [],
        risks: [],
      };
    }

    return NextResponse.json({
      success: true,
      result: analysisResult,
      raw: result,
    });
  } catch (error) {
    console.error("任务分析失败:", error);
    return NextResponse.json(
      {
        error: "任务分析失败",
        message: error instanceof Error ? error.message : "未知错误",
      },
      { status: 500 }
    );
  }
}
