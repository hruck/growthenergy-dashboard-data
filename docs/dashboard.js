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

// ---------------------------------------------------------------------------
// Ranked bar lists (e.g. Top 10 States). Renders a compact name+bar+value list
// from a repo CSV — reads the raw GitHub URL so it stays in sync with the same
// CSVs that feed Flourish (GitHub Pages only serves /docs, not the repo root).
//
// Markup: <div class="barlist" data-csv="retail/fuel_ethanol_by_state.csv"
//              data-label="state_name" data-value="million_gallons" data-top="10"></div>
// ---------------------------------------------------------------------------
(function () {
  const DATA_BASE =
    "https://raw.githubusercontent.com/hruck/growthenergy-dashboard-data/main/";

  // Minimal CSV parse — these repo CSVs are clean (no quoted/embedded commas).
  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    const headers = lines[0].split(",");
    return lines.slice(1).map((line) => {
      const cells = line.split(",");
      return Object.fromEntries(headers.map((h, i) => [h, cells[i]]));
    });
  }

  document.querySelectorAll(".barlist[data-csv]").forEach(async (el) => {
    const labelKey = el.dataset.label;
    const valueKey = el.dataset.value;
    const topN = parseInt(el.dataset.top || "10", 10);

    try {
      const res = await fetch(DATA_BASE + el.dataset.csv, { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const rows = parseCSV(await res.text())
        .map((r) => ({ label: r[labelKey], value: parseFloat(r[valueKey]) }))
        .filter((r) => r.label && !Number.isNaN(r.value))
        .sort((a, b) => b.value - a.value)
        .slice(0, topN);

      const max = rows.length ? rows[0].value : 1;
      el.innerHTML = rows
        .map(
          (r) => `
        <div class="barlist__row">
          <span class="barlist__name" title="${r.label}">${r.label}</span>
          <span class="barlist__track"><span class="barlist__bar" style="width:${(r.value / max) * 100}%"></span></span>
          <span class="barlist__val">${Math.round(r.value).toLocaleString("en-US")}</span>
        </div>`
        )
        .join("");
    } catch (e) {
      console.error("bar list failed for", el.dataset.csv, e);
      el.innerHTML = '<div class="barlist__error">Could not load data.</div>';
    }
  });
})();
