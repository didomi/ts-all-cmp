const { test, expect } = require("@playwright/test");

async function mockSDK(
  page,
  config = { regulation: { name: "gdpr" }, test: true },
  startup = "",
) {
  await page.route("https://sdk*/**", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `
      ${startup}
      window.testBootstrap = { gpp: typeof window.__gpp, tcf: typeof window.__tcfapi, config: window.didomiConfig };
      window.testCalls = [];
      let visible = false;
      window.Didomi = {
        getConfig: () => (${JSON.stringify(config)}),
        widgets: {
          show: options => { visible = true; window.testCalls.push(['show', options]); },
          hide: () => { visible = false; window.testCalls.push(['hide']); },
          isVisible: () => visible,
        },
        reset: () => localStorage.setItem('test-reset', 'yes'),
      };
      (window.didomiOnReady || []).forEach(callback => callback(window.Didomi));
    `,
    }),
  );
}

async function openSetup(page) {
  await page.getByRole("tab", { name: "1. Setup", exact: true }).click();
  await page.locator("#flow_id").waitFor({ state: "attached" });
  await page.locator(".setup-group").evaluateAll((groups) =>
    groups.forEach((group) => {
      group.open = true;
    }),
  );
}

test("loader options explain GVL, forward it to loader.js and reject irrelevant shared options", async ({
  page,
}) => {
  const loaders = [];
  page.on("request", (request) => {
    if (request.url().includes("/loader.js")) loaders.push(request.url());
  });
  await mockSDK(page);
  await page.goto("/flows.html?apiKey=key&flow_id=flow");
  await openSetup(page);
  const options = page.getByLabel("Loader options", { exact: true });
  expect(
    await options
      .locator("option")
      .evaluateAll((nodes) => nodes.map((node) => node.value)),
  ).toEqual(["", "gvl"]);
  expect(
    (await options.getAttribute("title")).includes("non-GDPR location"),
  ).toBe(true);
  await page.getByText("Examples and behavior", { exact: true }).click();
  await expect(page.locator(".field-help")).toContainText(
    "normally included automatically",
  );
  await options.selectOption("gvl");
  await expect(page.locator("#loader-url")).toContainText("opts=gvl");
  await page
    .getByRole("button", { name: "Apply and reload", exact: true })
    .click();
  await expect(page.locator("#status")).toContainText("SDK ready");
  expect(new URL(loaders[loaders.length - 1]).searchParams.get("opts")).toBe(
    "gvl",
  );
  await page.goto(
    "/flows.html?apiKey=key&flow_id=flow&opts=minTCFVersion%3A2.3",
  );
  await expect(page.locator("#status")).toContainText(
    "Unsupported loader options",
  );
  await expect(page.locator("#spcloader")).toHaveCount(0);
});

test("sandbox styles do not change SDK main, nav, buttons or text outside its root", async ({
  page,
}) => {
  await page.goto("/flows.html");
  const styles = await page.evaluate(() => {
    const host = document.createElement("div");
    const elements = ["main", "nav", "button", "p", "footer", "form"].map(
      (tag) => {
        const el = document.createElement(tag);
        el.textContent = "SDK fixture";
        host.append(el);
        return el;
      },
    );
    document.body.append(host);
    const read = () =>
      elements.map((el) => {
        const style = getComputedStyle(el);
        return Object.fromEntries(
          [
            "maxWidth",
            "padding",
            "display",
            "gap",
            "flexWrap",
            "fontFamily",
            "lineHeight",
            "boxSizing",
          ].map((key) => [key, style[key]]),
        );
      });
    const styled = read();
    document.querySelector("head style").sheet.disabled = true;
    const baseline = read();
    return { styled, baseline };
  });
  expect(styles.styled).toEqual(styles.baseline);
});

