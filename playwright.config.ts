import { defineConfig, devices } from "@playwright/test";

const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
    testDir: "e2e",
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    use: {
        baseURL: "http://localhost:4173",
        trace: "retain-on-failure",
        ...(chromiumPath ? { launchOptions: { executablePath: chromiumPath } } : {}),
    },
    projects: [
        { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
        { name: "mobile", use: { ...devices["Pixel 7"] } },
    ],
    webServer: {
        command: "npm run build && npm run preview -- --port 4173 --strictPort",
        url: "http://localhost:4173",
        env: { VITE_INVOCATIONS: "100000", VITE_LATENCY_MS: "60", VITE_FAILURE_RATE: "0" },
        reuseExistingServer: !process.env.CI,
    },
});
