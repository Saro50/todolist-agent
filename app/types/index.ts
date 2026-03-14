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

// ==================== 任务类型 ====================

export type TodoType = 'task' | 'subtask';

// ==================== 审批状态 ====================

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export const APPROVAL_STATUS_CONFIG: Record<ApprovalStatus, {
  label: string;
  color: string;
  bg: string;
  icon: string
}> = {
  pending: { label: '待审批', color: 'text-amber-600', bg: 'bg-amber-100', icon: '⏳' },
  approved: { label: '已通过', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: '✅' },
  rejected: { label: '已拒绝', color: 'text-rose-600', bg: 'bg-rose-100', icon: '❌' },
};

export function getApprovalStatusConfig(status: ApprovalStatus) {
  return APPROVAL_STATUS_CONFIG[status];
}

export interface Todo {
  id: string;
  type: TodoType;           // 'task' 主任务, 'subtask' 子任务
  text: string;
  status: TaskStatus;       // 处理状态：待处理/处理中/已完成
  completed: boolean;       // 是否已完成（向后兼容，由 status 派生）
  approvalStatus: ApprovalStatus;  // 审批状态：待审批/已通过/已拒绝
  createdAt: Date;          // 创建时间
  updatedAt: Date;          // 更新时间
  tagIds: string[];         // 关联的标签 ID 列表
  children?: Todo[];        // 子任务列表（可选，加载时填充）
  artifact?: string;        // 产物：Markdown 报告
  workspaceId?: string;     // 工作区 ID（V3：只给主任务，子任务跟随父任务）
  sortOrder?: number;       // 排序序号（子任务用）
  parentId?: string;        // 父任务 ID（V3：子任务专用，标识所属主任务）
}

// 向后兼容：SubTask 作为 Todo 的别名
export type SubTask = Todo;

// ==================== 任务关系类型 ====================

export interface TodoRelation {
  parentId: string;
  childId: string;
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
  parentId: string;      // 父任务 ID（原 todoId）
  approvalStatus?: ApprovalStatus;  // 审批状态，可选，默认 pending
}

// 子任务更新
export interface UpdateSubTaskInput {
  text?: string;
  completed?: boolean;
  sortOrder?: number;
  artifact?: string;     // 产物更新
  approvalStatus?: ApprovalStatus;  // 审批状态更新
}

// 创建任务输入
export interface CreateTodoInput {
  text: string;
  type?: TodoType;
  status?: TaskStatus;
  completed?: boolean;  // 可选，会从 status 派生
  tagIds?: string[];
  artifact?: string;
  workspaceId?: string;  // V3: 使用 workspaceId 而不是 workspacePath
  approvalStatus?: ApprovalStatus;  // 审批状态，可选，默认 pending
}

// 更新任务输入
export interface UpdateTodoInput {
  text?: string;
  status?: TaskStatus;
  completed?: boolean;
  tagIds?: string[];
  artifact?: string;
  sortOrder?: number;
  workspaceId?: string;  // V3: 支持修改工作区
  approvalStatus?: ApprovalStatus;  // 审批状态更新
}

// 筛选用的审批状态类型
export type TodoFilterApprovalStatus = "all" | "pending" | "approved" | "rejected";
