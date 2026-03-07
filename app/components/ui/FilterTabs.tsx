import { cn } from "@/lib/utils";

type FilterValue = string;

interface FilterOption<T extends FilterValue> {
  key: T;
  label: string;
  count?: number;
}

interface FilterTabsProps<T extends FilterValue> {
  options: FilterOption<T>[];
  activeKey: T;
  onChange: (key: T) => void;
  className?: string;
}

/**
 * 筛选标签组件
 * 通用的标签切换组件，支持显示数量徽标
 */
export function FilterTabs<T extends FilterValue>({
  options,
  activeKey,
  onChange,
  className,
}: FilterTabsProps<T>) {
  return (
    <div
      className={cn(
        "flex gap-2 p-1 bg-gray-100 rounded-xl",
        className
      )}
    >
      {options.map(({ key, label, count }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={cn(
            "flex-1 px-4 py-2 text-sm font-medium rounded-lg",
            "transition-all duration-300",
            activeKey === key
              ? "bg-white text-emerald-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          {label}
          {count !== undefined && (
            <span
              className={cn(
                "ml-2 text-xs px-2 py-0.5 rounded-full",
                activeKey === key
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-gray-200 text-gray-500"
              )}
            >
              {count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
