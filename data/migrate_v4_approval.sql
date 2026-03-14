-- V4: 添加审批状态字段
-- 执行方式: sqlite3 todos.db < migrate_v4_approval.sql

BEGIN TRANSACTION;

-- 添加审批状态字段
ALTER TABLE todos ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'pending';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_todos_approval_status ON todos(approval_status);

-- 更新现有数据：已完成的任务默认为已审批
UPDATE todos SET approval_status = 'approved' WHERE status = 'completed' OR completed = 1;

COMMIT;
