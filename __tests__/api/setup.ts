// API 测试专用 setup 文件
// 不使用 window 相关的 mock，因为 API 测试使用 node 环境

// 只导入基本的 jest-dom matchers，不导入依赖浏览器环境的模块
import "@testing-library/jest-dom/matchers";

// Mock fetch globally
(global as any).fetch = jest.fn();

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
