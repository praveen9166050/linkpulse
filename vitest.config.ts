import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // As in n8n: unit tests in each folder's __tests__/; tests against
        // real HTTP (and later the real database) in test/integration/.
        include: ["src/**/__tests__/**/*.test.ts", "test/**/*.test.ts"],
        coverage: {
            provider: "v8",
            include: ["src/**"],
            exclude: ["src/**/__tests__/**"],
        },
    },
});