test("Hide preview dismisses a fallback notice without resetting or writing consent", async ({
  page,
}) => {
  await mockSDK(page);
  await page.goto("/flows.html?apiKey=key&flow_id=flow&ctv_ui=1#test");
  await expect(page.locator("#status")).toContainText("SDK ready");
  await page.evaluate(() => {
    window.noticePreviewVisible = true;
    window.previewHideCalls = 0;
    window.Didomi.notice = {
      isVisible: () => window.noticePreviewVisible,
      hide: () => {
        window.noticePreviewVisible = false;
        window.previewHideCalls++;
      },
    };
  });
  await page.getByRole("button", { name: "Show widget", exact: true }).click();
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "didomi-host";
    host.style.cssText = "position:fixed;inset:0;z-index:2147483646";
    document.body.append(host);
  });
  await page.getByRole("button", { name: "Hide preview", exact: true }).click();
  expect(await page.evaluate(() => window.noticePreviewVisible)).toBe(false);
  expect(await page.evaluate(() => window.previewHideCalls)).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem("test-reset"))).toBe(
    null,
  );
  expect(await page.locator("#hide-preview").isVisible()).toBe(false);
  for (const [name, id] of [
    ["1. Setup", "tab-setup"],
    ["3. Configuration", "tab-config"],
    ["2. Test & troubleshoot", "tab-test"],
  ]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.locator(`#${id}`)).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }
  await page.getByRole("button", { name: "Show widget", exact: true }).click();
  expect(
    await page
      .locator("#didomi-host")
      .getAttribute("data-sandbox-preview-dismissed"),
  ).toBe(null);
  await page.getByRole("button", { name: "Hide preview", exact: true }).click();
});

test("Force CTV UI initializes the SDK with its app flag while requesting a web Flow", async ({
  page,
}) => {
  await mockSDK(page);
  await page.goto("/flows.html?apiKey=key&flow_id=flow&platform=web&ctv_ui=1");
  await expect
    .poll(() =>
      page.evaluate(() => window.testBootstrap?.config?.app?.ctvEnabled),
    )
    .toBe(true);
  expect(
    new URL(
      await page.locator("#spcloader").getAttribute("src"),
    ).searchParams.get("platform"),
  ).toBe("web");
  await expect(page.getByLabel("Force CTV UI", { exact: true })).toHaveValue(
    "1",
  );
});

test("ready SDK with unresolved widget bundles reports the live Flow failure visibly", async ({
  page,
}) => {
  await mockSDK(page, {
    widgets: { testWidget: { versionId: "v1" } },
    defaultWidgetId: "testWidget",
    rules: [{}],
  });
  await page.goto("/flows.html?apiKey=key&flow_id=flow");
  await expect(page.locator("#status")).toContainText(
    "widgets have no bundle URL: testWidget",
  );
  await expect(page.locator("#status")).toHaveAttribute("data-error", "true");
  await expect(page.locator("#runtime-info")).toContainText(
    '"missingBundleUrls"',
  );
});

test("empty form is usable, incomplete links hydrate, and SDK is not requested", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (request) => {
    if (request.url().includes("/loader.js")) requests.push(request.url());
  });
  await page.goto("/flows.html?flow_id=only-flow");
  await expect(page.getByLabel("Flow ID", { exact: true })).toHaveValue(
    "only-flow",
  );
  await expect(page.locator("#status")).toContainText("Enter both");
  await page
    .getByRole("tab", { name: "2. Test & troubleshoot", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Show widget", exact: true }),
  ).toBeDisabled();
  expect(requests).toEqual([]);
});

test("loaded config renders automatically, refreshes, and copies the full JSON", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text) => {
          window.copiedConfig = text;
        },
      },
    });
  });
  await mockSDK(page);
  await page.goto("/flows.html?apiKey=key&flow_id=flow");
  await page
    .getByRole("tab", { name: "3. Configuration", exact: true })
    .click();
  await expect(page.locator("#loaded-config")).toContainText('"test": true');
  expect(
    JSON.parse(await page.locator("#loaded-config").textContent()),
  ).toEqual({ regulation: { name: "gdpr" }, test: true });
  await page.evaluate(() => {
    window.Didomi.getConfig = () => ({
      updated: 42,
      widgets: { example: { versionId: "version" } },
    });
  });
  await page
    .getByRole("tab", { name: "3. Configuration", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Refresh loaded config", exact: true })
    .click();
  await expect(page.locator("#loaded-config")).toContainText('"updated": 42');
  await page.getByRole("button", { name: "Copy JSON", exact: true }).click();
  await expect(page.locator("#loaded-config-status")).toContainText(
    "Configuration JSON copied.",
  );
  expect(await page.evaluate(() => window.copiedConfig)).toBe(
    await page.locator("#loaded-config").textContent(),
  );
});

