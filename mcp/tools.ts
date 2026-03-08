/**
 * MCP 工具定义
 * 
 * 定义所有可用的工具及其参数模式
 * 使用 Zod 进行参数验证
 */

import { z } from "zod";

// ==================== 通用类型 ====================

export const TodoStatusSchema = z.enum(["all", "active", "completed"]);
export const TagColorSchema = z.enum([
  "emerald", "blue", "violet", "rose", "amber", "cyan"
]);

// ==================== Todo 工具 ====================

export const GetTodosSchema = z.object({
  status: TodoStatusSchema.optional().describe("筛选状态: all/active/completed"),
  tagId: z.string().optional().describe("按标签筛选"),
  includeSubTasks: z.boolean().optional().describe("是否包含子任务"),
  workspace: z.string().optional().describe("工作区路径，不传则获取所有工作区的任务"),
});

export const CreateTodoSchema = z.object({
  text: z.string().min(1).describe("任务内容"),
  tagIds: z.array(z.string()).optional().describe("关联的标签ID列表"),
  artifact: z.string().optional().describe("产物(Markdown格式)"),
  workspace: z.string().optional().describe("工作区路径，默认为根目录/"),
  status: z.enum(["pending", "in_progress", "completed"]).optional().describe("任务处理状态: pending(待处理), in_progress(处理中), completed(已完成)"),
});

export const UpdateTodoSchema = z.object({
  id: z.string().describe("任务ID"),
  text: z.string().min(1).optional().describe("任务内容"),
  completed: z.boolean().optional().describe("完成状态"),
  status: z.enum(["pending", "in_progress", "completed"]).optional().describe("任务处理状态: pending(待处理), in_progress(处理中), completed(已完成)"),
  tagIds: z.array(z.string()).optional().describe("关联的标签ID列表"),
  artifact: z.string().optional().describe("产物(Markdown格式)"),
  workspace: z.string().optional().describe("工作区路径"),
});

export const DeleteTodoSchema = z.object({
  id: z.string().describe("任务ID"),
});

export const ToggleTodoSchema = z.object({
  id: z.string().describe("任务ID"),
});

// ==================== 工作区工具 ====================

export const GetWorkspacesSchema = z.object({});

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).describe("工作区名称"),
  path: z.string().optional().describe("工作区路径，不指定则自动生成"),
  color: z.enum(["blue", "emerald", "violet", "rose", "amber", "cyan", "slate"]).optional().describe("工作区颜色标识"),
  id: z.string().optional().describe("工作区ID，不指定则自动生成"),
});

export const UpdateWorkspaceSchema = z.object({
  id: z.string().describe("工作区ID"),
  name: z.string().min(1).optional().describe("工作区名称"),
  path: z.string().optional().describe("工作区路径"),
  color: z.enum(["blue", "emerald", "violet", "rose", "amber", "cyan", "slate"]).optional().describe("工作区颜色标识"),
});

export const DeleteWorkspaceSchema = z.object({
  id: z.string().describe("工作区ID"),
});

// ==================== 标签工具 ====================

export const GetTagsSchema = z.object({});

export const CreateTagSchema = z.object({
  name: z.string().min(1).describe("标签名称"),
  color: TagColorSchema.describe("标签颜色"),
});

export const UpdateTagSchema = z.object({
  id: z.string().describe("标签ID"),
  name: z.string().min(1).optional().describe("标签名称"),
  color: TagColorSchema.optional().describe("标签颜色"),
});

export const DeleteTagSchema = z.object({
  id: z.string().describe("标签ID"),
});

// ==================== 子任务工具 ====================

export const GetSubTasksSchema = z.object({
  todoId: z.string().describe("所属任务ID"),
});

export const CreateSubTaskSchema = z.object({
  todoId: z.string().describe("所属任务ID"),
  text: z.string().min(1).describe("子任务内容"),
});

export const UpdateSubTaskSchema = z.object({
  id: z.string().describe("子任务ID"),
  text: z.string().min(1).optional().describe("子任务内容"),
  completed: z.boolean().optional().describe("完成状态"),
  artifact: z.string().optional().describe("产物(Markdown格式)"),
});

export const DeleteSubTaskSchema = z.object({
  id: z.string().describe("子任务ID"),
});

export const ToggleSubTaskSchema = z.object({
  id: z.string().describe("子任务ID"),
  completed: z.boolean().describe("完成状态"),
});

// ==================== 产物工具 ====================

export const UpdateTodoArtifactSchema = z.object({
  todoId: z.string().describe("任务ID"),
  artifact: z.string().describe("产物内容(Markdown格式)"),
});

export const UpdateSubTaskArtifactSchema = z.object({
  subTaskId: z.string().describe("子任务ID"),
  artifact: z.string().describe("产物内容(Markdown格式)"),
});

// ==================== 搜索工具 ====================

export const SearchTodosSchema = z.object({
  keyword: z.string().min(1).describe("搜索关键词，支持模糊匹配任务标题"),
  workspace: z.string().optional().describe("工作区路径，不传则搜索所有工作区"),
  status: TodoStatusSchema.optional().describe("筛选状态: all/active/completed"),
});

export const GetTodosByTagSchema = z.object({
  tagId: z.string().describe("标签ID"),
  workspace: z.string().optional().describe("工作区路径，不传则搜索所有工作区"),
  status: TodoStatusSchema.optional().describe("筛选状态: all/active/completed"),
});

// ==================== 统计工具 ====================

