import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		globals: true,
		environment: "jsdom",
		setupFiles: ["./src/test/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"src/test/",
				"**/*.d.ts",
				"**/*.config.*",
				"**/mockData/",
				"dist/",
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80,
			},
		},
		include: ["src/**/*.{test,spec}.{ts,tsx}"],
		exclude: ["node_modules", "dist", ".idea", ".git", ".cache"],
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
			"@types": path.resolve(__dirname, "./src/types"),
			"@services": path.resolve(__dirname, "./src/services"),
			"@providers": path.resolve(__dirname, "./src/providers"),
			"@utils": path.resolve(__dirname, "./src/utils"),
		},
	},
});
