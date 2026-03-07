import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

/**
 * 通用卡片组件
 * @example
 * <Card className="p-4">
 *   <Card.Header>标题</Card.Header>
 *   <Card.Body>内容</Card.Body>
 * </Card>
 */
export function Card({ children, className }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl shadow-sm border border-gray-100",
        className
      )}
    >
      {children}
    </div>
  );
}

interface CardSectionProps {
  children: ReactNode;
  className?: string;
}

Card.Header = function CardHeader({ children, className }: CardSectionProps) {
  return (
    <div className={cn("px-6 py-4 border-b border-gray-100", className)}>
      {children}
    </div>
  );
};

Card.Body = function CardBody({ children, className }: CardSectionProps) {
  return <div className={cn("p-6", className)}>{children}</div>;
};

Card.Footer = function CardFooter({ children, className }: CardSectionProps) {
  return (
    <div
      className={cn(
        "px-6 py-4 border-t border-gray-100 flex items-center justify-between",
        className
      )}
    >
      {children}
    </div>
  );
};
