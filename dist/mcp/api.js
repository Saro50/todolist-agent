"use strict";
/**
 * MCP API 客户端
 *
 * 复用 lib/api/client 的逻辑，但支持配置基础 URL
 * 用于 MCP 服务器与后端通信
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = exports.subTaskApi = exports.tagApi = exports.todoApi = void 0;
// MCP 服务配置 - 使用 4000 端口
const MCP_API_PORT = process.env.MCP_API_PORT || "4000";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || `http://localhost:${MCP_API_PORT}`;
class ApiError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
        this.name = "ApiError";
    }
}
async function fetchJson(url, options) {
    const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;
    const response = await fetch(fullUrl, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options?.headers || {}),
        },
    });
    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new ApiError(response.status, error.error || "Request failed");
    }
    return response.json();
}
// ==================== Todo API ====================
exports.todoApi = {
    getAll() {
        return fetchJson(`/api/todos`);
    },
    getById(id) {
        return fetchJson(`/api/todos/${id}`);
    },
    getByTag(tagId) {
        return fetchJson(`/api/todos?tag=${tagId}`);
    },
    getByStatus(completed) {
        return fetchJson(`/api/todos?completed=${completed}`);
    },
    create(data) {
        return fetchJson(`/api/todos`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },
    update(id, data) {
        return fetchJson(`/api/todos/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },
    delete(id) {
        return fetchJson(`/api/todos/${id}`, {
            method: "DELETE",
        });
    },
};
// ==================== Tag API ====================
exports.tagApi = {
    getAll() {
        return fetchJson(`/api/tags`);
    },
    getById(id) {
        return fetchJson(`/api/tags/${id}`);
    },
    create(data) {
        return fetchJson(`/api/tags`, {
            method: "POST",
            body: JSON.stringify(data),
        });
    },
    update(id, data) {
        return fetchJson(`/api/tags/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },
    delete(id) {
        return fetchJson(`/api/tags/${id}`, {
            method: "DELETE",
        });
    },
};
// ==================== SubTask API ====================
exports.subTaskApi = {
    getByTodoId(todoId) {
        return fetchJson(`/api/todos/${todoId}/subtasks`);
    },
    getById(id) {
        return fetchJson(`/api/subtasks/${id}`);
    },
    create(todoId, text) {
        return fetchJson(`/api/todos/${todoId}/subtasks`, {
            method: "POST",
            body: JSON.stringify({ text }),
        });
    },
    update(id, data) {
        return fetchJson(`/api/subtasks/${id}`, {
            method: "PATCH",
            body: JSON.stringify(data),
        });
    },
    delete(id) {
        return fetchJson(`/api/subtasks/${id}`, {
            method: "DELETE",
        });
    },
};
// ==================== 统一导出 ====================
exports.api = {
    todos: exports.todoApi,
    tags: exports.tagApi,
    subTasks: exports.subTaskApi,
};
exports.default = exports.api;