test("shareable edits apply on reload, stubs precede loader, and widget API works", async ({
  page,
}) => {
  await mockSDK(page);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/flows.html");
  await openSetup(page);
  await page.getByLabel("Public API key", { exact: true }).fill("public-key");
  await page.getByLabel("Flow ID", { exact: true }).fill("flow&encoded=1");
  await page
    .getByLabel("Flow deployment", { exact: true })
    .selectOption("staging");
  await page
    .getByLabel("SDK environment", { exact: true })
    .selectOption("preprod");
  await page.getByLabel("Country", { exact: true }).fill("US");
  await page.getByLabel("Region", { exact: true }).fill("CA");
  await page.getByLabel("Brand config ID", { exact: true }).fill("brand");
  await page.getByLabel("Brand version ID", { exact: true }).fill("v2");
  await page.getByLabel("Enable notice", { exact: true }).selectOption("false");
  await page
    .getByLabel("Custom didomiConfig JSON", { exact: true })
    .fill('{"user":{"age":50},"test":"日本語 😀"}');
  await page.getByLabel("Apply custom JSON", { exact: true }).selectOption("1");
  await page.getByLabel("Age", { exact: true }).fill("18");
  await page.getByLabel("Load GPP stub", { exact: true }).selectOption("1");
  await page.getByLabel("Widget ID", { exact: true }).fill("widget");
  await page.getByLabel("Layer name", { exact: true }).fill("preferences");
  await expect(page.locator("#loader-url")).toContainText(
    "environment=staging",
  );
  await page
    .getByRole("button", { name: "Apply and reload", exact: true })
    .click();
  await expect(page.locator("#status")).toContainText("SDK ready");
  await expect(page.getByLabel("Flow ID", { exact: true })).toHaveValue(
    "flow&encoded=1",
  );
  const bootstrap = await page.evaluate(() => window.testBootstrap);
  expect(bootstrap.gpp).toBe("function");
  expect(bootstrap.tcf).toBe("function");
  expect(bootstrap.config.user).toEqual({
    age: 18,
    country: "US",
    region: "CA",
  });
  expect(bootstrap.config.test).toBe("日本語 😀");
  const url = new URL(await page.locator("#spcloader").getAttribute("src"));
  expect(url.origin).toBe("https://sdk-preprod.privacy-center.org");
  expect(Object.fromEntries(url.searchParams)).toMatchObject({
    target_type: "flow",
    target: "flow&encoded=1",
    environment: "staging",
    brand: "brand",
    brand_version: "v2",
    country: "US",
    region: "CA",
  });
  expect(url.searchParams.has("didomiConfig.notice.enable")).toBe(false);
  expect(
    new URL(page.url()).searchParams.get("didomiConfig.notice.enable"),
  ).toBe("false");
  await page.getByRole("button", { name: "Show widget", exact: true }).click();
  await expect(page.locator("#runtime-info")).toContainText(
    '"widgetVisible": true',
  );
  await page.getByRole("button", { name: "Hide widget", exact: true }).click();
  expect(await page.evaluate(() => window.testCalls)).toEqual([
    ["show", { widgetId: "widget", layerName: "preferences" }],
    ["hide"],
  ]);
  await page
    .getByRole("tab", { name: "3. Configuration", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Refresh loaded config", exact: true })
    .click();
  await expect(page.locator("#loaded-config")).toContainText('"test": true');
  await page
    .getByRole("tab", { name: "2. Test & troubleshoot", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset status", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("test-reset")))
    .toBe("yes");
  await expect(page.locator("#status")).toContainText("SDK ready");
  expect(errors).toEqual([]);
});

test("malformed shared JSON blocks SDK startup and can be corrected", async ({
  page,
}) => {
  await mockSDK(page);
  await page.goto(
    "/flows.html?apiKey=key&flow_id=flow&config=%%%&apply_conf=1",
  );
  await expect(page.locator("#status")).toContainText("must be valid JSON");
  await expect(page.locator("#spcloader")).toHaveCount(0);
  await openSetup(page);
  await page.getByLabel("Custom didomiConfig JSON", { exact: true }).fill("{}");
  await page
    .getByRole("button", { name: "Apply and reload", exact: true })
    .click();
  await expect(page.locator("#status")).toContainText("SDK ready");
});

test("loader network failure is visible and leaves widget controls disabled", async ({
  page,
}) => {
  await page.route("https://sdk*/**", (route) => route.abort());
  await page.goto("/flows.html?apiKey=key&flow_id=flow");
  await expect(page.locator("#status")).toContainText("Could not load the SDK");
  await page
    .getByRole("tab", { name: "2. Test & troubleshoot", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Show widget", exact: true }),
  ).toBeDisabled();
});

test("legacy page still loads a notice URL with its existing geo/environment inputs", async ({
  page,
}) => {
  await page.route("https://sdk*/**", (route) =>
    route.fulfill({ contentType: "application/javascript", body: "" }),
  );
  await page.goto(
    "/index.html?apiKey=key&notice_id=notice&country=FR&region=IDF&staging=1",
  );
  const url = new URL(await page.locator("#spcloader").getAttribute("src"));
  expect(url.origin).toBe("https://sdk.staging.privacy-center.org");
  expect(Object.fromEntries(url.searchParams)).toEqual({
    target_type: "notice",
    target: "notice",
    country: "FR",
    region: "IDF",
  });
  await expect(
    page.getByRole("link", { name: "Test a Consent Flow" }),
  ).toHaveAttribute("href", "flows.html");
});

test("mobile page fits the viewport and every input has an accessible label", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/flows.html");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page
      .locator("#flow-form input, #flow-form select, #flow-form textarea")
      .evaluateAll((inputs) =>
        inputs.every((input) => input.labels.length > 0),
      ),
  ).toBe(true);
});

test("tree and plain views handle large collections and render untrusted JSON as text", async ({
  page,
}) => {
  const config = {
    app: { apiKey: "key" },
    regulation: { name: "gdpr" },
    nested: { enabled: false, empty: null },
    catalog: Array.from({ length: 250 }, (_, i) => ({ id: i })),
    text: '<img src=x onerror="window.treeInjected=true">',
  };
  await mockSDK(page, config);
  await page.goto("/flows.html?apiKey=key&flow_id=flow#config");
  await expect(page.locator("#config-tree")).toContainText('"nested"');
  expect(await page.locator("#config-tree .json-leaf").count()).toBe(1);
  await page
    .locator('#config-tree details[data-json-path="/nested"] > summary')
    .click();
  await expect(page.locator("#config-tree")).toContainText('"enabled": false');
  await page
    .locator('#config-tree details[data-json-path="/catalog"] > summary')
    .click();
  const catalog = page.locator(
    '#config-tree details[data-json-path="/catalog"]',
  );
  await expect(
    catalog.locator(":scope > .json-children > details"),
  ).toHaveCount(100);
  await catalog
    .getByRole("button", { name: "Show next 100 entries", exact: true })
    .click();
  await expect(
    catalog.locator(":scope > .json-children > details"),
  ).toHaveCount(200);
  await page
    .getByRole("button", { name: "Collapse sections", exact: true })
    .click();
  expect(
    await page.locator("#config-tree > details").getAttribute("open"),
  ).toBe(null);
  await page
    .getByRole("button", { name: "Expand sections", exact: true })
    .click();
  await expect(page.locator("#config-tree")).toContainText('"enabled": false');
  await page.getByRole("button", { name: "Plain JSON", exact: true }).click();
  expect(await page.locator("#loaded-config").isVisible()).toBe(true);
  expect(
    JSON.parse(await page.locator("#loaded-config").textContent()),
  ).toEqual(config);
  expect(await page.locator("#config-tree img").count()).toBe(0);
  expect(await page.evaluate(() => window.treeInjected === undefined)).toBe(
    true,
  );
});

test("troubleshooting captures startup messages, preserves console forwarding, and clears only runtime evidence", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.forwardedWarnings = 0;
    const previous = console.warn;
    console.warn = (...args) => {
      window.forwardedWarnings++;
      previous(...args);
    };
  });
  await mockSDK(
    page,
    {
      app: { apiKey: "key" },
      regulation: { name: "gdpr" },
      widgets: { widget: { versionId: "v" } },
    },
    'console.warn("Didomi - No bundle URL for widget test"); console.warn("Didomi - No bundle URL for widget test");',
  );
  await page.goto("/flows.html?apiKey=key&flow_id=flow#test");
  await expect(page.locator("#config-findings")).toContainText(
    "Flows → Privacy Widgets",
  );
  await expect(page.locator("#runtime-events")).toContainText("(×2)");
  expect(await page.evaluate(() => window.forwardedWarnings)).toBe(2);
  await page.evaluate(() => {
    window.dispatchEvent(
      new ErrorEvent("error", {
        message: "Example page failure",
        filename: "example.js",
        lineno: 10,
      }),
    );
    window.dispatchEvent(
      new PromiseRejectionEvent("unhandledrejection", {
        reason: new Error("Example rejected promise"),
        promise: Promise.resolve(),
      }),
    );
  });
  await expect(page.locator("#runtime-events")).toContainText(
    "Example page failure",
  );
  await expect(page.locator("#runtime-events")).toContainText(
    "Example rejected promise",
  );
  await page
    .getByText("Technical evidence: captured runtime messages", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Clear captured messages", exact: true })
    .click();
  await expect(page.locator("#runtime-events")).toContainText(
    "No warnings or errors captured",
  );
  await expect(page.locator("#config-findings")).toContainText(
    "Widget has no usable bundle URL",
  );
});

test("workspace tabs support keyboard navigation, deep links and collapsed setup groups", async ({
  page,
}) => {
  await page.goto("/flows.html#troubleshooting-title");
  await expect(page.locator("#tab-test")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.locator("#tab-test").press("ArrowRight");
  await expect(page.locator("#tab-config")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(await page.locator("#test-panel").isVisible()).toBe(false);
  await page.locator("#tab-config").press("Home");
  await expect(page.locator("#tab-setup")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(await page.locator("#setup-group-1").getAttribute("open")).toBe(null);
  await page
    .locator("#setup-navigation")
    .getByRole("link", { name: "Delivery overrides", exact: true })
    .click();
  await page.getByLabel("Country", { exact: true }).fill("FR");
  await expect(page.getByLabel("Country", { exact: true })).toHaveValue("FR");
});

test("startup failures remain visible when the main page module cannot load", async ({
  page,
}) => {
  await page.route("**/scripts/flows.js", (route) => route.abort());
  await page.goto("/flows.html");
  await expect(page.locator("#troubleshooting-summary")).toContainText(
    "Startup warnings or errors were captured",
  );
  expect(await page.locator("#runtime-events").isVisible()).toBe(false);
  await page
    .getByText("Technical evidence: captured runtime messages", { exact: true })
    .click();
  await expect(page.locator("#runtime-events")).toContainText("flows.js");
});

test("Show widget failures offer a dismissible dialog and a route to troubleshooting", async ({
  page,
}) => {
  await mockSDK(page);
  await page.goto("/flows.html?apiKey=key&flow_id=flow#test");
  await expect(page.locator("#status")).toContainText("SDK ready");
  const dialog = page.getByRole("dialog");
  for (const mode of ["throw", "reject", "empty", "unavailable"]) {
    await page.evaluate((mode) => {
      window.Didomi.widgets.isVisible = () => false;
      window.Didomi.widgets.show =
        mode === "unavailable"
          ? undefined
          : () => {
              if (mode === "throw") throw new Error("Widget unavailable");
              if (mode === "reject")
                return Promise.reject(new Error("Widget asset failed"));
            };
    }, mode);
    await page
      .getByRole("button", { name: "Show widget", exact: true })
      .click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(
      "Read the Troubleshooting section on tab 2",
    );
    if (mode === "throw") {
      await page.getByRole("button", { name: "Close", exact: true }).click();
    } else if (mode === "reject") {
      await page.keyboard.press("Escape");
    } else {
      await page
        .getByRole("button", { name: "Read troubleshooting", exact: true })
        .click();
      await expect(page.locator("#tab-test")).toHaveAttribute(
        "aria-selected",
        "true",
      );
      await expect(page.locator("#troubleshooting-title")).toBeFocused();
    }
    await expect(dialog).not.toBeVisible();
  }
  await page.evaluate(() => {
    let visible = false;
    window.Didomi.widgets.isVisible = () => visible;
    window.Didomi.widgets.show = () => {
      setTimeout(() => {
        visible = true;
      }, 200);
    };
  });
  await page.getByRole("button", { name: "Show widget", exact: true }).click();
  await expect(page.locator("#runtime-info")).toContainText(
    '"widgetVisible": true',
  );
  await expect(dialog).not.toBeVisible();
});

test("consent strings read SDK snapshots, copy complete values and clear stale values on errors", async ({
  page,
}) => {
  await mockSDK(page);
  await page.goto("/flows.html?apiKey=key&flow_id=flow#test");
  await expect(page.locator("#status")).toContainText("SDK ready");
  await page.evaluate(() => {
    window.Didomi.getCurrentUserStatus = () => ({
      consent_string: "TC.complete.segment",
      gpp_string: "DBABLA~test.section",
    });
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.copiedString = value;
        },
      },
    });
  });
  // Simulate SDK readiness after installing the test API.
  await page.evaluate(() =>
    window.didomiOnReady.forEach((callback) => callback()),
  );
  await page
    .getByRole("button", { name: "Refresh consent strings", exact: true })
    .click();
  await expect(page.locator("#tc-string")).toHaveValue("TC.complete.segment");
  await expect(page.locator("#gpp-string")).toHaveValue("DBABLA~test.section");
  for (const [kind, value] of [
    ["tc", "TC.complete.segment"],
    ["gpp", "DBABLA~test.section"],
  ]) {
    await page.locator(`#copy-${kind}-string`).click();
    expect(await page.evaluate(() => window.copiedString)).toBe(value);
  }
  const links = await page.locator("#consent-strings a").evaluateAll((nodes) =>
    nodes.map((node) => ({
      href: node.href,
      target: node.target,
      rel: node.rel,
    })),
  );
  expect(links).toEqual([
    {
      href: "https://iabgpp.com/#TC.complete.segment",
      target: "_blank",
      rel: "noopener noreferrer",
    },
    {
      href: "https://iabgpp.com/#DBABLA~test.section",
      target: "_blank",
      rel: "noopener noreferrer",
    },
    {
      href: "https://dcs-decoder.didomi.io/",
      target: "_blank",
      rel: "noopener noreferrer",
    },
  ]);
  await page.evaluate(() => {
    window.Didomi.getCurrentUserStatus = () => ({});
  });
  await page.locator("#read-consent-strings").click();
  await expect(page.locator("#tc-string")).toHaveValue("");
  await expect(page.locator("#gpp-string")).toHaveValue("");
  await expect(page.locator("#copy-tc-string")).toBeDisabled();
  await expect(page.locator("#copy-gpp-string")).toBeDisabled();
  await expect(page.locator("#decode-tc-string")).toHaveAttribute(
    "href",
    "https://iabgpp.com/#",
  );
  await expect(page.locator("#decode-gpp-string")).toHaveAttribute(
    "href",
    "https://iabgpp.com/#",
  );
  await expect(page.locator("#gpp-string-status")).toContainText(
    "No GPP string was returned",
  );
  await page.evaluate(() => {
    window.Didomi.getCurrentUserStatus = () => {
      throw new Error("Test read error");
    };
  });
  await page.locator("#read-consent-strings").click();
  await expect(page.locator("#consent-strings-status")).toContainText(
    "Test read error",
  );
  await expect(page.locator("#tc-string")).toHaveValue("");
  await expect(page.locator("#copy-tc-string")).toBeDisabled();
});

