// پلاگین Vike در تست‌ها لازم نیست؛ Router در setupTests شبیه‌سازی می‌شود.
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/setupTests.js",
    include: ["src/**/*.test.{js,jsx}"],
  },
});
