// Heuristic checks of the publicly delivered config, not a publishing validator.
const isObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
export function checkConfig(config, state = {}) {
  const findings = [];
  const add = (id, severity, title, evidence, suggestion) =>
    findings.push({ id, severity, title, evidence, suggestion });
  if (!isObject(config)) {
    add(
      "config-unavailable",
      state.ready ? "error" : "info",
      "No loaded config available",
      state.ready
        ? "The SDK is ready but did not return a JSON object."
        : "The SDK has not provided a config yet.",
      "In Console, open the Flow’s Publishing tab. Confirm the public API key, Flow ID, platform, and selected staging or production environment; confirm publication completed successfully.",
    );
    return findings;
  }
  if (!isObject(config.app) || !config.app.apiKey) {
    add(
      "api-key",
      "warning",
      "Config has no public API key",
      "app.apiKey is missing.",
      "Open the Flow’s Publishing tab in the intended Console organization and copy its public API key and Flow ID. Confirm it was published to the selected environment.",
    );
  } else if (state.apiKey && config.app.apiKey !== state.apiKey) {
    add(
      "api-key-mismatch",
      "warning",
      "Loaded API key differs from this test",
      "app.apiKey does not match the applied API key.",
      "Confirm the Console organization and copy the API key from this Flow’s Publishing tab. Clear conflicting sandbox overrides and reload.",
    );
  }
  const regulation = config.regulation?.name;
  if (state.ctv_ui === "1")
    add(
      "ctv-preview",
      "info",
      "CTV UI preview is enabled",
      "This test applies app.ctvEnabled while retaining the selected delivery platform.",
      "For a web-configuration preview, keep Platform set to web. For TV-ready Flow content, verify the CTV platform and compatible widgets in Console. A CTV fallback notice appearing does not confirm that a Flow widget loaded.",
    );
  if (!regulation)
    add(
      "regulation-missing",
      "warning",
      "No regulation name in the config",
      "regulation.name is missing.",
      "In Flows → Regulations, check the attached regulations and territory coverage. In Regulation Manager, review the regulation settings. Save, apply resource updates in the Flow if offered, and publish to the selected environment.",
    );
  else if (regulation === "none")
    add(
      "regulation-none",
      "info",
      "No applicable regulation selected",
      "regulation.name is none.",
      "In Flows → Regulations, check country and region coverage. Review the regulation in Regulation Manager, or test a location covered by the Flow. No regulation can be an expected result.",
    );
  if (state.regulation && regulation && regulation !== state.regulation)
    add(
      "regulation-mismatch",
      "warning",
      "Requested regulation was not returned",
      `Requested ${state.regulation}; received ${regulation}.`,
      "In Flows → Regulations, confirm the requested regulation is attached and covers this test location. Review it in Regulation Manager, then save and publish the Flow to the selected environment.",
    );

  const catalog = isObject(config.widgets) ? config.widgets : {};
  const ids = Object.keys(catalog);
  if (config.widgets !== undefined && !isObject(config.widgets))
    add(
      "widgets-shape",
      "error",
      "Widget catalog has an unexpected shape",
      "widgets must be an object keyed by widget ID for this viewer’s checks.",
      "In Flows → Privacy Widgets, check widget assignments and save the Flow. Publish to the selected environment and retest without custom JSON. If it persists, contact support with the returned config.",
    );
  if (!ids.length && regulation !== "none")
    add(
      "widgets-empty",
      "warning",
      "No widgets in the delivered config",
      "The widget catalog is absent or empty.",
      "In Flows → Privacy Widgets, select the applicable regulation and assign its widget and default widget. Save the Flow, publish to the selected environment, and confirm publication succeeds before reloading.",
    );
  for (const [id, definition] of Object.entries(catalog)) {
    if (!isObject(definition)) {
      add(
        `widget-shape-${id}`,
        "error",
        "Widget definition is not an object",
        `widgets[${JSON.stringify(id)}] has an unexpected value.`,
        "In Flows → Privacy Widgets, confirm the widget assignment. Open that widget in the editor, save valid changes, apply any offered updates to the Flow, then publish again. Contact support if the returned definition is still incomplete.",
      );
      continue;
    }
    const url =
      Array.isArray(definition.bundleUrls) && definition.bundleUrls.length
        ? definition.bundleUrls[0]
        : definition.bundleUrl;
    if (!url) {
      add(
        `widget-bundle-${id}`,
        "error",
        "Widget has no usable bundle URL",
        `Widget ${id}${definition.versionId ? " has a version reference but" : ""} has neither a usable bundleUrls[0] nor bundleUrl.`,
        "In Flows → Privacy Widgets, confirm the intended widget is assigned and verify a successful publication to the environment selected here. If those are already correct, this finding does not establish an editor mistake: contact support to investigate missing published display assets. No arbitrary widget edit or manual asset URL is required.",
      );
    } else {
      try {
        if (
          typeof url !== "string" ||
          !["http:", "https:"].includes(new URL(url).protocol)
        )
          throw new Error();
      } catch {
        add(
          `widget-url-${id}`,
          "error",
          "Widget bundle URL is invalid",
          `Widget ${id} does not have an absolute HTTP(S) asset URL.`,
          "Save the widget in its editor, apply any offered updates in Flows → Privacy Widgets, and publish the Flow again. Retest without custom JSON; contact support if a published asset is still invalid.",
        );
      }
    }
  }
  if (config.defaultWidgetId && !has(catalog, config.defaultWidgetId))
    add(
      "default-widget",
      "error",
      "Default widget is absent from the catalog",
      `defaultWidgetId is ${config.defaultWidgetId}.`,
      "In Flows → Privacy Widgets, select this regulation and choose a default widget that is assigned to it. Save and publish to the selected environment.",
    );
  if (state.widget_id && !has(catalog, state.widget_id))
    add(
      "requested-widget",
      "warning",
      "Requested widget is absent from the catalog",
      `The applied Widget ID is ${state.widget_id}.`,
      "Compare this Widget ID with the widgets assigned under Flows → Privacy Widgets for the selected regulation. Use an assigned ID, or clear this sandbox input to test the Flow’s normal selection.",
    );
  if (config.rules !== undefined && !Array.isArray(config.rules))
    add(
      "rules-shape",
      "error",
      "Rules have an unexpected shape",
      "rules is not an array.",
      "In Flows → Privacy Widgets, review and save the display rules. Publish to the selected environment and retest without sandbox JSON overrides. Contact support if the published rules remain incomplete.",
    );
  const rules = Array.isArray(config.rules) ? config.rules : [];
  if (
    ids.length &&
    (config.rules === undefined ||
      (Array.isArray(config.rules) && config.rules.length === 0))
  )
    add(
      "widget-rules-empty",
      "warning",
      "No display rules may prevent widget initialization",
      config.rules === undefined
        ? "The widget catalog is present, but rules is missing."
        : "The widget catalog is present, but rules is an empty array ([]).",
      "Some SDK builds skip Flow widget initialization when no display rules are present, even with a valid default widget and bundle URL. The SDK can still load and display a legacy fallback notice, while Show widget may report no widgets configured. In Flows → Privacy Widgets → Rules engine, review the intended display rules and confirm the selected environment was published. If a default-widget-only Flow is intentional, ask support to confirm the expected behavior for this SDK version; this finding alone does not establish a setup error or require an arbitrary rule.",
    );
  rules.forEach((rule, index) => {
    if (!isObject(rule) || !rule.targetWidgetId) {
      add(
        `rule-target-${index}`,
        "warning",
        "Rule has no target widget ID",
        `rules[${index}] has no targetWidgetId.`,
        "In Flows → Privacy Widgets, check the rule’s widget assignment, save, and publish the updated Flow.",
      );
    } else if (!has(catalog, rule.targetWidgetId))
      add(
        `rule-widget-${index}`,
        "error",
        "Rule points to a missing widget",
        `Rule ${rule.id || index} targets ${rule.targetWidgetId}.`,
        "In Flows → Privacy Widgets, select a widget currently assigned to this regulation for the affected rule. Save and publish the Flow.",
      );
  });
  if (ids.length && !rules.length && !config.defaultWidgetId)
    add(
      "selection-empty",
      "warning",
      "No rules or default widget select a widget",
      "Widgets are present, but no rules or defaultWidgetId were returned.",
      "In Flows → Privacy Widgets, configure a default widget and review the display rules and priorities. Save and publish. An explicit Widget ID does not bypass widget initialization in all SDK versions.",
    );
  if (rules.length && rules.every((rule) => rule?.triggerMode === "manual"))
    add(
      "manual-rules",
      "info",
      "All returned rules use manual display",
      "Every rule has triggerMode=manual.",
      "In Flows → Privacy Widgets, check whether manual display was intended. If automatic display is needed, change the rule’s trigger setting, save, and publish. Try Show widget to test the manual path.",
    );
  if (
    rules.some(
      (rule) =>
        Array.isArray(rule?.scenarios) &&
        rule.scenarios.some((scenario) =>
          /path/.test(scenario?.scenarioId || ""),
        ),
    )
  )
    add(
      "path-rules",
      "info",
      "Some rules depend on the page path",
      `This sandbox is testing pathname ${state.pathname || "/"}.`,
      "In Flows → Privacy Widgets, review the URL/path conditions along with country, authentication, age, and other conditions. Use URL-pattern test on this tab to check a different pathname. Automatic display still uses this sandbox’s real path. This finding does not identify a winning rule.",
    );
  if (config.notice?.enable === false)
    add(
      "notice-disabled",
      "info",
      "Automatic notice display is disabled",
      "notice.enable is false.",
      "First clear an unintended Enable notice or JSON override in this sandbox. In Flows → Privacy Widgets, confirm the intended display rules and publish any changes. Manual widget display can be tested separately.",
    );
  if (
    config.brand !== undefined &&
    (!isObject(config.brand) || !config.brand.brandConfigId)
  )
    add(
      "brand-shape",
      "warning",
      "Brand reference is incomplete",
      "brand is present without a brandConfigId.",
      "In Brand Manager, save the intended profile and theme. In Flows → Privacy Widgets, select the intended brand, apply offered updates, save, and publish. Clear unintended brand overrides in this sandbox.",
    );
  if (
    state.didomi_country &&
    state.country &&
    state.didomi_country.toUpperCase() !== state.country.toUpperCase()
  )
    add(
      "geo-overrides",
      "info",
      "Runtime and delivery countries differ",
      `Loader country ${state.country}; runtime country ${state.didomi_country}.`,
      "Align these sandbox countries unless testing this deliberately. Compare the test location with Flows → Regulations territory coverage and Flows → Privacy Widgets rule conditions.",
    );
  return findings;
}