test("DCS reads configured browser storage and preserves signed values for copying", async ({
  page,
}) => {
  await mockSDK(page, {
    cookies: { didomiConsentStringCookieName: "custom_dcs" },
  });
  await page.goto("/flows.html?apiKey=key&flow_id=flow#test");
  await expect(page.locator("#status")).toContainText("SDK ready");
  await page.evaluate(() => {
    window.Didomi.getCurrentUserStatus = () => ({});
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.copiedString = value;
        },
      },
    });
  });
  await page.evaluate(() =>
    window.didomiOnReady.forEach((callback) => callback()),
  );
  await page.locator("#read-consent-strings").click();
  await expect(page.locator("#dcs-string-status")).toContainText(
    "No saved DCS",
  );
  await expect(page.locator("#copy-dcs-string")).toBeDisabled();
  await expect(page.locator("#decode-dcs-string")).toHaveAttribute(
    "href",
    "https://dcs-decoder.didomi.io/",
  );
  await page.evaluate(() => {
    localStorage.setItem("didomi_dcs", "unrelated-default-value");
    localStorage.setItem("custom_dcs", "DCS.payload.user~signature");
  });
  await page.locator("#read-consent-strings").click();
  await expect(page.locator("#dcs-string")).toHaveValue(
    "DCS.payload.user~signature",
  );
  await expect(page.locator("#dcs-string-status")).toContainText(
    "local storage “custom_dcs”",
  );

  const decoderURL = new URL(
    await page.locator("#decode-dcs-string").getAttribute("href"),
  );
  expect(decoderURL.origin).toBe("https://dcs-decoder.didomi.io");
  expect(decoderURL.searchParams.get("dcs")).toBe("DCS.payload.user~signature");
  await page.locator("#copy-dcs-string").click();
  expect(await page.evaluate(() => window.copiedString)).toBe(
    "DCS.payload.user~signature",
  );
  await page.evaluate(() => {
    document.cookie = "custom_dcs=other.payload~signature;path=/";
  });
  await page.locator("#read-consent-strings").click();
  await expect(page.locator("#dcs-string")).toHaveValue(
    "other.payload~signature",
  );
  await expect(page.locator("#dcs-string-status")).toContainText(
    "Cookie and local storage values differ",
  );
  expect(
    new URL(
      await page.locator("#decode-dcs-string").getAttribute("href"),
    ).searchParams.get("dcs"),
  ).toBe("other.payload~signature");
  await page.evaluate(() => {
    window.Didomi.getConfig = () => {
      throw Error("Config unavailable");
    };
    window.Didomi.getCurrentUserStatus = () => ({
      consent_string: "TC-still-available",
    });
  });
  await page.locator("#read-consent-strings").click();
  await expect(page.locator("#dcs-string")).toHaveValue("");
  await expect(page.locator("#copy-dcs-string")).toBeDisabled();
  await expect(page.locator("#dcs-string-status")).toContainText(
    "Config unavailable",
  );
  await expect(page.locator("#decode-dcs-string")).toHaveAttribute(
    "href",
    "https://dcs-decoder.didomi.io/",
  );
  await expect(page.locator("#tc-string")).toHaveValue("TC-still-available");
});

