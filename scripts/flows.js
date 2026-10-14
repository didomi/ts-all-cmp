import {
  groups,
  fields,
  readState,
  shareURL,
  validate,
  buildConfig,
  loaderURL,
  widgetOptions,
  widgetDiagnostics,
} from "./flows-state.mjs";
import { createJSONViewer } from "./flows-json-viewer.mjs";
import { createTroubleshooting } from "./flows-troubleshooting.mjs";
import { createConsentStrings } from "./flows-consent-strings.mjs";
import { createPathTest } from "./flows-path-test.mjs";
import { createWorkspace } from "./flows-layout.mjs";

const form = document.querySelector("#flow-form");
const status = document.querySelector("#status");
const info = document.querySelector("#runtime-info");
const consentStrings = createConsentStrings(
  document.querySelector("#consent-strings"),
);
const pathTest = createPathTest(document.querySelector("#path-test"));
const controls = new Map();
const initial = readState(new URLSearchParams(location.search));
let applied;
let ready = false;
let readyTimer;
const viewer = createJSONViewer(
  document.querySelector('section[aria-labelledby="loaded-config-title"]'),
);
const troubleshooting = createTroubleshooting(
  document.querySelector("#troubleshooting"),
);

function message(text, error = false) {
  status.textContent = text;
  status.dataset.error = String(error);
}
for (const [groupIndex, group] of groups.entries()) {
  const section = document.createElement("details");
  section.className = "setup-group";
  section.id = `setup-group-${groupIndex}`;
  section.open = groupIndex === 0;
  const summary = document.createElement("summary");
  summary.textContent = group.title;
  const link = document.createElement("a");
  link.href = `#${section.id}`;
  link.textContent = group.title;
  link.addEventListener("click", () => {
    section.open = true;
  });
  document.querySelector("#setup-navigation").append(link);
  const fieldset = document.createElement("fieldset");
  const legend = document.createElement("legend");
  legend.textContent = group.title;
  legend.className = "sr-only";
  const hint = document.createElement("p");
  hint.className = "hint";
  hint.textContent = group.hint;
  const grid = document.createElement("div");
  grid.className = "fields";
  for (const field of group.fields) {
    const label = document.createElement("label");
    label.textContent = field.label;
    label.title = `URL parameter: ${field.key}`;
    const input = document.createElement(
      field.options
        ? "select"
        : field.type === "textarea"
          ? "textarea"
          : "input",
    );
    input.id = field.key;
    input.name = field.key;
    if (field.options) {
      for (const value of field.options) {
        const option = document.createElement("option");
        option.value = value;
        const defaultLabels = {
          "": ["gpp_stub", "apply_conf"].includes(field.key)
            ? "Off"
            : "Use published setting",
          true: "On",
          false: "Off",
          1: field.key === "ctv_ui" ? "Force CTV UI" : "On",
        };
        option.textContent =
          field.optionLabels?.[value] ?? defaultLabels[value] ?? value;
        input.append(option);
      }
      // Keep unsupported incoming values visible so validation can explain them.
      if (!field.options.includes(initial[field.key])) {
        const invalid = document.createElement("option");
        invalid.value = initial[field.key];
        invalid.textContent = `Unsupported: ${initial[field.key]}`;
        input.append(invalid);
      }
    } else if (field.type !== "textarea") {
      input.type = "text";
      input.autocomplete = "off";
      input.spellcheck = false;
    }
    input.value = initial[field.key];
    if (field.tooltip) input.title = field.tooltip;
    if (["apiKey", "flow_id"].includes(field.key)) input.required = true;
    if (field.type === "textarea") input.spellcheck = false;
    label.htmlFor = input.id;
    const help = document.createElement("small");
    help.id = `${field.key}-help`;
    help.textContent = field.hint;
    input.setAttribute("aria-describedby", help.id);
    const wrapper = document.createElement("div");
    if (field.type === "textarea") wrapper.className = "wide";
    wrapper.append(label, input, help);
    if (field.tooltip) {
      const details = document.createElement("details");
      details.className = "field-help";
      const summary = document.createElement("summary");
      summary.textContent = "Examples and behavior";
      const explanation = document.createElement("p");
      explanation.textContent = field.tooltip;
      details.append(summary, explanation);
      wrapper.append(details);
    }
    grid.append(wrapper);
    controls.set(field.key, input);
  }
  fieldset.append(legend, hint, grid);
  if (group.note) {
    const explanation = document.createElement("p");
    explanation.className = "hint";
    explanation.textContent = group.note;
    fieldset.insertBefore(explanation, grid);
  }
  section.append(summary, fieldset);
  document.querySelector("#field-groups").append(section);
}
const workspace = createWorkspace();
function stateFromForm() {
  return Object.fromEntries(
    fields.map(({ key }) => [key, controls.get(key).value]),
  );
}
function preview(state, updateHistory = false) {
  const url = shareURL(state, location.href);
  document.querySelector("#share-url").value = url.href;
  if (updateHistory) history.replaceState(null, "", url);
  try {
    validate(state, false);
    document.querySelector("#effective-config").textContent = JSON.stringify(
      buildConfig(state),
      null,
      2,
    );
    if (!state.apiKey || !state.flow_id) {
      const prompt = "Enter both a public API key and a Flow ID.";
      document.querySelector("#loader-url").textContent = prompt;
      message(prompt);
      return false;
    }
    document.querySelector("#loader-url").textContent = loaderURL(state).href;
    return true;
  } catch (error) {
    document.querySelector("#loader-url").textContent = error.message;
    document.querySelector("#effective-config").textContent =
      "Fix input errors to preview the effective config.";
    message(error.message, true);
    return false;
  }
}
form.addEventListener("input", () => {
  const valid = preview(stateFromForm(), true);
  if (valid)
    message("Settings changed. Apply and reload to test this configuration.");
});
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const state = stateFromForm();
  if (!preview(state)) return;
  // Reload even if the URL was already updated while editing.
  const next = shareURL(state, location.href);
  next.hash = "test";
  history.replaceState(null, "", next);
  location.reload();
});
document.querySelector("#copy-link").addEventListener("click", async () => {
  if (!preview(stateFromForm())) return;
  try {
    await navigator.clipboard.writeText(
      document.querySelector("#share-url").value,
    );
    message("Share link copied.");
  } catch {
    const textarea = document.querySelector("#share-url");
    textarea.closest("details").open = true;
    textarea.focus();
    textarea.select();
    message("Copy the selected share link.");
  }
});
// Back/forward must restore both the form and the loaded SDK, not just the URL.
window.addEventListener("popstate", () => location.reload());

