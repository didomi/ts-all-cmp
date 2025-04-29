require("dotenv").config();

const { test } = require("@playwright/test");

const { buildTestUrl } = require("./buildTestUrl");
const { runDidomiTest } = require("./runDidomiTest");

const API_KEY = process.env.API_KEY;
const NOTICE_ID = process.env.NOTICE_ID;
const NOTICE_ID_CTV = process.env.NOTICE_ID_CTV;

test.describe("CTV notice visibility", () => {
  test.beforeEach(async ({ page }) => {
    // Fail the test immediately if a console error is detected
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        throw new Error(`Console error detected: ${msg.text()}`);
      }
    });
  });

  test("notice should NOT be visible because the platform is NOT CTV for the default notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID,
      ctv_platform: "1",
    });
    await runDidomiTest(page, url, false, {
      expectedText:
        "CTV mode is active but the notice is either not a CTV notice or it is hidden. Disable CTV",
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should NOT be visible because the CTV platform toggle is NOT enabled", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID_CTV,
      ctv_platform: "0",
    });
    await runDidomiTest(page, url, false, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should NOT be visible because the country is NOT valid for this CTV notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID_CTV,
      country: "US",
      ctv_platform: "1",
    });
    await runDidomiTest(page, url, false, {
      expectedText: "No applicable regulation found (none).",
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible because the notice platform is CTV for this notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID_CTV,
      ctv_platform: "1",
    });
    await runDidomiTest(page, url, true, {
      expectedText: "CTV mode is active. Disable CTV",
      hasApiKey: true,
      hasNoticeId: true,
    });
  });
});
