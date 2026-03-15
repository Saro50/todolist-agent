/**
 * TodoItem 组件测试
 */

import React from "react";
import { render, screen, waitFor } from "../../utils/testUtils";
import { TodoItem } from "@/app/components/todo/TodoItem";
import { createTodo, createTag, createSubTask } from "../../utils/testUtils";

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

  const mockSubTasks = [
    createSubTask({ id: "subtask-1", parentId: "todo-1", text: "SubTask 1" }),
  ];

  // 更新后的默认 props，包含所有必需属性
  const defaultProps = {
    todo: mockTodo,
    tags: mockTags,
    subTasks: mockSubTasks,
    isSubTasksLoaded: true,
    onDelete: jest.fn(),
    onUpdateTags: jest.fn(),
    onCreateTag: jest.fn(),
    onTagClick: jest.fn(),
    onUpdateStatus: jest.fn().mockResolvedValue(undefined),
    onLoadSubTasks: jest.fn().mockResolvedValue(undefined),
    onAddSubTask: jest.fn().mockResolvedValue(undefined),
    onToggleSubTask: jest.fn().mockResolvedValue(undefined),
    onDeleteSubTask: jest.fn().mockResolvedValue(undefined),
    onUpdateSubTask: jest.fn().mockResolvedValue(undefined),
    onUpdateSubTaskArtifact: jest.fn().mockResolvedValue(undefined),
    onApproveSubTask: jest.fn().mockResolvedValue(undefined),
    onUpdateArtifact: jest.fn().mockResolvedValue(undefined),
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

  it("calls onDelete when delete button is clicked", async () => {
    const onDelete = jest.fn();
    const { user } = render(<TodoItem {...defaultProps} onDelete={onDelete} />);

    // 先点击 "更多操作" 按钮打开菜单
    const moreButton = screen.getByTitle("更多操作");
    await user.click(moreButton);

    // 然后点击 "删除任务"
    const deleteButton = screen.getByText("删除任务");
    await user.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith("todo-1");
  });

  it("applies gray color when completed", () => {
    const completedTodo = { ...mockTodo, completed: true };
    render(<TodoItem {...defaultProps} todo={completedTodo} />);

    const text = screen.getByText("Buy milk");
    expect(text).toHaveClass("text-gray-400");
  });

  it("calls onTagClick when tag is clicked", async () => {
    const onTagClick = jest.fn();
    const { user } = render(<TodoItem {...defaultProps} onTagClick={onTagClick} />);

    await user.click(screen.getByText("Shopping"));

    expect(onTagClick).toHaveBeenCalledWith("tag-1");
  });

  it("opens tag editor when tag button is clicked", async () => {
    const { user } = render(<TodoItem {...defaultProps} />);

    // 先点击 "更多操作" 按钮打开菜单
    const moreButton = screen.getByTitle("更多操作");
    await user.click(moreButton);

    // 然后点击 "编辑标签"
    const tagButton = screen.getByText("编辑标签");
    await user.click(tagButton);

    // 检查编辑器是否打开
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

  it("displays subtask count", () => {
    render(<TodoItem {...defaultProps} />);
    // 子任务数量显示
    expect(screen.getByText(/子任务/)).toBeInTheDocument();
  });

  it("calls onUpdateStatus when status is changed", async () => {
    const onUpdateStatus = jest.fn().mockResolvedValue(undefined);
    const { user } = render(<TodoItem {...defaultProps} onUpdateStatus={onUpdateStatus} />);

    const statusSelect = screen.getByRole("combobox");
    await user.selectOptions(statusSelect, "completed");

    expect(onUpdateStatus).toHaveBeenCalledWith("todo-1", "completed");
  });
});