test("URL-pattern tester overrides only the query context and leaves page and widget display unchanged", async ({
  page,
}) => {
  await mockSDK(page);
  await page.goto("/flows.html?apiKey=key&flow_id=flow#test");
  await expect(page.locator("#status")).toContainText("SDK ready");
  await page.evaluate(() => {
    window.pathQueries = [];
    window.Didomi.widgets.getApplicable = (context) => {
      window.pathQueries.push(context);
      if (context.currentUrl === "/checkout")
        return { widgetId: "checkout-widget", rule: { id: "checkout-rule" } };
      if (context.currentUrl === "/fallback")
        return { widgetId: "default-widget", rule: null };
      if (context.currentUrl === "/error")
        throw new Error("Rules query failed");
      return null;
    };
    window.didomiOnReady.forEach((callback) => callback());
  });
  await page.getByText("URL-pattern test", { exact: true }).click();
  const path = page.getByLabel("Test pathname", { exact: true });
  const check = page.getByRole("button", {
    name: "Check path rules",
    exact: true,
  });
  const originalURL = page.url();
  await path.fill("/checkout");
  await check.click();
  await expect(page.locator("#path-test-status")).toContainText(
    "checkout-rule matched and selected widget checkout-widget",
  );
  expect(await page.evaluate(() => window.pathQueries)).toEqual([
    { currentUrl: "/checkout" },
  ]);
  expect(await page.evaluate(() => window.testCalls)).toEqual([]);
  expect(page.url()).toBe(originalURL);
  await page.getByText("Rules test result", { exact: true }).click();
  await expect(page.locator("#path-test-result")).toContainText(
    "checkout-widget",
  );
  for (const invalid of [
    "https://example.com/checkout",
    "//example.com/checkout",
    "/checkout?x=1",
    "/checkout#x",
    "/bad\\path",
  ]) {
    await path.fill(invalid);
    await check.click();
    await expect(page.locator("#path-test-status")).toContainText(
      "Enter a pathname",
    );
  }
  expect(await page.evaluate(() => window.pathQueries.length)).toBe(1);
  await path.fill("/fallback");
  await check.click();
  await expect(page.locator("#path-test-status")).toContainText(
    "No display rule matched; the SDK returned default widget default-widget",
  );
  await path.fill("/nothing");
  await check.click();
  await expect(page.locator("#path-test-status")).toContainText(
    "No widget was returned",
  );
  await path.fill("/error");
  await check.click();
  await expect(page.locator("#path-test-status")).toContainText(
    "Could not check path rules: Rules query failed",
  );
  expect(await page.locator("#path-test-result").textContent()).toBe("");
  expect(page.url()).toBe(originalURL);
  await page.evaluate(() => {
    window.Didomi.widgets.getApplicable = undefined;
    window.didomiOnReady.forEach((callback) => callback());
  });
  await expect(check).toBeDisabled();
  await expect(page.locator("#path-test-status")).toContainText(
    "This SDK version does not provide rules testing",
  );
});

