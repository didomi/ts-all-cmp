import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readState,
  shareURL,
  loaderURL,
  validate,
  buildConfig,
  widgetOptions,
  widgetDiagnostics,
} from "../scripts/flows-state.mjs";

const state = (overrides) => ({
  ...readState(new URLSearchParams("apiKey=public-key&flow_id=my-flow")),
  ...overrides,
});

test("widget diagnostics distinguish version references from renderable bundles", () => {
  assert.deepEqual(
    widgetDiagnostics({
      widgets: {
        unresolved: { versionId: "v1" },
        single: { bundleUrl: "https://example.com/widget.js" },
        multiple: { bundleUrls: ["https://example.com/widget.js"] },
        emptyFirst: { bundleUrls: ["", "legacy.js"], bundleUrl: "fallback.js" },
      },
      rules: [{}],
      defaultWidgetId: "unresolved",
    }),
    {
      widgetIds: ["unresolved", "single", "multiple", "emptyFirst"],
      defaultWidgetId: "unresolved",
      ruleCount: 1,
      missingBundleUrls: ["unresolved", "emptyFirst"],
    },
  );
  assert.deepEqual(widgetDiagnostics(undefined).widgetIds, []);
});

test("Flow loader defaults match the production embed and exclude sandbox/SDK URL parameters", () => {
  const url = loaderURL(
    state({
      age: "18",
      widget_id: "widget",
      "didomiConfig.notice.enable": "false",
    }),
  );
  assert.equal(url.origin, "https://sdk.privacy-center.org");
  assert.equal(url.pathname, "/public-key/loader.js");
  assert.deepEqual(Object.fromEntries(url.searchParams), {
    target_type: "flow",
    target: "my-flow",
    platform: "web",
  });
});
test("every delivery override reaches the correct environment with encoded values", () => {
  const overrides = {
    environment: "staging",
    sdk_environment: "preprod",
    platform: "ctv",
    country: "US",
    region: "CA",
    regulation: "cpra",
    lang: "fr",
    brand: "brand&other=value",
    brand_version: "v1",
    opts: "gvl",
    ts: "123",
  };
  const url = loaderURL(state(overrides));
  assert.equal(url.origin, "https://sdk-preprod.privacy-center.org");
  for (const [key, value] of Object.entries(overrides))
    if (key !== "sdk_environment")
      assert.equal(url.searchParams.get(key), value);
  assert.equal(url.searchParams.has("other"), false);
  assert.equal(
    loaderURL(state({ sdk_environment: "staging" })).origin,
    "https://sdk.staging.privacy-center.org",
  );
});
test("share URL round-trips Unicode JSON, explicit false, punctuation, unknown params and hash", () => {
  const original = state({
    config: '{"message":"日本語 + français & 😀"}',
    apply_conf: "1",
    "didomiConfig.notice.enable": "false",
    attributes: '{"plan":"a+b&x=y"}',
    didomiConfig: '{"sync":{"enabled":false}}',
  });
  const url = shareURL(
    original,
    "https://example.com/flows.html?unrelated=keep#test",
  );
  assert.deepEqual(readState(url.searchParams), original);
  assert.equal(url.searchParams.get("unrelated"), "keep");
  assert.equal(url.hash, "#test");
  assert.equal(url.searchParams.has("config.message"), false);
});
test("loader-style URLs normalize to flow_id and preserve unknown query params", () => {
  const parsed = readState(
    new URLSearchParams("apiKey=key&target_type=flow&target=flow&extra=1"),
  );
  assert.equal(parsed.flow_id, "flow");
  const shared = shareURL(
    parsed,
    "https://example.com/flows.html?target_type=flow&target=old&extra=1",
  );
  assert.equal(shared.searchParams.has("target"), false);
  assert.equal(shared.searchParams.get("flow_id"), "flow");
});
test("explicit controls override custom JSON and clear a stale JSON region", () => {
  const input = state({
    config:
      '{"user":{"country":"FR","region":"IDF","userContext":{"other":1}},"app":{"sdkVersion":"old"},"notice":{"enable":false}}',
    apply_conf: "1",
    country: "US",
    age: "0",
    organization_user_id: "tester",
    attributes: '{"plan":"premium"}',
    page_category: "news",
    commit_hash: "a".repeat(40),
  });
  const config = buildConfig(input);
  assert.equal(config.user.country, "US");
  assert.equal(config.user.region, undefined);
  assert.equal(config.user.age, 0);
  assert.equal(config.user.organizationUserId, "tester");
  assert.deepEqual(config.user.userContext, {
    other: 1,
    attributes: { plan: "premium" },
  });
  assert.equal(config.pageCategory, "news");
  assert.equal(config.notice.enable, false);
  assert.equal(config.app.sdkVersion, "a".repeat(40));
  assert.equal(loaderURL(input).searchParams.get("country"), "US");
  assert.equal(
    loaderURL(
      state({
        config: '{"user":{"country":"FR","region":"IDF"}}',
        apply_conf: "1",
      }),
    ).searchParams.get("region"),
    "IDF",
  );
  assert.deepEqual(
    buildConfig(state({ config: '{"notice":{"enable":false}}' })),
    {},
  );
});
test("invalid inputs block loading rather than losing their values", () => {
  for (const overrides of [
    { apiKey: "" },
    { flow_id: "" },
    { environment: "draft" },
    { sdk_environment: "bad" },
    { platform: "amp" },
    { region: "CA" },
    { brand_version: "v1" },
    { age: "-1" },
    { age: "abc" },
    { country: "USA" },
    { didomi_region: "IDF" },
    { commit_hash: "abc" },
    { attributes: "[]" },
    { config: "{bad" },
    { didomiConfig: "null" },
    { "didomiConfig.notice.enable": "invalid" },
  ])
    assert.throws(() => validate(state(overrides)), JSON.stringify(overrides));
  const malformed = readState(
    new URLSearchParams("apiKey=key&flow_id=flow&config=%%%"),
  );
  assert.throws(() => validate(malformed), /JSON/);
  assert.equal(malformed.config.includes("Invalid base64"), true);
});
test("widget and layer options use the Flows API shape and omit blank values", () => {
  assert.equal(widgetOptions(state()), undefined);
  assert.deepEqual(
    widgetOptions(state({ widget_id: "widget", layer_name: "preferences" })),
    { widgetId: "widget", layerName: "preferences" },
  );
  assert.deepEqual(widgetOptions(state({ layer_name: "preferences" })), {
    layerName: "preferences",
  });
});

