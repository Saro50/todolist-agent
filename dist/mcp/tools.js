"use strict";
/**
 * MCP 工具定义
 *
 * 定义所有可用的工具及其参数模式
 * 使用 Zod 进行参数验证
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolDefinitions = exports.ToolName = exports.GetStatsSchema = exports.UpdateSubTaskArtifactSchema = exports.UpdateTodoArtifactSchema = exports.ToggleSubTaskSchema = exports.DeleteSubTaskSchema = exports.UpdateSubTaskSchema = exports.CreateSubTaskSchema = exports.GetSubTasksSchema = exports.DeleteTagSchema = exports.UpdateTagSchema = exports.CreateTagSchema = exports.GetTagsSchema = exports.ToggleTodoSchema = exports.DeleteTodoSchema = exports.UpdateTodoSchema = exports.CreateTodoSchema = exports.GetTodosSchema = exports.TagColorSchema = exports.TodoStatusSchema = void 0;
const zod_1 = require("zod");
// ==================== 通用类型 ====================
exports.TodoStatusSchema = zod_1.z.enum(["all", "active", "completed"]);
exports.TagColorSchema = zod_1.z.enum([
    "emerald", "blue", "violet", "rose", "amber", "cyan"
]);
// ==================== Todo 工具 ====================
exports.GetTodosSchema = zod_1.z.object({
    status: exports.TodoStatusSchema.optional().describe("筛选状态: all/active/completed"),
    tagId: zod_1.z.string().optional().describe("按标签筛选"),
    includeSubTasks: zod_1.z.boolean().optional().describe("是否包含子任务"),
});
exports.CreateTodoSchema = zod_1.z.object({
    text: zod_1.z.string().min(1).describe("任务内容"),
    tagIds: zod_1.z.array(zod_1.z.string()).optional().describe("关联的标签ID列表"),
    artifact: zod_1.z.string().optional().describe("产物(Markdown格式)"),
});
exports.UpdateTodoSchema = zod_1.z.object({
    id: zod_1.z.string().describe("任务ID"),
    text: zod_1.z.string().min(1).optional().describe("任务内容"),
    completed: zod_1.z.boolean().optional().describe("完成状态"),
    tagIds: zod_1.z.array(zod_1.z.string()).optional().describe("关联的标签ID列表"),
    artifact: zod_1.z.string().optional().describe("产物(Markdown格式)"),
});
exports.DeleteTodoSchema = zod_1.z.object({
    id: zod_1.z.string().describe("任务ID"),
});
exports.ToggleTodoSchema = zod_1.z.object({
    id: zod_1.z.string().describe("任务ID"),
});
// ==================== 标签工具 ====================
exports.GetTagsSchema = zod_1.z.object({});
exports.CreateTagSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).describe("标签名称"),
    color: exports.TagColorSchema.describe("标签颜色"),
});
exports.UpdateTagSchema = zod_1.z.object({
    id: zod_1.z.string().describe("标签ID"),
    name: zod_1.z.string().min(1).optional().describe("标签名称"),
    color: exports.TagColorSchema.optional().describe("标签颜色"),
});
exports.DeleteTagSchema = zod_1.z.object({
    id: zod_1.z.string().describe("标签ID"),
});
// ==================== 子任务工具 ====================
exports.GetSubTasksSchema = zod_1.z.object({
    todoId: zod_1.z.string().describe("所属任务ID"),
});
exports.CreateSubTaskSchema = zod_1.z.object({
    todoId: zod_1.z.string().describe("所属任务ID"),
    text: zod_1.z.string().min(1).describe("子任务内容"),
});
exports.UpdateSubTaskSchema = zod_1.z.object({
    id: zod_1.z.string().describe("子任务ID"),
    text: zod_1.z.string().min(1).optional().describe("子任务内容"),
    completed: zod_1.z.boolean().optional().describe("完成状态"),
    artifact: zod_1.z.string().optional().describe("产物(Markdown格式)"),
});
exports.DeleteSubTaskSchema = zod_1.z.object({
    id: zod_1.z.string().describe("子任务ID"),
});
exports.ToggleSubTaskSchema = zod_1.z.object({
    id: zod_1.z.string().describe("子任务ID"),
    completed: zod_1.z.boolean().describe("完成状态"),
});
// ==================== 产物工具 ====================
exports.UpdateTodoArtifactSchema = zod_1.z.object({
    todoId: zod_1.z.string().describe("任务ID"),
    artifact: zod_1.z.string().describe("产物内容(Markdown格式)"),
});
exports.UpdateSubTaskArtifactSchema = zod_1.z.object({
    subTaskId: zod_1.z.string().describe("子任务ID"),
    artifact: zod_1.z.string().describe("产物内容(Markdown格式)"),
});
// ==================== 统计工具 ====================
exports.GetStatsSchema = zod_1.z.object({});
// ==================== 工具名称常量 ====================
exports.ToolName = {
    GET_TODOS: "get_todos",
    CREATE_TODO: "create_todo",
    UPDATE_TODO: "update_todo",
    DELETE_TODO: "delete_todo",
    TOGGLE_TODO: "toggle_todo",
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
    GET_STATS: "get_stats",
};
// ==================== 工具定义列表 ====================
exports.toolDefinitions = [
    // Todo 管理
    {
        name: exports.ToolName.GET_TODOS,
        description: "获取任务列表，支持按状态和标签筛选",
        schema: exports.GetTodosSchema,
    },
    {
        name: exports.ToolName.CREATE_TODO,
        description: "创建新任务",
        schema: exports.CreateTodoSchema,
    },
    {
        name: exports.ToolName.UPDATE_TODO,
        description: "更新任务信息（内容、状态、标签、产物）",
        schema: exports.UpdateTodoSchema,
    },
    {
        name: exports.ToolName.DELETE_TODO,
        description: "删除任务及其所有子任务",
        schema: exports.DeleteTodoSchema,
    },
    {
        name: exports.ToolName.TOGGLE_TODO,
        description: "切换任务完成状态",
        schema: exports.ToggleTodoSchema,
    },
    // 标签管理
    {
        name: exports.ToolName.GET_TAGS,
        description: "获取所有标签",
        schema: exports.GetTagsSchema,
    },
    {
        name: exports.ToolName.CREATE_TAG,
        description: "创建新标签",
        schema: exports.CreateTagSchema,
    },
    {
        name: exports.ToolName.UPDATE_TAG,
        description: "更新标签信息",
        schema: exports.UpdateTagSchema,
    },
    {
        name: exports.ToolName.DELETE_TAG,
        description: "删除标签",
        schema: exports.DeleteTagSchema,
    },
    // 子任务管理
    {
        name: exports.ToolName.GET_SUBTASKS,
        description: "获取任务的子任务列表",
        schema: exports.GetSubTasksSchema,
    },
    {
        name: exports.ToolName.CREATE_SUBTASK,
        description: "为任务创建子任务",
        schema: exports.CreateSubTaskSchema,
    },
    {
        name: exports.ToolName.UPDATE_SUBTASK,
        description: "更新子任务信息",
        schema: exports.UpdateSubTaskSchema,
    },
    {
        name: exports.ToolName.DELETE_SUBTASK,
        description: "删除子任务",
        schema: exports.DeleteSubTaskSchema,
    },
    {
        name: exports.ToolName.TOGGLE_SUBTASK,
        description: "切换子任务完成状态",
        schema: exports.ToggleSubTaskSchema,
    },
    // 产物管理
    {
        name: exports.ToolName.UPDATE_TODO_ARTIFACT,
        description: "更新任务的产物(Markdown报告)",
        schema: exports.UpdateTodoArtifactSchema,
    },
    {
        name: exports.ToolName.UPDATE_SUBTASK_ARTIFACT,
        description: "更新子任务的产物(Markdown报告)",
        schema: exports.UpdateSubTaskArtifactSchema,
    },
    // 统计
    {
        name: exports.ToolName.GET_STATS,
        description: "获取任务统计信息",
        schema: exports.GetStatsSchema,
    },
];
