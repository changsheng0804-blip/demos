// 毛利元就 西国势力沙盘 · core.js — 基础：数据句柄、SVG 图层、国域、可信度、地名、提示框
// 所有 js/*.js 按 index.html 中顺序作为普通脚本加载，共享同一全局作用域（原单一 IIFE 拆分）。
const S = window.SANDBOX, F = S.frames, FA = S.factions, NS = "http://www.w3.org/2000/svg";
const $ = (id) => document.getElementById(id);
const el = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
const RG = {}; S.regions.forEach((r) => (RG[r.id] = r));
const fname = (k) => FA[k].name;
const parts = (v) => v.split("/");
// concise mode: four protagonists at full colour, the rest in muted paper tints
let concise = true, descOpen = false, chipsOpen = false, allPeople = false, legOpen = false;
const MAJORS = (S.majors || ["MORI", "OUCHI", "AMAGO", "OTOMO"]).filter((k) => FA[k]);
const MAJOR = new Set(MAJORS), CORE = new Set(["出雲", "周防", "長門"]);
const hx = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mix = (h, b, t) => { const A = hx(h), B = hx(b); return "#" + A.map((a, i) => Math.round(a * t + B[i] * (1 - t)).toString(16).padStart(2, "0")).join(""); };
const MUTE = {};
Object.keys(FA).forEach((k) => (MUTE[k] = MAJOR.has(k) ? [FA[k].color, FA[k].dark] : [mix(FA[k].color, "#d8d2c6", 0.28), mix(FA[k].dark, "#8f877b", 0.35)]));
const col = (k) => (concise ? MUTE[k][0] : FA[k].color);
const dk = (k) => (concise ? MUTE[k][1] : FA[k].dark);
const map = $("map");
map.setAttribute("viewBox", S.meta.viewBox.join(" "));
$("mtitle").textContent = S.meta.title;
$("noteTxt").textContent = S.meta.note || "";
$("noteSrc").textContent = S.meta.source || "";

// layers
const defs = el("defs", {}, map);
el("image", { href: "assets/terrain_soft.webp", x: -165, y: -105.7, width: 1378.6, height: 1057.3, preserveAspectRatio: "none", class: "x-terrain", "pointer-events": "none", "aria-hidden": "true" }, map);
const gR = el("g", { id: "regions" }, map);
const gCt = el("g", { id: "contest" }, map);
const gConf = el("g", { id: "conf" }, map);
el("path", { d: S.akiOutline, class: "x-aki" }, map);
const gClaim = el("g", { id: "claims" }, map);
const gPulse = el("g", { id: "pulse" }, map);
const gCas = el("g", { id: "castles" }, map);
const gEcoR = el("g", { id: "econRoutes", class: "x-eco-only" }, map);
const gFx = el("g", { id: "fx" }, map);
const gPl = el("g", { id: "places" }, map);
const gEcoN = el("g", { id: "econNodes" }, map);
const gLb = el("g", { id: "labels" }, map);
const gCfB = el("g", { id: "confBadges" }, map);
const gFloat = el("g", { id: "float" }, map);
const gRib = el("g", { id: "ribbon" }, map);
const gFocus = el("g", { id: "focus", class: "x-focus" }, map);