function renderRuntime() {
  const config = window.Didomi?.getConfig?.();
  const diagnostics = widgetDiagnostics(config);
  const visible = window.Didomi?.widgets?.isVisible?.();
  const noticeVisible = window.Didomi?.notice?.isVisible?.();
  const previewVisible = Boolean(
    visible || noticeVisible || window.Didomi?.preferences?.isVisible?.(),
  );
  document.querySelector("#hide-preview").hidden = !previewVisible;
  if (previewVisible)
    document
      .querySelector("#didomi-host")
      ?.removeAttribute("data-sandbox-preview-dismissed");
  const summary = document.querySelector("#runtime-summary");
  summary.replaceChildren();
  for (const [label, value] of Object.entries({
    Flow: applied.flow_id,
    Deployment: applied.environment,
    "CTV UI override": applied.ctv_ui === "1" ? "Requested" : "Off",
    Regulation: config?.regulation?.name || "Not returned",
    "Widget visible":
      visible === undefined ? "Unavailable" : visible ? "Yes" : "No",
    "Notice visible":
      noticeVisible === undefined
        ? "Unavailable"
        : noticeVisible
          ? "Yes"
          : "No",
    Widgets: diagnostics.widgetIds.join(", ") || "None returned",
    "Browser GPC":
      navigator.globalPrivacyControl === true ? "Enabled" : "Not enabled",
  })) {
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    summary.append(term, description);
  }
  info.textContent = JSON.stringify(
    {
      regulation: config?.regulation?.name ?? null,
      widgetVisible: visible ?? null,
      noticeVisible: noticeVisible ?? null,
      ...diagnostics,
      globalPrivacyControl: navigator.globalPrivacyControl === true,
      loadedSettings: {
        flowId: applied.flow_id,
        environment: applied.environment,
        sdkEnvironment: applied.sdk_environment,
        widgetOptions: widgetOptions(applied) ?? null,
      },
    },
    null,
    2,
  );
}
function renderLoadedConfig() {
  const feedback = document.querySelector("#loaded-config-status");
  const copy = document.querySelector("#copy-config");
  try {
    const config = window.Didomi?.getConfig?.();
    viewer.update(config);
    troubleshooting.update(config, {
      ...(applied || initial),
      ready,
      pathname: location.pathname,
    });
    copy.disabled = config === undefined;
    feedback.textContent =
      config === undefined
        ? "No configuration available."
        : "Loaded from Didomi.getConfig().";
  } catch (error) {
    viewer.error(`Could not read Didomi.getConfig(): ${error.message}`);
    troubleshooting.update(undefined, {
      ...(applied || initial),
      ready,
      pathname: location.pathname,
    });
    feedback.textContent = "Configuration could not be displayed.";
    copy.disabled = true;
    window.flowDebugCapture?.record(
      "Config inspection",
      "error",
      error.message,
    );
  }
}
async function runAction(action) {
  if (!ready) return;
  try {
    await action();
    renderRuntime();
    renderLoadedConfig();
  } catch (error) {
    message(`SDK action failed: ${error.message}`, true);
    window.flowDebugCapture?.record("SDK action", "error", error.message);
  }
}
const widgetProblem = document.querySelector("#widget-problem");
document
  .querySelector("#close-widget-problem")
  .addEventListener("click", () => widgetProblem.close());
