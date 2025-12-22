import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: "backend/dist/integration/**/*.test.js",
  workspaceFolder: ".",
  mocha: {
    timeout: 10000
  }
});
