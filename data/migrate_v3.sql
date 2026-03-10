-- V3 迁移：新增 todo_workspaces 关系表，删除 todos.workspace_path 字段

-- 1. 创建新的关系表：任务与工作区的关联
CREATE TABLE todo_workspaces (
  todo_id TEXT NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  PRIMARY KEY (todo_id, workspace_id)
);

-- 2. 将现有数据迁移到新关系表
-- 根据 workspace_path 查找对应的 workspace_id 并建立关系
INSERT OR IGNORE INTO todo_workspaces (todo_id, workspace_id)
SELECT 
  t.id,
  COALESCE(w.id, 'root') as workspace_id
FROM todos t
LEFT JOIN workspaces w ON t.workspace_path = w.path;

-- 3. 为根目录下的任务建立与 root 工作区的关系
INSERT OR IGNORE INTO todo_workspaces (todo_id, workspace_id)
SELECT 
  t.id,
  'root'
FROM todos t
WHERE t.workspace_path = '/' OR t.workspace_path IS NULL OR t.workspace_path = '';

-- 4. 创建索引
CREATE INDEX idx_todo_workspaces_todo ON todo_workspaces(todo_id);
CREATE INDEX idx_todo_workspaces_workspace ON todo_workspaces(workspace_id);

-- 5. 验证迁移结果（查询数量是否一致）
-- SELECT 
--   (SELECT COUNT(*) FROM todos) as total_todos,
--   (SELECT COUNT(*) FROM todo_workspaces) as total_relations;

-- 6. 删除旧的 workspace_path 字段（SQLite 不支持直接删除列，需要重建表）
-- 这一步在应用代码的 migrate 方法中处理
