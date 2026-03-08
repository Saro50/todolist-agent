import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "secondary" | "destructive" | "outline";
  className?: string;
}

export function Badge({ 
  children, 
  variant = "default",
  className 
}: BadgeProps) {
  const variants = {
    default: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    primary: "bg-blue-100 text-blue-800 hover:bg-blue-200",
    secondary: "bg-purple-100 text-purple-800 hover:bg-purple-200",
    destructive: "bg-rose-100 text-rose-800 hover:bg-rose-200",
    outline: "border border-gray-200 text-gray-800 hover:bg-gray-50",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-colors",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export default Badge;
