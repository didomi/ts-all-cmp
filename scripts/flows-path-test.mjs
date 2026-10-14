export function createPathTest(section) {
  const path = section.querySelector("#test-path");
  const check = section.querySelector("#check-path");
  const status = section.querySelector("#path-test-status");
  const output = section.querySelector("#path-test-result");
  path.value = location.pathname;
  function clear() {
    output.textContent = "";
    output.closest("details").hidden = true;
  }
  path.addEventListener("input", () => {
    clear();
    status.textContent = "Path changed. Check rules again to see the result.";
  });
  check.addEventListener("click", async () => {
    clear();
    const value = path.value.trim();
    if (
      !value.startsWith("/") ||
      value.startsWith("//") ||
      /[?#\\\u0000-\u001f]/.test(value)
    ) {
      status.textContent =
        "Enter a pathname starting with /, such as /checkout. Leave out the website domain, query string, and # fragment.";
      return;
    }
    const pathname = new URL(value, location.origin).pathname;
    path.value = pathname;
    check.disabled = true;
    status.textContent = "Checking the loaded rules…";
    try {
      const result = await window.Didomi.widgets.getApplicable({
        currentUrl: pathname,
      });
      const selection = result?.widgetId
        ? result.rule
          ? `Rule ${result.rule.id || "(unnamed)"} matched and selected widget ${result.widgetId}.`
          : `No display rule matched; the SDK returned default widget ${result.widgetId}.`
        : "No widget was returned. No rule may match, or the loaded rules or widgets may be unavailable. Check Troubleshooting.";
      status.textContent = `Tested pathname ${pathname}. ${selection} This check does not display a widget or change the page’s path.`;
      output.textContent = JSON.stringify(
        { pathname, result: result ?? null },
        null,
        2,
      );
      output.closest("details").hidden = false;
    } catch (error) {
      status.textContent = `Could not check path rules: ${error?.message || "the SDK query failed"}. Check Troubleshooting.`;
      window.flowDebugCapture?.record(
        "URL-pattern test",
        "error",
        error?.message || "Rules query failed",
      );
    } finally {
      check.disabled = false;
    }
  });
  return {
    setReady() {
      check.disabled =
        typeof window.Didomi?.widgets?.getApplicable !== "function";
      status.textContent = check.disabled
        ? "This SDK version does not provide rules testing. Check the SDK version used by your published Flow."
        : "Ready. Enter a test path and check which widget the loaded rules would select.";
    },
  };
}
