const REFRESH_MS = 30_000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SVG_NS = "http://www.w3.org/2000/svg";

const FILTERS = [
  { id: "all", label: "All", test: () => true },
  { id: "signedIn", label: "Signed in", test: (u) => u.signedIn },
  { id: "active7d", label: "Active 7d", test: (u, now) => now - u.lastActive <= 7 * DAY_MS },
  { id: "unverified", label: "Unverified", test: (u) => u.emailVerified === false },
];

const state = { data: null, filter: "all", query: "" };

const $ = (id) => document.getElementById(id);

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) if (child != null) node.append(child);
  return node;
}

function svg(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
  return node;
}

function relative(ms, now) {
  const diff = now - ms;
  if (diff < 60_000) return "just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

const fullDate = (ms) => new Date(ms).toLocaleString();
const shortDate = (ms) => new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

function dayLabel(key, { long = false } = {}) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, long ? { weekday: "short", month: "short", day: "numeric" } : { month: "numeric", day: "numeric" });
}

function renderTiles({ totals }) {
  const verifiedHint = totals.users ? `${Math.round((totals.verified / totals.users) * 100)}% of accounts` : "—";
  const tiles = [
    { label: "Total users", value: totals.users },
    { label: "Signed in now", value: totals.signedIn, hint: "unexpired sessions" },
    { label: "Active · 24h", value: totals.active24h },
    { label: "Active · 7 days", value: totals.active7d },
    { label: "Verified email", value: totals.verified, hint: verifiedHint },
  ];
  $("tiles").replaceChildren(
    ...tiles.map((t) =>
      el("div", { class: "tile" }, [
        el("div", { class: "label", text: t.label }),
        el("div", { class: "value", text: String(t.value).padStart(3, "0") }),
        t.hint ? el("div", { class: "hint", text: t.hint }) : null,
      ])
    )
  );
}

