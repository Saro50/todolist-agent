/**
 * 任务分析器 Hook
 * 
 * 调用 AI Agent 分析任务并拆分为子任务
 */

import { useState, useCallback } from "react";

export interface SubTaskAnalysis {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedTime: string;
  dependencies: number[];
}

export interface TaskAnalysisResult {
  summary: string;
  complexity: "simple" | "medium" | "complex";
  subTasks: SubTaskAnalysis[];
  executionOrder: number[];
  risks: string[];
}

interface UseTaskAnalyzerReturn {
  isAnalyzing: boolean;
  error: string | null;
  result: TaskAnalysisResult | null;
  analyzeTask: (taskText: string, taskId: string) => Promise<TaskAnalysisResult | null>;
  clearResult: () => void;
}

export function useTaskAnalyzer(): UseTaskAnalyzerReturn {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TaskAnalysisResult | null>(null);

  const analyzeTask = useCallback(async (
    taskText: string,
    taskId: string
  ): Promise<TaskAnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ taskText, taskId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "分析失败");
      }

      setResult(data.result);
      return data.result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "分析失败";
      setError(message);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    isAnalyzing,
    error,
    result,
    analyzeTask,
    clearResult,
  };
}
