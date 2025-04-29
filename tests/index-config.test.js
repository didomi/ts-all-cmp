require("dotenv").config();

const { test } = require("@playwright/test");

const { buildTestUrl } = require("./buildTestUrl");
const { runDidomiTest } = require("./runDidomiTest");

const API_KEY = process.env.API_KEY;
const NOTICE_ID = process.env.NOTICE_ID;

test.describe("Notice with config visibility", () => {
  test.beforeEach(async ({ page }) => {
    // Fail the test immediately if a console error is detected
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        throw new Error(`Console error detected: ${msg.text()}`);
      }
    });
  });

  test("notice should NOT be visible when config explicitly disables the notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      apply_conf: "1",
      config: btoa(JSON.stringify({ notice: { enable: false } })),
    });
    await runDidomiTest(page, url, false, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible when config explicitly enables the notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      apply_conf: "1",
      config: btoa(JSON.stringify({ notice: { enable: true } })),
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible if config param is ignored because invalid", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      apply_conf: "1",
      config: "invalid-base64",
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible with an extensive config", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      apply_conf: "1",
      config: btoa(
        JSON.stringify({
          cookies: {
            didomiConsentStringCookieName: "didomiConsentStringCookieName",
            iabCookieName: "iabCookieName",
          },
          user: {
            organizationUserId: "organizationUserId",
          },
          sync: { enabled: true },
          app: {
            apiKey: API_KEY,
            noticeId: NOTICE_ID,
          },
        }),
      ),
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible and should ignore config if config toggle is not set", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      config: btoa(JSON.stringify({ notice: { enable: false } })),
      apply_conf: "0",
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible without a didomiConfig", async ({ page }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      apply_conf: "0",
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });
});
