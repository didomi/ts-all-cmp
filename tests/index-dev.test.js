require("dotenv").config();

const { test } = require("@playwright/test");

const { buildTestUrl } = require("./buildTestUrl");
const { runDidomiTest } = require("./runDidomiTest");

const API_KEY = process.env.API_KEY;
const COMMIT_HASH = process.env.COMMIT_HASH;
const NOTICE_ID = process.env.NOTICE_ID;
const NOTICE_ID_CA = process.env.NOTICE_ID_CA;
const STAGING_API_KEY = process.env.STAGING_API_KEY;
const STAGING_NOTICE_ID = process.env.STAGING_NOTICE_ID;

test.describe("Dev notice visibility", () => {
  test.beforeEach(async ({ page }) => {
    let currentUrl = "";

    page.on("request", (request) => {
      const url = request.url();
      if (!currentUrl) {
        currentUrl = url;
      }
    });

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const shouldSkip =
          currentUrl && currentUrl.includes("notice_id=invalid123");

        if (!shouldSkip) {
          throw new Error(`Console error detected: ${msg.text()}`);
        }
      }
    });
  });

  test("notice should NOT be visible with default config on staging", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: STAGING_API_KEY,
      notice_id: NOTICE_ID,
      staging: "1",
    });
    await runDidomiTest(page, url, false, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible on staging with this notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: STAGING_API_KEY,
      notice_id: STAGING_NOTICE_ID,
      staging: "1",
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible when loading from preprod environment", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      preprod: "1",
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should NOT be visible with static loader and an invalid notice ID", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: "invalid123",
      commit_hash: COMMIT_HASH,
      static: "1",
    });
    await runDidomiTest(page, url, false, {
      commitHash: COMMIT_HASH,
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible with static loader only and no config", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      commit_hash: COMMIT_HASH,
      static: "1",
    });
    await runDidomiTest(page, url, true, {
      commitHash: COMMIT_HASH,
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should NOT be visible with static loader and this notice", async ({
    page,
  }, testInfo) => {
    // Mark this test to skip console check
    testInfo.annotations.push({ type: "skipConsoleCheck" });

    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      commit_hash: COMMIT_HASH,
      country: "FR",
      static: "1",
      apply_conf: "1",
      config: btoa(
        JSON.stringify({
          app: {
            apiKey: API_KEY,
            noticeId: NOTICE_ID_CA,
          },
        }),
      ),
    });
    await runDidomiTest(page, url, false, {
      commitHash: COMMIT_HASH,
      expectedText: "No applicable regulation found (none)",
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible with static loader and this notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      commit_hash: COMMIT_HASH,
      static: "1",
      apply_conf: "1",
      config: btoa(
        JSON.stringify({
          app: {
            apiKey: API_KEY,
            noticeId: NOTICE_ID,
          },
        }),
      ),
    });
    await runDidomiTest(page, url, true, {
      commitHash: COMMIT_HASH,
      hasApiKey: true,
      hasNoticeId: true,
    });
  });
});
