#!/bin/bash
# TaskBoard Agent 启动脚本
# 连接到已运行的 TaskBoard MCP 服务 (http://localhost:4001/mcp)

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 从 .env.local 读取环境变量
if [ -f "$PROJECT_DIR/.env.local" ]; then
    export $(grep -v '^#' "$PROJECT_DIR/.env.local" | xargs)
fi

# 应用 nvm 环境
if [ -n "$CLAUDE_ENV" ]; then
    echo "🔄 切换到 Node $CLAUDE_ENV 环境..."
    source ~/.nvm/nvm.sh
    nvm use "$CLAUDE_ENV"
fi

# 创建临时 MCP 配置 (HTTP 传输格式)
CONFIG_FILE=$(mktemp)
echo "$MCP_CONFIG" > "$CONFIG_FILE"
trap "rm -f $CONFIG_FILE" EXIT

# 启动 Claude CLI
# --allowedTools: 授权 MCP 工具
claude \
    --append-system-prompt-file "$PROJECT_DIR/mcp/PROMPT.md" \
    --allowedTools "mcp__kanAI__*" \
    -p "介绍你能做什么，查询当前工作目录对应的看板任务"
