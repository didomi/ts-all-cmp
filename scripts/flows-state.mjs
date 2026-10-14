// Query helpers for the public Consent Flows sandbox.
const field = (key, label, hint = "", options) => ({
  key,
  label,
  hint,
  options,
});
export const groups = [
  {
    title: "Flow and deployment",
    hint: "The deployment environment selects published Flow content. The SDK environment selects the infrastructure serving it.",
    fields: [
      field(
        "apiKey",
        "Public API key",
        "Identifies the Console organization whose Flow you want to test. Copy the public API key from the Flow’s Publishing tab. Required; use a public key, not a private API key.",
      ),
      field(
        "flow_id",
        "Flow ID",
        "Chooses the published Flow to load. Copy its Flow ID from Console → Flows → Publishing. Required; this is not a widget or legacy notice ID.",
      ),
      field(
        "environment",
        "Flow deployment",
        "Chooses which published version of the Flow to test. Use production for live content or staging for a test publication. Unsaved drafts are not loaded.",
        ["production", "staging"],
      ),
      field(
        "sdk_environment",
        "SDK environment",
        "Chooses where the SDK is loaded from. Keep production for normal testing; use staging or preprod only when testing there with your Didomi contact. This is separate from the Flow’s publication environment.",
        ["production", "staging", "preprod"],
      ),
      field(
        "platform",
        "Platform",
        "Chooses the type of published content to request: web for websites, ctv for connected TVs. Match the Flow’s platform in Console. To preview CTV UI with web content, keep web and enable Force CTV UI.",
        ["web", "ctv"],
      ),
      field(
        "ctv_ui",
        "Force CTV UI",
        "Asks the SDK to use its TV-style consent UI for this test. Keep Platform set to web to test web content this way. Leave unchanged for normal behavior. This does not redesign a widget for TV.",
        ["", "1"],
      ),
      field(
        "commit_hash",
        "SDK commit hash",
        "Tests a specific SDK build. Leave blank for the normal build, enter a full 40-character commit hash, or use latest for the latest available build. A build pinned in the published configuration can take priority.",
      ),
    ],
  },
  {
    title: "Delivery overrides",
    hint: "Choose which published content to load for this test. For normal location testing, set Country and Region here and leave the runtime location fields blank.",
    fields: [
      field(
        "country",
        "Country",
        "Selects content for this country. Example: US for the United States. Leave blank to use your detected location.",
      ),
      field(
        "region",
        "Region",
        "A state or subdivision within the country. Example: Country US + Region CA tests California. Requires Country.",
      ),
      field(
        "regulation",
        "Regulation",
        "Requests a particular regulation from this Flow, such as gdpr or cpra. Leave blank to choose by location. The regulation must be included in the selected published Flow.",
      ),
      field(
        "lang",
        "Requested language",
        "Requests configuration content for a language, such as fr or en-US. Leave blank for normal language delivery. This only reduces the downloaded languages when the published configuration allows it; it does not force the language displayed to the visitor.",
      ),
      field(
        "brand",
        "Brand config ID",
        "Tries a different brand for this test, using its brand configuration ID. Leave blank to keep the Flow’s brand. This changes the returned configuration for this test, not the saved brand selection in Console.",
      ),
      field(
        "brand_version",
        "Brand version ID",
        "Tests a specific saved version of the brand entered above. Leave blank to use that brand’s latest version. Requires a Brand config ID; without a brand override, the Flow keeps its published brand reference.",
      ),
      {
        ...field(
          "opts",
          "Loader options",
          "Controls whether IAB vendor-list data is explicitly requested with the SDK. Keep Automatic for normal testing; select Include IAB Global Vendor List only when investigating vendor-list availability.",
          ["", "gvl"],
        ),
        optionLabels: {
          "": "Automatic — let the loader decide",
          gvl: "Include IAB Global Vendor List (gvl)",
        },
        tooltip:
          "Automatic: omit opts and let the loader include vendor-list data when needed.\nInclude IAB Global Vendor List: sends opts=gvl to loader.js, requesting vendor-list data even when the selected regulation would not normally include it. For example, use it to investigate missing IAB vendor-list data while testing a non-GDPR location.\nFor GDPR or a configuration that already uses IAB, the data is normally included automatically, so choosing gvl may make no visible difference. This option does not enable TCF, change its version, or select an environment. Use Flow deployment for staging/production. These choices affect loader.js; this page does not separately request the config JSON endpoint.",
      },
      field(
        "ts",
        "Cache key",
        "Uses a different cached response for this request. Leave blank normally, or enter a new value such as test-2 after publishing when checking for an older cached response. This does not publish your draft or clear saved consent.",
      ),
    ],
  },
  {
    title: "SDK URL overrides",
    hint: "Temporarily changes how the loaded SDK behaves. Use published setting keeps the Flow’s value; On and Off explicitly override it for this test. Some options apply only to the SDK’s standard notice, not to every widget layout.",
    note: "Why are there two sets of location fields? Delivery Country and Region choose the content to download. Runtime country and region below only change the location used by widget display rules after loading. Usually leave them blank so both stages use the same location. For example, loading US / CA and setting Runtime country to FR keeps the California configuration while testing widget rules as if you were in France; it does not load a GDPR configuration.",
    fields: [
      field(
        "didomiConfig.notice.enable",
        "Enable notice",
        "Controls whether the SDK is allowed to display the consent notice automatically. On allows display when other display conditions are met; Off disables automatic notice display. Use published setting for normal testing; On does not guarantee a widget will appear.",
        ["", "true", "false"],
      ),
      field(
        "didomiConfig.notice.showDataProcessing",
        "Show data processing",
        "Shows or hides the list of data-processing purposes in supported standard notices. Use this to compare a notice with and without that list. Use published setting to keep the normal content; custom widgets may not use this option.",
        ["", "true", "false"],
      ),
      field(
        "didomiConfig.experiment.group",
        "Experiment group",
        "Assigns this test to a named experiment group, such as test. Use a group expected by your experiment setup. Leave blank for normal assignment; entering a name alone does not create a different widget design.",
      ),
      field(
        "didomiConfig.app.vendors.iab.version",
        "IAB version",
        "Overrides the IAB TCF major version used by the SDK’s IAB settings, for example 2. This is an advanced compatibility test; leave blank normally. It does not select a TCF minor revision such as 2.3 or 2.4.",
      ),
      field(
        "didomiConfig.app.alwaysDisplayActionButtons",
        "Always display action buttons",
        "Keeps consent action buttons accessible while long content scrolls in supported standard notices and preference screens. Use this for small-screen or long-content testing. Use published setting for normal behavior; custom widgets control their own layout.",
        ["", "true", "false"],
      ),
      field(
        "didomiConfig.user.externalConsent.value",
        "External consent value",
        "Supplies existing consent choices from another integration as JSON. Only applies when the loaded configuration already enables external consent. Leave blank normally. This can set actual test-user consent choices; it is not just a display setting.",
      ),
      field(
        "didomiConfig.sync.enabled",
        "Enable sync",
        "Controls whether consent choices are synchronized with stored choices for an identified user, when the integration supports it. On permits synchronization; Off disables it for this test. Use published setting normally; turning it on alone does not configure user identification.",
        ["", "true", "false"],
      ),
      field(
        "didomi_country",
        "Runtime country",
        "Advanced: usually leave blank. Changes the country used by widget display rules without downloading different content. Example: FR for France.",
      ),
      field(
        "didomi_region",
        "Runtime region",
        "Advanced: usually leave blank. Changes the state or subdivision used by widget display rules, without changing the downloaded configuration. Example: CA for California when testing the US. The SDK reads two letters.",
      ),
      {
        ...field(
          "didomiConfig",
          "Native URL config JSON",
          "Advanced: sets several of the SDK URL overrides together as a JSON object. Only the seven supported settings listed above are accepted by the SDK. Leave blank to use individual inputs; if both specify the same setting, the individual input wins.",
        ),
        type: "textarea",
      },
    ],
  },
  {
    title: "Rules context",
    hint: "Provides sample visitor details for testing widget display rules. Only conditions configured in your Flow use these values. Existing consent choices and the browser’s Global Privacy Control signal are not replaced here.",
    fields: [
      field(
        "organization_user_id",
        "Organization user ID",
        "Supplies a visitor ID for testing rules that distinguish identified from anonymous visitors. Leave blank normally. Use a test ID: depending on the published setup, this may also activate consent synchronization for that identity; it does not sign you into Console.",
      ),
      field(
        "age",
        "Age",
        "Supplies a sample visitor age for age-based display rules, such as 18. Enter a whole number; leave blank to use the loaded configuration. This does not verify the visitor’s real age.",
      ),
      field(
        "page_category",
        "Page category",
        "Labels this page for category-based display rules, for example news or checkout. Use a category your Flow’s rules expect. Leave blank to use the loaded configuration; it does not change this page’s URL.",
      ),
      {
        ...field(
          "attributes",
          "Custom attributes JSON",
          'Supplies sample visitor attributes for custom display rules, for example {"plan":"premium"}. Use attribute names and values your Flow expects. Leave blank for the loaded configuration; entering attributes does not create new rules.',
        ),
        type: "textarea",
      },
    ],
  },
  {
    title: "SDK configuration and tools",
    hint: "Advanced test tools. These settings change only this sandbox session; they do not save edits to your Flow in Console. Explicit inputs above take priority over conflicting custom JSON values.",
    fields: [
      field(
        "gpp_stub",
        "Load GPP stub",
        "Installs a temporary GPP API before the SDK starts, so other page scripts can queue GPP calls during loading. Use it to test a site’s GPP integration. Leave off normally; it does not enable GPP in the Flow. A TCF startup API is already installed.",
        ["", "1"],
      ),
      field(
        "apply_conf",
        "Apply custom JSON",
        "Applies the custom configuration entered below when the page reloads. Leave off to keep the JSON in your share link without applying it. More specific inputs above take priority over conflicting values.",
        ["", "1"],
      ),
      field(
        "widget_id",
        "Widget ID",
        "Chooses a particular widget when you click Show widget. It must be included in the loaded Flow configuration. Leave blank to let the Flow’s rules choose; this input does not change automatic display at startup.",
      ),
      field(
        "layer_name",
        "Layer name",
        "Chooses which screen or layer opens when you click Show widget. Enter a layer name defined by that widget. Leave blank to use its normal opening screen; this does not create a new layer.",
      ),
      {
        ...field(
          "config",
          "Custom didomiConfig JSON",
          "Advanced: supplies a JSON object with configuration changes for this test. Turn on Apply custom JSON and reload to use it. Leave blank for the published configuration plus the inputs above. It is saved in the share link, not back to Console.",
        ),
        type: "textarea",
      },
    ],
  },
];
export const fields = groups.flatMap((group) => group.fields);
const hosts = {
  production: "https://sdk.privacy-center.org/",
  staging: "https://sdk.staging.privacy-center.org/",
  preprod: "https://sdk-preprod.privacy-center.org/",
};
const defaults = {
  environment: "production",
  sdk_environment: "production",
  platform: "web",
};
const loaderKeys = [
  "platform",
  "country",
  "region",
  "regulation",
  "lang",
  "brand",
  "brand_version",
  "opts",
  "ts",
];
export function encodeConfig(value) {
  return btoa(
    Array.from(new TextEncoder().encode(value), (byte) =>
      String.fromCharCode(byte),
    ).join(""),
  );
}
export function decodeConfig(value) {
  return new TextDecoder("utf-8", { fatal: true }).decode(
    Uint8Array.from(atob(value), (char) => char.charCodeAt(0)),
  );
}
export function readState(params) {
  const state = Object.fromEntries(
    fields.map(({ key }) => [key, params.get(key) ?? defaults[key] ?? ""]),
  );
  // Also accept a loader-style target URL pasted into the sandbox.
  if (!state.flow_id && params.get("target_type") === "flow")
    state.flow_id = params.get("target") || "";
  if (state.opts.trim().toLowerCase() === "gvl") state.opts = "gvl";
  if (state.config) {
    try {
      state.config = decodeConfig(state.config);
    } catch {
      state.config = "Invalid base64 config. Replace this with a JSON object.";
    }
  }
  return state;
}
export function shareURL(state, href) {
  const url = new URL(href);
  for (const { key } of fields) {
    url.searchParams.delete(key);
    if (state[key] !== "" && state[key] !== undefined) {
      url.searchParams.set(
        key,
        key === "config" ? encodeConfig(state[key]) : state[key],
      );
    }
  }
  // Normalize accepted loader aliases, keeping unrelated page query parameters.
  url.searchParams.delete("target");
  url.searchParams.delete("target_type");
  return url;
}
function objectJSON(text, label) {
  let value;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be a JSON object.`);
  return value;
}
export function validate(state, requireTarget = true) {
  if (requireTarget && (!state.apiKey || !state.flow_id))
    throw new Error("Enter both a public API key and a Flow ID.");
  if (state.opts && state.opts !== "gvl")
    throw new Error(
      "Unsupported loader options. Choose Automatic or gvl; other tokens do not affect this Web/CTV loader.",
    );
  for (const { key, options } of fields) {
    if (options && !options.includes(state[key] ?? ""))
      throw new Error(`Unsupported value for ${key}.`);
  }
  for (const key of ["country", "didomi_country", "didomi_region"]) {
    if (state[key] && !/^[A-Za-z]{2}$/.test(state[key]))
      throw new Error(`${key} must contain two letters.`);
  }
  if (state.region && !state.country)
    throw new Error("Region requires a loader country.");
  if (state.brand_version && !state.brand)
    throw new Error("Brand version requires a brand config ID.");
  if (state.commit_hash && !/^([a-f0-9]{40}|latest)$/i.test(state.commit_hash))
    throw new Error(
      "SDK commit hash must be 40 hexadecimal characters or latest.",
    );
  if (
    state.age &&
    (!/^\d+$/.test(state.age) || !Number.isSafeInteger(Number(state.age)))
  )
    throw new Error("Age must be a non-negative whole number.");
  if (
    state["didomiConfig.app.vendors.iab.version"] &&
    !/^\d+$/.test(state["didomiConfig.app.vendors.iab.version"])
  )
    throw new Error("IAB version must be a whole number.");
  for (const key of ["config", "attributes", "didomiConfig"]) {
    if (state[key])
      objectJSON(state[key], fields.find((field) => field.key === key).label);
  }
}
export function buildConfig(state) {
  const config =
    state.apply_conf === "1" && state.config
      ? objectJSON(state.config, "Custom config")
      : {};
  const user = () => {
    if (
      !config.user ||
      typeof config.user !== "object" ||
      Array.isArray(config.user)
    )
      config.user = {};
    return config.user;
  };
  if (state.commit_hash || state.ctv_ui === "1") {
    if (
      !config.app ||
      typeof config.app !== "object" ||
      Array.isArray(config.app)
    )
      config.app = {};
    if (state.commit_hash) config.app.sdkVersion = state.commit_hash;
    if (state.ctv_ui === "1") config.app.ctvEnabled = true;
  }
  if (state.country) {
    user().country = state.country;
    // Avoid combining an explicit country with a stale JSON region.
    delete user().region;
  }
  if (state.region) user().region = state.region;
  if (state.organization_user_id)
    user().organizationUserId = state.organization_user_id;
  if (state.age) user().age = Number(state.age);
  if (state.page_category) config.pageCategory = state.page_category;
  if (state.attributes) {
    if (
      !user().userContext ||
      typeof user().userContext !== "object" ||
      Array.isArray(user().userContext)
    )
      user().userContext = {};
    user().userContext.attributes = objectJSON(
      state.attributes,
      "Custom attributes",
    );
  }
  return config;
}
export function loaderURL(state) {
  validate(state);
  const config = buildConfig(state);
  const url = new URL(
    `${encodeURIComponent(state.apiKey)}/loader.js`,
    hosts[state.sdk_environment],
  );
  url.searchParams.set("target_type", "flow");
  url.searchParams.set("target", state.flow_id);
  // Match the generated production embed: no environment parameter needed.
  if (state.environment === "staging")
    url.searchParams.set("environment", "staging");
  for (const key of loaderKeys)
    if (state[key]) url.searchParams.set(key, state[key]);
  // Match the generated Flow embed's window-config geo forwarding.
  if (config.user?.country) {
    url.searchParams.set("country", config.user.country);
    if (config.user.region) url.searchParams.set("region", config.user.region);
  }
  return url;
}
export function widgetOptions(state) {
  const options = {};
  if (state.widget_id) options.widgetId = state.widget_id;
  if (state.layer_name) options.layerName = state.layer_name;
  return Object.keys(options).length ? options : undefined;
}

export function widgetDiagnostics(config) {
  const widgets = Object.entries(config?.widgets || {});
  return {
    widgetIds: widgets.map(([id]) => id),
    defaultWidgetId: config?.defaultWidgetId ?? null,
    ruleCount: Array.isArray(config?.rules) ? config.rules.length : 0,
    missingBundleUrls: widgets
      .filter(([, definition]) => {
        const url =
          Array.isArray(definition?.bundleUrls) && definition.bundleUrls.length
            ? definition.bundleUrls[0]
            : definition?.bundleUrl;
        return !url;
      })
      .map(([id]) => id),
  };
}