S.regions.forEach((r) => {
  r.el = el("path", { d: r.d, class: "x-reg" + (r.level === "district" ? " is-district" : ""), "aria-label": r.name }, gR);
  r.tok = 0;
});
S.seaLabels.forEach((s) => (el("text", { x: s.xy[0], y: s.xy[1], class: "x-lb-sea" }, gLb).textContent = s.name));
S.regions.forEach((r) => {
  r.lb = el("text", { x: r.label[0], y: r.label[1], class: r.level === "district" ? "x-lb-d" : "x-lb-p" }, gLb);
  r.lb.textContent = r.name;
  r.el.addEventListener("mouseenter", () => r.lb.classList.add("is-hov"));
  r.el.addEventListener("mouseleave", () => r.lb.classList.remove("is-hov"));
});
el("text", { x: 612, y: 440, class: "x-lb-p x-aki-lb is-on" }, gLb).textContent = "安艺";
// reliability: an inner outline (stroke clipped to the region) and a badge right of the label
const GC = { "确证": "#3d6b4a", "通说": "#8a8073", "推测": "#b7791f" };
const GRADES = S.grades || {};
const gdot = (g) => `<span class="x-gd" style="background:${GC[g] || GC["通说"]}"></span>`;
let confOn = false;
S.regions.forEach((r, i) => {
  const cp = el("clipPath", { id: "cfc" + i }, defs);
  el("path", { d: r.d }, cp);
  // contested: inner border in the challenger's colour, clipped to the region (10px non-scaling stroke → 5px inside)
  r.ct = el("path", { d: r.d, class: "x-ct", "clip-path": `url(#cfc${i})`, display: "none" }, gCt);
  r.cfo = el("path", { d: r.d, class: "x-cfo", "clip-path": `url(#cfc${i})`, display: "none" }, gConf);
  const fs = r.level === "district" ? 8.5 : 13, bx = r.label[0] + (r.name.length * fs) / 2 + 8;
  r.cfb = el("g", { class: "x-cfb", transform: `translate(${bx.toFixed(1)},${r.label[1]})`, display: "none" }, gCfB);
  el("circle", { r: 6 }, r.cfb);
  r.cfbt = el("text", { y: 0.5 }, r.cfb);
});
function confPaint(f) {
  const C = f.conf || {};
  S.regions.forEach((r) => {
    const g = (C[r.id] || {}).grade, spec = g === "推测", sure = g === "确证";
    r.el.classList.toggle("is-spec", spec);
    const k = spec ? "is-spec" : sure ? "is-sure" : "";
    r.cfo.setAttribute("class", "x-cfo " + k);
    r.cfb.setAttribute("class", "x-cfb " + k);
    r.cfo.setAttribute("display", k ? "inline" : "none");
    r.cfb.setAttribute("display", k ? "inline" : "none");
    r.cfbt.textContent = spec ? "?" : sure ? "✓" : "";
  });
  const e = f.eventConf, eg = $("eg");
  eg.hidden = !e;
  if (e) {
    eg.innerHTML = `<span class="x-gpi" style="border-color:${GC[e.grade] || GC["通说"]}">${gdot(e.grade)}${e.grade}</span>`;
    eg.setAttribute("aria-label", `可信度：${e.grade}，${e.basis}`);
  }
}
const PL = {};
Object.entries(S.places).forEach(([n, p]) => {
  if (p.castle) return; // drawn by the castle layer
  const [x, y] = p.xy, g = el("g", { class: "x-pl", transform: `translate(${x},${y})` }, gPl), z = el("g", { class: "x-cz" }, g);
  if (p.type === "castle") el("rect", { x: -3, y: -3, width: 6, height: 6, class: "x-castle x-mk" }, z);
  else el("circle", { r: 2.4, class: "x-place x-mk" }, z);
  el("circle", { r: 1.6, class: "x-dotm" }, z);
  const t = el("text", { x: x + 5, y, class: "x-lb-pl" }, gLb);
  t.textContent = n;
  PL[n] = { g, t };
});
// focus ring
const gFocusZ = el("g", { class: "x-cz" }, gFocus);
[0, 0.8].forEach((d) => {
  const c = el("circle", { r: 6 }, gFocusZ);
  el("animate", { attributeName: "r", values: "6;26", dur: "1.6s", begin: d + "s", repeatCount: "indefinite" }, c);
  el("animate", { attributeName: "opacity", values: "1;0", dur: "1.6s", begin: d + "s", repeatCount: "indefinite" }, c);
});
el("circle", { r: 3.5, class: "x-core" }, gFocusZ);

const swCss = (v) => { const [a, b] = parts(v); return b ? `${col(a)};box-shadow:inset 0 0 0 2px ${col(b)}` : col(a); };
const sw = (v) => `<span class="x-sw" style="background:${swCss(v)}"></span>`;
const vname = (v) => parts(v).map(fname).join("·");