test("CTV UI override keeps web targeting and overrides only the local app flag", () => {
  const input = state({
    platform: "web",
    ctv_ui: "1",
    apply_conf: "1",
    config: '{"app":{"ctvEnabled":false,"name":"Existing"}}',
  });
  assert.deepEqual(buildConfig(input).app, {
    ctvEnabled: true,
    name: "Existing",
  });
  const url = loaderURL(input);
  assert.equal(url.searchParams.get("platform"), "web");
  assert.equal(url.searchParams.has("ctv_ui"), false);
  assert.deepEqual(
    readState(shareURL(input, "https://example.com/flows.html").searchParams),
    input,
  );
  assert.equal(buildConfig(state()).app, undefined);
});

test("Web and CTV loader options offer only automatic or GVL inclusion", () => {
  for (const platform of ["web", "ctv"]) {
    assert.equal(
      loaderURL(state({ platform, opts: "" })).searchParams.has("opts"),
      false,
    );
    assert.equal(
      loaderURL(state({ platform, opts: "gvl" })).searchParams.get("opts"),
      "gvl",
    );
    for (const opts of [
      "minTCFVersion:2.3",
      "gvl,minTCFVersion:2.3",
      "env:staging",
      "unknown",
    ])
      assert.throws(
        () => loaderURL(state({ platform, opts })),
        /Unsupported loader options/,
      );
  }
  assert.equal(readState(new URLSearchParams("opts=GVL")).opts, "gvl");
});
