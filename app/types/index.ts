export interface Tag {
  id: string;
  name: string;
  color: TagColor;
}

export type TagColor = 
  | "emerald"   // 翠绿
  | "blue"      // 天蓝
  | "violet"    // 紫罗兰
  | "rose"      // 玫瑰
  | "amber"     // 琥珀
  | "cyan";     // 青色

export const TAG_COLORS: { key: TagColor; label: string; bg: string; text: string }[] = [
  { key: "emerald", label: "翠绿", bg: "bg-emerald-100", text: "text-emerald-600" },
  { key: "blue", label: "天蓝", bg: "bg-blue-100", text: "text-blue-600" },
  { key: "violet", label: "紫罗兰", bg: "bg-violet-100", text: "text-violet-600" },
  { key: "rose", label: "玫瑰", bg: "bg-rose-100", text: "text-rose-600" },
  { key: "amber", label: "琥珀", bg: "bg-amber-100", text: "text-amber-600" },
  { key: "cyan", label: "青色", bg: "bg-cyan-100", text: "text-cyan-600" },
];

export function getTagColorStyle(colorKey: TagColor) {
  return TAG_COLORS.find(c => c.key === colorKey) || TAG_COLORS[0];
}

// ==================== 任务处理状态 ====================

export type TaskStatus = "pending" | "in_progress" | "completed";

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: "待处理", color: "text-slate-500", bg: "bg-slate-100", icon: "⏸️" },
  in_progress: { label: "处理中", color: "text-amber-600", bg: "bg-amber-100", icon: "▶️" },
  completed: { label: "已完成", color: "text-emerald-600", bg: "bg-emerald-100", icon: "✅" },
};

export function getTaskStatusConfig(status: TaskStatus) {
  return TASK_STATUS_CONFIG[status];
}

// ==================== 子任务类型 ====================

export interface SubTask {
  id: string;
  todoId: string;        // 所属任务的 ID
  text: string;
  completed: boolean;
  createdAt: Date;
  order: number;         // 排序序号
  artifact?: string;     // 产物：Markdown 报告
}

// ==================== 主任务类型 ====================

export interface Todo {
  id: string;
  text: string;
  status: TaskStatus;    // 处理状态：待处理/处理中/已完成
  completed: boolean;    // 是否已完成（向后兼容，由 status 派生）
  createdAt: Date;       // 创建时间
  tagIds: string[];      // 关联的标签 ID 列表
  subTasks?: SubTask[];  // 子任务列表（可选，加载时填充）
  artifact?: string;     // 产物：Markdown 报告
  workspacePath: string; // 工作目录路径：任务所属的工作空间
}

// 筛选用的状态类型
export type TodoFilterStatus = "all" | "pending" | "in_progress" | "completed";

// 向后兼容的类型别名
export type TodoStatus = "all" | "active" | "completed";
export type ProcessingStatus = TaskStatus;

// ==================== 工作区类型 ====================

export interface Workspace {
  id: string;           // 唯一标识 (如: "project-a")
  name: string;         // 显示名称 (如: "项目A")
  path: string;         // 路径 (如: "/projects/a")
  color?: string;       // 可选颜色标识
  createdAt: Date;
}

// 子任务输入（创建时）
export interface CreateSubTaskInput {
  text: string;
  todoId: string;
}

// 子任务更新
export interface UpdateSubTaskInput {
  text?: string;
  completed?: boolean;
  order?: number;
  artifact?: string;     // 产物更新
}