document
  .querySelector("#widget-problem-troubleshooting")
  .addEventListener("click", () => {
    widgetProblem.close();
    workspace.activate("test");
    history.replaceState(null, "", "#troubleshooting-title");
    const heading = document.querySelector("#troubleshooting-title");
    heading.scrollIntoView({ block: "start", behavior: "smooth" });
    heading.focus({ preventScroll: true });
  });
document.querySelector("#show-widget").addEventListener("click", async () => {
  if (!ready) return;
  const button = document.querySelector("#show-widget");
  button.disabled = true;
  let timeout;
  try {
    if (typeof window.Didomi?.widgets?.show !== "function") {
      throw new Error("Widget controls are unavailable in the loaded SDK.");
    }
    await Promise.race([
      window.Didomi.widgets.show(widgetOptions(applied)),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                "The widget did not finish opening. It may still appear if loading completes.",
              ),
            ),
          10000,
        );
      }),
    ]);
    // Allow an asynchronous render to finish before treating a silent no-op as a failure.
    const deadline = Date.now() + 3000;
    while (
      window.Didomi.widgets.isVisible?.() === false &&
      Date.now() < deadline
    ) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (window.Didomi.widgets.isVisible?.() === false) {
      throw new Error("No widget appeared for the current test settings.");
    }
    renderRuntime();
    renderLoadedConfig();
  } catch (error) {
    const detail = error?.message || "The SDK could not display a widget.";
    message(
      "The widget could not be displayed. Read Troubleshooting on tab 2 for checks to try.",
      true,
    );
    window.flowDebugCapture?.record("Show widget", "error", detail);
    renderRuntime();
    renderLoadedConfig();
    document.querySelector("#widget-problem-detail").textContent = detail;
    if (!widgetProblem.open) widgetProblem.showModal();
  } finally {
    clearTimeout(timeout);
    button.disabled = false;
  }
});
document
  .querySelector("#hide-widget")
  .addEventListener("click", () =>
    runAction(() => window.Didomi.widgets.hide()),
  );
document.querySelector("#hide-preview").addEventListener("click", () =>
  runAction(async () => {
    // Closing the preview is a UI action; it must not record consent or reset it.
    const sdk = window.Didomi;
    if (sdk.preferences?.isVisible?.()) await sdk.preferences.hide?.();
    if (sdk.notice?.isVisible?.()) await sdk.notice.hide?.();
    if (sdk.widgets?.isVisible?.()) await sdk.widgets.hide?.();
    if (
      !sdk.notice?.isVisible?.() &&
      !sdk.preferences?.isVisible?.() &&
      !sdk.widgets?.isVisible?.()
    ) {
      document
        .querySelector("#didomi-host")
        ?.setAttribute("data-sandbox-preview-dismissed", "true");
    }
  }),
);
document.querySelector("#reset-consent").addEventListener("click", () =>
  runAction(async () => {
    await window.Didomi.reset();
    location.reload();
  }),
);
document
  .querySelector("#inspect-config")
  .addEventListener("click", renderLoadedConfig);
