/**
 * API Client 测试
 */

import { api } from "@/lib/api/client";
import {
  mockFetchResponse,
  mockFetchError,
  mockFetchNetworkError,
} from "../utils/testUtils";
import { createTodo, createTag } from "../utils/testUtils";

describe("API Client", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  describe("todoApi", () => {
    describe("getAll", () => {
      it("should fetch all todos", async () => {
        const mockTodos = [createTodo({ text: "Todo 1" }), createTodo({ text: "Todo 2" })];
        // API 现在返回分页结构
        mockFetchResponse({
          data: mockTodos,
          total: 2,
          page: 1,
          pageSize: 20,
          totalPages: 1,
        });

        const result = await api.todos.getAll();

        expect(global.fetch).toHaveBeenCalledWith("/api/todos", expect.any(Object));
        expect(result).toEqual(mockTodos);
      });

      it("should throw error on failure", async () => {
        mockFetchError(500, "Server error");

        await expect(api.todos.getAll()).rejects.toThrow("Server error");
      });
    });

    describe("getById", () => {
      it("should fetch todo by id", async () => {
        const mockTodo = createTodo({ id: "123", text: "Test" });
        mockFetchResponse(mockTodo);

        const result = await api.todos.getById("123");

        expect(global.fetch).toHaveBeenCalledWith("/api/todos/123", expect.any(Object));
        expect(result).toEqual(mockTodo);
      });
    });

    describe("create", () => {
      it("should create a new todo", async () => {
        const newTodo = createTodo({ text: "New Todo", tagIds: ["tag-1"] });
        mockFetchResponse(newTodo);

        const result = await api.todos.create({
          text: "New Todo",
          tagIds: ["tag-1"],
        });

        expect(global.fetch).toHaveBeenCalledWith(
          "/api/todos",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ text: "New Todo", tagIds: ["tag-1"] }),
          })
        );
        expect(result).toEqual(newTodo);
      });
    });

    describe("update", () => {
      it("should update todo", async () => {
        const updatedTodo = createTodo({ id: "123", text: "Updated", completed: true });
        mockFetchResponse(updatedTodo);

        const result = await api.todos.update("123", { completed: true });

        expect(global.fetch).toHaveBeenCalledWith(
          "/api/todos/123",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ completed: true }),
          })
        );
        expect(result).toEqual(updatedTodo);
      });
    });

    describe("delete", () => {
      it("should delete todo", async () => {
        mockFetchResponse({ success: true });

        await api.todos.delete("123");

        expect(global.fetch).toHaveBeenCalledWith(
          "/api/todos/123",
          expect.objectContaining({
            method: "DELETE",
          })
        );
      });
    });
  });

  describe("tagApi", () => {
    describe("getAll", () => {
      it("should fetch all tags", async () => {
        const mockTags = [createTag({ name: "Work" }), createTag({ name: "Personal" })];
        mockFetchResponse(mockTags);

        const result = await api.tags.getAll();

        expect(global.fetch).toHaveBeenCalledWith("/api/tags", expect.any(Object));
        expect(result).toEqual(mockTags);
      });
    });

    describe("create", () => {
      it("should create a new tag", async () => {
        const newTag = createTag({ name: "New Tag", color: "blue" });
        mockFetchResponse(newTag);

        const result = await api.tags.create({ name: "New Tag", color: "blue" });

        expect(global.fetch).toHaveBeenCalledWith(
          "/api/tags",
          expect.objectContaining({
            method: "POST",
            body: JSON.stringify({ name: "New Tag", color: "blue" }),
          })
        );
        expect(result).toEqual(newTag);
      });
    });

    describe("update", () => {
      it("should update tag", async () => {
        const updatedTag = createTag({ id: "123", name: "Updated", color: "red" });
        mockFetchResponse(updatedTag);

        const result = await api.tags.update("123", { color: "red" });

        expect(global.fetch).toHaveBeenCalledWith(
          "/api/tags/123",
          expect.objectContaining({
            method: "PATCH",
            body: JSON.stringify({ color: "red" }),
          })
        );
        expect(result).toEqual(updatedTag);
      });
    });

    describe("delete", () => {
      it("should delete tag", async () => {
        mockFetchResponse({ success: true });

        await api.tags.delete("123");

        expect(global.fetch).toHaveBeenCalledWith(
          "/api/tags/123",
          expect.objectContaining({
            method: "DELETE",
          })
        );
      });
    });
  });

  describe("error handling", () => {
    it("should handle network errors", async () => {
      mockFetchNetworkError("Network error");

      await expect(api.todos.getAll()).rejects.toThrow("Network error");
    });

    it("should handle 404 errors", async () => {
      mockFetchError(404, "Not found");

      await expect(api.todos.getById("non-existent")).rejects.toThrow("Not found");
    });

    it("should handle unknown errors", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({}),
      });

      await expect(api.todos.getAll()).rejects.toThrow("Request failed");
    });
  });
});
