import { test } from "node:test";
import assert from "node:assert/strict";
import { checkConfig, eventSuggestion } from "../scripts/flows-checks.mjs";

const valid = () => ({
  app: { apiKey: "key" },
  regulation: { name: "gdpr" },
  widgets: { widget: { bundleUrl: "https://example.com/widget.js" } },
  defaultWidgetId: "widget",
  rules: [{ id: "rule", targetWidgetId: "widget", scenarios: [] }],
});

test("valid published config does not invent missing-section errors for optional settings", () => {
  assert.deepEqual(checkConfig(valid(), { apiKey: "key" }), []);
  const findings = checkConfig({
    app: { apiKey: "key" },
    regulation: { name: "none" },
  });
  assert.deepEqual(
    findings.map((f) => f.id),
    ["regulation-none"],
  );
  assert.equal(checkConfig(undefined, { ready: false })[0].severity, "info");
  assert.equal(checkConfig(null, { ready: true })[0].severity, "error");
});
test("incomplete published assets and broken assignments produce Console actions", () => {
  const config = valid();
  config.widgets.widget = { versionId: "version" };
  config.defaultWidgetId = "missing-default";
  config.rules[0].targetWidgetId = "missing-rule-widget";
  config.brand = { versionId: "brand-version" };
  const findings = checkConfig(config, { widget_id: "requested-missing" });
  for (const id of [
    "widget-bundle-widget",
    "default-widget",
    "rule-widget-0",
    "requested-widget",
    "brand-shape",
  ])
    assert.ok(
      findings.some((f) => f.id === id),
      id,
    );
  assert.match(
    findings.find((f) => f.id === "brand-shape").suggestion,
    /Brand Manager/,
  );
  assert.match(
    findings.find((f) => f.id === "widget-bundle-widget").suggestion,
    /Flows → Privacy Widgets/,
  );
  assert.match(
    findings.find((f) => f.id === "widget-bundle-widget").suggestion,
    /does not establish an editor mistake/,
  );
  assert.ok(findings.every((f) => f.evidence && f.suggestion));
});
test("bad response shapes are diagnosed without throwing and unsafe asset URLs are rejected", () => {
  for (const value of [null, [], "bad", 4, {}])
    assert.doesNotThrow(() => checkConfig(value));
  for (const widgets of [
    null,
    [],
    "bad",
    { bad: null },
    { bad: { bundleUrl: "javascript:alert(1)" } },
  ]) {
    const findings = checkConfig({
      ...valid(),
      widgets,
      rules: [null, { scenarios: { some: true } }],
    });
    assert.ok(findings.length > 0);
  }
  const config = valid();
  config.widgets.widget = {
    bundleUrls: ["", "legacy.js"],
    bundleUrl: "https://example.com/ignored.js",
  };
  assert.ok(checkConfig(config).some((f) => f.id === "widget-bundle-widget"));
});
test("manual and URL rule conditions are guidance rather than claims of an evaluated failure", () => {
  const config = valid();
  config.rules[0].triggerMode = "manual";
  config.rules[0].scenarios = [{ scenarioId: "path_not_matches" }];
  const findings = checkConfig(config, {
    country: "FR",
    didomi_country: "US",
    pathname: "/flows.html",
  });
  for (const id of ["manual-rules", "path-rules", "geo-overrides"])
    assert.equal(findings.find((f) => f.id === id).severity, "info");
  assert.match(
    findings.find((f) => f.id === "path-rules").suggestion,
    /does not identify a winning rule/,
  );
});
test("runtime suggestions distinguish Console actions from browser restrictions", () => {
  assert.match(
    eventSuggestion({
      message: "Didomi - No bundle URL for widget",
      kind: "SDK console",
    }),
    /Flows → Privacy Widgets/,
  );
  assert.match(
    eventSuggestion({
      message: "No widgets are configured",
      kind: "SDK console",
    }),
    /Flows → Regulations/,
  );
  assert.match(
    eventSuggestion({ message: "Blocked", kind: "Resource load" }),
    /do not reveal an HTTP status/,
  );
  assert.match(
    eventSuggestion({ message: "Script error.", kind: "Page exception" }),
    /hid details/,
  );
});

test("empty or missing rules warn about widget initialization even with a valid default and asset", () => {
  for (const rules of [[], undefined]) {
    const config = { ...valid(), rules };
    const finding = checkConfig(config).find(
      (f) => f.id === "widget-rules-empty",
    );
    assert.equal(finding.severity, "warning");
    assert.match(
      finding.suggestion,
      /even with a valid default widget and bundle URL/,
    );
    assert.match(finding.suggestion, /SDK can still load/);
    assert.match(finding.suggestion, /confirm the expected behavior/);
    assert.match(finding.suggestion, /does not establish a setup error/);
  }
  for (const config of [
    valid(),
    { ...valid(), rules: "invalid" },
    { app: { apiKey: "key" }, regulation: { name: "gdpr" }, rules: [] },
  ])
    assert.equal(
      checkConfig(config).some((f) => f.id === "widget-rules-empty"),
      false,
    );
});