function niceMax(n) {
  if (n <= 4) return Math.max(n, 1);
  const step = Math.pow(10, Math.floor(Math.log10(n)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= n) return m * step;
  return 10 * step;
}

function renderChart({ daily }) {
  const box = $("chart");
  const width = box.clientWidth;
  const height = box.clientHeight;
  const pad = { top: 18, right: 4, bottom: 22, left: 28 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const max = niceMax(Math.max(...daily.map((d) => d.active)));
  const tickCount = Math.min(max, 4);
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (max / tickCount) * i);
  const y = (v) => pad.top + plotH - (v / max) * plotH;

  const root = svg("svg", { role: "img", "aria-label": `Daily active users, last ${daily.length} days` });
  const defs = svg("defs");
  const grad = svg("linearGradient", { id: "barGrad", x1: 0, y1: 0, x2: 1, y2: 0 });
  grad.append(
    svg("stop", { offset: "0", "stop-color": "#6a1fb8" }),
    svg("stop", { offset: "0.35", "stop-color": "#c58cff" }),
    svg("stop", { offset: "1", "stop-color": "#6a1fb8" })
  );
  defs.append(grad);
  root.append(defs, svg("rect", { class: "plot-bg", x: pad.left, y: pad.top, width: plotW, height: plotH }));

  for (const t of ticks) {
    root.append(svg("line", { class: t === 0 ? "baseline" : "gridline", x1: pad.left, x2: width - pad.right, y1: y(t), y2: y(t) }));
    const label = svg("text", { class: "axis", x: pad.left - 8, y: y(t) + 4, "text-anchor": "end" });
    label.textContent = Number.isInteger(t) ? t : t.toFixed(1);
    root.append(label);
  }

  const slot = plotW / daily.length;
  const barW = Math.min(26, slot * 0.6);
  const tooltip = el("div", { class: "tooltip" });
  const labelEvery = slot < 34 ? 2 : 1;

  daily.forEach((d, i) => {
    const cx = pad.left + slot * i + slot / 2;
    const x = cx - barW / 2;
    const top = y(d.active);
    const h = pad.top + plotH - top;

    let bar = null;
    if (d.active > 0) {
      bar = svg("rect", { class: "bar", x, y: top, width: barW, height: h, fill: "url(#barGrad)" });
      root.append(bar);
    }

    const isLast = i === daily.length - 1;
    if (isLast || (daily.length - 1 - i) % labelEvery === 0) {
      const label = svg("text", { class: "axis", x: cx, y: height - 4, "text-anchor": "middle" });
      label.textContent = isLast ? "Today" : dayLabel(d.date);
      root.append(label);
    }

    const hit = svg("rect", { class: "hit", x: pad.left + slot * i, y: pad.top, width: slot, height: plotH });
    const show = () => {
      bar?.classList.add("on");
      tooltip.textContent = `${dayLabel(d.date, { long: true })} · ${d.active} active`;
      tooltip.style.left = `${Math.min(Math.max(cx, 70), width - 70)}px`;
      tooltip.style.top = `${top}px`;
      tooltip.classList.add("show");
    };
    const hide = () => {
      bar?.classList.remove("on");
      tooltip.classList.remove("show");
    };
    hit.addEventListener("mouseenter", show);
    hit.addEventListener("mouseleave", hide);
    hit.addEventListener("touchstart", show, { passive: true });
    root.append(hit);
  });

  box.replaceChildren(root, tooltip);

  $("chart-table").replaceChildren(
    el("thead", {}, el("tr", {}, [el("th", { text: "Day" }), el("th", { class: "num", text: "Active users" })])),
    el(
      "tbody",
      {},
      daily.map((d) => el("tr", {}, [el("td", { text: dayLabel(d.date, { long: true }) }), el("td", { class: "num", text: String(d.active) })]))
    )
  );
}

function statusPill(u) {
  return u.signedIn
    ? el("span", { class: "status on" }, [el("span", { class: "led" }), "Online"])
    : el("span", { class: "status off" }, [el("span", { class: "led" }), "Offline"]);
}

function verifiedPill(u) {
  if (u.emailVerified === null) return el("span", { class: "muted", text: "—", title: "Restart the app to add the email_verified column" });
  return u.emailVerified
    ? el("span", { class: "verified", text: "✓ Verified" })
    : el("span", { class: "unverified", text: "✗ Unverified" });
}

function renderFilters() {
  const { users, generatedAt } = state.data;
  $("filters").replaceChildren(
    ...FILTERS.map((f) => {
      const count = users.filter((u) => f.test(u, generatedAt)).length;
      const button = el("button", { type: "button", class: "xp-btn", "aria-pressed": String(state.filter === f.id) }, [
        f.label,
        el("span", { class: "count", text: String(count) }),
      ]);
      button.addEventListener("click", () => {
        state.filter = f.id;
        renderFilters();
        renderRows();
      });
      return button;
    })
  );
}

function renderRows() {
  const { users, generatedAt: now } = state.data;
  const filter = FILTERS.find((f) => f.id === state.filter);
  const q = state.query.trim().toLowerCase();

  const rows = users
    .filter((u) => filter.test(u, now) && (!q || u.email.toLowerCase().includes(q)))
    .sort((a, b) => b.lastActive - a.lastActive);

  $("rows").replaceChildren(
    ...rows.map((u) =>
      el("tr", {}, [
        el("td", {}, [
          el("span", { class: "email", text: u.email }),
          u.isAdmin ? el("span", { class: "admin-tag", text: "ADMIN" }) : null,
          now - u.createdAt <= 7 * DAY_MS ? el("span", { class: "new", text: "NEW!" }) : null,
        ]),
        el("td", {}, statusPill(u)),
        el("td", {}, verifiedPill(u)),
        el("td", { title: fullDate(u.lastActive), text: relative(u.lastActive, now) }),
        el("td", { class: "muted", title: fullDate(u.createdAt), text: shortDate(u.createdAt) }),
        el("td", { class: "num", text: u.reviews.toLocaleString() }),
        el("td", { class: "num", text: u.quizAnswers.toLocaleString() }),
      ])
    )
  );
  $("empty").hidden = rows.length > 0;
}

function render() {
  const data = state.data;
  renderTiles(data);
  renderChart(data);
  renderFilters();
  renderRows();
  $("updated").textContent = `Last updated: ${new Date(data.generatedAt).toLocaleTimeString()}`;
  $("counter").textContent = String(data.totals.users).padStart(6, "0");
}

async function load() {
  try {
    const res = await fetch("/api/overview");
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    state.data = await res.json();
    $("error").style.display = "none";
    render();
  } catch (err) {
    $("error").textContent = `Couldn't load data: ${err.message}. Is the users server still running?`;
    $("error").style.display = "block";
  }
}

$("refresh").addEventListener("click", load);

function currentTheme() {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function syncThemeButton() {
  const dark = currentTheme() === "dark";
  $("theme").textContent = dark ? "☀️ Light Mode" : "🌙 Dark Mode";
  $("theme").setAttribute("aria-pressed", String(dark));
}

$("theme").addEventListener("click", () => {
  const next = currentTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("skilltape-users-theme", next);
  } catch {}
  syncThemeButton();
});
syncThemeButton();
$("search").addEventListener("input", (e) => {
  state.query = e.target.value;
  if (state.data) renderRows();
});

let resizeFrame = 0;
window.addEventListener("resize", () => {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => state.data && renderChart(state.data));
});

setInterval(() => {
  if (!document.hidden) load();
}, REFRESH_MS);

load();
