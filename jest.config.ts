import type { Config } from "jest";

const config: Config = {
  // 测试环境
  testEnvironment: "jsdom",
  
  // 测试文件匹配模式
  testMatch: [
    "**/__tests__/**/*.test.ts",
    "**/__tests__/**/*.test.tsx",
  ],
  
  // 模块路径别名
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  
  // 转换器
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {
      tsconfig: {
        jsx: "react-jsx",
        esModuleInterop: true,
      },
    }],
  },
  
  // 转换忽略模式
  transformIgnorePatterns: [
    "/node_modules/",
  ],
  
  // 测试前运行的设置文件
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  
  // 覆盖率配置
  collectCoverageFrom: [
    "lib/**/*.ts",
    "app/components/**/*.tsx",
    "app/types/**/*.ts",
    "!lib/db/index.ts",
    "!**/*.d.ts",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // 忽略的路径
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
  ],
  
  // 模块文件扩展名
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};

export default config;
