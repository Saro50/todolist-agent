/**
 * Tag 组件测试
 */

import React from "react";
import { render, screen } from "../../utils/testUtils";
import { Tag } from "@/app/components/ui/Tag";
import { TAG_COLORS } from "@/app/types";

describe("Tag", () => {
  it("renders tag name", () => {
    render(<Tag name="Work" color="blue" />);
    expect(screen.getByText("Work")).toBeInTheDocument();
  });

  it("applies correct color styles", () => {
    const { rerender } = render(<Tag name="Work" color="blue" />);
    expect(screen.getByText("Work")).toHaveClass("bg-blue-100", "text-blue-600");

    rerender(<Tag name="Urgent" color="rose" />);
    expect(screen.getByText("Urgent")).toHaveClass("bg-rose-100", "text-rose-600");

    rerender(<Tag name="Done" color="emerald" />);
    expect(screen.getByText("Done")).toHaveClass("bg-emerald-100", "text-emerald-600");
  });

  it("calls onClick when clicked and clickable", async () => {
    const handleClick = jest.fn();
    const { user } = render(
      <Tag name="Clickable" color="blue" clickable onClick={handleClick} />
    );

    await user.click(screen.getByText("Clickable"));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("does not have cursor-pointer when not clickable", () => {
    const handleClick = jest.fn();
    const { rerender } = render(
      <Tag name="Not Clickable" color="blue" onClick={handleClick} />
    );

    // 验证没有 clickable 类
    expect(screen.getByText("Not Clickable")).not.toHaveClass("cursor-pointer");
    
    // 重新渲染为 clickable
    rerender(<Tag name="Clickable" color="blue" clickable onClick={handleClick} />);
    expect(screen.getByText("Clickable")).toHaveClass("cursor-pointer");
  });

  it("shows remove button when removable", () => {
    const handleRemove = jest.fn();
    render(<Tag name="Removable" color="blue" removable onRemove={handleRemove} />);

    expect(screen.getByLabelText("移除标签 Removable")).toBeInTheDocument();
  });

  it("calls onRemove when remove button clicked", async () => {
    const handleRemove = jest.fn();
    const { user } = render(
      <Tag name="Removable" color="blue" removable onRemove={handleRemove} />
    );

    const removeButton = screen.getByLabelText("移除标签 Removable");
    await user.click(removeButton);

    expect(handleRemove).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onClick when clicking remove button", async () => {
    const handleClick = jest.fn();
    const handleRemove = jest.fn();
    const { user } = render(
      <Tag
        name="Both"
        color="blue"
        clickable
        onClick={handleClick}
        removable
        onRemove={handleRemove}
      />
    );

    const removeButton = screen.getByLabelText("移除标签 Both");
    await user.click(removeButton);

    expect(handleRemove).toHaveBeenCalledTimes(1);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("applies custom className", () => {
    render(<Tag name="Styled" color="blue" className="custom-class" />);
    expect(screen.getByText("Styled")).toHaveClass("custom-class");
  });
});