document.querySelector("#copy-config").addEventListener("click", async () => {
  renderLoadedConfig();
  if (document.querySelector("#copy-config").disabled) return;
  const output = document.querySelector("#loaded-config");
  const feedback = document.querySelector("#loaded-config-status");
  try {
    await navigator.clipboard.writeText(output.textContent);
    feedback.textContent = "Configuration JSON copied.";
  } catch {
    const range = document.createRange();
    viewer.showPlain();
    range.selectNodeContents(output);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    output.focus();
    feedback.textContent = "Copy the selected configuration JSON.";
  }
});

async function start() {
  if (!preview(initial)) return;
  applied = initial;
  window.didomiConfig = buildConfig(applied);
  const url = loaderURL(applied);
  window.didomiOnReady = window.didomiOnReady || [];
  window.didomiOnReady.push(() => {
    ready = true;
    consentStrings.setReady();
    pathTest.setReady();
    clearTimeout(readyTimer);
    document.querySelector("#show-widget").disabled = false;
    document.querySelector("#hide-widget").disabled =
      typeof window.Didomi?.widgets?.hide !== "function";
    document.querySelector("#reset-consent").disabled =
      typeof window.Didomi?.reset !== "function";
    document.querySelector("#inspect-config").disabled =
      typeof window.Didomi?.getConfig !== "function";
    renderRuntime();
    renderLoadedConfig();
    if (typeof window.Didomi?.on === "function") {
      for (const event of [
        "notice.shown",
        "notice.hidden",
        "preferences.shown",
        "preferences.hidden",
        "widget.shown",
        "widget.hidden",
      ])
        window.Didomi.on(event, renderRuntime);
    }
    const diagnostics = widgetDiagnostics(window.Didomi?.getConfig?.());
    if (!window.Didomi?.widgets) {
      message(
        "SDK ready, but the widgets API is unavailable. Verify the deployment and SDK version.",
        true,
      );
    } else if (!diagnostics.widgetIds.length) {
      message(
        "SDK ready, but no widgets were returned. Verify the Flow deployment, targeting, and loaded config.",
        true,
      );
    } else if (diagnostics.missingBundleUrls.length) {
      message(
        `SDK ready, but these widgets have no bundle URL: ${diagnostics.missingBundleUrls.join(", ")}. Verify Flow publishing and config delivery.`,
        true,
      );
    } else {
      message(
        "SDK ready. Inspect the loaded config and test the Flow widgets.",
      );
    }
  });
  message("Loading the Flow SDK…");
  try {
    if (applied.gpp_stub === "1") {
      // Install GPP before the loader can execute; async insertion alone races it.
      await new Promise((resolve, reject) => {
        const stub = document.createElement("script");
        stub.src = "scripts/gpp_stub.js";
        stub.onload = resolve;
        stub.onerror = () => reject(new Error("Could not load the GPP stub."));
        document.head.append(stub);
      });
    }
    // Reuse the legacy page's TCF bootstrap with the explicit Flow loader URL.
    writeSDK(
      applied.apiKey,
      applied.flow_id,
      null,
      null,
      false,
      false,
      false,
      false,
      url.href,
    );
    const loader = document.querySelector("#spcloader");
    loader.addEventListener("error", () => {
      clearTimeout(readyTimer);
      window.flowDebugCapture?.record(
        "SDK startup",
        "error",
        "Could not load the SDK loader.",
      );
      message(
        "Could not load the SDK. Check the generated loader URL and your network connection.",
        true,
      );
    });
    readyTimer = setTimeout(() => {
      if (!ready) {
        message(
          "The SDK has not become ready. Verify the API key, Flow publication, environment, and browser console.",
          true,
        );
        window.flowDebugCapture?.record(
          "SDK startup",
          "error",
          "SDK readiness timed out after 20 seconds.",
        );
      }
    }, 20000);
  } catch (error) {
    message(error.message, true);
    window.flowDebugCapture?.record("SDK startup", "error", error.message);
  }
}
start();
