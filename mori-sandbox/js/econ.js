// 毛利元就 西国势力沙盘 · econ.js — 经济层：银山、港口、海路、水军
// 所有 js/*.js 按 index.html 中顺序作为普通脚本加载，共享同一全局作用域（原单一 IIFE 拆分）。
// economic layer: routes and the navy zone under the fx layer, nodes and boats above the places
const E = S.econ || { nodes: [], routes: [], navy: [] };
let ecoOn = false;
const SEA = "#7fa3c4", AG = "#9aa3ad", TRD = "#6f665b", NAVY = "#4f6f8f";
const ICON = {
  mine: '<path class="x-ag" d="M-4.6,2.6L-3,-1.6Q0,-3.4 3,-1.6L4.6,2.6Z"/><path d="M-1.6,-1.1Q0,-1.9 1.6,-1.1"/>',
  port: '<circle cx="0" cy="-3.7" r="1.1"/><path d="M0,-2.6V3.8M-2.2,-1H2.2M-3.6,1Q-3,3.8 0,3.8Q3,3.8 3.6,1"/>',
  city: '<path d="M-5,3.6V0L-2.6,-2.2L-0.2,0V3.6ZM0.4,3.6V-1.4L2.7,-3.6L5,-1.4V3.6Z"/>',
  strait: '<path d="M-5,-3.6H5M-3.8,-1.6H3.8M-2.6,-3.6V4M2.6,-3.6V4"/>',
};
const KIND = { mine: "矿山", port: "港口", city: "城市", strait: "海峡" };
const ringC = (k) => (!FA[k] ? MUTE.OTHER[1] : MAJOR.has(k) ? FA[k].color : MUTE[k][1]);
const r1 = (v) => +v.toFixed(1);
function crPath(P) {
  let d = `M${P[0][0]},${P[0][1]}`;
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
    d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)},${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)},${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]},${p2[1]}`;
  }
  return d;
}
function bindTip(n, html) {
  n._tip = html;
  n.addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") showTip(html(), e.clientX, e.clientY, n); });
  n.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && tipFor === n) hideTip(); });
  n.addEventListener("click", (e) => { if (lastPT === "mouse") return; e.stopPropagation(); if (tipFor === n) hideTip(); else showTip(html(), e.clientX, e.clientY, n); });
}
const setA = (e, o) => { for (const n in o) e.setAttribute(n, o[n]); };
const am = el("marker", { id: "eco-ah", viewBox: "0 0 10 10", refX: 8, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }, defs);
el("path", { d: "M0,1L10,5L0,9Z", fill: TRD }, am);
if (E.navyZone) {
  const z = E.navyZone, [cx, cy] = z.center;
  const wp = el("pattern", { id: "eco-wave", patternUnits: "userSpaceOnUse", width: 14, height: 7 }, defs);
  el("path", { d: "M0,4.5Q3.5,1.5 7,4.5T14,4.5", fill: "none", stroke: SEA, "stroke-width": 0.7, "stroke-opacity": 0.5 }, wp);
  el("ellipse", { cx, cy, rx: z.rx, ry: z.ry, fill: SEA, "fill-opacity": 0.08, "pointer-events": "none" }, gEcoR);
  el("ellipse", { cx, cy, rx: z.rx, ry: z.ry, fill: "url(#eco-wave)", stroke: SEA, "stroke-opacity": 0.55, "stroke-dasharray": "3 3", "pointer-events": "none" }, gEcoR);
  txt(gEcoR, cx, cy - z.ry - 7, "x-eco-zl", z.label);
}
const RT = {};
E.routes.forEach((r) => {
  const g = el("g", { class: "x-eco-r" }, gEcoR), d = crPath(r.points), id = "rt-" + r.id;
  const line = el("path", { id, d, fill: "none", "stroke-linecap": "round" }, g);
  if (r.kind === "sea") setA(line, { stroke: SEA, "stroke-width": 1.8, "stroke-dasharray": "12 7", "stroke-opacity": 0.75 });
  else if (r.kind === "silver") setA(line, { stroke: AG, "stroke-width": 2.2, "stroke-dasharray": "0.1 5" });
  else setA(line, { stroke: TRD, "stroke-width": 1.1, "stroke-dasharray": "5 4", "stroke-linecap": "butt", "marker-end": "url(#eco-ah)" });
  nsw(line, line.getAttribute("stroke-width"));
  if (r.kind === "trade") { const e = r.points[r.points.length - 1]; txt(g, e[0] + 12, e[1] + 2, "x-eco-tl", r.name); }
  else if (!RM) {
    const len = line.getTotalLength ? line.getTotalLength() : 600, dur = (len / 14).toFixed(1);
    for (let j = 0; j < 3; j++) {
      const c = el("circle", { r: r.kind === "sea" ? 1.5 : 1.8, fill: r.kind === "sea" ? SEA : AG, stroke: r.kind === "silver" ? "#6c747c" : "none", "stroke-width": 0.5, "pointer-events": "none" }, g);
      const mo = el("animateMotion", { dur: dur + "s", repeatCount: "indefinite", begin: (-(dur * j) / 3).toFixed(1) + "s" }, c);
      const mp = el("mpath", { href: "#" + id }, mo);
      mp.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "#" + id);
    }
  }
  const hit = el("path", { d, class: "x-eco-hit" }, g);
  bindTip(hit, () => `<b>${r.name}</b><span class="x-tip-f">${r.since}${r.until ? "–" + r.until : " 起"}</span><span class="x-tip-n">${r.desc}</span>`);
  RT[r.id] = { r, g };
});
(E.navy || []).forEach((n) => {
  const b = el("g", { class: "x-boat x-eco-only", transform: `translate(${n.xy[0]},${n.xy[1]})`, role: "img", "aria-label": n.name }, gEcoN);
  const bz = el("g", { class: "x-cz" }, b);
  el("circle", { r: 7, fill: "transparent" }, bz);
  el("path", { d: "M-5,0H5L3.2,2.6H-3.2Z", fill: NAVY }, bz);
  el("path", { d: "M0,-0.6V-7L4.4,-1.8Z", fill: "#f3ede1", stroke: NAVY, "stroke-width": 0.7 }, bz);
  bindTip(b, () => `<b>${n.name}</b><span class="x-tip-n">${n.note}</span>`);
});
const EN = {}, LEFT = new Set(["yunotsu"]);
E.nodes.forEach((n) => {
  const g = el("g", { class: "x-eco-n" + (n.id === "ginzan" ? "" : " x-eco-only"), transform: `translate(${n.xy[0]},${n.xy[1]})`, role: "img", "aria-label": n.name }, gEcoN);
  const z = el("g", { class: "x-cz" }, g);
  const ring = el("circle", { r: 6.5, class: "x-ring" }, z);
  el("g", { class: "x-ic" }, z).innerHTML = ICON[n.kind] || "";
  const t = LEFT.has(n.id) ? txt(z, -9, 0, "x-eco-lb", n.name) : txt(z, 0, 13, "x-eco-lb", n.name);
  if (LEFT.has(n.id)) t.style.textAnchor = "end";
  const o = (EN[n.id] = { n, g, z, ring, owner: null });
  bindTip(g, () => {
    const k = o.owner || "OTHER";
    return `<b>${n.name}</b><span class="x-tip-f">${KIND[n.kind] || ""} · ${n.region} · ${sw(k)}${fname(k)}</span><span class="x-tip-n">${n.desc}</span>`;
  });
});
function ping(o, k, n) {
  if (RM) return;
  const c = el("circle", { r: 6.5, fill: "none", stroke: ringC(k), "stroke-width": 2 }, o.z);
  o.z.insertBefore(c, o.ring);
  c.animate([{ transform: "scale(1)", opacity: 0.9 }, { transform: "scale(3)", opacity: 0 }], { duration: 1100, iterations: n, easing: "ease-out" }).onfinish = () => c.remove();
  o.ring.animate([{ strokeWidth: "2px" }, { strokeWidth: "4px" }, { strokeWidth: "2px" }], { duration: 900, iterations: n });
}
function ecoPaint(f, anim) {
  const fe = f.econ || { nodes: {}, routes: [], events: [] }, on = new Set(fe.routes || []);
  Object.values(RT).forEach((o) => (o.g.style.display = on.has(o.r.id) ? "" : "none"));
  Object.values(EN).forEach((o) => {
    const k = (fe.nodes || {})[o.n.id];
    o.g.style.display = k ? "" : "none";
    if (!k) { o.owner = null; return; }
    o.ring.style.stroke = ringC(k);
    if (anim && o.owner && o.owner !== k) ping(o, k, 1);
    o.owner = k;
    o.g.setAttribute("aria-label", `${o.n.name} · ${fname(k)}`);
  });
  const ev = fe.events || [];
  $("econEv").innerHTML = ev.length ? ev.map((e) => `<li><b>${e.year}</b>${e.text}</li>`).join("") : '<li class="x-none">暂无</li>';
}
const hlNode = (s) => (/银/.test(s) ? EN.ginzan : /遣明|勘合|宁波/.test(s) ? EN.hakata : null);
const clearHl = () => Object.values(EN).forEach((o) => o.g.classList.remove("is-hl"));
const ecoIco = (k) => `<svg viewBox="-8 -8 16 16" aria-hidden="true"><circle r="6.5" fill="#f3ede1" stroke="#8a8073" stroke-width="1.4"/><g class="x-ic">${ICON[k]}</g></svg>`;
const ecoLine = (a) => `<svg class="x-lr" viewBox="0 0 24 10" aria-hidden="true"><line x1="2" y1="5" x2="20" y2="5" stroke-linecap="round" ${a}/></svg>`;
const ecoLegend = () =>
  `<div class="x-cfl x-ecl"><span><b>经济</b></span>` +
  ["mine", "port", "city", "strait"].map((k) => `<span>${ecoIco(k)}${KIND[k]}</span>`).join("") +
  `<span>${ecoLine(`stroke="${SEA}" stroke-width="1.8" stroke-dasharray="6 3"`)}海路</span>` +
  `<span>${ecoLine(`stroke="${AG}" stroke-width="2.4" stroke-dasharray="0.1 4"`)}白银外运</span>` +
  `<span><svg class="x-lr" viewBox="0 0 24 10" aria-hidden="true"><line x1="2" y1="5" x2="18" y2="5" stroke="${TRD}" stroke-width="1.1" stroke-dasharray="4 3"/><path d="M17,2L23,5L17,8Z" fill="${TRD}"/></svg>对外贸易</span></div>`;

