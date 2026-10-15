const { test, expect } = require("@playwright/test");
const { buildTestUrl } = require("./buildTestUrl");

test.use({ headless: true });

test("legacy page still loads a notice URL with its existing geo/environment inputs", async ({
  page,
}) => {
  await page.route("https://sdk*/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  await page.goto(
    buildTestUrl({
      apiKey: "key",
      notice_id: "notice",
      country: "FR",
      region: "IDF",
      staging: "1",
    }),
  );
  const url = new URL(await page.locator("#spcloader").getAttribute("src"));
  expect(url.origin).toBe("https://sdk.staging.privacy-center.org");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    target_type: "notice",
    target: "notice",
    country: "FR",
    region: "IDF",
  });
});