test("troubleshooting explains empty rules as a possible widget initialization cause", async ({
  page,
}) => {
  await mockSDK(page, {
    app: { apiKey: "key" },
    regulation: { name: "gdpr" },
    widgets: { widget: { bundleUrl: "https://example.com/widget.js" } },
    defaultWidgetId: "widget",
    rules: [],
  });
  await page.goto("/flows.html?apiKey=key&flow_id=flow#test");
  await expect(page.locator("#status")).toContainText("SDK ready");
  await expect(page.locator("#config-findings")).toContainText(
    "No display rules may prevent widget initialization",
  );
  await expect(page.locator("#config-findings")).toContainText(
    "SDK can still load",
  );
  await expect(page.locator("#config-findings")).toContainText(
    "confirm the expected behavior",
  );
});

test("Setup reset status uses the legacy SDK reset and reloads with the existing test settings", async ({
  page,
}) => {
  const loaders = [];
  page.on("request", (request) => {
    if (request.url().includes("/loader.js")) loaders.push(request.url());
  });
  await page.goto("/flows.html#setup");
  await expect(page.locator("#reset-status-setup")).toBeDisabled();
  await mockSDK(page);
  await page.goto("/flows.html?apiKey=key&flow_id=flow&country=FR#setup");
  await expect(page.locator("#status")).toContainText("SDK ready");
  const originalURL = page.url();
  const firstLoads = loaders.length;
  await page.locator("#reset-status-setup").click();
  await expect.poll(() => loaders.length).toBe(firstLoads + 1);
  await expect(page.locator("#status")).toContainText("SDK ready");
  expect(await page.evaluate(() => localStorage.getItem("test-reset"))).toBe(
    "yes",
  );
  expect(page.url()).toBe(originalURL);
  await expect(page.getByLabel("Flow ID", { exact: true })).toHaveValue("flow");
  await expect(page.getByLabel("Country", { exact: true })).toHaveValue("FR");
});
