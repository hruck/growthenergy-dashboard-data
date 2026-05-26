// Populates headline number tiles from data/metrics.json so the monthly
// refresh is a one-file edit (or a future R-script write) — no HTML touching.
(async function () {
  const fmt = (d) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

  let m;
  try {
    const res = await fetch("data/metrics.json", { cache: "no-store" });
    m = await res.json();
  } catch (e) {
    console.error("Could not load metrics.json", e);
    return;
  }

  // Fill any element with data-metric="dot.path" from the JSON.
  // Optional data-field="value|label|note|unit" (defaults to value).
  // For source objects ({name,url}): text falls back to .name, and if the
  // element is a link with a non-empty url, its href is set. Empty url => the
  // <a> renders as plain, non-clickable text (e.g. internal sources).
  document.querySelectorAll("[data-metric]").forEach((el) => {
    const path = el.getAttribute("data-metric");
    const field = el.getAttribute("data-field") || "value";
    const node = path.split(".").reduce((o, k) => (o ? o[k] : undefined), m);
    if (node == null) return;
    if (typeof node === "object") {
      el.textContent = node[field] ?? node.name ?? "";
      if (el.tagName === "A") {
        if (node.url) {
          el.href = node.url;
          el.target = "_blank";
          el.rel = "noopener";
        } else {
          el.removeAttribute("href");
        }
      }
    } else {
      el.textContent = node;
    }
  });

  // Header meta
  const meta = m.meta || {};
  setText("dash-title", meta.title);
  setText("dash-version", meta.version ? "Version " + meta.version : "");
  if (meta.updated) setText("dash-updated", fmt(meta.updated));
  if (meta.nextUpdate) setText("dash-next", fmt(meta.nextUpdate));

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el && val != null) el.textContent = val;
  }
})();
