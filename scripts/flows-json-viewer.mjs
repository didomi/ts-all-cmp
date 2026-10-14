// Lazy rendering keeps large vendor catalogs out of the DOM until expanded.
export function createJSONViewer(root) {
  let snapshot;
  const tree = root.querySelector("#config-tree");
  const plain = root.querySelector("#loaded-config");
  const treeButton = root.querySelector("#config-tree-mode");
  const plainButton = root.querySelector("#config-plain-mode");
  const expand = root.querySelector("#expand-config");
  const collapse = root.querySelector("#collapse-config");
  const objectLike = (value) => value !== null && typeof value === "object";

  function node(key, value, path) {
    if (!objectLike(value)) {
      const line = document.createElement("div");
      line.className = "json-leaf";
      const name = document.createElement("span");
      name.className = "json-key";
      name.textContent = `${JSON.stringify(key)}: `;
      const content = document.createElement("span");
      content.className = `json-${value === null ? "null" : typeof value}`;
      content.textContent = JSON.stringify(value);
      line.append(name, content);
      return line;
    }
    const branch = document.createElement("details");
    branch.dataset.jsonPath = path;
    const summary = document.createElement("summary");
    const keys = Object.keys(value);
    summary.textContent = `${key === "$" ? "$" : JSON.stringify(key)}: ${Array.isArray(value) ? "[" : "{"} ${keys.length} ${Array.isArray(value) ? "items ]" : "properties }"}`;
    const children = document.createElement("div");
    children.className = "json-children";
    // Render in pages, including during Expand all. This bounds DOM size even
    // for very large configs; unrendered values remain in the complete plain JSON.
    let offset = 0;
    const more = document.createElement("button");
    more.type = "button";
    more.textContent = "Show next 100 entries";
    function appendPage() {
      const end = Math.min(offset + 100, keys.length);
      const fragment = document.createDocumentFragment();
      while (offset < end) {
        const name = keys[offset++];
        fragment.append(
          node(
            name,
            value[name],
            `${path}/${name.replaceAll("~", "~0").replaceAll("/", "~1")}`,
          ),
        );
      }
      children.insertBefore(fragment, more);
      more.hidden = offset === keys.length;
    }
    children.append(more);
    more.addEventListener("click", appendPage);
    branch.addEventListener("toggle", () => {
      if (branch.open && offset === 0) appendPage();
    });
    branch.append(summary, children);
    // Called synchronously by Expand all so it need not wait for toggle events.
    branch.expandJSON = () => {
      branch.open = true;
      if (offset === 0) appendPage();
    };
    return branch;
  }
  function mode(isTree) {
    tree.hidden = !isTree;
    plain.hidden = isTree;
    treeButton.setAttribute("aria-pressed", String(isTree));
    plainButton.setAttribute("aria-pressed", String(!isTree));
    expand.hidden = collapse.hidden = !isTree;
  }
  treeButton.addEventListener("click", () => mode(true));
  plainButton.addEventListener("click", () => mode(false));
  expand.addEventListener("click", () => {
    // Each branch materializes at most its first 100 entries. Do not traverse
    // unbounded subtrees in one click; the button explains this limit.
    const queue = [...tree.children];
    let budget = 1000;
    while (queue.length && budget-- > 0) {
      const item = queue.shift();
      if (item.tagName !== "DETAILS") continue;
      item.expandJSON();
      queue.push(...item.querySelector(".json-children").children);
    }
    root.querySelector("#loaded-config-status").textContent =
      "Expanded up to 1,000 sections; large collections show 100 entries at a time. Plain JSON and Copy JSON include the complete response.";
  });
  collapse.addEventListener("click", () =>
    tree.querySelectorAll("details").forEach((branch) => {
      branch.open = false;
    }),
  );
  mode(true);
  return {
    showPlain() {
      mode(false);
    },
    update(config) {
      // A JSON snapshot renders only JSON data and preserves the copy output.
      const json = JSON.stringify(config, null, 2);
      plain.textContent = json ?? "The SDK returned no configuration.";
      if (json !== undefined && json === snapshot) return;
      snapshot = json;
      tree.replaceChildren();
      if (json === undefined) {
        tree.textContent = plain.textContent;
        return;
      }
      const branch = node("$", JSON.parse(json), "");
      tree.append(branch);
      branch.expandJSON?.();
    },
    error(text) {
      snapshot = undefined;
      plain.textContent = text;
      tree.textContent = text;
    },
  };
}