// tooltip: regions (hover or tap) and change chips
const tip = $("tip");
let tipFor = null, lastPT = "mouse";
function showTip(html, x, y, who) {
  tip.innerHTML = html; tip.hidden = false; tipFor = who;
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let L = x + 14, T = y + 14;
  if (L + w > innerWidth - 8) L = x - w - 14;
  if (T + h > innerHeight - 8) T = y - h - 14;
  tip.style.left = Math.max(8, L) + "px"; tip.style.top = Math.max(8, T) + "px";
}
const hideTip = () => { tip.hidden = true; tipFor = null; };
const noteOf = (f, id) => (f.notes && f.notes[id]) || "";
function regTip(r) {
  const f = F[cur], v = f.state[r.id] || "OTHER", ps = parts(v), n = noteOf(f, r.id);
  const who = ps.length > 1 ? ps.map((k) => sw(k) + fname(k)).join(" / ") + " 争夺" : sw(v) + fname(v);
  const c = (f.conf || {})[r.id];
  const cl = c ? `<span class="x-tip-c">${gdot(c.grade)} 可信度：${c.grade}${c.basis ? " · " + c.basis : ""}</span>` : "";
  return `<b>${r.name}</b><span class="x-tip-f">${who}</span>${n ? `<span class="x-tip-n">实情：${n}</span>` : ""}${cl}`;
}
document.addEventListener("pointerdown", (e) => (lastPT = e.pointerType || "mouse"), true);
S.regions.forEach((r) => {
  r.el.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") showTip(regTip(r), e.clientX, e.clientY, r); });
  r.el.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && tipFor === r) hideTip(); });
  r.el.addEventListener("click", (e) => {
    if (lastPT === "mouse") return;
    e.stopPropagation();
    if (tipFor === r) hideTip(); else showTip(regTip(r), e.clientX, e.clientY, r);
  });
});
document.addEventListener("click", () => { if (tipFor) hideTip(); });
const chipNote = (li) => { const f = F[cur], id = li.dataset.r, r = RG[id]; return `<b>${r ? r.name : id}</b><span class="x-tip-n">实情：${noteOf(f, id)}</span>`; };
const chipAt = (li) => { const b = li.getBoundingClientRect(); showTip(chipNote(li), b.left - 14, b.bottom - 8, li); };
const chg = $("changes");
chg.addEventListener("mouseover", (e) => { const li = e.target.closest("li[data-r]"); if (li && tipFor !== li) chipAt(li); });
chg.addEventListener("mouseout", (e) => { const li = e.target.closest("li[data-r]"); if (li && !li.contains(e.relatedTarget)) hideTip(); });
chg.addEventListener("focusin", (e) => { const li = e.target.closest("li[data-r]"); if (li) chipAt(li); });
chg.addEventListener("focusout", () => hideTip());
// headline event pill: basis on hover, focus or tap
const eg = $("eg");
const egHtml = () => { const e = F[cur].eventConf || {}; return `<b>${gdot(e.grade)} ${e.grade}</b><span class="x-tip-n">${e.basis || ""}</span>`; };
const egAt = () => { const b = eg.getBoundingClientRect(); showTip(egHtml(), b.left - 14, b.bottom - 8, eg); };
eg.addEventListener("mouseenter", () => { if (tipFor !== eg) egAt(); });
eg.addEventListener("mouseleave", () => { if (tipFor === eg) hideTip(); });
eg.addEventListener("focus", egAt);
eg.addEventListener("blur", () => { if (tipFor === eg) hideTip(); });
eg.addEventListener("click", (e) => { if (lastPT === "mouse") return; e.stopPropagation(); if (tipFor === eg) hideTip(); else egAt(); });
eg.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); if (tipFor === eg) hideTip(); else egAt(); } });
chg.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-r]"); if (!li || lastPT === "mouse") return;
  e.stopPropagation();
  if (tipFor === li) hideTip(); else chipAt(li);
});

