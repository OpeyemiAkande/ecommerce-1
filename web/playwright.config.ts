import {defineConfig} from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {baseURL: "http://localhost:3100"},
  webServer: [
    {
      command: "node e2e/fake-api.mjs",
      url: "http://localhost:4010/api/health",
      reuseExistingServer: false
    },
    {
      command: "npm run build && npm run start -- -p 3100",
      url: "http://localhost:3100",
      timeout: 300_000,
      reuseExistingServer: false,
      env: {
        ...(process.env as Record<string, string>),
        NEXT_PUBLIC_API_URL: "http://localhost:4010/api",
        NEXT_PUBLIC_SITE_URL: "http://localhost:3100",
        NEXT_DIST_DIR: ".next-e2e"
      }
    }
  ]
});
