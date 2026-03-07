# 代码规范指南

## 1. 组件设计原则

### 1.1 原子化设计 (Atomic Design)
遵循从简单到复杂的组件层级结构：

```
Atoms（原子）→ Molecules（分子）→ Organisms（有机体）→ Templates（模板）→ Pages（页面）
```

- **Atoms**: 最小不可分割的 UI 元素（Button, Input, Icon）
- **Molecules**: 多个原子组合的功能单元（SearchBar, TodoItem）
- **Organisms**: 独立的功能区块（TodoList, Header）
- **Templates**: 页面布局框架
- **Pages**: 完整页面

### 1.2 单一职责原则 (SRP)
每个组件只负责一个功能，避免组件过于臃肿：

```typescript
// ✅ 好的做法：职责单一
function TodoItem({ todo, onToggle, onDelete }: TodoItemProps) {
  return (
    <div>
      <Checkbox checked={todo.completed} onChange={onToggle} />
      <Text>{todo.text}</Text>
      <DeleteButton onClick={onDelete} />
    </div>
  );
}

// ❌ 避免：组件承担过多职责
function TodoItem({ todo }) {
  // 不要在这里处理状态管理、API 调用、路由跳转等
  // 不要内联复杂的筛选逻辑
}
```

## 2. 组件复用原则

### 2.1 优先使用通用组件

在创建新组件前，先检查是否已有类似组件可以复用或扩展：

```typescript
// ✅ 复用通用 Button 组件
<Button variant="primary" size="sm" onClick={handleClick}>
  添加
</Button>

// ✅ 复用通用 Input 组件
<Input 
  placeholder="搜索任务" 
  value={searchTerm} 
  onChange={setSearchTerm}
  icon={<SearchIcon />}
/>
```

### 2.2 Props 设计原则

组件的 props 应该：
- **最小化必需 props**：减少使用者的负担
- **合理的默认值**：大部分场景无需配置
- **支持扩展**：使用 `...rest` 或 HTML 原生属性

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";  // 可选，有默认值
  size?: "sm" | "md" | "lg";                     // 可选，有默认值
  loading?: boolean;                              // 可选
  icon?: React.ReactNode;                         // 可选
}

function Button({ 
  variant = "primary", 
  size = "md", 
  loading = false,
  icon,
  children,
  className,
  disabled,
  ...rest  // 透传原生 button 属性
}: ButtonProps) {
  return (
    <button 
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner />}
      {icon}
      {children}
    </button>
  );
}
```

### 2.3 可组合组件模式

使用复合组件模式提高灵活性：

```typescript
// Card.tsx - 可组合的基础组件
const Card = ({ children, className }: CardProps) => (
  <div className={cn("rounded-2xl bg-white shadow-sm", className)}>
    {children}
  </div>
);

Card.Header = ({ children }) => (
  <div className="p-4 border-b border-gray-100">{children}</div>
);

Card.Body = ({ children }) => (
  <div className="p-4">{children}</div>
);

// 使用示例
<Card>
  <Card.Header>
    <h3>任务列表</h3>
  </Card.Header>
  <Card.Body>
    <TodoList />
  </Card.Body>
</Card>
```

## 3. 目录结构规范

```
app/
├── components/           # 可复用的 UI 组件
│   ├── ui/              # 基础 UI 组件（原子级）
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Checkbox.tsx
│   │   └── Card.tsx
│   ├── common/          # 通用业务组件（分子级）
│   │   ├── EmptyState.tsx
│   │   ├── FilterTabs.tsx
│   │   └── ConfirmDialog.tsx
│   ├── todo/            # 领域专用组件（有机体级）
│   │   ├── TodoItem.tsx
│   │   ├── TodoList.tsx
│   │   ├── TodoInput.tsx
│   │   └── TodoFilter.tsx
│   └── providers/       # Context Providers
├── hooks/               # 自定义 Hooks
│   ├── useLocalStorage.ts
│   └── useTodoFilter.ts
├── lib/                 # 工具函数
│   ├── utils.ts         # cn 等通用工具
│   └── constants.ts     # 常量定义
├── types/               # TypeScript 类型
│   └── index.ts
└── page.tsx
```

## 4. 命名规范

### 4.1 文件命名
- **组件文件**: PascalCase（如 `TodoItem.tsx`）
- **工具文件**: camelCase（如 `useLocalStorage.ts`）
- **常量文件**: UPPER_SNAKE_CASE 导出

### 4.2 组件命名
- 使用 PascalCase
- 使用完整、描述性的名称
- 避免无意义的缩写

```typescript
// ✅ 好的命名
function UserProfileCard() {}
function TodoListItem() {}
function SearchInput() {}

