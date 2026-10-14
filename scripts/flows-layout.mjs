export function createWorkspace() {
  const tabs = [...document.querySelectorAll('[role="tab"][data-panel]')];
  function activate(name, changeHash = false) {
    for (const tab of tabs) {
      const active = tab.dataset.panel === name;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(`${tab.dataset.panel}-panel`).hidden = !active;
    }
    if (changeHash) history.replaceState(null, "", `#${name}`);
  }
  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener("click", () => activate(tab.dataset.panel, true));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
      if (event.key === "ArrowLeft")
        next = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next !== undefined) {
        event.preventDefault();
        activate(tabs[next].dataset.panel, true);
        tabs[next].focus();
      }
    });
  }
  function fromHash() {
    const hash = location.hash.slice(1);
    if (hash === "config" || hash === "loaded-config-title") activate("config");
    else if (
      hash === "test" ||
      hash === "troubleshooting-title" ||
      hash === "runtime-title"
    )
      activate("test");
    else if (hash.startsWith("setup-group-")) {
      activate("setup");
      const group = document.getElementById(hash);
      if (group) {
        group.open = true;
        group.scrollIntoView({ block: "start" });
      }
    } else activate("setup");
  }
  window.addEventListener("hashchange", fromHash);
  fromHash();
  if (history.state?.flowsApplyReload) {
    history.replaceState(null, "", location.href);
    const landOnTest = () => {
      requestAnimationFrame(() => {
        document.getElementById("runtime-title").focus({ preventScroll: true });
        window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        history.scrollRestoration = "auto";
      });
    };
    if (document.readyState === "complete") landOnTest();
    else window.addEventListener("load", landOnTest, { once: true });
  }
  return { activate };
}
