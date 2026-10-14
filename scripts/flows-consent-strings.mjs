function readStoredDCS() {
  const config = window.Didomi.getConfig();
  const configuredName = config?.cookies?.didomiConsentStringCookieName;
  const name =
    typeof configuredName === "string" && configuredName.length > 0
      ? configuredName
      : "didomi_dcs";
  let cookie;
  let local;
  const blocked = [];
  try {
    const prefix = `${encodeURIComponent(name)}=`;
    const match = document.cookie
      .split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(prefix));
    if (match) cookie = decodeURIComponent(match.slice(prefix.length));
  } catch {
    blocked.push("cookies");
  }
  try {
    local = window.localStorage.getItem(name);
  } catch {
    blocked.push("local storage");
  }
  const value = cookie || local || "";
  let description = value
    ? `Stored DCS read from ${cookie ? "cookie" : "local storage"} “${name}”. This saved value may differ from the current SDK state.`
    : `No saved DCS was found under “${name}”. DCS may not be enabled, or choices may not have been saved yet. Check your published Flow settings and browser storage.`;
  if (cookie && local && cookie !== local)
    description +=
      " Cookie and local storage values differ; the cookie value is shown. Check both stores when troubleshooting.";
  if (blocked.length)
    description += ` Could not read ${blocked.join(" and ")}; browser restrictions may prevent access.`;
  return { value, description };
}

export function createConsentStrings(section) {
  const refresh = section.querySelector("#read-consent-strings");
  const feedback = section.querySelector("#consent-strings-status");
  const entries = [
    {
      key: "consent_string",
      id: "tc-string",
      name: "TC",
      framework: "IAB TCF",
    },
    { key: "gpp_string", id: "gpp-string", name: "GPP", framework: "GPP" },
    {
      id: "dcs-string",
      name: "DCS",
      read: readStoredDCS,
      decoderBase: "https://dcs-decoder.didomi.io/",
      decoderParam: "dcs",
    },
  ].map((entry) => ({
    ...entry,
    decoderBase: entry.decoderBase ?? "https://iabgpp.com/#",
    output: section.querySelector(`#${entry.id}`),
    copy: section.querySelector(`#copy-${entry.id}`),
    status: section.querySelector(`#${entry.id}-status`),
    decoder: section.querySelector(`#decode-${entry.id}`),
  }));
  function clear() {
    for (const entry of entries) {
      entry.output.value = "";
      entry.copy.disabled = true;
      if (entry.decoder) entry.decoder.href = entry.decoderBase;
    }
  }
  refresh.addEventListener("click", async () => {
    refresh.disabled = true;
    clear();
    feedback.textContent = "Reading current consent strings…";
    for (const entry of entries) entry.status.textContent = "Reading…";
    try {
      const status = await window.Didomi.getCurrentUserStatus();
      for (const entry of entries) {
        let stored;
        if (entry.read) {
          try {
            stored = entry.read();
          } catch (error) {
            stored = {
              value: "",
              description: `Could not read the stored DCS: ${error?.message || "storage information unavailable"}. Check Troubleshooting on this tab.`,
            };
          }
        }
        const value = stored ? stored.value : status?.[entry.key];
        const present = typeof value === "string" && value.trim().length > 0;
        entry.output.value = present ? value : "";
        entry.copy.disabled = !present;
        if (entry.decoder) {
          const url = new URL(entry.decoderBase);
          if (present) {
            if (entry.decoderParam)
              url.searchParams.set(entry.decoderParam, value);
            else url.hash = value;
          }
          entry.decoder.href = url.href;
        }
        entry.status.textContent = stored
          ? stored.description
          : present
            ? `Returned by Didomi.getCurrentUserStatus().${entry.key}.`
            : `No ${entry.name} string was returned. This can be expected when ${entry.framework} is not enabled or does not apply. Check the regulation’s framework settings in Console and publish any changes, then reload.`;
      }
      feedback.textContent = `Snapshot read at ${new Date().toLocaleTimeString()}. Refresh after changing consent choices to see the latest values.`;
    } catch (error) {
      clear();
      for (const entry of entries) entry.status.textContent = "Not read.";
      feedback.textContent = `Could not read consent strings: ${error?.message || "the SDK did not return a user status"}. Check Troubleshooting on this tab.`;
    } finally {
      refresh.disabled = false;
    }
  });
  for (const entry of entries) {
    entry.copy.addEventListener("click", async () => {
      if (!entry.output.value) return;
      try {
        await navigator.clipboard.writeText(entry.output.value);
        entry.status.textContent = `${entry.name} string copied. Paste it into the decoder to inspect it.`;
      } catch {
        entry.output.focus();
        entry.output.select();
        entry.status.textContent = `Copy the selected ${entry.name} string and paste it into the decoder.`;
      }
    });
  }
  return {
    setReady() {
      refresh.disabled =
        typeof window.Didomi?.getCurrentUserStatus !== "function";
      feedback.textContent = refresh.disabled
        ? "The loaded SDK does not expose getCurrentUserStatus(). Check the SDK version and Troubleshooting."
        : "Ready to read the current strings. Reading does not change consent choices.";
    },
  };
}
