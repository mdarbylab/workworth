import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Claude Code background-task worktrees are full nested checkouts
    // (their own .next, node_modules, etc.) at an unanchored depth the
    // patterns above don't reach -- exclude the whole tree outright.
    ".claude/worktrees/**",
  ]),
]);

export default eslintConfig;
