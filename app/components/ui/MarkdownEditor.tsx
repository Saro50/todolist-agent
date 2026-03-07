"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

interface MarkdownEditorProps {
  value?: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  placeholder?: string;
  className?: string;
}

/**
 * Markdown 编辑器组件
 * 支持编辑和实时预览
 */
export function MarkdownEditor({
  value = "",
  onChange,
  onSave,
  onCancel,
  placeholder = "输入 Markdown 格式的产物报告...",
  className,
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");

  // 简单的 Markdown 渲染
  const renderMarkdown = useCallback((text: string): string => {
    if (!text) return "<p class=\"text-gray-400 italic\">暂无内容</p>";

    let html = text
      // 转义 HTML
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // 代码块
      .replace(/```(\w+)?\n([\s\S]*?)```/g, "<pre class=\"bg-gray-100 p-3 rounded-lg overflow-x-auto my-2\"><code class=\"text-sm\">$2</code></pre>")
      // 行内代码
      .replace(/`([^`]+)`/g, "<code class=\"bg-gray-100 px-1.5 py-0.5 rounded text-sm text-rose-600\">$1</code>")
      // 标题
      .replace(/^### (.*$)/gim, "<h3 class=\"text-lg font-semibold mt-4 mb-2\">$1</h3>")
      .replace(/^## (.*$)/gim, "<h2 class=\"text-xl font-bold mt-5 mb-3\">$1</h2>")
      .replace(/^# (.*$)/gim, "<h1 class=\"text-2xl font-bold mt-6 mb-4\">$1</h1>")
      // 粗体和斜体
      .replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // 删除线
      .replace(/~~(.*?)~~/g, "<del class=\"text-gray-400\">$1</del>")
      // 引用
      .replace(/^> (.*$)/gim, "<blockquote class=\"border-l-4 border-emerald-400 pl-4 py-1 my-2 bg-gray-50 italic\">$1</blockquote>")
      // 无序列表
      .replace(/^- (.*$)/gim, "<li class=\"ml-4 list-disc\">$1</li>")
      // 有序列表
      .replace(/^\d+\. (.*$)/gim, "<li class=\"ml-4 list-decimal\">$1</li>")
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href=\"$2\" class=\"text-blue-500 hover:underline\" target=\"_blank\" rel=\"noopener\">$1</a>")
      // 分隔线
      .replace(/^---$/gim, "<hr class=\"my-4 border-gray-200\">");

    // 将连续的 li 包裹在 ul/ol 中
    html = html.replace(/(<li class="ml-4 list-disc">.*<\/li>\n?)+/g, "<ul class=\"my-2\">$&</ul>");
    html = html.replace(/(<li class="ml-4 list-decimal">.*<\/li>\n?)+/g, "<ol class=\"my-2\">$&</ol>");

    // 段落
    html = html.replace(/\n\n/g, "</p><p class=\"my-2\">");
    html = "<p class=\"my-2\">" + html + "</p>";

    // 清理空段落
    html = html.replace(/<p class="my-2"><\/p>/g, "");

    return html;
  }, []);

  return (
    <div className={cn("border border-gray-200 rounded-xl overflow-hidden bg-white", className)}>
      {/* 标签页 */}
      <div className="flex border-b border-gray-100">
        <button
          onClick={() => setActiveTab("edit")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "edit"
              ? "text-emerald-600 border-b-2 border-emerald-400"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          编辑
        </button>
        <button
          onClick={() => setActiveTab("preview")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "preview"
              ? "text-emerald-600 border-b-2 border-emerald-400"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          预览
        </button>
      </div>

      {/* 内容区 */}
      <div className="p-4">
        {activeTab === "edit" ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-64 p-3 text-sm font-mono bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-200 resize-none"
            spellCheck={false}
          />
        ) : (
          <div
            className="w-full h-64 p-3 text-sm overflow-auto prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
          />
        )}
      </div>

      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          支持 Markdown 语法：# 标题 **粗体** *斜体* `代码` - 列表
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            取消
          </Button>
          <Button size="sm" onClick={onSave}>
            保存
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Markdown 预览组件（只读）
 */
interface MarkdownPreviewProps {
  content?: string;
  maxHeight?: string;
  className?: string;
}

export function MarkdownPreview({
  content = "",
  maxHeight = "200px",
  className,
}: MarkdownPreviewProps) {
  const renderMarkdown = useCallback((text: string): string => {
    if (!text) return "";

    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/```(\w+)?\n([\s\S]*?)```/g, "<pre class=\"bg-gray-100 p-2 rounded text-xs overflow-x-auto my-1\"><code>$2</code></pre>")
      .replace(/`([^`]+)`/g, "<code class=\"bg-gray-100 px-1 rounded text-xs text-rose-600\">$1</code>")
      .replace(/^### (.*$)/gim, "<h4 class=\"text-sm font-semibold mt-2 mb-1\">$1</h4>")
      .replace(/^## (.*$)/gim, "<h3 class=\"text-sm font-bold mt-2 mb-1\">$1</h3>")
      .replace(/^# (.*$)/gim, "<h2 class=\"text-base font-bold mt-2 mb-1\">$1</h2>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/~~(.*?)~~/g, "<del class=\"text-gray-400\">$1</del>")
      .replace(/^> (.*$)/gim, "<blockquote class=\"border-l-2 border-emerald-400 pl-2 py-0.5 my-1 bg-gray-50 text-xs italic\">$1</blockquote>")
      .replace(/^- (.*$)/gim, "<li class=\"ml-3 list-disc text-sm\">$1</li>")
      .replace(/^\d+\. (.*$)/gim, "<li class=\"ml-3 list-decimal text-sm\">$1</li>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<a href=\"$2\" class=\"text-blue-500 hover:underline text-sm\" target=\"_blank\">$1</a>");

    html = html.replace(/(<li class="ml-3 list-disc text-sm">.*<\/li>\n?)+/g, "<ul class=\"my-1\">$&</ul>");
    html = html.replace(/(<li class="ml-3 list-decimal text-sm">.*<\/li>\n?)+/g, "<ol class=\"my-1\">$&</ol>");
    html = html.replace(/\n/g, "<br>");

    return html;
  }, []);

  if (!content) {
    return (
      <div className={cn("text-gray-400 text-sm italic", className)}>
        暂无产物报告
      </div>
    );
  }

  return (
    <div
      className={cn("overflow-auto prose prose-sm max-w-none", className)}
      style={{ maxHeight }}
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
