import type { Config } from "jest";

const config: Config = {
  // 使用 projects 来区分不同类型的测试
  projects: [
    {
      displayName: "api",
      testMatch: [
        "<rootDir>/__tests__/api/todos.route.test.ts",
        "<rootDir>/__tests__/api/tags.route.test.ts",
        "<rootDir>/__tests__/api/workspaces.route.test.ts",
      ],
      testEnvironment: "node",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
      },
      transform: {
        "^.+\\.tsx?$": ["ts-jest", {
          tsconfig: {
            jsx: "react-jsx",
            esModuleInterop: true,
          },
        }],
      },
      setupFilesAfterEnv: ["<rootDir>/__tests__/api/setup.ts"],
      moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
    },
    {
      displayName: "components",
      testMatch: [
        "<rootDir>/__tests__/components/**/*.test.tsx",
        "<rootDir>/__tests__/db/**/*.test.ts",
        "<rootDir>/__tests__/api/client.test.ts",
      ],
      testEnvironment: "jsdom",
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
      },
      transform: {
        "^.+\\.tsx?$": ["ts-jest", {
          tsconfig: {
            jsx: "react-jsx",
            esModuleInterop: true,
          },
        }],
      },
      setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
      testPathIgnorePatterns: [
        "/node_modules/",
        "/.next/",
      ],
      moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
    },
  ],

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
};

export default config;
