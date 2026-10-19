/* Sandbox Notes — static PWA (web conversion of a SwiftUI app).
 *
 * IMPORTANT: Everything here is COSMETIC / LOCAL ONLY.
 * This is a local register of app names, risk levels and free-text notes. Nothing
 * is scanned or verified; entries live only in localStorage (key 'sandbox_apps').
 * Data persists in localStorage only. No network calls (CSP connect-src 'none'),
 * no analytics, no tracking, no third-party code.
 */

// ===== PASSCODE (change here) =====
const PASSCODE = "6767";
// ==================================

const decoyEl = document.getElementById("decoy");
const lockEl = document.getElementById("lock");
const panelEl = document.getElementById("panel");
const dotsEl = document.getElementById("dots");
const errorEl = document.getElementById("lockError");
const keypadEl = document.getElementById("keypad");
const lockPanelBtn = document.getElementById("lockPanelBtn");
const decoyTimeEl = document.getElementById("decoyTime");
const decoyDateEl = document.getElementById("decoyDate");

let entered = "";
let view = "decoy"; // decoy | lock | panel

/* ---------- localStorage helpers (UserDefaults -> localStorage) ---------- */
function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch { return fallback; }
}
function saveJSON(key, value) {
  // Local only — never sent anywhere.
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota/private */ }
}
function isoNow() { return new Date().toISOString(); }

function renderLog(listEl, lines, emptyText) {
  listEl.textContent = "";
  if (!lines.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = emptyText || "No entries yet";
    listEl.appendChild(li);
    return;
  }
  for (const line of lines) {
    const li = document.createElement("li");
    li.textContent = line; // textContent: never interpreted as HTML
    listEl.appendChild(li);
  }
}

/* ---------- Views ---------- */
function show(name) {
  view = name;
  decoyEl.hidden = name !== "decoy";
  lockEl.hidden = name !== "lock";
  panelEl.hidden = name !== "panel";
  decoyEl.setAttribute("aria-hidden", name === "decoy" ? "false" : "true");
  if (name === "lock") { entered = ""; updateDots(); errorEl.hidden = true; }
  if (name === "panel") { App.onUnlock(); } else { App.onLock(); }
}

function updateDots() {
  const dots = dotsEl.querySelectorAll(".dot");
  dots.forEach((d, i) => { d.classList.toggle("filled", i < entered.length); });
}

function onDigit(d) {
  if (view !== "lock" || entered.length >= 4) return;
  errorEl.hidden = true;
  entered += d;
  updateDots();
  if (entered.length === 4) {
    if (entered === PASSCODE) { show("panel"); }
    else { errorEl.hidden = false; entered = ""; setTimeout(updateDots, 180); }
  }
}
function onDelete() {
  if (view !== "lock" || !entered.length) return;
  entered = entered.slice(0, -1);
  errorEl.hidden = true;
  updateDots();
}

keypadEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-k]");
  if (!btn) return;
  const k = btn.getAttribute("data-k");
  if (k === "del") onDelete(); else onDigit(k);
});
lockPanelBtn.addEventListener("click", () => { show("decoy"); });

/* ---------- Hidden gesture: double-tap in top ~15% strip ---------- */
const TOP_STRIP_RATIO = 0.15;
const DOUBLE_TAP_MS = 350;
let lastTopTapAt = 0;

function isTopStrip(clientY) {
  const h = window.innerHeight || document.documentElement.clientHeight;
  return clientY <= h * TOP_STRIP_RATIO;
}
function onPointerDown(e) {
  if (view !== "decoy") return;
  if (typeof e.button === "number" && e.button !== 0) return;
  const y = e.clientY;
  if (!isTopStrip(y)) { lastTopTapAt = 0; return; }
  const now = performance.now();
  if (lastTopTapAt && now - lastTopTapAt <= DOUBLE_TAP_MS) { lastTopTapAt = 0; show("lock"); }
  else { lastTopTapAt = now; }
}
decoyEl.addEventListener("pointerdown", onPointerDown, { passive: true });

/* ---------- Decoy clock ---------- */
const FR_DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const FR_MONTHS = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
function pad2(n) { return String(n).padStart(2, "0"); }
function tickClock() {
  const now = new Date();
  decoyTimeEl.textContent = pad2(now.getHours()) + ":" + pad2(now.getMinutes());
  decoyDateEl.textContent = FR_DAYS[now.getDay()] + " " + now.getDate() + " " + FR_MONTHS[now.getMonth()];
}
tickClock();
setInterval(tickClock, 15000);

/* ================= App-specific logic ================= */
const K_APPS = "sandbox_apps"; // list of { name, risk, notes }

const App = {
  init() {
    this.listEl = document.getElementById("notesList");
    this.nameEl = document.getElementById("nameField");
    this.riskEl = document.getElementById("riskField");
    this.notesEl = document.getElementById("notesField");

    document.getElementById("addBtn").addEventListener("click", () => {
      const name = (this.nameEl.value || "").trim();
      if (!name) { this.nameEl.focus(); return; }
      const apps = loadJSON(K_APPS, []);
      apps.push({ name, risk: this.riskEl.value, notes: (this.notesEl.value || "").trim() });
      saveJSON(K_APPS, apps);
      this.nameEl.value = "";
      this.notesEl.value = "";
      this.riskEl.value = "medium";
      this.render();
    });
  },
  render() {
    const apps = loadJSON(K_APPS, []);
    this.listEl.textContent = "";
    if (!apps.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "No notes yet";
      this.listEl.appendChild(li);
      return;
    }
    apps.forEach((a, idx) => {
      const li = document.createElement("li");
      li.className = "note-item";

      const top = document.createElement("div");
      top.className = "note-row-top";

      const left = document.createElement("div");
      left.className = "note-left";
      const headline = document.createElement("div");
      headline.className = "note-headline";
      headline.textContent = a.name; // textContent: safe, never HTML
      const risk = document.createElement("div");
      risk.className = "risk";
      risk.textContent = a.risk;
      left.appendChild(headline);
      left.appendChild(risk);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "del-btn";
      del.textContent = "Delete";
      del.addEventListener("click", () => {
        const cur = loadJSON(K_APPS, []);
        cur.splice(idx, 1);
        saveJSON(K_APPS, cur);
        this.render();
      });

      top.appendChild(left);
      top.appendChild(del);
      li.appendChild(top);

      if (a.notes) {
        const nt = document.createElement("div");
        nt.className = "note-text";
        nt.textContent = a.notes; // textContent: safe, never HTML
        li.appendChild(nt);
      }
      this.listEl.appendChild(li);
    });
  },
  onUnlock() { this.render(); },
  onLock() {},
};

/* ================= Boot ================= */
App.init();
show("decoy");

/* PWA service worker (app-shell only, same-origin) */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js", { scope: "./" }).catch(() => {});
  });
}
