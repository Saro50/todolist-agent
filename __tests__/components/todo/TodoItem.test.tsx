/**
 * TodoItem 组件测试
 */

import React from "react";
import { render, screen, waitFor } from "../../utils/testUtils";
import { TodoItem } from "@/app/components/todo/TodoItem";
import { createTodo, createTag } from "../../utils/testUtils";

describe("TodoItem", () => {
  const mockTodo = createTodo({
    id: "todo-1",
    text: "Buy milk",
    completed: false,
    tagIds: ["tag-1", "tag-2"],
  });

  const mockTags = [
    createTag({ id: "tag-1", name: "Shopping", color: "blue" }),
    createTag({ id: "tag-2", name: "Urgent", color: "rose" }),
  ];

  const defaultProps = {
    todo: mockTodo,
    tags: mockTags,
    onToggle: jest.fn(),
    onDelete: jest.fn(),
    onUpdateTags: jest.fn(),
    onCreateTag: jest.fn(),
    onTagClick: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders todo text", () => {
    render(<TodoItem {...defaultProps} />);
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
  });

  it("renders associated tags", () => {
    render(<TodoItem {...defaultProps} />);
    expect(screen.getByText("Shopping")).toBeInTheDocument();
    expect(screen.getByText("Urgent")).toBeInTheDocument();
  });

  it("calls onToggle when checkbox is clicked", async () => {
    const onToggle = jest.fn();
    const { user } = render(<TodoItem {...defaultProps} onToggle={onToggle} />);

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith("todo-1");
  });

  it("calls onDelete when delete button is clicked", async () => {
    const onDelete = jest.fn();
    const { user } = render(<TodoItem {...defaultProps} onDelete={onDelete} />);

    // 悬停显示删除按钮
    const deleteButton = screen.getByLabelText("删除任务");
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith("todo-1");
  });

  it("applies strikethrough when completed", () => {
    const completedTodo = { ...mockTodo, completed: true };
    render(<TodoItem {...defaultProps} todo={completedTodo} />);

    const text = screen.getByText("Buy milk");
    expect(text).toHaveClass("line-through");
  });

  it("calls onTagClick when tag is clicked", async () => {
    const onTagClick = jest.fn();
    const { user } = render(<TodoItem {...defaultProps} onTagClick={onTagClick} />);

    await user.click(screen.getByText("Shopping"));

    expect(onTagClick).toHaveBeenCalledWith("tag-1");
  });

  it("opens tag editor when tag button is clicked", async () => {
    const { user } = render(<TodoItem {...defaultProps} />);

    const tagButton = screen.getByLabelText("编辑标签");
    await user.click(tagButton);

    // 检查编辑器是否打开 - 使用更灵活的匹配
    await waitFor(() => {
      expect(screen.getByText(/新建标签|可选标签/)).toBeInTheDocument();
    });
  });

  it("does not show tags section when todo has no tags", () => {
    const todoWithoutTags = { ...mockTodo, tagIds: [] };
    render(<TodoItem {...defaultProps} todo={todoWithoutTags} />);

    expect(screen.queryByText("Shopping")).not.toBeInTheDocument();
  });

  it("only shows tags that exist in tags prop", () => {
    const todoWithUnknownTag = { ...mockTodo, tagIds: ["tag-1", "unknown-tag"] };
    render(<TodoItem {...defaultProps} todo={todoWithUnknownTag} />);

    expect(screen.getByText("Shopping")).toBeInTheDocument();
    expect(screen.queryByText("unknown-tag")).not.toBeInTheDocument();
  });
});
