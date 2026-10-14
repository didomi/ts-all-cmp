const { defineConfig } = require("@playwright/test");

export default defineConfig({
  testIgnore: ["**/flows.browser.test.js", "**/flows-*.test.mjs"],
  use: { headless: false },
});
