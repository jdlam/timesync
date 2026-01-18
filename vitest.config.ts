import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths()],
	test: {
		projects: [
			{
				extends: true,
				test: {
					name: "convex",
					environment: "edge-runtime",
					include: ["convex/**/*.test.ts"],
					server: {
						deps: {
							inline: ["convex-test"],
						},
					},
				},
			},
			{
				extends: true,
				test: {
					name: "unit",
					environment: "jsdom",
					include: ["src/**/*.test.{ts,tsx}"],
				},
			},
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: ["src/lib/**/*.ts", "convex/**/*.ts"],
			exclude: ["convex/_generated/**"],
		},
	},
});
