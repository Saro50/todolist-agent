"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Todo, Workspace } from "@/app/types";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import { Button } from "@/app/components/ui/Button";
import { Card } from "@/app/components/ui/Card";
import { Badge } from "@/app/components/ui/Badge";
import { 
  Activity, 
  RefreshCw, 
  Bell, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Zap
} from "lucide-react";

interface TodoMonitorProps {
  currentWorkspace: Workspace;
  onRefresh: () => Promise<void>;
  className?: string;
}

interface MonitorState {
  lastCheckTime: Date | null;
  lastTodoCount: number;
  lastTodoIds: Set<string>;
  newTodos: Todo[];
  updatedTodos: Todo[];
  isChecking: boolean;
  isAutoRefresh: boolean;
  error: string | null;
}

// 检测任务变化的类型
interface ChangeDetection {
  hasNew: boolean;
  hasUpdates: boolean;
  newTodos: Todo[];
  updatedTodos: Todo[];
}

/**
 * Todo 任务监控组件
 * 定时轮询检测新任务和任务更新
 */
export function TodoMonitor({ 
  currentWorkspace, 
  onRefresh,
  className 
}: TodoMonitorProps) {
  const [state, setState] = useState<MonitorState>({
    lastCheckTime: null,
    lastTodoCount: 0,
    lastTodoIds: new Set(),
    newTodos: [],
    updatedTodos: [],
    isChecking: false,
    isAutoRefresh: false,
    error: null,
  });

  // 用于存储之前的任务数据以检测变化
  const previousTodosRef = useRef<Map<string, Todo>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 初始化音频（浏览器策略可能阻止自动播放）
  useEffect(() => {
    // 创建简单的提示音
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const createBeep = () => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gainNode.gain.value = 0.1;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.1);
    };
    
    // 将音频播放函数存储在 ref 中
    (audioRef as any).current = { play: createBeep };
  }, []);

  // 检测任务变化
  const detectChanges = useCallback((currentTodos: Todo[]): ChangeDetection => {
    const previousTodos = previousTodosRef.current;
    const newTodos: Todo[] = [];
    const updatedTodos: Todo[] = [];

    // 检测新任务和更新
    for (const todo of currentTodos) {
      const previous = previousTodos.get(todo.id);
      if (!previous) {
        // 新任务
        newTodos.push(todo);
      } else {
        // 检查是否有更新
        const hasChanged = 
          previous.text !== todo.text ||
          previous.completed !== todo.completed ||
          previous.status !== todo.status ||
          previous.tagIds.length !== todo.tagIds.length ||
          previous.artifact !== todo.artifact;
        
        if (hasChanged) {
          updatedTodos.push(todo);
        }
      }
    }

    // 更新参考数据
    previousTodosRef.current = new Map(currentTodos.map(t => [t.id, t]));

    return {
      hasNew: newTodos.length > 0,
      hasUpdates: updatedTodos.length > 0,
      newTodos,
      updatedTodos,
    };
  }, []);

  // 执行检查
  const checkForUpdates = useCallback(async (silent: boolean = false) => {
    if (state.isChecking) return;

    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      // 只获取第一页的任务用于比较（优化性能）
      const result = await api.todos.getAllPaginated(
        currentWorkspace.id,
        1,
        50 // 最多比较前50个任务
      );

      const changes = detectChanges(result.data);

      setState(prev => ({
        ...prev,
        lastCheckTime: new Date(),
        lastTodoCount: result.total,
        lastTodoIds: new Set(result.data.map(t => t.id)),
        newTodos: changes.newTodos,
        updatedTodos: changes.updatedTodos,
        isChecking: false,
      }));

      // 如果有变化且不是静默模式，播放提示音
      if ((changes.hasNew || changes.hasUpdates) && !silent && (audioRef as any).current) {
        try {
          (audioRef as any).current.play();
        } catch {
          // 忽略音频播放错误
        }
      }

      // 如果有新任务，自动刷新列表
      if (changes.hasNew && !silent) {
        await onRefresh();
      }

      return changes;
    } catch (err) {
      setState(prev => ({
        ...prev,
        isChecking: false,
        error: err instanceof Error ? err.message : "检查失败",
      }));
      return null;
    }
  }, [currentWorkspace.id, detectChanges, onRefresh, state.isChecking]);

  // 切换自动刷新
  const toggleAutoRefresh = useCallback(() => {
    setState(prev => {
      const newIsAutoRefresh = !prev.isAutoRefresh;
      
      if (newIsAutoRefresh) {
        // 启动定时器（每 10 秒检查一次）
        intervalRef.current = setInterval(() => {
          checkForUpdates(true); // 静默模式，不自动刷新列表
        }, 10000);
        
        // 立即执行一次检查
        checkForUpdates(true);
      } else {
        // 清除定时器
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
      
      return { ...prev, isAutoRefresh: newIsAutoRefresh };
    });
  }, [checkForUpdates]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 手动刷新按钮
  const handleManualCheck = useCallback(async () => {
    const changes = await checkForUpdates(false);
    if (changes?.hasNew || changes?.hasUpdates) {
      // 显示提示
      const message = [
        changes.hasNew && `发现 ${changes.newTodos.length} 个新任务`,
        changes.hasUpdates && `发现 ${changes.updatedTodos.length} 个更新`,
      ].filter(Boolean).join("，");
      
      // 可以在这里添加 toast 通知
      console.log(`[Monitor] ${message}`);
    }
  }, [checkForUpdates]);

  // 清除通知
  const clearNotifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      newTodos: [],
      updatedTodos: [],
    }));
  }, []);

  // 格式化时间
  const formatTime = (date: Date | null) => {
    if (!date) return "未检查";
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 5) return "刚刚";
    if (diff < 60) return `${diff}秒前`;
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  };

  const hasNotifications = state.newTodos.length > 0 || state.updatedTodos.length > 0;

  return (
    <Card className={cn("p-4 space-y-4", className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className={cn(
            "w-5 h-5",
            state.isAutoRefresh ? "text-emerald-500 animate-pulse" : "text-gray-400"
          )} />
          <h3 className="font-medium text-gray-800">任务监控</h3>
          {hasNotifications && (
            <Badge variant="destructive" className="animate-bounce">
              {state.newTodos.length + state.updatedTodos.length}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* 自动刷新开关 */}
          <Button
            variant={state.isAutoRefresh ? "primary" : "ghost"}
            size="sm"
            onClick={toggleAutoRefresh}
            className={cn(
              "text-xs",
              state.isAutoRefresh && "bg-emerald-500 hover:bg-emerald-600"
            )}
          >
            <Zap className="w-3.5 h-3.5 mr-1" />
            {state.isAutoRefresh ? "监控中" : "自动监控"}
          </Button>
          
          {/* 手动刷新 */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleManualCheck}
            disabled={state.isChecking}
            className="text-xs"
          >
            <RefreshCw className={cn(
              "w-3.5 h-3.5 mr-1",
              state.isChecking && "animate-spin"
            )} />
            检查
          </Button>
        </div>
      </div>

      {/* 状态信息 */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          上次检查: {formatTime(state.lastCheckTime)}
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          任务总数: {state.lastTodoCount}
        </div>
      </div>

      {/* 错误提示 */}
      {state.error && (
        <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-2 rounded">
          <AlertCircle className="w-4 h-4" />
          {state.error}
        </div>
      )}

      {/* 通知列表 */}
      {hasNotifications && (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {/* 新任务 */}
          {state.newTodos.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <Bell className="w-3.5 h-3.5" />
                  新任务 ({state.newTodos.length})
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearNotifications}
                  className="h-6 text-xs text-gray-400 hover:text-gray-600"
                >
                  清除
                </Button>
              </div>
              <div className="space-y-1">
                {state.newTodos.slice(0, 3).map(todo => (
                  <div 
                    key={todo.id} 
                    className="text-xs p-2 bg-emerald-50 rounded border border-emerald-100 truncate"
                  >
                    <span className="font-medium">{todo.text}</span>
                    <span className="text-gray-400 ml-1">
                      {new Date(todo.createdAt).toLocaleTimeString("zh-CN", { 
                        hour: "2-digit", 
                        minute: "2-digit" 
                      })}
                    </span>
                  </div>
                ))}
                {state.newTodos.length > 3 && (
                  <div className="text-xs text-gray-400 pl-2">
                    还有 {state.newTodos.length - 3} 个新任务...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 更新任务 */}
          {state.updatedTodos.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                <RefreshCw className="w-3.5 h-3.5" />
                任务更新 ({state.updatedTodos.length})
              </div>
              <div className="space-y-1">
                {state.updatedTodos.slice(0, 3).map(todo => (
                  <div 
                    key={todo.id} 
                    className="text-xs p-2 bg-amber-50 rounded border border-amber-100 truncate"
                  >
                    <span className="font-medium">{todo.text}</span>
                    <span className="text-gray-400 ml-1">
                      状态: {todo.status === "completed" ? "已完成" : 
                            todo.status === "in_progress" ? "处理中" : "待处理"}
                    </span>
                  </div>
                ))}
                {state.updatedTodos.length > 3 && (
                  <div className="text-xs text-gray-400 pl-2">
                    还有 {state.updatedTodos.length - 3} 个更新...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 空状态 */}
      {!hasNotifications && state.lastCheckTime && (
        <div className="text-center py-4 text-xs text-gray-400">
          <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          暂无新动态
        </div>
      )}

      {/* 首次使用提示 */}
      {!state.lastCheckTime && (
        <div className="text-center py-4 text-xs text-gray-400">
          <Activity className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          点击"检查"或开启"自动监控"开始监控任务变化
        </div>
      )}
    </Card>
  );
}

export default TodoMonitor;
