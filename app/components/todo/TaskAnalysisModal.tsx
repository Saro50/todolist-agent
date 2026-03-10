"use client";

import { createPortal } from "react-dom";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { TaskAnalysisResult } from "@/lib/hooks/useTaskAnalyzer";
import { cn } from "@/lib/utils";

interface TaskAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: TaskAnalysisResult | null;
  isLoading: boolean;
  error: string | null;
  onApplySubTasks: (subTasks: TaskAnalysisResult["subTasks"]) => void;
}

export function TaskAnalysisModal({
  isOpen,
  onClose,
  result,
  isLoading,
  error,
  onApplySubTasks,
}: TaskAnalysisModalProps) {
  if (!isOpen) return null;

  const complexityColors = {
    simple: "bg-emerald-100 text-emerald-700",
    medium: "bg-amber-100 text-amber-700",
    complex: "bg-rose-100 text-rose-700",
  };

  const priorityColors = {
    high: "bg-rose-100 text-rose-700 border-rose-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    low: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-800">
              🤖 AI 任务分析
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Button>
          </div>

          {isLoading && (
            <div className="py-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4" />
              <p className="text-gray-500">AI 正在分析任务...</p>
              <p className="text-gray-400 text-sm mt-2">这可能需要几秒钟</p>
            </div>
          )}

          {error && (
            <div className="py-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-rose-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-rose-500 mb-2">分析失败</p>
              <p className="text-gray-400 text-sm">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              {/* 任务概览 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      complexityColors[result.complexity]
                    )}
                  >
                    {result.complexity === "simple" && "简单"}
                    {result.complexity === "medium" && "中等"}
                    {result.complexity === "complex" && "复杂"}
                  </span>
                </div>
                <p className="text-gray-700">{result.summary}</p>
              </div>

              {/* 子任务列表 */}
              {result.subTasks.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    建议的子任务 ({result.subTasks.length}个)
                  </h3>
                  <div className="space-y-3">
                    {result.subTasks.map((subTask, index) => (
                      <div
                        key={index}
                        className={cn(
                          "border rounded-lg p-4",
                          priorityColors[subTask.priority]
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs opacity-70">#{index + 1}</span>
                              <span className="font-medium">{subTask.title}</span>
                            </div>
                            <p className="text-sm opacity-80 mb-2">{subTask.description}</p>
                            <div className="flex items-center gap-3 text-xs opacity-70">
                              <span>⏱ {subTask.estimatedTime}</span>
                              {subTask.dependencies.length > 0 && (
                                <span>🔗 依赖: {subTask.dependencies.map(i => `#${i + 1}`).join(", ")}</span>
                              )}
                            </div>
                          </div>
                          <span
                            className={cn(
                              "px-2 py-1 rounded text-xs font-medium",
                              subTask.priority === "high" && "bg-rose-200 text-rose-800",
                              subTask.priority === "medium" && "bg-amber-200 text-amber-800",
                              subTask.priority === "low" && "bg-blue-200 text-blue-800"
                            )}
                          >
                            {subTask.priority === "high" && "高"}
                            {subTask.priority === "medium" && "中"}
                            {subTask.priority === "low" && "低"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 风险提示 */}
              {result.risks.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-amber-800 mb-2">
                    ⚠️ 风险提示
                  </h3>
                  <ul className="space-y-1">
                    {result.risks.map((risk, index) => (
                      <li key={index} className="text-sm text-amber-700">
                        • {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="primary"
                  onClick={() => onApplySubTasks(result.subTasks)}
                  disabled={result.subTasks.length === 0}
                  className="flex-1"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  应用子任务
                </Button>
                <Button variant="secondary" onClick={onClose}>
                  关闭
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  // 使用 Portal 渲染到 body，避免父元素的 backdrop-filter 等属性影响 fixed 定位
  return createPortal(modalContent, document.body);
}
