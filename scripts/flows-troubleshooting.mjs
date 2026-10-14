import { checkConfig, eventSuggestion } from "./flows-checks.mjs";

export function createTroubleshooting(root) {
  root.dataset.initialized = "true";
  let config;
  let state = {};
  let scheduled = false;
  const findings = root.querySelector("#config-findings");
  const events = root.querySelector("#runtime-events");
  const summary = root.querySelector("#troubleshooting-summary");
  function text(tag, value) {
    const element = document.createElement(tag);
    element.textContent = value;
    return element;
  }
  function render() {
    scheduled = false;
    const issues = checkConfig(config, state);
    findings.replaceChildren();
    for (const issue of issues) {
      const item = document.createElement("li");
      item.dataset.severity = issue.severity;
      const evidence = document.createElement("details");
      evidence.append(
        text("summary", "Observed config"),
        text("p", issue.evidence),
      );
      item.append(
        text("strong", `${issue.severity}: ${issue.title}`),
        text("p", issue.suggestion),
        evidence,
      );
      findings.append(item);
    }
    if (!issues.length)
      findings.append(
        text(
          "li",
          "No issues found by these config checks. This does not confirm that all rules match or that a widget rendered.",
        ),
      );
    const captured = window.flowDebugCapture?.entries || [];
    events.replaceChildren();
    for (const entry of [...captured].reverse()) {
      const item = document.createElement("li");
      item.dataset.severity = entry.level;
      const detail = document.createElement("details");
      detail.append(
        text(
          "summary",
          `${entry.level} · ${entry.kind} · ${entry.message.slice(0, 160)}${entry.count > 1 ? ` (×${entry.count})` : ""}`,
        ),
      );
      detail.append(
        text("pre", [entry.message, entry.detail].filter(Boolean).join("\n")),
        text("p", `Double-check: ${eventSuggestion(entry)}`),
      );
      item.append(detail);
      events.append(item);
    }
    if (!captured.length)
      events.append(
        text("li", "No warnings or errors captured during this page load."),
      );
    const errors = issues.filter((issue) => issue.severity === "error").length;
    const warnings = issues.filter(
      (issue) => issue.severity === "warning",
    ).length;
    summary.textContent = `${errors} setup errors · ${warnings} setup warnings · ${captured.length} captured runtime messages${window.flowDebugCapture?.dropped ? ` · ${window.flowDebugCapture.dropped} older messages discarded` : ""}. Checks use the last loaded config and applied settings; Console publication status is not accessible here.`;
  }
  window.addEventListener("flows-debug-update", () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(render);
    }
  });
  root
    .querySelector("#clear-runtime-events")
    .addEventListener("click", () => window.flowDebugCapture?.clear());
  render();
  return {
    update(nextConfig, nextState) {
      config = nextConfig;
      state = nextState;
      render();
    },
  };
}
