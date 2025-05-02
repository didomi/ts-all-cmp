require("dotenv").config();

const { test } = require("@playwright/test");

const { buildTestUrl } = require("./buildTestUrl");
const { runDidomiTest } = require("./runDidomiTest");

const API_KEY = process.env.API_KEY;
const NOTICE_ID_CA = process.env.NOTICE_ID_CA;

test.describe("Notice with location visibility", () => {
  test.beforeEach(async ({ page }) => {
    // Fail the test immediately if a console error is detected
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        throw new Error(`Console error detected: ${msg.text()}`);
      }
    });
  });

  test("notice should NOT be visible because the country is NOT valid for this notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID_CA,
      country: "FR",
    });
    await runDidomiTest(page, url, false, {
      expectedText: "No applicable regulation found (none).",
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should NOT be visible when config country does NOT match for this notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID_CA,
      apply_conf: "1",
      config: btoa(JSON.stringify({ user: { country: "FR" } })),
    });
    await runDidomiTest(page, url, false, {
      expectedText: "No applicable regulation found (none).",
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should NOT be visible when only region is set for this notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID_CA,
      region: "QC",
    });
    await runDidomiTest(page, url, false, {
      expectedText: "No applicable regulation found (none).",
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should NOT be visible with an invalid config region for this notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID_CA,
      apply_conf: "1",
      config: btoa(JSON.stringify({ user: { region: "invalid123" } })),
    });
    await runDidomiTest(page, url, false, {
      expectedText: "No applicable regulation found (none).",
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible because the country is valid for this notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID_CA,
      country: "CA",
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible when config country matches for this notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID_CA,
      apply_conf: "1",
      config: btoa(JSON.stringify({ user: { country: "CA" } })),
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible with country and only config region for this notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID_CA,
      country: "CA",
      apply_conf: "1",
      config: btoa(JSON.stringify({ user: { region: "QC" } })),
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible when config country and region match for this notice", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID_CA,
      apply_conf: "1",
      config: btoa(JSON.stringify({ user: { country: "CA", region: "QC" } })),
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });

  test("notice should be visible when there is another user key but the notice id is valid", async ({
    page,
  }) => {
    const url = buildTestUrl({
      apiKey: API_KEY,
      notice_id: NOTICE_ID_CA,
      country: "CA",
      apply_conf: "1",
      config: btoa(
        JSON.stringify({
          user: { organizationUserId: "organizationUserId" },
        }),
      ),
    });
    await runDidomiTest(page, url, true, {
      hasApiKey: true,
      hasNoticeId: true,
    });
  });
});