export function eventSuggestion(entry) {
  const message = `${entry.message} ${entry.detail}`;
  if (entry.kind === "Content security policy")
    return "Check the page’s Content Security Policy and allow the required SDK and widget resource origins.";
  if (/no bundle url|invalid bundle url/i.test(message))
    return "Check the assignment in Flows → Privacy Widgets and confirm successful publication to the selected environment. If both are correct, contact support to investigate the published display assets. This message alone does not establish an editor mistake; do not make arbitrary edits or paste a guessed asset URL.";
  if (/no widgets are configured|not found in catalog/i.test(message))
    return "In Flows → Regulations, check territory coverage. In Flows → Privacy Widgets, check assignments and the default widget, then publish to the selected environment. Compare any explicit sandbox Widget ID with those assignments.";
  if (
    /engine not initialized|failed to initialize|no rules configuration/i.test(
      message,
    )
  )
    return "In Flows → Privacy Widgets, review the rules, priorities, and widget assignments. Save and publish the Flow. If it still fails, contact support with the captured message and returned config.";
  if (/mount|export.*mount/i.test(message))
    return "Save the widget in its editor and apply any updates offered in Flows → Privacy Widgets. Publish the Flow and retest. If it persists, contact support with this message and the returned config.";
  if (
    /timeout|timed out|failed to fetch|resource|load/i.test(message) ||
    entry.kind === "Resource load"
  )
    return "Check browser Network and Console for the affected request, connection errors, blocking extensions, CORS, or CSP. Resource events alone do not reveal an HTTP status.";
  if (/script error\.?$/i.test(entry.message.trim()))
    return "The browser hid details of a cross-origin script failure. Open DevTools Console and Network for more context.";
  return "Confirm the Flow was saved and successfully published to the environment selected here. Retest without sandbox overrides. If it persists, provide this message, the returned config, and test settings to support; a site developer may need to inspect page errors.";
}
