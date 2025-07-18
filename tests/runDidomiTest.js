const { expect } = require("@playwright/test");

const TIMEOUT = 3000;

/**
 * Reusable SDK readiness + notice visibility test
 */
async function runDidomiTest(
  page,
  testUrl,
  expectVisible = true,
  options = {},
) {
  const {
    expectedText = null,
    commitHash = null,
    hasApiKey = false,
    hasNoticeId = false,
    expectGtm = false,
  } = options;

  console.log("Test URL:", testUrl);
  await page.goto(testUrl);

  if (hasApiKey && hasNoticeId) {
    // Wait for SDK readiness via didomiOnReady
    await page.evaluate(
      () => {
        return new Promise((resolve) => {
          window.didomiOnReady = window.didomiOnReady || [];
          window.didomiOnReady.push(() => resolve());
        });
      },
      { timeout: TIMEOUT },
    );

    // Verify Didomi object exists
    const sdkLoaded = await page.evaluate(
      () => typeof window.Didomi !== "undefined",
      { timeout: TIMEOUT },
    );
    expect(sdkLoaded).toBe(true);

    // If commitHash is provided, check that Didomi.version includes it
    if (commitHash) {
      const didomiVersion = await page.evaluate(() => window.Didomi.version, {
        timeout: TIMEOUT,
      });
      expect(didomiVersion).toContain(commitHash);
    }
  }

  // Check the agree button presence based on visibility
  const url = new URL(testUrl);
  const isCTV = Boolean(parseInt(url.searchParams.get("ctv_platform")));
  const agreeSelector = isCTV
    ? ".didomi-accept-and-close-button"
    : "#didomi-notice-agree-button";

  const agreeButton = page.locator(agreeSelector);

  if (expectVisible) {
    await agreeButton.waitFor({ state: "visible" });
    await expect(agreeButton).toBeVisible();

    // Determine expected notice ID correctly
    const expectedNoticeIdFromQuery = url.searchParams.get("notice_id");

    const expectedNoticeId = expectedNoticeIdFromQuery
      ? expectedNoticeIdFromQuery
      : await page.evaluate(() => window.didomiConfig?.app?.noticeId || null, {
          timeout: TIMEOUT,
        });

    // Read actual notice ID from Didomi remote config
    const actualNoticeId = await page.evaluate(
      () => window.didomiRemoteConfig?.notices?.[0]?.notice_id || null,
      {
        timeout: TIMEOUT,
      },
    );

    expect(actualNoticeId).not.toBeNull();
    expect(expectedNoticeId).not.toBeNull();
    expect(actualNoticeId).toBe(expectedNoticeId);
  } else {
    await expect(agreeButton).toHaveCount(0);
  }

  // Additional check for banner text, if expected
  const banner = page.locator("#top-banner");

  if (expectedText) {
    await expect(banner).toBeVisible();
    const bannerText = await banner.innerText();
    expect(bannerText).toContain(expectedText);
  } else {
    await expect(banner).toHaveCount(0);
  }

  const gtmLoaded = await page.evaluate(() => {
    return (
      Array.isArray(window.dataLayer) &&
      window.dataLayer.some((entry) => entry.event === "gtm.js")
    );
  });

  if (expectGtm) {
    expect(gtmLoaded).toBe(true);
  } else {
    expect(gtmLoaded).toBe(false);
  }
}

module.exports = { runDidomiTest };