// ❌ 避免
function TLI() {}           // 缩写不清晰
function Comp1() {}         // 无意义
function myComponent() {}   // 小写开头
```

### 4.3 Props 命名
- 使用 camelCase
- 事件处理器以 `on` 开头（如 `onClick`, `onSubmit`）
- boolean 属性使用正面语义（如 `isOpen` 而非 `isClosed`）

## 5. TypeScript 规范

### 5.1 类型定义
```typescript
// ✅ 优先使用 interface 定义对象类型
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ 使用 type 定义联合类型或工具类型
type Status = "pending" | "loading" | "success" | "error";
type Nullable<T> = T | null;

// ✅ 组件 Props 使用 interface
interface ButtonProps {
  variant?: "primary" | "secondary";
  onClick?: () => void;
}
```

### 5.2 泛型使用
```typescript
// ✅ 泛型组件示例
interface ListProps<T> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor: (item: T) => string;
}

function List<T>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={keyExtractor(item)}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

// 使用
<List<Todo>
  items={todos}
  renderItem={(todo) => <TodoItem todo={todo} />}
  keyExtractor={(todo) => todo.id}
/>
```

## 6. Tailwind CSS 规范

### 6.1 类名排序
使用一致的类名顺序提高可读性：

```html
<!-- 布局 → 间距 → 尺寸 → 外观 → 交互 → 状态 -->
<div class="
  flex items-center justify-between   <!-- 布局 -->
  p-4 gap-2                           <!-- 间距 -->
  w-full h-12                         <!-- 尺寸 -->
  bg-white rounded-lg shadow-sm       <!-- 外观 -->
  transition-all duration-200         <!-- 交互 -->
  hover:shadow-md                     <!-- 状态 -->
">
```

### 6.2 使用 cn 工具合并类名
```typescript
import { cn } from "@/lib/utils";

function Button({ className, variant, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        // 基础样式
        "inline-flex items-center justify-center rounded-lg px-4 py-2",
        // 变体样式
        variant === "primary" && "bg-emerald-500 text-white hover:bg-emerald-600",
        variant === "secondary" && "bg-gray-100 text-gray-700 hover:bg-gray-200",
        // 外部传入的类名（可以覆盖）
        className
      )}
      {...props}
    />
  );
}
```

### 6.3 提取可复用的样式变体
```typescript
// lib/variants.ts
import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-lg font-medium transition-colors",
  {
    variants: {
      variant: {
        primary: "bg-emerald-500 text-white hover:bg-emerald-600",
        secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
        ghost: "hover:bg-gray-100",
        danger: "bg-rose-500 text-white hover:bg-rose-600",
      },
      size: {
        sm: "px-3 py-1.5 text-sm",
        md: "px-4 py-2 text-base",
        lg: "px-6 py-3 text-lg",
        icon: "p-2",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);
```

## 7. 性能优化规范

### 7.1 使用 React.memo 避免不必要重渲染
```typescript
import { memo } from "react";

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
}

// 纯展示组件使用 memo
const TodoItem = memo(function TodoItem({ todo, onToggle }: TodoItemProps) {
  return (
    <div onClick={() => onToggle(todo.id)}>
      {todo.text}
    </div>
  );
});
```

### 7.2 使用 useMemo 和 useCallback
```typescript
import { useMemo, useCallback } from "react";

function TodoList({ todos, filter }: TodoListProps) {
  // 缓存计算结果
  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (filter === "active") return !todo.completed;
      if (filter === "completed") return todo.completed;
      return true;
    });
  }, [todos, filter]);

  // 缓存回调函数
  const handleToggle = useCallback((id: string) => {
    // 处理切换逻辑
  }, []);

  return (
    <ul>
      {filteredTodos.map((todo) => (
        <TodoItem 
          key={todo.id} 
          todo={todo} 
          onToggle={handleToggle}  // 稳定的引用
        />
      ))}
    </ul>
  );
}
```

## 8. 重构示例

### 场景：多个地方使用类似的卡片

**重构前**（重复代码）：
```typescript
// TodoItem.tsx
<div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
  ...
</div>

// NoteCard.tsx  
<div className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
  ...
</div>
```

**重构后**（提取通用组件）：
```typescript
// components/ui/Card.tsx
interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return (
    <div className={cn(
      "bg-white rounded-xl shadow-sm border border-gray-100",
      className
    )}>
      {children}
    </div>
  );
}

// 使用
<Card className="p-4">...</Card>
<Card className="p-6 hover:shadow-md transition-shadow">...</Card>
```

## 9. 代码审查清单

在提交代码前，请检查：

- [ ] 是否遵循了单一职责原则？
- [ ] 是否有可复用的组件被重复实现了？
- [ ] Props 接口是否清晰、完整？
- [ ] 是否使用了 TypeScript 严格类型？
- [ ] 类名是否使用了 `cn` 工具合并？
- [ ] 是否有不必要的重渲染需要优化？
- [ ] 组件是否自文档化（命名清晰、结构清晰）？
- [ ] 是否处理了 loading、error、empty 等边界状态？

---

**记住：好的代码是写给别人看的，顺便能在机器上运行。**
