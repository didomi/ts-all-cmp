require("dotenv").config();

const { test } = require("@playwright/test");

const { buildTestUrl } = require("./buildTestUrl");
const { runDidomiTest } = require("./runDidomiTest");

const API_KEY = process.env.API_KEY;
const NOTICE_ID = process.env.NOTICE_ID;

test.describe("Default settings notice visibility", () => {
  test.beforeEach(async ({ page }) => {
    // Fail the test immediately if a console error is detected
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        throw new Error(`Console error detected: ${msg.text()}`);
      }
    });
  });

  test("notice should NOT be visible when no query parameters are set", async ({
    page,
  }) => {
    const url = buildTestUrl({});
    await runDidomiTest(page, url, false, {
      expectedText: "Error: API key and Notice ID are missing.",
    });
  });

  test("notice should NOT be visible with missing notice ID", async ({
    page,
  }) => {
    const url = buildTestUrl({ apiKey: API_KEY });
    await runDidomiTest(page, url, false, {
      expectedText: "Error: Notice ID is missing.",
      hasApiKey: true,
    });
  });

  test("notice should NOT be visible with invalid API key", async ({
    page,
  }) => {
    const url = buildTestUrl({ apiKey: "invalid123" });
    await runDidomiTest(page, url, false, {
      expectedText: "Error: Notice ID is missing.",
      hasApiKey: true,
    });
  });

  test("notice should NOT be visible with missing API key", async ({
    page,
  }) => {
    const url = buildTestUrl({ notice_id: NOTICE_ID });
    await runDidomiTest(page, url, false, {
      expectedText: "Error: API key is missing.",
      hasNoticeId: true,
    });
  });

  test("notice should NOT be visible with invalid notice ID", async ({
    page,
  }) => {
    const url = buildTestUrl({ notice_id: "invalid123" });
    await runDidomiTest(page, url, false, {
      expectedText: "Error: API key is missing.",
      hasNoticeId: true,
    });
  });

  test("notice should be visible with default config", async ({ page }) => {
    const url = buildTestUrl({ apiKey: API_KEY, notice_id: NOTICE_ID });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible with default config and deprecated query parameters", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      global: "1",
      static: "1",
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible when GPP is enabled", async ({ page }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      gpp_stub: "1",
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible with all query parameters", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      country: "FR",
      region: "CA",
      commit_hash: "abcdef1234567890",
      staging: "0",
      preprod: "0",
      gpp_stub: "1",
      ctv_platform: "0",
      config: btoa(
        JSON.stringify({
          notice: { enable: true },
          cookies: {
            didomiConsentStringCookieName: "consentCookie",
            iabCookieName: "iabCookie",
          },
        }),
      ),
      apply_conf: "1",
    });

    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible and pushes gtm.js when enable_gtm is true", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      enable_gtm: "true",
      gtm_id: "GTM-W63VJKH",
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
      expectGtm: true,
    });
  });

  test("notice should be visible and does not push gtm.js when enable_gtm is false", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      enable_gtm: "false",
      gtm_id: "GTM-W63VJKH",
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
      expectGtm: false,
    });
  });
});