export const GetStatsSchema = z.object({
  workspace: z.string().optional().describe("工作区路径，不传则统计所有工作区"),
});

// ==================== 工具名称常量 ====================

export const ToolName = {
  GET_TODOS: "get_todos",
  CREATE_TODO: "create_todo",
  UPDATE_TODO: "update_todo",
  DELETE_TODO: "delete_todo",
  TOGGLE_TODO: "toggle_todo",
  
  GET_WORKSPACES: "get_workspaces",
  CREATE_WORKSPACE: "create_workspace",
  UPDATE_WORKSPACE: "update_workspace",
  DELETE_WORKSPACE: "delete_workspace",
  
  GET_TAGS: "get_tags",
  CREATE_TAG: "create_tag",
  UPDATE_TAG: "update_tag",
  DELETE_TAG: "delete_tag",
  
  GET_SUBTASKS: "get_subtasks",
  CREATE_SUBTASK: "create_subtask",
  UPDATE_SUBTASK: "update_subtask",
  DELETE_SUBTASK: "delete_subtask",
  TOGGLE_SUBTASK: "toggle_subtask",
  
  UPDATE_TODO_ARTIFACT: "update_todo_artifact",
  UPDATE_SUBTASK_ARTIFACT: "update_subtask_artifact",
  
  SEARCH_TODOS: "search_todos",
  GET_TODOS_BY_TAG: "get_todos_by_tag",
  
  GET_STATS: "get_stats",
} as const;

export type ToolName = typeof ToolName[keyof typeof ToolName];

// ==================== 工具定义类型 ====================

export interface ToolDefinition {
  name: ToolName;
  description: string;
  schema: z.ZodTypeAny;
}

// ==================== 工具定义列表 ====================

export const toolDefinitions: ToolDefinition[] = [
  // Todo 管理
  {
    name: ToolName.GET_TODOS,
    description: "获取任务列表，支持按状态、标签筛选，可通过 workspace 参数指定工作区路径",
    schema: GetTodosSchema,
  },
  {
    name: ToolName.CREATE_TODO,
    description: "创建新任务，使用 workspace 参数指定工作区路径（如 /project-a），不指定则创建在根目录",
    schema: CreateTodoSchema,
  },
  {
    name: ToolName.UPDATE_TODO,
    description: "更新任务信息，可通过 workspace 参数修改任务所属工作区",
    schema: UpdateTodoSchema,
  },
  {
    name: ToolName.DELETE_TODO,
    description: "删除任务及其所有子任务",
    schema: DeleteTodoSchema,
  },
  {
    name: ToolName.TOGGLE_TODO,
    description: "切换任务完成状态",
    schema: ToggleTodoSchema,
  },
  
  // 工作区管理
  {
    name: ToolName.GET_WORKSPACES,
    description: "获取所有工作区列表",
    schema: GetWorkspacesSchema,
  },
  {
    name: ToolName.CREATE_WORKSPACE,
    description: "创建新工作区",
    schema: CreateWorkspaceSchema,
  },
  {
    name: ToolName.UPDATE_WORKSPACE,
    description: "更新工作区信息",
    schema: UpdateWorkspaceSchema,
  },
  {
    name: ToolName.DELETE_WORKSPACE,
    description: "删除工作区（有任务时不可删除）",
    schema: DeleteWorkspaceSchema,
  },
  
  // 标签管理
  {
    name: ToolName.GET_TAGS,
    description: "获取所有标签",
    schema: GetTagsSchema,
  },
  {
    name: ToolName.CREATE_TAG,
    description: "创建新标签",
    schema: CreateTagSchema,
  },
  {
    name: ToolName.UPDATE_TAG,
    description: "更新标签信息",
    schema: UpdateTagSchema,
  },
  {
    name: ToolName.DELETE_TAG,
    description: "删除标签",
    schema: DeleteTagSchema,
  },
  
  // 子任务管理
  {
    name: ToolName.GET_SUBTASKS,
    description: "获取任务的子任务列表",
    schema: GetSubTasksSchema,
  },
  {
    name: ToolName.CREATE_SUBTASK,
    description: "为任务创建子任务",
    schema: CreateSubTaskSchema,
  },
  {
    name: ToolName.UPDATE_SUBTASK,
    description: "更新子任务信息",
    schema: UpdateSubTaskSchema,
  },
  {
    name: ToolName.DELETE_SUBTASK,
    description: "删除子任务",
    schema: DeleteSubTaskSchema,
  },
  {
    name: ToolName.TOGGLE_SUBTASK,
    description: "切换子任务完成状态",
    schema: ToggleSubTaskSchema,
  },
  
  // 产物管理
  {
    name: ToolName.UPDATE_TODO_ARTIFACT,
    description: "更新任务的产物(Markdown报告)",
    schema: UpdateTodoArtifactSchema,
  },
  {
    name: ToolName.UPDATE_SUBTASK_ARTIFACT,
    description: "更新子任务的产物(Markdown报告)",
    schema: UpdateSubTaskArtifactSchema,
  },
  
  // 搜索
  {
    name: ToolName.SEARCH_TODOS,
    description: "模糊搜索任务标题，支持关键词匹配",
    schema: SearchTodosSchema,
  },
  {
    name: ToolName.GET_TODOS_BY_TAG,
    description: "通过标签ID查询任务列表",
    schema: GetTodosByTagSchema,
  },
  
  // 统计
  {
    name: ToolName.GET_STATS,
    description: "获取任务统计信息，可指定 workspace 参数按工作区统计",
    schema: GetStatsSchema,
  },
];
