#!/usr/bin/env node
/**
 * 开发启动脚本
 * 
 * 同时启动：
 * - Web 服务 (Next.js) on port 4000
 * - MCP 服务 on port 4001 (HTTP/SSE mode)
 */

const { spawn } = require('child_process');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(service, message, color = 'reset') {
  const timestamp = new Date().toLocaleTimeString();
  const prefix = `${colors.bright}[${timestamp}]${colors.reset} ${colors[color]}[${service}]${colors.reset}`;
  console.log(`${prefix} ${message}`);
}

// 环境变量
const env = {
  ...process.env,
  PORT: '4000',
  MCP_PORT: '4001',
  MCP_API_PORT: '4000',
  NEXT_PUBLIC_API_URL: 'http://localhost:4000',
};

// 启动 Web 服务
function startWeb() {
  log('WEB', '启动 Next.js 服务 (端口: 4000)...', 'blue');
  
  const web = spawn('npm', ['run', 'dev:web'], {
    cwd: process.cwd(),
    env,
    stdio: 'pipe',
    shell: true,
  });

  web.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.includes('Ready') || line.includes('✓') || line.includes('Local:')) {
        log('WEB', line, 'green');
      } else if (line.includes('error') || line.includes('Error')) {
        log('WEB', line, 'red');
      } else {
        log('WEB', line, 'blue');
      }
    }
  });

  web.stderr.on('data', (data) => {
    log('WEB', data.toString().trim(), 'red');
  });

  web.on('close', (code) => {
    log('WEB', `服务退出 (代码: ${code})`, code === 0 ? 'green' : 'red');
    process.exit(code);
  });

  return web;
}

// 启动 MCP HTTP 服务
function startMCP() {
  log('MCP', '启动 MCP HTTP 服务 (端口: 4001)...', 'magenta');
  
  const mcp = spawn('npm', ['run', 'dev:mcp'], {
    cwd: process.cwd(),
    env,
    stdio: 'pipe',
    shell: true,
  });

  mcp.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    for (const line of lines) {
      if (line.includes('✅') || line.includes('已启动') || line.includes('已连接')) {
        log('MCP', line, 'green');
      } else if (line.includes('error') || line.includes('Error') || line.includes('❌')) {
        log('MCP', line, 'red');
      } else {
        log('MCP', line, 'magenta');
      }
    }
  });

  mcp.stderr.on('data', (data) => {
    log('MCP', data.toString().trim(), 'red');
  });

  mcp.on('close', (code) => {
    log('MCP', `服务退出 (代码: ${code})`, code === 0 ? 'green' : 'red');
  });

  return mcp;
}

// 主函数
function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 启动 TodoList 开发服务');
  console.log('='.repeat(70));
  console.log('   🌐 Web:  http://localhost:4000');
  console.log('   🔌 MCP:  http://localhost:4001');
  console.log('   📖 API:  http://localhost:4000/api');
  console.log('='.repeat(70) + '\n');

  // 启动两个服务
  const web = startWeb();
  const mcp = startMCP();

  // 进程终止处理
  process.on('SIGINT', () => {
    console.log('\n');
    log('MAIN', '接收到终止信号，正在关闭服务...', 'yellow');
    web.kill('SIGTERM');
    mcp.kill('SIGTERM');
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });

  process.on('SIGTERM', () => {
    console.log('\n');
    log('MAIN', '接收到终止信号，正在关闭服务...', 'yellow');
    web.kill('SIGTERM');
    mcp.kill('SIGTERM');
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });
}

main();
