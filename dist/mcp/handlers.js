"use strict";
/**
 * MCP 工具处理器
 *
 * 实现所有工具的具体逻辑
 * 复用现有的 API 客户端与后端通信
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.toolHandlers = void 0;
const api_ts_1 = require("./api.ts");
const tools_ts_1 = require("./tools.ts");
// ==================== 格式化函数 ====================
function formatTodo(todo, subTasks = []) {
    const status = todo.completed ? "✅" : "⬜";
    const tags = todo.tagIds.length > 0 ? ` [${todo.tagIds.join(", ")}]` : "";
    const artifact = todo.artifact ? " 📄" : "";
    let result = `${status} ${todo.text}${tags}${artifact}\n`;
    result += `   ID: ${todo.id} | 创建: ${new Date(todo.createdAt).toLocaleDateString()}\n`;
    if (subTasks.length > 0) {
        result += `   子任务: ${subTasks.filter(st => st.completed).length}/${subTasks.length} 完成\n`;
        for (const st of subTasks) {
            const stStatus = st.completed ? "✅" : "⬜";
            const stArtifact = st.artifact ? " 📄" : "";
            result += `     ${stStatus} ${st.text}${stArtifact}\n`;
        }
    }
    if (todo.artifact) {
        result += `   产物: 已设置\n`;
    }
    return result;
}
function formatTag(tag) {
    return `- ${tag.name} (ID: ${tag.id}, 颜色: ${tag.color})`;
}
function formatSubTask(subTask) {
    const status = subTask.completed ? "✅" : "⬜";
    const artifact = subTask.artifact ? " 📄" : "";
    return `${status} ${subTask.text}${artifact} (ID: ${subTask.id})`;
}
// ==================== 错误处理 ====================
function handleError(error) {
    const message = error instanceof Error ? error.message : "未知错误";
    return {
        content: [{ type: "text", text: `❌ 操作失败: ${message}` }],
        isError: true,
    };
}
// ==================== Todo 处理器 ====================
async function handleGetTodos(args) {
    try {
        const params = tools_ts_1.GetTodosSchema.parse(args);
        let todos;
        if (params.status === "active") {
            todos = await api_ts_1.api.todos.getByStatus(false);
        }
        else if (params.status === "completed") {
            todos = await api_ts_1.api.todos.getByStatus(true);
        }
        else if (params.tagId) {
            todos = await api_ts_1.api.todos.getByTag(params.tagId);
        }
        else {
            todos = await api_ts_1.api.todos.getAll();
        }
        // 如果需要包含子任务
        const subTasksMap = {};
        if (params.includeSubTasks && todos.length > 0) {
            for (const todo of todos) {
                subTasksMap[todo.id] = await api_ts_1.api.subTasks.getByTodoId(todo.id);
            }
        }
        if (todos.length === 0) {
            return { content: [{ type: "text", text: "📭 暂无任务" }] };
        }
        const lines = [`📋 任务列表 (${todos.length}项)\n`];
        for (const todo of todos) {
            lines.push(formatTodo(todo, params.includeSubTasks ? subTasksMap[todo.id] : []));
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
    }
    catch (error) {
        return handleError(error);
    }
}
async function handleCreateTodo(args) {
    try {
        const params = tools_ts_1.CreateTodoSchema.parse(args);
        const todo = await api_ts_1.api.todos.create({
            text: params.text,
            tagIds: params.tagIds || [],
            artifact: params.artifact,
        });
        return {
            content: [{ type: "text", text: `✅ 任务创建成功\n\n${formatTodo(todo)}` }],
        };
    }
    catch (error) {
        return handleError(error);
    }
}
async function handleUpdateTodo(args) {
    try {
        const params = tools_ts_1.UpdateTodoSchema.parse(args);
        const { id, ...data } = params;
        const todo = await api_ts_1.api.todos.update(id, data);
        return {
            content: [{ type: "text", text: `✅ 任务更新成功\n\n${formatTodo(todo)}` }],
        };
    }
    catch (error) {
        return handleError(error);
    }
}
async function handleDeleteTodo(args) {
    try {
        const params = tools_ts_1.DeleteTodoSchema.parse(args);
        await api_ts_1.api.todos.delete(params.id);
        return {
            content: [{ type: "text", text: `🗑️ 任务已删除 (ID: ${params.id})` }],
        };
    }
    catch (error) {
        return handleError(error);
    }
}
async function handleToggleTodo(args) {
    try {
        const params = tools_ts_1.ToggleTodoSchema.parse(args);
        const todo = await api_ts_1.api.todos.getById(params.id);
        if (!todo) {
            return { content: [{ type: "text", text: "❌ 任务不存在" }], isError: true };
        }
        const updated = await api_ts_1.api.todos.update(params.id, { completed: !todo.completed });
        const status = updated.completed ? "已完成" : "未完成";
        return {
            content: [{ type: "text", text: `✅ 任务已标记为${status}\n\n${formatTodo(updated)}` }],
        };
    }
    catch (error) {
        return handleError(error);
    }
}
// ==================== 标签处理器 ====================
async function handleGetTags() {
    try {
        const tags = await api_ts_1.api.tags.getAll();
        if (tags.length === 0) {
            return { content: [{ type: "text", text: "🏷️ 暂无标签" }] };
        }
        const lines = [`🏷️ 标签列表 (${tags.length}项)\n`];
        for (const tag of tags) {
            lines.push(formatTag(tag));
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
    }
    catch (error) {
        return handleError(error);
    }
}
async function handleCreateTag(args) {
    try {
        const params = tools_ts_1.CreateTagSchema.parse(args);
        const tag = await api_ts_1.api.tags.create(params);
        return {
            content: [{ type: "text", text: `✅ 标签创建成功\n${formatTag(tag)}` }],
        };
    }
    catch (error) {
        return handleError(error);
    }
}
async function handleUpdateTag(args) {
    try {
        const params = tools_ts_1.UpdateTagSchema.parse(args);
        const { id, ...data } = params;
        const tag = await api_ts_1.api.tags.update(id, data);
        return {
            content: [{ type: "text", text: `✅ 标签更新成功\n${formatTag(tag)}` }],
        };
    }
    catch (error) {
        return handleError(error);
    }
}
async function handleDeleteTag(args) {
    try {
        const params = tools_ts_1.DeleteTagSchema.parse(args);
        await api_ts_1.api.tags.delete(params.id);
        return {
            content: [{ type: "text", text: `🗑️ 标签已删除 (ID: ${params.id})` }],
        };
    }
    catch (error) {
        return handleError(error);
    }
}
// ==================== 子任务处理器 ====================
async function handleGetSubTasks(args) {
    try {
        const params = tools_ts_1.GetSubTasksSchema.parse(args);
        const subTasks = await api_ts_1.api.subTasks.getByTodoId(params.todoId);
        if (subTasks.length === 0) {
            return { content: [{ type: "text", text: "📭 该任务暂无子任务" }] };
        }
        const lines = [`📋 子任务列表 (${subTasks.length}项)\n`];
        for (const st of subTasks) {
            lines.push(formatSubTask(st));
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
    }
    catch (error) {
        return handleError(error);
    }
}
async function handleCreateSubTask(args) {
    try {
        const params = tools_ts_1.CreateSubTaskSchema.parse(args);
        const subTask = await api_ts_1.api.subTasks.create(params.todoId, params.text);
        return {
            content: [{ type: "text", text: `✅ 子任务创建成功\n${formatSubTask(subTask)}` }],
        };
    }
    catch (error) {
        return handleError(error);
    }
}
async function handleUpdateSubTask(args) {
    try {
        const params = tools_ts_1.UpdateSubTaskSchema.parse(args);
        const { id, ...data } = params;
        const subTask = await api_ts_1.api.subTasks.update(id, data);
        return {
            content: [{ type: "text", text: `✅ 子任务更新成功\n${formatSubTask(subTask)}` }],
        };
    }
    catch (error) {
        return handleError(error);
    }
}
async function handleDeleteSubTask(args) {
    try {
        const params = tools_ts_1.DeleteSubTaskSchema.parse(args);
        await api_ts_1.api.subTasks.delete(params.id);
        return {
            content: [{ type: "text", text: `🗑️ 子任务已删除 (ID: ${params.id})` }],
        };
    }
    catch (error) {
        return handleError(error);
    }
}
async function handleToggleSubTask(args) {
    try {
        const params = tools_ts_1.ToggleSubTaskSchema.parse(args);
        const subTask = await api_ts_1.api.subTasks.update(params.id, { completed: params.completed });
        return {
            content: [{ type: "text", text: `✅ 子任务已更新\n${formatSubTask(subTask)}` }],
        };
    }
    catch (error) {
        return handleError(error);
    }
}
// ==================== 产物处理器 ====================
async function handleUpdateTodoArtifact(args) {
    try {
        const params = tools_ts_1.UpdateTodoArtifactSchema.parse(args);
        const todo = await api_ts_1.api.todos.update(params.todoId, { artifact: params.artifact });
        return {
            content: [{ type: "text", text: `✅ 任务产物已更新\n\n${formatTodo(todo)}` }],
        };
    }
    catch (error) {
        return handleError(error);
    }
}
async function handleUpdateSubTaskArtifact(args) {
    try {
        const params = tools_ts_1.UpdateSubTaskArtifactSchema.parse(args);
        const subTask = await api_ts_1.api.subTasks.update(params.subTaskId, { artifact: params.artifact });
        return {
            content: [{ type: "text", text: `✅ 子任务产物已更新\n${formatSubTask(subTask)}` }],
        };
    }
    catch (error) {
        return handleError(error);
    }
}
// ==================== 统计处理器 ====================
async function handleGetStats() {
    try {
        const [todos, tags] = await Promise.all([
            api_ts_1.api.todos.getAll(),
            api_ts_1.api.tags.getAll(),
        ]);
        const total = todos.length;
        const completed = todos.filter(t => t.completed).length;
        const active = total - completed;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        // 计算子任务统计
        let totalSubTasks = 0;
        let completedSubTasks = 0;
        for (const todo of todos) {
            const subTasks = await api_ts_1.api.subTasks.getByTodoId(todo.id);
            totalSubTasks += subTasks.length;
            completedSubTasks += subTasks.filter(st => st.completed).length;
        }
        const lines = [
            "📊 TodoList 统计\n",
            `总任务数: ${total}`,
            `已完成: ${completed} (${completionRate}%)`,
            `进行中: ${active}`,
            `标签数: ${tags.length}`,
            ``,
            `子任务: ${completedSubTasks}/${totalSubTasks} 完成`,
        ];
        return { content: [{ type: "text", text: lines.join("\n") }] };
    }
    catch (error) {
        return handleError(error);
    }
}
// ==================== 处理器映射 ====================
exports.toolHandlers = {
    [tools_ts_1.ToolName.GET_TODOS]: handleGetTodos,
    [tools_ts_1.ToolName.CREATE_TODO]: handleCreateTodo,
    [tools_ts_1.ToolName.UPDATE_TODO]: handleUpdateTodo,
    [tools_ts_1.ToolName.DELETE_TODO]: handleDeleteTodo,
    [tools_ts_1.ToolName.TOGGLE_TODO]: handleToggleTodo,
    [tools_ts_1.ToolName.GET_TAGS]: handleGetTags,
    [tools_ts_1.ToolName.CREATE_TAG]: handleCreateTag,
    [tools_ts_1.ToolName.UPDATE_TAG]: handleUpdateTag,
    [tools_ts_1.ToolName.DELETE_TAG]: handleDeleteTag,
    [tools_ts_1.ToolName.GET_SUBTASKS]: handleGetSubTasks,
    [tools_ts_1.ToolName.CREATE_SUBTASK]: handleCreateSubTask,
    [tools_ts_1.ToolName.UPDATE_SUBTASK]: handleUpdateSubTask,
    [tools_ts_1.ToolName.DELETE_SUBTASK]: handleDeleteSubTask,
    [tools_ts_1.ToolName.TOGGLE_SUBTASK]: handleToggleSubTask,
    [tools_ts_1.ToolName.UPDATE_TODO_ARTIFACT]: handleUpdateTodoArtifact,
    [tools_ts_1.ToolName.UPDATE_SUBTASK_ARTIFACT]: handleUpdateSubTaskArtifact,
    [tools_ts_1.ToolName.GET_STATS]: handleGetStats,
};
